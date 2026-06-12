<?php

namespace App\Jobs;

use App\Exports\DocumentExpiryReportExport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Maatwebsite\Excel\Facades\Excel;

class GenerateDocumentExpiryReportExcel implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
        public int $daysThreshold = 30,
    ) {}

    public function handle(): void
    {
        $relative = "xlsx/{$this->date}/{$this->companyId}/document_expiry_report_{$this->branchId}.xlsx";
        Excel::store(
            new DocumentExpiryReportExport($this->companyId, $this->branchId, $this->date, $this->daysThreshold),
            $relative,
            'public'
        );
    }
}
