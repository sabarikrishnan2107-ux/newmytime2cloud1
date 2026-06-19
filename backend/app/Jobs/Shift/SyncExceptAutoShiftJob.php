<?php

namespace App\Jobs\Shift;

use App\Models\AttendanceLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log as Logger;

class SyncExceptAutoShiftJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $companyId;
    protected $date;

    public $timeout = 1200; // 20 minutes

    public function __construct($companyId, $date)
    {
        $this->companyId = $companyId;
        $this->date = $date;
    }

    public function handle()
    {
        $id = $this->companyId;
        $date = $this->date;

        $url = rtrim(env('APP_URL', 'https://v2backend.mytime2cloud.com'), '/') . '/api/render_logs';
        if (env("APP_ENV") == "desktop") {
            $localIp = gethostbyname(gethostname());
            $url = "http://{$localIp}:8000/api/render_logs";
        }

        $employeeIds = Employee::where("company_id", $id)
            ->whereHas("schedule", function ($q) use ($id, $date) {
                $q->where("company_id", $id);
                $q->where("isAutoShift", false);
                $q->whereIn("shift_type_id", [1, 4, 6]);
                $q->whereHas("shift", function ($shiftQuery) use ($date) {
                    $shiftQuery->whereJsonContains("days", Carbon::parse($date)->format("D"));
                });
            })
            ->pluck("system_user_id");

        Logger::channel('custom')->info('Queue: SyncExceptAutoShiftJob Started', [
            'company_id' => $id,
            'date' => $date,
            'url' => $url,
        ]);

        $employeeIds->chunk(10)->each(function ($chunk) use ($id, $date, $url, $employeeIds) {

            $params = [
                'date' => '',
                'UserID' => '',
                'updated_by' => 26,
                'company_ids' => [$id],
                'manual_entry' => true,
                'reason' => '',
                'employee_ids' => $chunk->toArray(),
                'dates' => [$date, $date],
                'shift_type_id' => 0,
                'company_id' => $id,
                'channel' => "queue",
            ];

            Logger::channel('custom')->info('Queue request chunk', [
                'chunk' => $chunk->toArray(),
                'params' => $params,
            ]);

            try {
                $response = Http::withoutVerifying()->get($url, $params);

                if ($response->successful()) {
                    Logger::channel('custom')->info('Queue request successful', [
                        'chunk' => $chunk->toArray(),
                        'response' => $response->json(),
                    ]);

                    AttendanceLog::where("company_id", $id)
                        ->whereIn("UserID", $employeeIds)
                        ->whereBetween("LogTime", [
                            $date . ' 00:00:00',
                            $date . ' 23:59:00'
                        ])
                        ->update([
                            "checked" => true,
                            "checked_datetime" => now(),
                            "channel" => "queue",
                            "log_message" => ""
                        ]);

                } else {
                    Logger::channel('custom')->error('Queue request failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                }

            } catch (\Exception $e) {
                Logger::channel('custom')->critical('Queue unexpected error', [
                    'exception' => $e->getMessage(),
                ]);
            }
        });

        Logger::channel('custom')->info('Queue: SyncExceptAutoShiftJob Completed Successfully');
    }
}
