<?php

namespace App\Jobs;

use App\Http\Controllers\AutomationConnectionTestController;
use App\Models\ReportNotification;
use App\Models\ReportNotificationLogs;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class DeliverReportViaApiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function __construct(
        public int $notificationId,
        public string $fileSlug,
        public string $date,
        public string $format,
    ) {}

    public function handle(): void
    {
        $rule = ReportNotification::find($this->notificationId);
        if (!$rule || !$rule->api_config) {
            $this->logAttempt($rule?->id, 'missing_config', 'rule or api_config missing');
            return;
        }

        $ext = $this->format === 'Excel' ? 'xlsx' : 'pdf';
        $dir = $this->format === 'Excel' ? 'xlsx' : 'pdf';
        $relative = "{$dir}/{$this->date}/{$rule->company_id}/{$this->fileSlug}_report_{$rule->branch_id}.{$ext}";
        $absolute = storage_path("app/public/{$relative}");

        if (!file_exists($absolute)) {
            $this->logAttempt($rule->id, 'file_not_ready', $relative);
            return;
        }

        try {
            $headers = AutomationConnectionTestController::buildAuthHeaders($rule->api_config);

            $resp = Http::withHeaders($headers)
                ->timeout(30)
                ->attach('file', fopen($absolute, 'r'), basename($absolute))
                ->post($rule->api_config['endpoint'], [
                    ['name' => 'branch_id',   'contents' => (string) $rule->branch_id],
                    ['name' => 'date',        'contents' => $this->date],
                    ['name' => 'report_type', 'contents' => $this->fileSlug],
                    ['name' => 'company_id',  'contents' => (string) $rule->company_id],
                    ['name' => 'format',      'contents' => $this->format],
                ]);

            $status = $resp->successful() ? 'success' : 'failed';
            $this->logAttempt($rule->id, $status, "HTTP {$resp->status()}: " . substr($resp->body(), 0, 512));

            if (!$resp->successful()) {
                throw new \RuntimeException("API HTTP {$resp->status()}");
            }
        } catch (\Throwable $e) {
            $this->logAttempt($rule->id, 'failed', substr($e->getMessage(), 0, 500));
            throw $e;
        }
    }

    private function logAttempt(?int $id, string $status, string $detail): void
    {
        if (!$id) {
            return;
        }
        ReportNotificationLogs::create([
            'notification_id' => $id,
            'medium' => 'API',
            'status' => $status,
            'attempt' => $this->attempts(),
            'response_summary' => $detail,
        ]);
    }
}
