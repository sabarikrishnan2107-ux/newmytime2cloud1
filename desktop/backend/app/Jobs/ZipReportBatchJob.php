<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use ZipArchive;

class ZipReportBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $batchId,
        public readonly int    $companyId,
        public readonly int    $year,
        public readonly int    $month,
    ) {}

    public function handle(): void
    {
        $dir     = storage_path("app/reports/{$this->companyId}/{$this->year}-{$this->month}");
        $zipPath = "{$dir}/attendance_report_{$this->year}_{$this->month}.zip";

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach (glob("{$dir}/*.pdf") as $pdfFile) {
            $zip->addFile($pdfFile, basename($pdfFile));
        }

        $zip->close();

        Cache::put("report_batch_{$this->batchId}_zip_path", $zipPath, now()->addHours(24));
        Cache::put("report_batch_{$this->batchId}_ready",    true,     now()->addHours(24));
    }

    public function failed(\Throwable $e): void
    {
        Cache::increment("report_batch_{$this->batchId}_failed");
    }
}
