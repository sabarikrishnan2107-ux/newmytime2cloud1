<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Generates the new "Daily Attendance Report" PDF for a single
 * (company_id, branch_id, date) tuple by calling the Puppeteer
 * microservice (the same one used by the manual "Daily" download).
 *
 * Output is saved to:
 *   storage/app/public/pdf/<date>/<company_id>/daily_report_<branchId>.pdf
 *
 * The companion notification cron (ReportNotificationCrons) reads
 * from this same path when frequency === 'Daily'.
 */
class GenerateDailyReportPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int  $companyId;
    public int  $branchId;
    public string $date;       // YYYY-MM-DD

    public function __construct(int $companyId, int $branchId, string $date)
    {
        $this->companyId = $companyId;
        $this->branchId  = $branchId;
        $this->date      = $date;
    }

    public function handle(): void
    {
        $pdfService  = env('PDF_SERVICE_URL', 'http://localhost:3002');
        $summaryBase = env('SUMMARY_REPORT_URL', $pdfService);
        // Puppeteer needs a PUBLICLY reachable api_base (it's Chromium running on the server,
        // but the URL passed in fetch() must be resolvable from that Chromium process).
        // Prefer a dedicated env var; fall back to APP_URL+/api.
        $apiBase = env('DAILY_REPORT_API_BASE')
            ?: rtrim(env('APP_URL', config('app.url')), '/') . '/api';

        $params = http_build_query([
            'company_id' => $this->companyId,
            'branch_ids' => $this->branchId,
            'from_date'  => $this->date,
            'to_date'    => $this->date,
            'api_base'   => $apiBase,
        ]);

        $templateUrl = rtrim($summaryBase, '/') . '/daily-report/?' . $params;

        echo "\n[GenerateDailyReportPDF] Calling Puppeteer for company={$this->companyId} branch={$this->branchId} date={$this->date}\n";
        echo "URL: $templateUrl\n";

        $response = Http::timeout(180)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post(rtrim($pdfService, '/') . '/pdf', [
                'url'       => $templateUrl,
                'landscape' => true,
            ]);

        if (!$response->successful()) {
            echo "[GenerateDailyReportPDF] FAILED: " . $response->status() . " - " . $response->body() . "\n";
            return;
        }

        $pdfBinary    = $response->body();
        $relativePath = "public/pdf/{$this->date}/{$this->companyId}/daily_report_{$this->branchId}.pdf";
        Storage::put($relativePath, $pdfBinary);

        echo "[GenerateDailyReportPDF] Saved " . strlen($pdfBinary) . " bytes to $relativePath\n";
    }
}
