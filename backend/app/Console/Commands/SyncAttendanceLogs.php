<?php

namespace App\Console\Commands;

use App\Helpers\BenchmarkHelper;
use App\Http\Controllers\AttendanceLogController;
use App\Http\Controllers\Controller;
use Illuminate\Console\Command;

class SyncAttendanceLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_attendance_logs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Attendance Logs';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $logger = new Controller;

        $logFilePath = 'logs/common_logs';

        $logFilePath = "$logFilePath/";

        $logger->logOutPut($logFilePath, "*****Cron started for task:sync_attendance_logs  *****");

        try {
            $benchmark = BenchmarkHelper::measure(function () {
                return json_encode((new AttendanceLogController)->store(), JSON_PRETTY_PRINT);
            });

            $logger->logOutPut($logFilePath, "✔ Execution Successful");
            $logger->logOutPut($logFilePath, "▶ Result: {$benchmark['result']}");
            $logger->logOutPut($logFilePath, "⏳ Execution Time: {$benchmark['execution_time']} sec");
            $logger->logOutPut($logFilePath, "💾 Memory Used: {$benchmark['memory_used']}");

            $this->info("✔ Execution Successful");
            $this->info("▶ Result: {$benchmark['result']}");
            $this->info("⏳ Execution Time: {$benchmark['execution_time']} sec");
            $this->info("💾 Memory Used: {$benchmark['memory_used']}");
        } catch (\Exception $e) {
            $logger->logOutPut($logFilePath, "❌ Error: " . $e->getMessage());
        }

        $logger->logOutPut($logFilePath, "*****Cron Ended for task:sync_attendance_logs  *****");
    }
}
