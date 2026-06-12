<?php

namespace App\Jobs;

use App\Services\AbsentReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Request;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateAbsentReportPDF implements ShouldQueue
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
        $request = new Request([
            'mode' => 'daily',
            'company_id' => $this->companyId,
            'branch_ids' => $this->branchId ? [$this->branchId] : [],
            'from_date' => $this->date,
            'to_date' => $this->date,
        ]);

        $payload = app(AbsentReportService::class)->buildDailyPayload($request);

        $pdf = Pdf::loadView('reports.absent_daily', array_merge($payload, [
            'date' => $this->date,
        ]))->setPaper('a4', 'landscape');

        $dir = storage_path("app/public/pdf/{$this->date}/{$this->companyId}");
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $target = "{$dir}/absent_report_{$this->branchId}.pdf";
        $pdf->save($target);
    }
}
