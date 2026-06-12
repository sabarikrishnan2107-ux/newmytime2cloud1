<?php

namespace App\Console\Commands\Test;

use App\Http\Controllers\AttendanceLogController;
use App\Models\Employee;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;
use Symfony\Component\Console\Input\InputOption;

class AttendanceLogSeederForTesting extends Command
{
    protected $signature = 'attendance_log_seeder_for_testing {company_id} {user_id}';
    protected $description = 'Default Attendance log Seeder';

    public function handle()
    {
        try {
            echo (new AttendanceLogController)->seedDefaultData($this->argument('company_id'), $this->argument('user_id'));
        } catch (\Throwable $th) {
            echo json_encode($th);
            return;
            Logger::channel("custom")->error('Command: Default Attendance Log Seeder. Error Details: ' . $th);
            $date = date("Y-m-d H:i:s");
            echo "[$date] Command: Default Attendance Log Seeder. Error occured while inserting logs.\n";
        }
    }
}
