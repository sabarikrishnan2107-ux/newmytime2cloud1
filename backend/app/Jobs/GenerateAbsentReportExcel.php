<?php

namespace App\Jobs;

use App\Exports\AbsentReportExport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Maatwebsite\Excel\Facades\Excel;

class GenerateAbsentReportExcel implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $relative = "xlsx/{$this->date}/{$this->companyId}/absent_report_{$this->branchId}.xlsx";
        Excel::store(
            new AbsentReportExport($this->companyId, $this->branchId, $this->date),
            $relative,
            'public'
        );
    }
}
