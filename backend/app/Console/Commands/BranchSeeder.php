<?php

namespace App\Console\Commands;

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\CompanyBranchController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;

class BranchSeeder extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:branch_seeder';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Branch Seeder';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        try {
            echo (new CompanyBranchController)->seedDefaultData();
        } catch (\Throwable $th) {
            return $th;
            Logger::channel("custom")->error('Cron: AttendanceSeeder. Error Details: ' . $th);
            $date = date("Y-m-d H:i:s");
            echo "[$date] Cron: SyncFiloShift. Error occured while inserting logs.\n";
        }
    }
}
