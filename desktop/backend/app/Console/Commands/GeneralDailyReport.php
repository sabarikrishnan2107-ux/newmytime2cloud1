<?php
namespace App\Console\Commands;

use App\Jobs\GenerateAbsentReportExcel;
use App\Jobs\GenerateAbsentReportPDF;
use App\Jobs\GenerateAccessControlReportExcel;
use App\Jobs\GenerateAccessControlReportPDF;
use App\Jobs\GenerateAttendanceReportExcel;
use App\Jobs\GenerateAttendanceSummaryReport;
use App\Jobs\GenerateDailyReportPDF;
use App\Jobs\GenerateDeviceReportExcel;
use App\Jobs\GenerateDeviceReportPDF;
use App\Jobs\GenerateDocumentExpiryReportExcel;
use App\Jobs\GenerateDocumentExpiryReportPDF;
use App\Jobs\GenerateFormatCReportPDF;
use App\Models\Company;
use App\Models\ReportNotification;
use App\Models\Shift;
use Illuminate\Console\Command;

class GeneralDailyReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:generate_daily_report {id?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate Daily Report';

    protected $company_id;

    public function handle()
    {
        $this->company_id = $this->argument("id") ?? 0;

        $companyIds = Company::when($this->company_id > 0, fn($q) => $q->where("id", $this->company_id))
            ->whereHas('report_notifications', function ($query) {
                $query->where('type', 'attendance');
            })
            ->with(['report_notifications' => function ($query) {
                $query->where('type', 'attendance');
                $query->select('id', 'company_id', "branch_id", "frequency");
                $query->with('branch:id,branch_name');
            }])
            ->whereHas('shifts')
            ->with('contact:id,company_id,number')
            ->get(["logo", "name", "company_code", "location", "p_o_box_no", "id", "user_id"]);

        foreach ($companyIds as $key => $company) {
            $this->processByCompanyIds($company);
        }

    }

    public function processByCompanyIds($companyPayload)
    {
        $company_id           = $companyPayload->id;
        $report_notifications = $companyPayload->report_notifications;
        $shift_types          = Shift::getShiftTypesByCompany($company_id);

        $from_date = date("Y-m-d", strtotime("-1 day"));
        $to_date   = date("Y-m-d", strtotime("-1 day"));

        $heading = "Summary";

        $companyPayload = Company::whereId($company_id)
            ->with('contact:id,company_id,number')
            ->first(["logo", "name", "company_code", "location", "p_o_box_no", "id", "user_id"]);

        $company = [
            "logo_raw"    => env("BASE_URL") . '/' . $companyPayload->logo_raw,
            "name"        => $companyPayload->name,
            "email"       => $companyPayload->user->email ?? 'mail not found',
            "location"    => $companyPayload->location,
            "contact"     => $companyPayload->contact->number ?? 'contact not found',
            "report_type" => $heading,
            "from_date"   => $from_date,
            "to_date"     => $to_date,
        ];

        // Route by frequency:
        //   Daily            → new consolidated daily report (Puppeteer)
        //   Weekly / Monthly → Format C (Puppeteer), one file per branch × shift_type
        $dailyNotifications = $report_notifications->filter(fn($n) => strcasecmp($n->frequency ?? '', 'Daily') === 0);
        $otherNotifications = $report_notifications->reject(fn($n) => strcasecmp($n->frequency ?? '', 'Daily') === 0);

        // ---- Daily — one consolidated PDF per branch ----
        foreach ($dailyNotifications as $notification) {
            $branchName = $notification?->branch?->branch_name ?? 'N/A';
            $branchId   = (int) ($notification?->branch_id ?? 0);
            $name       = $company['name'] ?? 'Unknown';
            $formats    = is_array($notification->formats ?? null) && !empty($notification->formats) ? $notification->formats : ['PDF'];

            $this->info("Daily-format report for Company $name (id=$company_id) Branch $branchName (id=$branchId) formats=" . implode(',', $formats));

            if (in_array('PDF', $formats, true)) {
                GenerateDailyReportPDF::dispatch($company_id, $branchId, $from_date);
            }
            if (in_array('Excel', $formats, true)) {
                GenerateAttendanceReportExcel::dispatch($company_id, $branchId, $from_date);
            }
        }

        // ---- Non-attendance daily reports (Absent / AccessControl / Device / DocumentExpiry) ----
        $nonAttendanceJobs = [
            'absent' => [GenerateAbsentReportPDF::class, GenerateAbsentReportExcel::class],
            'access_control' => [GenerateAccessControlReportPDF::class, GenerateAccessControlReportExcel::class],
            'device' => [GenerateDeviceReportPDF::class, GenerateDeviceReportExcel::class],
            'document_expiry' => [GenerateDocumentExpiryReportPDF::class, GenerateDocumentExpiryReportExcel::class],
        ];

        $otherTypeRules = ReportNotification::whereIn('type', array_keys($nonAttendanceJobs))
            ->where('company_id', $company_id)
            ->with('branch:id,branch_name')
            ->get();

        foreach ($otherTypeRules as $rule) {
            // Only generate new daily reports for non-attendance rules that
            // actually need a file delivered (FTP or API medium). Rules with
            // only Email medium continue to be served by the existing alert
            // commands (AlertAbsents etc.) and don't need a PDF/Excel file.
            $needsFile = in_array('FTP', $rule->mediums ?? [], true)
                || in_array('API', $rule->mediums ?? [], true);
            if (!$needsFile) {
                continue;
            }

            $branchId = (int) ($rule->branch_id ?? 0);
            $formats = is_array($rule->formats) && !empty($rule->formats) ? $rule->formats : ['PDF'];
            [$pdfJob, $xlsxJob] = $nonAttendanceJobs[$rule->type];

            $this->info("{$rule->type} report for Company id=$company_id Branch id=$branchId formats=" . implode(',', $formats));

            if (in_array('PDF', $formats, true)) {
                $pdfJob::dispatch($company_id, $branchId, $from_date);
            }
            if (in_array('Excel', $formats, true)) {
                $xlsxJob::dispatch($company_id, $branchId, $from_date);
            }
        }

        // ---- Weekly / Monthly — Format C via Puppeteer (one file per branch × shift_type) ----
        $shiftTypeIdMap = ['General' => null, 'Multi' => 2, 'Split' => 5]; // label → shift_type_id for employee filter
        foreach ($otherNotifications as $notification) {
            $branchName = $notification?->branch?->branch_name ?? 'N/A';
            $branchId   = (int) ($notification?->branch_id ?? 0);
            $name       = $company['name'] ?? 'Unknown';
            $freq       = strtolower($notification->frequency ?? 'weekly');

            // Compute the date range per frequency
            if ($freq === 'monthly') {
                $rangeFrom = date('Y-m-01', strtotime('first day of last month'));
                $rangeTo   = date('Y-m-t', strtotime('last day of last month'));
            } else {
                // weekly — last 7 days ending yesterday
                $rangeFrom = date('Y-m-d', strtotime('-7 days'));
                $rangeTo   = date('Y-m-d', strtotime('-1 day'));
            }

            foreach ($shift_types as $shift_type_label) {
                $shift_type_id = $shiftTypeIdMap[$shift_type_label] ?? null;

                $this->info("Format C report ($freq) for $name / Branch $branchName / shift=$shift_type_label range=$rangeFrom..$rangeTo");

                GenerateFormatCReportPDF::dispatch(
                    $company_id,
                    $branchId,
                    $rangeFrom,
                    $rangeTo,
                    $shift_type_label,
                    $shift_type_id,
                    $name
                );
            }
        }
    }
}
