<?php

namespace App\Console\Commands;

use App\Http\Controllers\AttendanceController;
use App\Models\Employee;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;
use Symfony\Component\Console\Input\InputOption;

class AttendanceSeeder extends Command
{
    protected $signature = 'default_attendance_seeder {company_id}';
    protected $description = 'Default Attendance Seeder';

    public function handle()
    {

        try {
            echo (new AttendanceController)->seedDefaultData($this->argument('company_id'));
        } catch (\Throwable $th) {
            Logger::channel("custom")->error('Cron: Default Attendance Seeder. Error Details: ' . $th);
            $date = date("Y-m-d H:i:s");
            echo "[$date] Cron: Default Attendance Seeder. Error occured while inserting logs.\n" . $th;
        }
    }
}
