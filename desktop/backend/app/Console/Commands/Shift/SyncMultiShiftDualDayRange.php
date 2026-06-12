<?php
namespace App\Console\Commands\Shift;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Symfony\Component\Console\Output\BufferedOutput;

class SyncMultiShiftDualDayRange extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_multi_shift_dual_day_range';

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
        $id = $this->ask('Enter ID', 1);

        // Get first and last date of the current month
        $defaultStartDate = Carbon::now()->startOfMonth()->toDateString();
        $defaultEndDate   = Carbon::now()->endOfMonth()->toDateString();

        // Ask for Start and End Date with default values
        $startDate = $this->ask("Enter Start Date (YYYY-MM-DD)", $defaultStartDate);
        $endDate   = $this->ask("Enter End Date (YYYY-MM-DD)", $defaultEndDate);

        // Set flag to static true
        $flag = 'true';

        // Validate Inputs
        if (! is_numeric($id)) {
            $this->error('ID must be a number.');
            return;
        }

        if (! strtotime($startDate) || ! strtotime($endDate)) {
            $this->error('Invalid date format. Please use YYYY-MM-DD.');
            return;
        }

        $start = Carbon::parse($startDate);
        $end   = Carbon::parse($endDate);

        if ($start->greaterThan($end)) {
            $this->error('Start date must be before end date.');
            return;
        }

        $outputBuffer = new BufferedOutput();

        $this->info("Running: php artisan update_log_date_column $id");

        $exitCode = $this->call('update_log_date_column', [
            'company_id' => $id,
            'from_date'  => $startDate,
            'to_date'    => $endDate,
        ], $outputBuffer);

        $this->line($outputBuffer->fetch());

        sleep(5);

        // Loop through the date range and execute the child command
        while ($start->lte($end)) {
            $dateString = $start->toDateString();
            // Create a buffered output to capture child command response
            $outputBuffer = new BufferedOutput();

            // Execute child command and capture output
            $exitCode = $this->call('task:sync_multi_shift_dual_day', [
                'company_id' => $id,
                'date'       => $dateString,
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
