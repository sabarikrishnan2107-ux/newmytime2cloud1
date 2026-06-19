<?php

namespace App\Console\Commands\Shift;

use App\Http\Controllers\Shift\FiloShiftController;
use App\Http\Controllers\Shift\MultiShiftController;
use App\Http\Controllers\Shift\NightShiftController;
use App\Http\Controllers\Shift\SingleShiftController;
use App\Http\Controllers\Shift\SplitShiftController;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\ScheduleEmployee;
use App\Models\Shift;
use DateTime;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log as Logger;

class SyncAutoShiftNew extends Command
{
    /**
     * The name and signature of the console command sync_auto_shift.
     *
     * @var string
     */
    protected $signature = 'task:sync_auto_shift_new {company_id} {date}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Auto Shift';
    public function handle()
    {
        $id = $this->argument("company_id", 1);

        $date = $this->argument("date");

        $formattedDate = (new DateTime())->format('d M Y \a\t H:i:s');

        $message = "Attendance Log Processing Alert !\n\n";

        $message .= "Dear Admin\n";

        $message .= "Attendance Logs Processed for Company id $id at $formattedDate\n\n";

        $logFilePath = "logs/shifts/multi_shift/command/$id";

        $all_new_employee_ids = DB::table('schedule_employees as se')
            ->join('attendance_logs as al', 'se.employee_id', '=', 'al.UserID')
            ->select('al.UserID')
            ->where('se.isAutoShift', true) // this condition not workin
            ->where('al.checked', false)
            // ->where('al.UserID', 619)
            ->where('se.company_id', $id)
            ->where('al.company_id', $id)
            ->whereDate('al.log_date', $date)
            ->orderBy("al.LogTime")
            // ->take(50)
            ->pluck("al.UserID")
            ->toArray();




        if (!$all_new_employee_ids || count($all_new_employee_ids) == 0) {
            $this->info("No data");

            if ($id == 22) {

                $message .= "No Data Found\n";

                $message .= "Thank you!\n";
            }

            return;
        }

        $filtered_all_new_employee_ids = array_values(array_unique($all_new_employee_ids));



        $all_logs_for_employee_ids = DB::table('employees as e')
            ->join('attendance_logs as al', 'e.system_user_id', '=', 'al.UserID')
            ->join('schedule_employees as se', 'e.system_user_id', '=', 'se.employee_id')
            ->select(
                'e.first_name',
                'e.employee_id',
                'e.company_id',
                'e.branch_id',
                'e.system_user_id',
                'al.id as log_id',
                'al.LogTime',
                'al.log_date',
                'al.UserID',
                'se.isOverTime'
            )
            ->where('e.status', 1)
            ->where('se.isAutoShift', true)
            ->where('al.company_id', $id)
            ->where('e.company_id', $id)
            ->whereIn('al.UserID', $filtered_all_new_employee_ids)
            ->whereBetween('al.log_date', [$date, date("Y-m-d", strtotime($date . "+1 day"))])
            ->distinct('al.LogTime', 'al.UserID', 'e.company_id')
            ->orderBy("al.LogTime")
            ->get()
            ->groupBy("UserID")
            ->toArray();


        foreach ($all_logs_for_employee_ids as $UserID => $row) {

            if (!$row) {
                $message .= "[" . date("Y-m-d H:i:s") . "] Cron:SyncAuto Employee with $UserID SYSTEM USER ID has no Log(s).\n";
                continue;
            }

            $shifts = ((new Shift)->getAutoShiftsAll($id, $row[0]->branch_id));

            //return $row;
            if (count($shifts) > 0) {

                $nearestShift = $this->findClosest($shifts, $row);
                //clear old Attendance shift data
                $itemData = [
                    "total_hrs" => "---",
                    "in" =>   "---",
                    "out" =>  "---",
                    "ot" => "---",
                    "device_id_in" =>   "---",
                    "device_id_out" => "---",
                    "shift_type_id" =>   $nearestShift["shift_type_id"] ?? 0,
                    "shift_id" =>   $nearestShift["id"] ?? 0,
                    "status" => "A",
                    "late_coming" => "---",
                    "early_going" => "---",
                ];

                Attendance::where("company_id", $id)
                    ->where("employee_id", $UserID)
                    ->where("date", $date)->update($itemData);


                if ($nearestShift == null) {
                    return "Nearest Shift is not found " . $date;
                }

                $params = [
                    "company_id" => $id,
                    "date" => $date,
                ];

                $result = $this->renderRelatedShiftype($nearestShift['shift_type_id'], $UserID, $params, "kernel");

                $this->info($result);


                $arr = [];
                $arr["company_id"] = $id;
                $arr["date"] = $date;
                $arr["employee_id"] = $UserID;
                $arr["shift_type_id"] = $nearestShift["shift_type_id"];
                $arr["shift_id"] = $nearestShift["id"];

                $message .= "[" . date("Y-m-d H:i:s") . "] Cron:SyncAuto The Log(s) has been rendered against " . $UserID . " SYSTEM USER ID.\n";

                $message .= " Nearest shift ({$nearestShift['name']})";

                // $this->info($message);
            }
        }
    }

    public function findClosest($shifts, $logs): ?array
    {
        // if shift_count 1 
        if (count($shifts) == 1) {
            return $shifts[0];
        }
        foreach ($logs as $log) {
            $logType = strtolower($log['log_type'] ?? '');
            $deviceFunction = strtolower($log['device']['function'] ?? '');

            if (in_array($logType, ['auto', 'in', ''], true) || in_array($deviceFunction, ['in'], true)) {
                $currentTime = date('H:i', strtotime($log['LogTime']));

                $matchingShift = array_values(array_filter($shifts, function ($shift) use ($currentTime) {
                    return $currentTime >= $shift['beginning_in'] && $currentTime <= $shift['beginning_out'];
                }));

                if (!empty($matchingShift)) {
                    return $matchingShift[0]; // Return the first matching shift
                }
            }
        }

        return null; // No matching shift found
    }

    public function renderRelatedShiftype($shift_type_id, $UserID, $params, $channel)
    {
        $arr = [
            1 => FiloShiftController::class,
            2 => MultiShiftController::class,
            4 => NightShiftController::class,
            5 => SplitShiftController::class,
            6 => SingleShiftController::class,
        ];

        return (new $arr[$shift_type_id])->render($params['company_id'], $params['date'], $shift_type_id, [$UserID], true, true, $channel);
    }
}
