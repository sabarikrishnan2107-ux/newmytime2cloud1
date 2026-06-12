<?php

namespace App\Jobs;

use App\Models\Company;
use App\Services\Attendance\AttendanceReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

class GenerateMonthlyAttendancePDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $batchId,
        public readonly int    $companyId,
        public readonly int    $year,
        public readonly int    $month,
        public readonly array  $employeeIds,
    ) {}

    public function handle(AttendanceReportService $reportService): void
    {
        ini_set('memory_limit', '512M');

        $from    = sprintf('%04d-%02d-01', $this->year, $this->month);
        $to      = date('Y-m-t', strtotime($from));
        $company = Company::find($this->companyId);

        $allData = $reportService->buildEmployeeRecords(
            $this->employeeIds,
            $from,
            $to
        );

        $dir = storage_path("app/reports/{$this->companyId}/{$this->year}-{$this->month}");

        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        foreach ($this->employeeIds as $employeeId) {
            $employeeData = $allData[$employeeId] ?? null;

            if (! $employeeData || empty($employeeData['records'])) {
                continue;
            }

            $employee   = $employeeData['employee'];
            $dayRecords = $employeeData['records'];
            $summary    = $reportService->buildSummary($dayRecords);

            $pdf = Pdf::loadView('pdf.attendance_reports.unified-attendance-report', [
                'company'  => $company,
                'employee' => $employee,
                'records'  => $dayRecords,
                'summary'  => $summary,
                'year'     => $this->year,
                'month'    => $this->month,
            ])->setPaper('a4', 'landscape');

            file_put_contents(
                "{$dir}/Attendance_{$employeeId}.pdf",
                $pdf->output()
            );
        }

        $done  = Cache::increment("report_batch_{$this->batchId}_done");
        $total = Cache::get("report_batch_{$this->batchId}_total");

        if ((int) $done === (int) $total) {
            ZipReportBatchJob::dispatch($this->batchId, $this->companyId, $this->year, $this->month);
        }
    }

    public function failed(\Throwable $e): void
    {
        Cache::increment("report_batch_{$this->batchId}_failed");
    }
}
