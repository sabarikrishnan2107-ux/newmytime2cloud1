<?php

namespace App\Console\Commands;

use App\Http\Controllers\Shift\RenderController;
use App\Models\Attendance;
use Carbon\Carbon;
use DateTime;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log as Logger;

class ResetAttendance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reset_attendance';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Off';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $company_id = $this->ask('company_id',22);
        $status = $this->ask('status',"A");
        
        $defaultStartDate = Carbon::now()->startOfMonth()->toDateString();
        $defaultEndDate   = Carbon::now()->endOfMonth()->toDateString();

        // Ask for Start and End Date with default values
        $from = $this->ask("Enter Start Date (YYYY-MM-DD)", $defaultStartDate);
        $to   = $this->ask("Enter End Date (YYYY-MM-DD)", $defaultEndDate);

        $result = Attendance::where("company_id",$company_id)
            ->where("date", ">=", $from)
            ->where("date", "<=", $to)
            ->update(["status" => $status]);

           $this->info($result ? "Records have been updated." : "Server Error");      
    }
}
