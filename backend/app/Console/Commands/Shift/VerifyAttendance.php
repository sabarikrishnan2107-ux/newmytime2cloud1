<?php

namespace App\Console\Commands\Shift;

use Illuminate\Console\Command;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use Illuminate\Support\Facades\DB;

class VerifyAttendance extends Command
{
    protected $signature = 'attendance:verify {company_id} {date?}';
    protected $description = 'Verify if attendance log counts match raw logs with status conditions (M, ME, P)';

    public function handle()
    {
        $company_id = $this->argument("company_id") ?? 1;
        $date       = $this->argument("date") ?? date("Y-m-d", strtotime("yesterday"));

        $range = ["$date 00:00:00", "$date 23:59:59"];

        $this->info("Verifying attendance records with status M, ME, P...");

        $attendances = Attendance::select('id', 'company_id', 'employee_id', 'date', 'in', 'out', 'logs', 'status')
            ->whereIn('status', ['M', 'ME', 'P'])
            ->where('company_id', $company_id)
            ->whereDate('date', $date)
            // Retrieve shift details dynamically
            ->with([
                "schedule" => function ($shiftQuery) use ($company_id) {
                    $shiftQuery->where('company_id', $company_id);
                    $shiftQuery->select('company_id', "shift_id", "id", "employee_id");
                    $shiftQuery->with("shift:id,on_duty_time,off_duty_time");
                }
            ])
            ->with([
                "AttendanceLogs" => function ($q) use ($company_id, $range) {
                    $q->where('company_id', $company_id);
                    $q->whereBetween('LogTime', $range);
                    $q->select('id', "LogTime", "UserID");
                    $q->distinct('LogTime', 'UserID', 'company_id');
                    $q->orderBy("LogTime");
                }
            ])
            ->where('employee_id', 570)
            ->get();


        $mismatchedRecords = [];

        foreach ($attendances as $attendance) {

            $on_duty_time = $attendance->schedule->shift->on_duty_time;
            $off_duty_time = $attendance->schedule->shift->off_duty_time;
            $actualLogCount = count($attendance->logs);

            ld($attendance);



            // if ($expectedLogCount !== $actualLogCount) {
            //     $mismatchedRecords[] = [
            //         'Attendance ID' => $attendance->id,
            //         'Company ID' => $attendance->company_id,
            //         'User ID' => $attendance->user_id,
            //         'Date' => $attendance->date,
            //         'Status' => $attendance->status,
            //         'Expected Logs' => $expectedLogCount,
            //         'Actual Logs' => $actualLogCount,
            //         'Mismatch' => abs($expectedLogCount - $actualLogCount)
            //     ];
            // }
        }

        // if (count($mismatchedRecords) > 0) {
        //     $this->table(['Attendance ID', 'Company ID', 'User ID', 'Date', 'Status', 'Expected Logs', 'Actual Logs', 'Mismatch'], $mismatchedRecords);
        //     $this->error("Mismatch found in attendance logs!");
        // } else {
        //     $this->info("All attendance logs with status M, ME, P are correctly recorded.");
        // }
    }
}
