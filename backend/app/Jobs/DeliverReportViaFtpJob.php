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

class DeliverReportViaFtpJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function __construct(
        public int $notificationId,
        public string $fileSlug,    // "daily" | "absent" | "access_control" | "device" | "document_expiry"
        public string $date,        // "YYYY-MM-DD"
        public string $format,      // "PDF" | "Excel"
    ) {}

    public function handle(): void
    {
        $rule = ReportNotification::find($this->notificationId);
        if (!$rule || !$rule->ftp_config) {
            $this->logAttempt($rule?->id, 'missing_config', 'rule or ftp_config missing');
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
            $remoteName = "{$this->fileSlug}_report_{$rule->branch_id}_{$this->date}.{$ext}";
            $remotePath = AutomationConnectionTestController::upload(
                $rule->ftp_config,
                $absolute,
                $remoteName
            );
            $this->logAttempt($rule->id, 'success', "uploaded {$remotePath}");
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
            'medium' => 'FTP',
            'status' => $status,
            'attempt' => $this->attempts(),
            'response_summary' => $detail,
        ]);
    }
}
