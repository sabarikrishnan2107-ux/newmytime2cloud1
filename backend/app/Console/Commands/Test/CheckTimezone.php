<?php

namespace App\Console\Commands\Test;

use App\Models\AttendanceLog;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CheckTimezone extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-timezone';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check the application timezone and current date/time';

    /**
     * Execute the console command.
     */
    public function handle()
    {

        // Retrieve the timezone from the config
        $timezone = config('app.timezone');

        // Get the current date and time in the application's timezone
        $currentDateTime = now($timezone)->format('l, F j, Y g:i A'); // Example: Wednesday, October 25, 2023 2:30 PM


        // Display the timezone and current date/time
        $this->info("The application timezone is: " . $timezone);
        $this->info("The current date and time is: " . $currentDateTime);



        $startDate = Carbon::create(2024, 1, 1); // 2025-02-01

        // $endDate = Carbon::create(2024, 12, 31); // 2025-02-10

        $endDate = Carbon::now(); // 2025-02-10


        // Loop through dates
        while ($startDate->lte($endDate)) { // lte() means "less than or equal to"

            echo "Processing date: " . $startDate->toDateString() . PHP_EOL;

            $updatedRecords = AttendanceLog::whereBetween('LogTime', [
                $startDate->toDateString() . " 00:00:00",
                $startDate->toDateString() . " 23:59:59"
            ])
                ->update(["log_date" => $startDate->toDateString()]);


            echo  $updatedRecords . " records updated for " . $startDate->toDateString() . PHP_EOL; // Output the date (e.g., 2025-02-01)
            
            $startDate->addDay();
        }

        die;
    }
}
