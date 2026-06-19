<?php

namespace App\Console\Commands;

use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\Shift\AutoShiftController;
use App\Http\Controllers\Shift\RenderController;
use App\Models\AttendanceLog;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log as Logger;

class SyncAttendanceMissingShiftIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_attendance_missing_shift_ids  {company_id} {date}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Missing Shift Ids';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {

        $id = $this->argument("company_id");

        $date = $this->argument("date");


        try {
            $result = (new EmployeeController)->AttendanceForMissingScheduleIds($id, '', $date);
            $this->info($result);
        } catch (\Throwable $th) {
            //throw $th;
            $error_message = 'Cron: ' . env('APP_NAME') . ': Exception in task:sync_attendance_missing_shift_ids  : Company Id :' . $id . ', : Date :' . $date . ', ' . $th;
            Logger::channel("custom")->error($error_message);
            echo $error_message;
        }
    }
}
