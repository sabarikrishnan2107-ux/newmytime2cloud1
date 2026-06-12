<?php

namespace App\Console\Commands\Test;

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\DeviceController;
use App\Models\Employee;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;
use Symfony\Component\Console\Input\InputOption;

class DeviceSeederForTesting extends Command
{
    protected $signature = 'DeviceSeederForTesting {company_id}';
    protected $description = 'Device Seeder For Testing';

    public function handle()
    {
        try {
            echo (new DeviceController)->seedDefaultData($this->argument('company_id'));
        } catch (\Throwable $th) {
            echo json_encode($th);
            Logger::channel("custom")->error('Command: DeviceSeederForTesting. Error Details: ' . $th);
            $date = date("Y-m-d H:i:s");
            echo "[$date] Command: DeviceSeederForTesting. Error occured while inserting logs.\n";
        }
    }
}
