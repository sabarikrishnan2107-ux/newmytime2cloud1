<?php

namespace App\Jobs;

use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Generates the "Monthly Report Format C" (Puppeteer) PDF for Weekly/Monthly
 * notification cadence. Replaces the legacy DomPDF chunked summary report.
 *
 * Output path (matches the legacy file naming so ReportNotificationCrons
 * doesn't need to change):
 *   storage/app/public/pdf/<yesterday>/<company_id>/summary_report_<branchId>_<shiftTypeLabel>.pdf
 */
class GenerateFormatCReportPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int    $companyId;
    public int    $branchId;
    public string $fromDate;
    public string $toDate;
    public string $shiftTypeLabel;   // "Multi" / "General" — used for file name
    public ?int   $shiftTypeId;      // DB id to filter employees, nullable
    public string $companyName;

    public function __construct(
        int $companyId,
        int $branchId,
        string $fromDate,
        string $toDate,
        string $shiftTypeLabel,
        ?int $shiftTypeId,
        string $companyName
    ) {
        $this->companyId      = $companyId;
        $this->branchId       = $branchId;
        $this->fromDate       = $fromDate;
        $this->toDate         = $toDate;
        $this->shiftTypeLabel = $shiftTypeLabel;
        $this->shiftTypeId    = $shiftTypeId;
        $this->companyName    = $companyName;
    }

    public function handle(): void
    {
        // Collect all active employees in this branch (optionally filtered by shift type).
        // Pluck system_user_id (NOT employee_id badge) — that's the FK that attendance rows
        // actually reference (see Attendance::employee belongsTo with foreignKey=employee_id
        // and ownerKey=system_user_id). Using badge values would miss any modern attendance
        // rows written under the system_user_id, which is the bug that made employees with
        // employee_id != system_user_id appear ABSENT in Format C reports.
        $empQuery = Employee::where('company_id', $this->companyId)
            ->where('branch_id', $this->branchId)
            ->where('status', 1);

        if ($this->shiftTypeId) {
            $empQuery->whereHas('schedule', function ($q) {
                $q->where('shift_type_id', $this->shiftTypeId);
            });
        }
        $employeeIds = $empQuery->pluck('system_user_id')->filter()->implode(',');

        if ($employeeIds === '') {
            echo "[GenerateFormatCReportPDF] No employees found for company={$this->companyId} branch={$this->branchId} — skipping.\n";
            return;
        }

        $pdfService  = env('PDF_SERVICE_URL', 'http://localhost:3002');
        $summaryBase = env('SUMMARY_REPORT_URL', $pdfService);
        $apiBase     = env('DAILY_REPORT_API_BASE')
            ?: rtrim(env('APP_URL', config('app.url')), '/') . '/api';

        $params = http_build_query([
            'employee_ids'  => $employeeIds,
            'company_id'    => $this->companyId,
            'from_date'     => $this->fromDate,
            'to_date'       => $this->toDate,
            'shift_type_id' => $this->shiftTypeId ?? 0,
            'api_base'      => $apiBase,
            'company_name'  => $this->companyName,
        ]);

        $templateUrl = rtrim($summaryBase, '/') . '/attendance-report/format-c.html?' . $params;

        echo "\n[GenerateFormatCReportPDF] Calling Puppeteer for company={$this->companyId} branch={$this->branchId} range={$this->fromDate}..{$this->toDate}\n";

        $response = Http::timeout(300)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post(rtrim($pdfService, '/') . '/pdf', [
                'url'       => $templateUrl,
                'landscape' => true,
            ]);

        if (!$response->successful()) {
            echo "[GenerateFormatCReportPDF] FAILED: " . $response->status() . " - " . $response->body() . "\n";
            return;
        }

        $yesterday    = $this->toDate;
        $relativePath = "public/pdf/{$yesterday}/{$this->companyId}/summary_report_{$this->branchId}_{$this->shiftTypeLabel}.pdf";
        Storage::put($relativePath, $response->body());

        echo "[GenerateFormatCReportPDF] Saved " . strlen($response->body()) . " bytes to $relativePath\n";
    }
}
