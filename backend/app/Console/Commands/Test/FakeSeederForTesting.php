<?php

namespace App\Console\Commands\Test;

use App\Http\Controllers\AttendanceController;
use App\Models\Employee;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;
use Symfony\Component\Console\Input\InputOption;

class FakeSeederForTesting extends Command
{
    protected $signature = 'FakeSeederForTesting {company_id} {employee_id}';
    protected $description = 'Fake Seeder For Testing';

    public function handle()
    {
        try {
            echo (new AttendanceController)->seedFakeDataForTesting($this->argument('company_id'),$this->argument('employee_id'));
        } catch (\Throwable $th) {
            Logger::channel("custom")->error('Cron: AttendanceSeeder. Error Details: ' . $th);
            $date = date("Y-m-d H:i:s");
            echo "[$date] Cron: SyncFiloShift. Error occured while inserting logs.\n";
        }
    }
}
