<?php

namespace App\Mail;

use App\Http\Controllers\Reports\AttendanceReportController;
use App\Http\Controllers\Shift\RenderController;
use App\Jobs\GenerateDailyReportPDF;
use App\Jobs\GenerateFormatCReportPDF;
use App\Models\Attendance;
use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Http\Request;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

class ReportNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public $model, public $manager, public $files) {}

    public function build()
    {
        $this->subject($this->model->subject ?: 'MyTime2Cloud - Attendance Report');

        $companyId = $this->model->company_id;
        $branchId = $this->model->branch_id;

        // Pick date range based on notification frequency
        $freq = strtolower($this->model->frequency ?? 'daily');
        if ($freq === 'weekly') {
            $fromDate = date('Y-m-d', strtotime('-7 days'));
            $toDate   = date('Y-m-d', strtotime('-1 day'));
        } elseif ($freq === 'monthly') {
            // Range = 1st of the month containing the rule's Date → that Date itself.
            // The rule's `date` field is the day-of-month it fires on (1..31). We use
            // the SAME month: when the rule fires today, we report from day 1 up to
            // today's day. So setting Date=27 produces a 1–27 report, Date=30 → 1–30.
            // If the rule's date is past the current month's last day (e.g. Date=31
            // in February), cap at last day to avoid invalid dates.
            $endDay   = (int) ($this->model->date ?? date('j'));
            if ($endDay < 1)  $endDay = 1;
            $lastDom  = (int) date('t');
            if ($endDay > $lastDom) $endDay = $lastDom;
            $fromDate = date('Y-m-01');
            $toDate   = date('Y-m-') . sprintf('%02d', $endDay);
        } else {
            $fromDate = $toDate = date('Y-m-d', strtotime('-1 day'));
        }
        $date = $toDate;
        $dateDisplay = ($fromDate === $toDate)
            ? date('D, F j, Y', strtotime($fromDate))
            : date('M j', strtotime($fromDate)) . ' – ' . date('M j, Y', strtotime($toDate));

        $companyName = optional($this->model->company)->name ?? 'N/A';

        // Mirror the manual "Regenerate" button on the report page: rebuild attendance
        // rows from raw punches BEFORE we compute stats / generate the PDF. Calls
        // RenderController::renderLogs once per shift_type_id group (passing 0 cascades
        // through every shift controller and wipes data, so we group properly here).
        $this->preRegenerateAttendance($companyId, $branchId, $fromDate, $toDate);

        // Counts for the email's at-a-glance stats row. Pulled from the same date range
        // the PDF covers, scoped to the rule's company + branch.
        $stats = $this->countStatuses($companyId, $branchId, $fromDate, $toDate);

        // For Daily-frequency notifications, regenerate the Puppeteer daily PDF inline
        // at send time. The 05:00 batch can go stale if attendance logs land late or a
        // user hits "regenerate" after 05:00 — sending the cached file would ship wrong
        // statuses (missing/absent for employees whose punches arrived later).
        if ($freq === 'daily') {
            $dailyRelative = "public/pdf/{$fromDate}/{$companyId}/daily_report_{$branchId}.pdf";
            $dailyAbsolute = storage_path("app/" . $dailyRelative);

            \Log::info("Regenerating Daily PDF at send time for company={$companyId} branch={$branchId} date={$fromDate}");
            try {
                (new GenerateDailyReportPDF($companyId, (int) $branchId, $fromDate))->handle();
            } catch (\Throwable $e) {
                \Log::warning("Inline Daily PDF generation failed: " . $e->getMessage());
            }

            if (file_exists($dailyAbsolute)) {
                $attachmentName = "Daily_Attendance_Report_{$date}.pdf";
                $this->attach($dailyAbsolute, [
                    'as'   => $attachmentName,
                    'mime' => 'application/pdf',
                ]);
                return $this->view('emails.attendance-report')->with([
                    'reportTypeLabel' => 'Daily Attendance Report',
                    'managerName'     => optional($this->manager)->name ?? 'Manager',
                    'companyName'     => $companyName,
                    'periodLabel'     => 'Date',
                    'periodValue'     => $dateDisplay,
                    'customMessage'   => $this->model->email_body ?? '',
                    'defaultMessage'  => 'Please find the attached Daily Attendance Report.',
                    'attachmentNames' => [$attachmentName],
                    'stats'           => $stats,
                ]);
            }
            \Log::warning("Daily PDF still missing after inline generation at $dailyAbsolute — falling back to Format B");
        }

        // For Weekly / Monthly — regenerate the Format C PDFs inline at send time.
        // Same staleness reasoning as the Daily branch above: the 05:00 batch can be
        // out of date by the time the rule fires.
        if ($freq === 'weekly' || $freq === 'monthly') {
            // Maps shift type label → DB shift_type_id used by the Format C job to scope
            // employees. Must mirror GeneralDailyReport's $shiftTypeIdMap.
            $shiftTypeIdMap = ['General' => null, 'Multi' => 2, 'Split' => 5];
            $attachmentNames = [];

            foreach ($this->files as $shiftLabel) {
                // Skip the sentinel 'daily' label if it leaked through
                if ($shiftLabel === 'daily') continue;

                $relative = "public/pdf/{$toDate}/{$companyId}/summary_report_{$branchId}_{$shiftLabel}.pdf";
                $absolute = storage_path("app/" . $relative);

                \Log::info("Regenerating Format C PDF at send time for company={$companyId} branch={$branchId} shift={$shiftLabel} range={$fromDate}..{$toDate}");
                try {
                    $shiftTypeId = $shiftTypeIdMap[$shiftLabel] ?? null;
                    (new GenerateFormatCReportPDF(
                        $companyId,
                        (int) $branchId,
                        $fromDate,
                        $toDate,
                        $shiftLabel,
                        $shiftTypeId,
                        $companyName
                    ))->handle();
                } catch (\Throwable $e) {
                    \Log::warning("Inline Format C generation failed: " . $e->getMessage());
                }

                if (file_exists($absolute)) {
                    $attachmentName = ucfirst($freq) . "_Attendance_Report_{$shiftLabel}_{$date}.pdf";
                    $this->attach($absolute, [
                        'as'   => $attachmentName,
                        'mime' => 'application/pdf',
                    ]);
                    $attachmentNames[] = $attachmentName;
                }
            }

            if (!empty($attachmentNames)) {
                return $this->view('emails.attendance-report')->with([
                    'reportTypeLabel' => ucfirst($freq) . ' Attendance Report',
                    'managerName'     => optional($this->manager)->name ?? 'Manager',
                    'companyName'     => $companyName,
                    'periodLabel'     => 'Period',
                    'periodValue'     => $dateDisplay,
                    'customMessage'   => $this->model->email_body ?? '',
                    'defaultMessage'  => 'Please find the attached ' . ucfirst($freq) . ' Attendance Report.',
                    'attachmentNames' => $attachmentNames,
                    'stats'           => $stats,
                ]);
            }
            \Log::warning("Format C PDFs still missing after inline generation for company=$companyId branch=$branchId freq=$freq — falling back to Format B");
        }

        // Fallback: generate Format B (monthly detail) PDF inline if nothing else worked
        $fallbackAttachmentName = "Attendance_Report_{$date}.pdf";
        $fallbackAttachmentNames = [];
        try {
            $req = Request::create('/api/report/monthly_detail_pdf', 'GET', [
                'company_id'    => $companyId,
                'from_date'     => $fromDate,
                'to_date'       => $toDate,
                'branch_ids'    => $branchId ? (string) $branchId : null,
                'shift_type_id' => $this->model->shift_type_id ?? null,
            ]);
            $response = (new AttendanceReportController())->monthlyDetailPDF($req);
            $pdfContent = $response->getContent();
            $pdfPath = storage_path("app/report_b_{$companyId}_{$branchId}_{$date}.pdf");
            file_put_contents($pdfPath, $pdfContent);
            $this->attach($pdfPath, [
                'as' => $fallbackAttachmentName,
                'mime' => 'application/pdf',
            ]);
            $fallbackAttachmentNames[] = $fallbackAttachmentName;
        } catch (\Exception $e) {
            \Log::warning("Format B PDF failed, falling back: " . $e->getMessage());
            // Fallback: simple HTML PDF
            try {
                $employees = Employee::where('company_id', $companyId)
                    ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                    ->with('branch:id,branch_name', 'department:id,name')
                    ->get(['id', 'first_name', 'last_name', 'employee_id', 'system_user_id', 'branch_id', 'department_id']);
                $branchName = $employees->first()?->branch?->branch_name ?? 'All Branches';
                $html = $this->generateReportHtml($employees, $companyId, $branchName, $dateDisplay);
                $pdf = Pdf::loadHTML($html)->setPaper('a4', 'landscape');
                $pdfPath = storage_path("app/attendance_report_{$companyId}_{$date}.pdf");
                $pdf->save($pdfPath);
                $this->attach($pdfPath, ['as' => $fallbackAttachmentName, 'mime' => 'application/pdf']);
                $fallbackAttachmentNames[] = $fallbackAttachmentName;
            } catch (\Exception $e2) {
                \Log::warning("Fallback PDF also failed: " . $e2->getMessage());
            }
        }

        return $this->view('emails.attendance-report')->with([
            'reportTypeLabel' => 'Attendance Report',
            'managerName'     => optional($this->manager)->name ?? 'Manager',
            'companyName'     => optional($this->model->company)->name ?? 'N/A',
            'periodLabel'     => 'Date',
            'periodValue'     => $dateDisplay,
            'customMessage'   => $this->model->email_body ?? '',
            'defaultMessage'  => 'Please find the attached Attendance Report.',
            'attachmentNames' => $fallbackAttachmentNames,
            'stats'           => $stats,
        ]);
    }

    /**
     * Regenerate attendance rows from raw punches before the PDF/email is built. This
     * mirrors the manual "Regenerate" button on the report page (RenderController::
     * renderLogs), but groups employees by their schedule's shift_type_id so each call
     * runs only the matching shift controller — passing shift_type_id=0 makes renderLogs
     * cascade through every controller (Auto → FILO → Single → Night) and the last one
     * to run wipes the previous one's output for employees on different shift types.
     *
     * Wrapped in try/catch so a regen failure never aborts the email send; we just log
     * and let the email go out with whatever data was already in the attendances table.
     */
    private function preRegenerateAttendance($companyId, $branchId, $fromDate, $toDate): void
    {
        try {
            // Bail out if the date range is wider than 8 days. The per-shift-type grouping
            // here uses each employee's CURRENT schedule, but for older date ranges (e.g.
            // Monthly covering all of last month) employees may have been on a different
            // shift then — running the "wrong" shift controller wipes the existing rows
            // instead of populating them. Auto-regenerate already handles the rolling
            // recent window correctly, so we only re-run regeneration for short ranges.
            $rangeDays = (strtotime($toDate) - strtotime($fromDate)) / 86400 + 1;
            if ($rangeDays > 8) {
                \Log::info("preRegenerateAttendance: skipping (range={$rangeDays} days > 8); trusting auto-regenerate / existing rows");
                return;
            }

            // Join active branch employees with their schedule to get shift_type_id.
            // schedule_employees.employee_id stores employees.system_user_id (verified
            // against actual prod data — same pattern used by processAttendanceModel).
            $rows = DB::table('employees as e')
                ->join('schedule_employees as se', function ($join) {
                    $join->on('se.employee_id', '=', 'e.system_user_id')
                         ->on('se.company_id', '=', 'e.company_id');
                })
                ->where('e.company_id', $companyId)
                ->when($branchId, fn($q) => $q->where('e.branch_id', $branchId))
                ->where('e.status', 1)
                ->whereNotNull('se.shift_type_id')
                ->select('e.system_user_id', 'se.shift_type_id')
                ->get();

            if ($rows->isEmpty()) {
                \Log::info("preRegenerateAttendance: no scheduled employees for company={$companyId} branch={$branchId} — skipping");
                return;
            }

            // Group by shift_type_id → list of employee system_user_ids.
            $groups = $rows->groupBy('shift_type_id')
                ->map(fn($g) => $g->pluck('system_user_id')->filter()->values()->all())
                ->all();

            foreach ($groups as $shiftTypeId => $empIds) {
                if (empty($empIds)) continue;

                \Log::info("preRegenerateAttendance: company={$companyId} branch={$branchId} shift_type_id={$shiftTypeId} range={$fromDate}..{$toDate} employees=" . count($empIds));

                $req = Request::create('/api/render_logs', 'GET', [
                    'company_id'    => $companyId,
                    'dates'         => [$fromDate, $toDate],
                    'employee_ids'  => $empIds,
                    'shift_type_id' => (int) $shiftTypeId,
                    'reason'        => 'automation_pre_send',
                ]);

                try {
                    (new RenderController)->renderLogs($req);
                } catch (\Throwable $inner) {
                    \Log::warning("preRegenerateAttendance: shift_type_id={$shiftTypeId} group failed: " . $inner->getMessage());
                }
            }
        } catch (\Throwable $e) {
            \Log::warning("preRegenerateAttendance failed (email will still send with current data): " . $e->getMessage());
        }
    }

    /**
     * Count attendance statuses for the report's date range, scoped to company + branch.
     * Returns ['present' => N, 'absent' => N, 'weekoff' => N, 'missing' => N].
     * Status codes: P=Present, A=Absent, O=Weekoff, M=Missing (plus LC/EG which count as Present).
     */
    private function countStatuses($companyId, $branchId, $fromDate, $toDate): array
    {
        try {
            // Restrict the count to attendance rows belonging to the branch's currently
            // active employees, joined by system_user_id (the FK Attendance::employee uses).
            // Without this scope the count silently picks up ghost/legacy rows written
            // under deactivated employees or under badge IDs, inflating the totals shown
            // in the email stats and making them disagree with the PDF.
            $employeeSysIds = Employee::where('company_id', $companyId)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->where('status', 1)
                ->pluck('system_user_id')
                ->filter()
                ->values()
                ->all();

            if (empty($employeeSysIds)) {
                return ['present' => 0, 'absent' => 0, 'weekoff' => 0, 'missing' => 0];
            }

            $rows = Attendance::query()
                ->where('company_id', $companyId)
                ->whereIn('employee_id', $employeeSysIds)
                ->whereBetween('date', [$fromDate, $toDate])
                ->select('status', DB::raw('COUNT(*) AS c'))
                ->groupBy('status')
                ->pluck('c', 'status')
                ->toArray();
        } catch (\Throwable $e) {
            \Log::warning("countStatuses failed: " . $e->getMessage());
            $rows = [];
        }

        $present = (int) ($rows['P'] ?? 0) + (int) ($rows['LC'] ?? 0) + (int) ($rows['EG'] ?? 0);
        $absent  = (int) ($rows['A'] ?? 0);
        $weekoff = (int) ($rows['O'] ?? 0);
        $missing = (int) ($rows['M'] ?? 0);

        return compact('present', 'absent', 'weekoff', 'missing');
    }

    private function generateReportHtml($employees, $companyId, $branchName, $dateDisplay)
    {
        $html = '<!DOCTYPE html><html><head><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;color:#333}
        .header{background:#1a5276;color:#fff;padding:25px 30px;text-align:center}
        .header h1{font-size:20px;font-weight:800;margin-bottom:4px}
        .header p{font-size:11px;opacity:0.85}
        .content{padding:20px 30px}
        table{width:100%;border-collapse:collapse;font-size:10px;margin-top:15px}
        th{background:#1a5276;color:#fff;padding:8px 6px;text-align:left;font-size:9px;text-transform:uppercase}
        td{padding:7px 6px;border-bottom:1px solid #eee}
        tr:nth-child(even){background:#f8f9fa}
        .status-p{color:#27ae60;font-weight:700}.status-a{color:#e74c3c;font-weight:700}.status-o{color:#f39c12;font-weight:700}
        .footer{text-align:center;padding:15px;font-size:9px;color:#999;border-top:1px solid #eee;margin-top:20px}
        </style></head><body>';

        $html .= '<div class="header"><h1>MyTime2Cloud - Attendance Report</h1>';
        $html .= '<p>Branch: ' . $branchName . ' | ' . $dateDisplay . '</p></div>';
        $html .= '<div class="content">';

        $present = 0;
        $absent = 0;
        $rows = '';

        foreach ($employees as $emp) {
            $att = Attendance::where('employee_id', $emp->system_user_id)
                ->where('company_id', $companyId)
                ->orderBy('id', 'desc')->first();

            $status = $att->status ?? 'A';
            $in = $att->in ?? '---';
            $out = $att->out ?? '---';
            $totalHrs = $att->total_hrs ?? '---';
            $late = $att->late_coming ?? '---';

            if (in_array($status, ['P', 'LC', 'EG'])) $present++;
            else $absent++;

            $statusClass = in_array($status, ['P', 'LC', 'EG']) ? 'status-p' : ($status == 'A' ? 'status-a' : 'status-o');

            $rows .= '<tr>';
            $rows .= '<td>' . $emp->first_name . ' ' . $emp->last_name . '</td>';
            $rows .= '<td>' . $emp->employee_id . '</td>';
            $rows .= '<td>' . ($emp->department->name ?? '---') . '</td>';
            $rows .= '<td>' . $in . '</td>';
            $rows .= '<td>' . $out . '</td>';
            $rows .= '<td>' . $late . '</td>';
            $rows .= '<td>' . $totalHrs . '</td>';
            $rows .= '<td class="' . $statusClass . '">' . $status . '</td>';
            $rows .= '</tr>';
        }

        $total = $employees->count();
        $html .= '<table style="width:100%;margin:15px 0"><tr>';
        $html .= '<td style="background:#f0f3f5;border-radius:6px;padding:10px;text-align:center;width:30%"><b style="font-size:20px;color:#1a5276">' . $total . '</b><br><span style="font-size:9px;color:#666">TOTAL</span></td>';
        $html .= '<td style="width:5%"></td>';
        $html .= '<td style="background:#e8f8f5;border-radius:6px;padding:10px;text-align:center;width:30%"><b style="font-size:20px;color:#27ae60">' . $present . '</b><br><span style="font-size:9px;color:#666">PRESENT</span></td>';
        $html .= '<td style="width:5%"></td>';
        $html .= '<td style="background:#fef2f2;border-radius:6px;padding:10px;text-align:center;width:30%"><b style="font-size:20px;color:#e74c3c">' . $absent . '</b><br><span style="font-size:9px;color:#666">ABSENT</span></td>';
        $html .= '</tr></table>';

        $html .= '<table><thead><tr><th>Employee</th><th>ID</th><th>Dept</th><th>In</th><th>Out</th><th>Late</th><th>Total Hrs</th><th>Status</th></tr></thead>';
        $html .= '<tbody>' . $rows . '</tbody></table>';
        $html .= '<div class="footer">System-generated report from MyTime2Cloud</div>';
        $html .= '</div></body></html>';

        return $html;
    }
}
