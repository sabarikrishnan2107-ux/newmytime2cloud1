<?php

namespace App\Console\Commands\Shift;

use App\Models\AttendanceLog;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Symfony\Component\Console\Output\BufferedOutput;

class SyncMultiShiftIncludesTwoDateOnly extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_multishift_includes_two_datesonly';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        // Ask for ID
        $id = 1;

        // Get yesterday's date as startDate and today's date as endDate
        $startDate = Carbon::yesterday()->toDateString();
        $endDate = Carbon::today()->toDateString();

        // $startDate = '2025-06-01';
        // $endDate = '2025-06-02';

        // Set flag to static true
        $flag = 'true';

        // Validate Inputs
        if (!is_numeric($id)) {
            $this->error('ID must be a number.');
            return;
        }

        if (!strtotime($startDate) || !strtotime($endDate)) {
            $this->error('Invalid date format. Please use YYYY-MM-DD.');
            return;
        }

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        if ($start->greaterThan($end)) {
            $this->error('Start date must be before end date.');
            return;
        }

        $outputBuffer = new BufferedOutput();

        $this->info("update log_date in attendance_logs table for company_id = $id");

        $rows = AttendanceLog::where("company_id", $id)
            ->whereBetween('LogTime', [$start, date("Y-m-d", strtotime($end . "+1 day"))])
            ->get(["id", "LogTime", "log_date"])->toArray();

        $result = 0;

        foreach ($rows as $key => $value) {
            $result +=  AttendanceLog::where("id", $value["id"])
                ->update([
                    "log_date" => date("Y-m-d", strtotime($value["LogTime"]))
                ]);
        }

        sleep(2);

        // Loop through the date range and execute the child command
        while ($start->lte($end)) {
            $dateString = $start->toDateString();
            // Create a buffered output to capture child command response
            $outputBuffer = new BufferedOutput();

            // Execute child command and capture output
            $exitCode = $this->call('task:sync_multi_shift_dual_day', [
                'company_id' => $id,
                'date' => $dateString,
            ], $outputBuffer);

            // Show response from child command
            $this->info("Running: php artisan task:sync_multi_shift_dual_day $id $dateString $flag");
            $this->line($outputBuffer->fetch());
            sleep(5);

            // Move to the next day
            $start->addDay();
        }

        $this->info('All commands executed successfully!');
    }
}
