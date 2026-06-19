<?php

namespace App\Console\Commands\Shift;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Shift\SplitShiftController;
use App\Models\Attendance;
use App\Models\Shift;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use DateTime;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Unique;

class SyncDoubleShift extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_double_shift {company_id} {date}';

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
        $id = $this->argument("company_id", 1);

        $date = $this->argument("date", date("Y-m-d"));

        if (! Shift::where('company_id', $id)->where('shift_type_id', 5)->exists()) {
            $this->info("No Split Shifts Found.");
            return Command::SUCCESS;
        }

        Log::channel('split')->info("Starting double shift sync", [
            'company_id' => $id,
            'date'       => $date,
            'timestamp'  => now()->toDateTimeString()
        ]);

        $UserIds = DB::table('schedule_employees as se')
            ->join('attendance_logs as al', 'se.employee_id', '=', 'al.UserID')
            ->join('shifts as sh', 'sh.id', '=', 'se.shift_id')
            ->select('al.UserID')
            ->where('sh.shift_type_id', "=", 5)
            ->where('al.checked', false)
            // ->where('al.UserID', 619)
            ->where('se.company_id', $id)
            ->where('al.company_id', $id)
            ->whereDate('al.log_date', $date)
            ->orderBy("al.LogTime")
            // ->take(50)
            ->pluck("al.UserID")
            ->unique()
            ->toArray();


        if (!$UserIds || count($UserIds) == 0) {
            Log::channel('split')->info("Users not found", [
                'users' => $UserIds
            ]);
            return Command::SUCCESS;
        }


        Log::channel('split')->info("Users found for split-shift processing", [
            'users' => $UserIds
        ]);

        $this->info(json_encode($UserIds));

        $this->info((new SplitShiftController)->render($id, $date, 5, $UserIds, false, "kernel"));

        Log::channel('split')->info("Double shift sync completed");

        return Command::SUCCESS;
    }
}
