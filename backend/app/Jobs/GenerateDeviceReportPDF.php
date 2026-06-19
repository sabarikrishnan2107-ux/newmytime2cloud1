<?php

namespace App\Jobs;

use App\Services\DeviceReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateDeviceReportPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $rows = app(DeviceReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date);

        $pdf = Pdf::loadView('reports.device_daily', [
            'rows' => $rows,
            'company_id' => $this->companyId,
            'branch_id' => $this->branchId,
            'date' => $this->date,
        ])->setPaper('a4', 'landscape');

        $dir = storage_path("app/public/pdf/{$this->date}/{$this->companyId}");
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $target = "{$dir}/device_report_{$this->branchId}.pdf";
        $pdf->save($target);
    }
}
