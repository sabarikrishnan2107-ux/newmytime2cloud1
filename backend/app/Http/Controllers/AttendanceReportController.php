<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateMonthlyAttendancePDF;
use App\Models\Company;
use App\Services\Attendance\AttendanceReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AttendanceReportController extends Controller
{
    public function __construct(
        private AttendanceReportService $reportService
    ) {}

    /**
     * POST /reports/monthly-pdf
     *
     * Dispatch batch jobs for a set of employees.
     * Returns { batch_id, total_jobs }
     */
    public function monthlyPdf(Request $request): JsonResponse
    {
        $request->validate([
            'company_id'   => 'required|integer',
            'employee_ids' => 'required|array|min:1',
            'year'         => 'required|integer',
            'month'        => 'required|integer|min:1|max:12',
        ]);

        $companyId   = (int) $request->company_id;
        $employeeIds = $request->employee_ids;
        $year        = (int) $request->year;
        $month       = (int) $request->month;

        $chunks  = array_chunk($employeeIds, 10);
        $batchId = (string) Str::uuid();
        $total   = count($chunks);

        Cache::put("report_batch_{$batchId}_total",  $total, now()->addHours(2));
        Cache::put("report_batch_{$batchId}_done",   0,      now()->addHours(2));
        Cache::put("report_batch_{$batchId}_failed", 0,      now()->addHours(2));

        foreach ($chunks as $chunk) {
            GenerateMonthlyAttendancePDF::dispatch($batchId, $companyId, $year, $month, $chunk);
        }

        return response()->json([
            'batch_id'   => $batchId,
            'total_jobs' => $total,
        ]);
    }

    /**
     * GET /reports/monthly-pdf/status/{batchId}
     *
     * Returns { done, total, failed, ready, download_url }
     */
    public function status(string $batchId): JsonResponse
    {
        $total  = (int) Cache::get("report_batch_{$batchId}_total",  0);
        $done   = (int) Cache::get("report_batch_{$batchId}_done",   0);
        $failed = (int) Cache::get("report_batch_{$batchId}_failed", 0);
        $ready  = (bool) Cache::get("report_batch_{$batchId}_ready", false);

        $downloadUrl = null;

        if ($ready) {
            $zipPath = Cache::get("report_batch_{$batchId}_zip_path");
            if ($zipPath && file_exists($zipPath)) {
                $downloadUrl = route('reports.monthly-pdf.download', ['batchId' => $batchId]);
            }
        }

        return response()->json(compact('done', 'total', 'failed', 'ready', 'downloadUrl'));
    }

    /**
     * GET /reports/monthly-pdf/download/{batchId}
     *
     * Stream the ZIP file to the client.
     */
    public function download(string $batchId)
    {
        $zipPath = Cache::get("report_batch_{$batchId}_zip_path");

        abort_if(! $zipPath || ! file_exists($zipPath), 404, 'Report not ready or expired.');

        return response()->download($zipPath);
    }

    /**
     * GET /reports/daily-pdf
     *
     * Daily attendance report for all employees on a specific date.
     * Query params: company_id, date (Y-m-d), department_id (optional), status (optional)
     */
    public function dailyPdf(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer',
            'date'       => 'required|date_format:Y-m-d',
        ]);

        $companyId    = (int) $request->company_id;
        $date         = $request->date;
        $departmentId = $request->department_id ? (int) $request->department_id : null;
        $status       = $request->status ?? null;

        $company = Company::find($companyId);
        $rows    = $this->reportService->buildDailyReport($companyId, $date, $departmentId, $status);

        $statuses = array_column(array_column($rows, 'record'), 'status');

        $summary = [
            'total_employees' => count($rows),
            'total_present'   => count(array_filter($statuses, fn($s) => in_array($s, ['P', 'LC', 'EG']))),
            'total_absent'    => count(array_filter($statuses, fn($s) => $s === 'A')),
            'total_off'       => count(array_filter($statuses, fn($s) => $s === 'O')),
            'total_missing'   => count(array_filter($statuses, fn($s) => $s === 'M')),
            'total_leave'     => count(array_filter($statuses, fn($s) => $s === 'L')),
            'total_holiday'   => count(array_filter($statuses, fn($s) => $s === 'H')),
        ];

        $pdf = Pdf::loadView('pdf.attendance_reports.unified-daily-attendance-report', [
            'company'  => $company,
            'rows'     => $rows,
            'summary'  => $summary,
            'date'     => $date,
        ])->setPaper('a4', 'landscape');

        $fileName = 'Daily_Attendance_' . $date . '.pdf';

        return $request->boolean('download')
            ? $pdf->download($fileName)
            : $pdf->stream($fileName);
    }

    /**
     * GET /reports/monthly-pdf/{employeeId}/{year}/{month}
     *
     * Synchronous single-employee PDF stream.
     */
    public function singleEmployee(int $employeeId, int $year, int $month)
    {
        $from = sprintf('%04d-%02d-01', $year, $month);
        $to   = date('Y-m-t', strtotime($from));

        $allData = $this->reportService->buildEmployeeRecords([$employeeId], $from, $to);

        $employeeData = $allData[$employeeId] ?? null;

        abort_if(! $employeeData, 404, 'No attendance records found for this employee.');

        $employee   = $employeeData['employee'];
        $dayRecords = $employeeData['records'];
        $summary    = $this->reportService->buildSummary($dayRecords);
        $company    = Company::find($employee->company_id ?? request()->query('company_id'));

        $pdf = Pdf::loadView('pdf.attendance_reports.unified-attendance-report', [
            'company'  => $company,
            'employee' => $employee,
            'records'  => $dayRecords,
            'summary'  => $summary,
            'year'     => $year,
            'month'    => $month,
        ])->setPaper('a4', 'landscape');

        return $pdf->stream("attendance_{$employeeId}_{$year}_{$month}.pdf");
    }
}
