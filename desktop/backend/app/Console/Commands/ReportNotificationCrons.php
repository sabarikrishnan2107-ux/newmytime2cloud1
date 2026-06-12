<?php

namespace App\Console\Commands;

use App\Http\Controllers\WhatsappController;
use App\Jobs\SendWhatsappMessageJob;
use App\Mail\ReportNotificationMail;
use App\Models\report_notification_logs;
use App\Models\ReportNotification;
use App\Models\ReportNotificationLogs;
use App\Models\Shift;
use App\Models\WhatsappClient;
use Illuminate\Support\Facades\Mail;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;


class ReportNotificationCrons extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:report_notification_crons {company_id} {notification_id?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Report Notification Crons';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $company_id = $this->argument("company_id");
        $notification_id = $this->argument("notification_id");


        $script_name = "ReportNotificationCrons";

        $date = date("Y-m-d H:i:s");
        $yesterday = date("Y-m-d", strtotime("-1 day"));

        $accounts = WhatsappClient::where("company_id", $company_id)->value("accounts");

        $shift_types = Shift::getShiftTypesByCompany($company_id);

        $files = $shift_types;

        if (is_null($shift_types)) {
            $this->error("No shift found for task:generate_daily_report command");
            return;
        }

        $typeToSlug = [
            'attendance' => 'daily',
            'absent' => 'absent',
            'access_control' => 'access_control',
            'device' => 'device',
            'document_expiry' => 'document_expiry',
        ];

        try {

            // Email and Whatsapp deliveries are attendance-shaped (the mail template
            // and Whatsapp file paths target daily_report_*.pdf). Keep them scoped
            // to attendance rules only — non-attendance types are handled below by
            // the rule-level FTP/API dispatcher and by their own alert commands.
            $modelsQuery = ReportNotification::where("type", "attendance")
                ->with(["managers", "company.company_mail_content"])
                ->with("managers", function ($query) use ($company_id) {
                    $query->where("company_id", $company_id);
                })->where("company_id", $company_id);

            // When the scheduler passes a specific notification_id, only process that one
            // rule. Each rule is now scheduled independently in Kernel::schedule(), so the
            // handler must scope to its caller — otherwise every cron run would re-send
            // every rule that matches today's day filter, regardless of time.
            if ($notification_id) {
                $modelsQuery->where("id", $notification_id);
            }

            $models = $modelsQuery->get();

            foreach ($models as $model) {

                // Frequency-aware scheduling filter.
                // Scheduler (Kernel) runs this command every day at $model->time, so each
                // notification must self-filter based on its configured frequency.
                $frequency = strtolower(trim($model->frequency ?? 'daily'));
                $shouldSend = false;
                $skipReason = '';

                if ($frequency === 'weekly') {
                    // $model->day stores the day name (e.g. "Monday"). Fire only when today matches.
                    $configuredDay = trim((string) ($model->day ?? ''));
                    $todayName = date('l'); // "Monday" .. "Sunday"
                    $shouldSend = $configuredDay !== '' && strcasecmp($configuredDay, $todayName) === 0;
                    $skipReason = "weekly: today={$todayName}, configured={$configuredDay}";
                } elseif ($frequency === 'monthly') {
                    // $model->date stores day-of-month (1..31). Fire only on that day.
                    $configuredDate = (int) ($model->date ?? 0);
                    $todayDom = (int) date('j');
                    $shouldSend = $configuredDate > 0 && $configuredDate === $todayDom;
                    $skipReason = "monthly: today={$todayDom}, configured={$configuredDate}";
                } else {
                    // Daily (default): respect $model->days array if provided, else fire every day.
                    // Frontend stores weekdays as "0".."6" with Sunday=0, so normalize to match both
                    // ISO-8601 (1..7, Sunday=7) and JS convention (0..6, Sunday=0).
                    $days = is_array($model->days) ? $model->days : (json_decode($model->days ?? '[]', true) ?: []);
                    if (empty($days)) {
                        $shouldSend = true;
                        $skipReason = "daily: no days filter";
                    } else {
                        $todayIso = (int) date('N');    // 1=Mon..7=Sun
                        $todayJs = (int) date('w');     // 0=Sun..6=Sat
                        $normalized = array_map('strval', $days);
                        $shouldSend = in_array((string) $todayIso, $normalized, true)
                            || in_array((string) $todayJs, $normalized, true);
                        $skipReason = "daily: todayIso={$todayIso}, todayJs={$todayJs}, days=" . implode(',', $normalized);
                    }
                }

                if (!$shouldSend) {
                    $this->info("Skipping notification {$model->id} ({$skipReason})");
                    continue;
                }

                $company_id = $model->company->id;
                $branchId = $model->branch_id;

                // For Daily-frequency notifications, use the new consolidated daily report
                // (one PDF per branch). For other frequencies, use the legacy per-shift-type files.
                $isDaily = $frequency === 'daily';
                $filesForThisModel = $isDaily ? ['daily'] : $files;


                foreach ($model->managers as $key => $manager) {

                    if ($manager->branch_id == $model->branch_id) {

                        if (in_array("Email", $model->mediums ?? [])) {
                            $email = $manager->email;

                            // if ($company_id == 60) {
                            //     $email = "akildevs1000@gmail.com";
                            // }

                            Mail::to($email)
                                ->queue(new ReportNotificationMail($model, $manager, $filesForThisModel));
                        }

                        if (in_array("Whatsapp", $model->mediums ?? [])) {
                            if (!$accounts || !is_array($accounts) || empty($accounts[0]['clientId'])) {
                                $this->info("No Whatsapp Client found.");
                            } else {
                                foreach ($filesForThisModel as $file) {
                                    $relativePath = $isDaily
                                        ? "pdf/$yesterday/{$company_id}/daily_report_{$branchId}.pdf"
                                        : "pdf/$yesterday/{$company_id}/summary_report_{$branchId}_{$file}.pdf";
                                    $filePath = storage_path("app/public/" . $relativePath);
                                    $link = env("BASE_URL") . "/storage/" . $relativePath;

                                    if (file_exists($filePath)) {

                                        $whatsappMessage = ($isDaily ? "*Daily Attendance Report*\n\n" : "*Summary Attendance Report*\n\n")
                                            . "Your report is ready for download.\n"
                                            . "Download Link: $link";

                                        $this->info($whatsappMessage);

                                        $clientId = $accounts[0]['clientId'];
                                        SendWhatsappMessageJob::dispatch(
                                            $manager->whatsapp_number,
                                            $whatsappMessage,
                                            0,
                                            $clientId,
                                            "file"
                                        );
                                    }
                                }
                            }
                        }
                    }
                }

                // FTP / API rule-level deliveries for ATTENDANCE rules
                // (independent of managers list; one job per format).
                $fileSlug = $typeToSlug[$model->type] ?? 'daily';
                $formats = is_array($model->formats) && !empty($model->formats) ? $model->formats : ['PDF'];

                if (in_array('FTP', $model->mediums ?? [], true) && $model->ftp_config) {
                    foreach ($formats as $fmt) {
                        \App\Jobs\DeliverReportViaFtpJob::dispatch($model->id, $fileSlug, $yesterday, $fmt);
                    }
                }
                if (in_array('API', $model->mediums ?? [], true) && $model->api_config) {
                    foreach ($formats as $fmt) {
                        \App\Jobs\DeliverReportViaApiJob::dispatch($model->id, $fileSlug, $yesterday, $fmt);
                    }
                }
            }

            // FTP / API delivery for non-attendance types (Absent / AccessControl /
            // Device / DocumentExpiry). These types do NOT go through the attendance
            // Email / Whatsapp loop above — Email for them is handled by the existing
            // alert commands (AlertAbsents etc.), and Whatsapp is not wired in this
            // iteration. Only the new file-based mediums (FTP / API) fire here.
            $nonAttendanceTypes = array_diff(array_keys($typeToSlug), ['attendance']);
            $otherRulesQuery = ReportNotification::whereIn('type', $nonAttendanceTypes)
                ->where('company_id', $company_id);
            if ($notification_id) {
                $otherRulesQuery->where('id', $notification_id);
            }

            foreach ($otherRulesQuery->get() as $rule) {
                $hasFtp = in_array('FTP', $rule->mediums ?? [], true) && $rule->ftp_config;
                $hasApi = in_array('API', $rule->mediums ?? [], true) && $rule->api_config;
                if (!$hasFtp && !$hasApi) {
                    continue;
                }

                $fileSlug = $typeToSlug[$rule->type] ?? null;
                if (!$fileSlug) {
                    continue;
                }
                $formats = is_array($rule->formats) && !empty($rule->formats) ? $rule->formats : ['PDF'];

                if ($hasFtp) {
                    foreach ($formats as $fmt) {
                        \App\Jobs\DeliverReportViaFtpJob::dispatch($rule->id, $fileSlug, $yesterday, $fmt);
                    }
                }
                if ($hasApi) {
                    foreach ($formats as $fmt) {
                        \App\Jobs\DeliverReportViaApiJob::dispatch($rule->id, $fileSlug, $yesterday, $fmt);
                    }
                }
            }
        } catch (\Throwable $th) {

            echo $th;
            echo "[" . $date . "] Cron: $script_name. Error occured while inserting logs.\n";
            //Logger::channel("custom")->error("Cron: $script_name. Error Details: $th");
            return;
        }
    }
}
