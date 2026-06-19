<?php

namespace App\Jobs;

use App\Exports\AttendanceExportGeneral;
use App\Models\Attendance;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Request;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Daily attendance Excel for a single (company, branch, date). Mirrors the
 * existing PDF daily report path so the delivery jobs can find it.
 *
 * Output: storage/app/public/xlsx/<date>/<company_id>/daily_report_<branchId>.xlsx
 */
class GenerateAttendanceReportExcel implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $request = new Request([
            'company_id' => $this->companyId,
            'branch_id' => $this->branchId,
            'from_date' => $this->date,
            'to_date' => $this->date,
            'shift_type_id' => 0,
        ]);

        $model = (new Attendance)->processAttendanceModel($request);

        $relative = "xlsx/{$this->date}/{$this->companyId}/daily_report_{$this->branchId}.xlsx";
        Excel::store(new AttendanceExportGeneral($model), $relative, 'public');
    }
}
