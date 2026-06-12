<?php

namespace App\Console\Commands\Shift;

use App\Jobs\Shift\SyncExceptAutoShiftJob;
use App\Models\AttendanceLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log as Logger;

class SyncExceptAutoShift extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_except_auto_shift {company_id} {date}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Other Shifts like (Filo,Single,Night,Multi) except Auto Shift';
    
    public function handle()
    {

        $companyId = $this->argument('company_id');
        $date = $this->argument('date');

        SyncExceptAutoShiftJob::dispatch($companyId, $date);

        $this->info("SyncExceptAutoShiftJob dispatched for Company: $companyId Date: $date");

        return;

        $url = 'https://backend.mytime2cloud.com/api/render_logs';

        if (env("APP_ENV") == "desktop") {
            $localIp = gethostbyname(gethostname());
            $port = 8000;
            $url = "http://$localIp:$port/api/render_logs";
            // $url = 'https://mytime2cloud-backend.test/api/render_logs';
        } else if (env("APP_ENV") == "local") {
            $url = 'https://mytime2cloud-backend.test/api/render_logs';
        }


        $id = $this->argument("company_id");
        $date = $this->argument("date");

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

        $userids = $employeeIds;

        try {
            // Log the start of the process
            Logger::channel('custom')->info('Starting SyncAutoShiftNew process', [
                'company_id' => $id,
                'date' => $date,
                'url' => $url,
            ]);

            // Chunk the employee IDs array into batches of 20
            $employeeIds->chunk(10)->each(function ($chunk) use ($id, $date, $url, $userids) {
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
                    'channel' => "kernel",
                ];

                try {
                    // Log the parameters for the current chunk
                    Logger::channel('custom')->info('Sending request to url', [
                        'chunk' => $chunk->toArray(),
                        'params' => $params,
                    ]);

                    // Call the url using Http facade
                    $response = Http::withoutVerifying()->get($url, $params);

                    // Log the response
                    if ($response->successful()) {
                        Logger::channel('custom')->info('Request successful', [
                            'chunk' => $chunk->toArray(),
                            'response' => $response->json(),
                        ]);
                        echo "Success: Processed chunk\n";

                        $this->info($userids);


                        $result = AttendanceLog::where("company_id", $id)
                            ->whereIn("UserID", $userids)
                            ->where("LogTime", ">=", $date . ' 00:00:00')
                            ->where("LogTime", "<=", $date . ' 23:59:00')
                            ->update([
                                "checked" => true,
                                "checked_datetime" => date('Y-m-d H:i:s'),
                                "channel" => "kernel",
                                "log_message" => ""
                            ]);

                        $this->info($result);
                    } else {
                        Logger::channel('custom')->error('Request failed', [
                            'chunk' => $chunk->toArray(),
                            'status' => $response->status(),
                            'error_body' => $response->body(),
                        ]);
                        echo "Error: {$response->status()} - {$response->body()}\n";
                    }
                } catch (\Exception $e) {
                    // Log any unexpected errors during the request
                    Logger::channel('custom')->critical('Unexpected error during request', [
                        'chunk' => $chunk->toArray(),
                        'exception_message' => $e->getMessage(),
                    ]);
                    echo "Critical Error: {$e->getMessage()}\n";
                }
            });

            // Log the completion of the process
            Logger::channel('custom')->info('SyncAutoShiftNew process completed successfully', [
                'company_id' => $id,
                'date' => $date,
            ]);
        } catch (\Exception $e) {
            // Log any unexpected errors in the overall process
            Logger::channel('custom')->critical('Unexpected error in SyncAutoShiftNew process', [
                'company_id' => $id,
                'date' => $date,
                'exception_message' => $e->getMessage(),
            ]);
            echo "Critical Error in Process: {$e->getMessage()}\n";
        }
    }
}
