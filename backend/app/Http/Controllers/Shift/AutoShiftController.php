<?php

namespace App\Http\Controllers\Shift;

use App\Http\Controllers\API\SharjahUniversityAPI;
use App\Models\Attendance;

use Illuminate\Support\Arr;
use Illuminate\Http\Request;
use App\Models\AttendanceLog;
use App\Models\ScheduleEmployee;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Schedule;
use App\Models\Shift;
use Carbon\Carbon;

class AutoShiftController extends Controller
{

    public $update_date;

    public function processByManual(Request $request)
    {
        $arr = [];
        $currentDate = $request->input('date', date('Y-m-d'));
        $checked = $request->input('checked');
        $companyIds = $request->input('company_ids', []);
        $UserIDs = $request->input('userIds', []);

        $companies = $this->getModelDataByCompanyIdAuto($currentDate, $companyIds, $UserIDs, $checked);

        foreach ($companies as $company_id => $data) {
            // return ScheduleEmployee::whereCompanyId($company_id)->count();
            $arr[] = $this->processData($company_id, $data, $currentDate, $checked);
        }
        return $arr;
        return "Logs Count " . array_sum($arr);
    }

    public function getModelDataByCompanyIdAuto($currentDate, $companyIds, $UserIDs, $checked)
    {
        $model = AttendanceLog::query();

        $model->where(function ($q) use ($currentDate, $companyIds, $UserIDs, $checked) {
            $q->where("checked", $checked);

            $q->whereHas("schedule", function ($q) {
                $q->where('shift_id', -2);
            });

            $q->when(count($companyIds) > 0, function ($q) use ($companyIds) {
                $q->whereIn("company_id", $companyIds);
            });

            $q->when(count($UserIDs) > 0, function ($q) use ($UserIDs) {
                $q->whereIn("UserID", $UserIDs);
            });

            $q->whereDate("LogTime", $currentDate);
        });

        $model->orderBy("LogTime");

        return $model->get(["id", "UserID", "LogTime", "DeviceID", "company_id"])->groupBy(["company_id", "UserID"])->toArray();
    }

    public function findAttendanceByUserId($item)
    {
        $model = Attendance::query();
        $model->where("employee_id", $item["employee_id"]);
        $model->where("company_id", $item["company_id"]);
        $model->whereDate("date", $item["date"]);

        return !$model->first() ? false : $model->with(["schedule", "shift"])->first();
    }

    public function getShifts($companyId)
    {
        return Shift::orderBy("on_duty_time")->whereHas("autoshift", function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->get()->toArray();
    }

    public function processData($companyId, $data, $date, $checked = true)
    {
        $counter = 0;
        $items = [];
        $shifts = $this->getShifts($companyId);
        $arr = [];
        $arr["company_id"] = $companyId;
        $arr["date"] = $date;

        foreach ($data as $UserID => $logs) {


            if (count($logs) == 0) {
                continue;
            }

            $arr["employee_id"] = $UserID;

            $model = $this->findAttendanceByUserId($arr);

            if (!$model) {
                $nearestShift = $this->findClosest($shifts, count($shifts), $logs, $date);
                if ($nearestShift == null) {

                    $itemData = [
                        "total_hrs" => "---",
                        "in" =>   "---",
                        "out" =>  "---",
                        "ot" => "---",
                        "device_id_in" =>   "---",
                        "device_id_out" => "---",

                        "status" => "A",
                        "late_coming" => "---",
                        "early_going" => "---",

                    ];
                    Attendance::where("company_id", $companyId)
                        ->where("employee_id", $UserID)
                        ->where("date", $date)->update($itemData);

                    return "Nearest Shift is not found " . $date;
                }
                $arr["shift_type_id"] = $nearestShift["shift_type_id"];
                $arr["status"] = "P";
                $arr["device_id_in"] = $logs[0]["DeviceID"];
                $arr["shift_id"] = $nearestShift["id"];
                $arr["in"] = $logs[0]["time"];
                $items[] = $arr;
                Attendance::create($arr);
                AttendanceLog::where("id",  $logs[0]["id"])->update(["checked" => $checked]);
            } else {
                $last = array_reverse($logs)[0];
                $arr["out"] = $last["time"];
                $arr["device_id_out"] = $last["DeviceID"];
                $arr["total_hrs"] = $this->getTotalHrsMins($model->in, $last["time"]);
                $schedule = $model->schedule ?? false;
                $isOverTime = $schedule && $schedule->isOverTime ?? false;
                if ($isOverTime) {
                    $temp["ot"] = $this->calculatedOT($arr["total_hrs"], $schedule->working_hours, $schedule->overtime_interval);
                }
                $items[] = $arr;
                $model->update($arr);
                AttendanceLog::where("id",  $last["id"])->update(["checked" => $checked]);
            }
        }
        return $items;
    }

    public function minutesToHoursNEW($in, $out)
    {
        $parsed_out = strtotime($out);
        $parsed_in = strtotime($in);

        if ($parsed_in > $parsed_out) {
            $parsed_out += 86400;
        }

        $diff = $parsed_out - $parsed_in;

        $mints =  floor($diff / 60);

        $minutes = $mints > 0 ? $mints : 0;

        $newHours = intdiv($minutes, 60);
        $newMints = $minutes % 60;
        $final_mints =  $newMints < 10 ? '0' . $newMints :  $newMints;
        $final_hours =  $newHours < 10 ? '0' . $newHours :  $newHours;
        $hours = $final_hours . ':' . ($final_mints);
        return $hours;
    }

    public function minutesToHours($minutes)
    {
        $newHours = intdiv($minutes, 60);
        $newMints = $minutes % 60;
        $final_mints =  $newMints < 10 ? '0' . $newMints :  $newMints;
        $final_hours =  $newHours < 10 ? '0' . $newHours :  $newHours;
        $hours = $final_hours . ':' . ($final_mints);
        return $hours;
    }

    public function calculatedOT($total_hours, $working_hours, $interval_time)
    {

        $interval_time_num = date("i", strtotime($interval_time));
        $total_hours_num = strtotime($total_hours);

        $date = new \DateTime($working_hours);
        $date->add(new \DateInterval("PT{$interval_time_num}M"));
        $working_hours_with_interval = $date->format('H:i');


        $working_hours_num = strtotime($working_hours_with_interval);

        if ($working_hours_num > $total_hours_num) {
            return "---";
        }

        $diff = abs(((strtotime($working_hours)) - (strtotime($total_hours))));
        $h = floor($diff / 3600);
        $m = floor(($diff % 3600) / 60);
        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }

    public function syncLogsScript()
    {
        $shift_type_id = 3;

        $result = 0;

        $companyIds = Company::pluck("id") ?? [];

        $UserIDs = [];

        $currentTimestamp = date('Y-m-d H:i:s');

        $condtionTimestamp = date("Y-m-d 07:00");

        $currentDate = $currentTimestamp < $condtionTimestamp ? date('Y-m-d', strtotime('yesterday')) : date('Y-m-d');

        $companies = $this->getModelDataByCompanyIdAuto($currentDate, $companyIds, $UserIDs, false);

        foreach ($companies as $company_id => $data) {
            $result += $this->processData($company_id, $data, $currentDate, $shift_type_id);
        }

        return "Logs Count " . $result;
    }

    public function getItemByIndex($arr, $index, $date)
    {
        $dateTime = $date . ' ' . $arr[$index]["on_duty_time"];

        return strtotime($dateTime);
    }

    public function findClosest($shifts, $count, $logs, $date): ?array
    {
        if (count($shifts) == 1) {
            return $shifts[0];
        }

        $firstEligibleTime = null;

        foreach ($logs as $log) {
            $logType = strtolower($log['log_type'] ?? '');
            $deviceFunction = strtolower($log['device']['function'] ?? '');

            if (in_array($logType, ['auto', 'in', ''], true) || in_array($deviceFunction, ['in'], true)) {
                $currentTime = date('H:i', strtotime($log['LogTime']));

                $matchingShift = array_values(array_filter($shifts, function ($shift) use ($currentTime) {
                    return $currentTime >= $shift['beginning_in'] && $currentTime <= $shift['beginning_out'];
                }));

                if (!empty($matchingShift)) {
                    return $matchingShift[0];
                }

                if ($firstEligibleTime === null) {
                    $firstEligibleTime = $currentTime;
                }
            }
        }

        // Fallback: pick the shift whose on_duty_time is nearest to the first log,
        // using circular time distance (handles 20:01 → Night Shift 18:00).
        if ($firstEligibleTime !== null && !empty($shifts)) {
            $toMinutes = function ($hhmm) {
                $p = explode(':', $hhmm);
                return ((int) ($p[0] ?? 0)) * 60 + ((int) ($p[1] ?? 0));
            };
            $logMinutes = $toMinutes($firstEligibleTime);
            $best = null;
            $bestDiff = PHP_INT_MAX;
            foreach ($shifts as $shift) {
                $ref = $shift['on_duty_time'] ?? $shift['beginning_in'] ?? null;
                if (!$ref || $ref === '---') {
                    continue;
                }
                $shiftMinutes = $toMinutes(date('H:i', strtotime($ref)));
                $direct = abs($logMinutes - $shiftMinutes);
                $diff = min($direct, 1440 - $direct);
                if ($diff < $bestDiff) {
                    $bestDiff = $diff;
                    $best = $shift;
                }
            }
            if ($best !== null) {
                return $best;
            }
        }

        return null;
    }


    public function findClosest_old($arr, $n, $target, $date)
    {
        if (count($arr) == 0) return false;

        // Corner cases
        if ($target <= $this->getItemByIndex($arr, 0, $date)) {
            return $arr[0];
        }

        if ($target >= $this->getItemByIndex($arr, $n - 1, $date)) {
            return $arr[$n - 1];
        }

        // Doing binary search
        $i = 0;
        $j = $n;
        $mid = 0;
        while ($i < $j) {
            $mid = ($i + $j) / 2;

            if ($this->getItemByIndex($arr, $mid, $date) == $target) {
                return $arr[$mid];
            }

            /* If target is less than array element,
            then search in left */
            if ($target < $this->getItemByIndex($arr, $mid, $date)) {

                // If target is greater than previous
                // to mid, return closest of two
                if ($mid > 0 && $target > $this->getItemByIndex($arr, $mid - 1, $date)) {
                    return $this->getClosest($arr[$mid - 1], $arr[$mid], $target, $date);
                }

                /* Repeat for left half */
                $j = $mid;
            }

            // If target is greater than mid
            else {
                if ($mid < $n - 1 && $target < $this->getItemByIndex($arr, $mid + 1, $date)) {
                    return $this->getClosest($arr[$mid], $arr[$mid + 1], $target, $date);
                }

                // update i
                $i = $mid + 1;
            }
        }

        // Only single element left after search
        return $arr[$mid];
    }

    public function getClosest($val1, $val2, $target, $date)
    {
        $v1 = strtotime($date . ' ' . $val1["on_duty_time"]);
        $v2 = strtotime($date . ' ' . $val2["on_duty_time"]);

        return ($target - $v1 > $v2 - $target) ? $val2 : $val1;
    }


    public function getTotalHrsMins($first, $last)
    {
        $diff = abs(strtotime($last) - strtotime($first));

        $h = floor($diff / 3600);
        $m = floor(($diff % 3600) / 60);
        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }

    public function renderData(Request $request)
    {
        // Extract start and end dates from the JSON data
        $startDateString = $request->dates[0];
        //$endDateString = $request->dates[1];
        if (isset($request->dates[1])) {
            $endDateString = $request->dates[1];
        } else {
            $endDateString = $request->dates[0];
        }
        $company_id = $request->company_ids[0] ?? $request->company_id ?? 0;
        $employee_ids = $request->employee_ids;

        // Convert start and end dates to DateTime objects
        $startDate = new \DateTime($startDateString);
        $endDate = new \DateTime($endDateString);
        $currentDate = new \DateTime();

        $response = [];
        // while ($startDate <= $currentDate && $startDate <= $endDate) {
        while ($startDate <= $endDate) {
            //$response[] = $this->render($company_id, $startDate->format("Y-m-d"), $employee_ids, true);
            $response[] = $this->render($company_id, $startDate->format("Y-m-d"), $employee_ids, $request->filled("auto_render") ? false : true, true, $request->channel ?? "unknown");

            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function renderRequest(Request $request)
    {
        return $this->render($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->UserIds, true, $request->channel ?? "unknown");
    }
    public function renderStep1($id, $date, $UserIds = [], $custom_render = false)
    {

        // Extract start and end dates from the JSON data
        $startDateString = $date;

        $endDateString = $date;

        $company_id = $id;

        $params = [
            "company_id" => $id,
            "date" => $date,
            "custom_render" => $custom_render,
            "UserIds" => $UserIds,
        ];

        $employee_ids = (new AttendanceLog)->getEmployeeIdsForNewLogsToRenderAuto($params);

        // Convert start and end dates to DateTime objects
        $startDate = new \DateTime($startDateString);
        $endDate = new \DateTime($endDateString);
        $currentDate = new \DateTime();

        $response = [];

        while ($startDate <= $currentDate && $startDate <= $endDate) {









            $response[] = $this->render($company_id, $startDate->format("Y-m-d"), $employee_ids, true);
            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function render($id, $date, $UserIds = [], $custom_render = false, $channel = "unknown")
    {


        $params = [
            "company_id" => $id,
            "date" => $date,
            "custom_render" => $custom_render,
            "UserIds" => $UserIds,
        ];



        $data = (new AttendanceLog)->getEmployeeIdsForNewLogsToRenderAuto($params);





        $message = "";

        if (!count($data)) {

            return "[" . $date . "] Cron:SyncAuto No data found.";
        }

        $items = [];

        foreach ($data as $UserID => $row) {

            if (!$row) {
                $message .= "[" . $date . "] Cron:SyncAuto Employee with $UserID SYSTEM USER ID has no Log(s).\n";
                continue;
            }

            // Cross-day filter: if yesterday's attendance was Night Shift with an IN,
            // today's early-morning logs in the previous day's OUT window belong to
            // THAT pairing — skip them so today's shift selection is correct.
            $prevDate = date("Y-m-d", strtotime($date . " -1 day"));
            $prevAttendance = Attendance::where("company_id", $params["company_id"])
                ->where("employee_id", $UserID)
                ->where("date", $prevDate)
                ->first();

            if ($prevAttendance && (int) $prevAttendance->shift_type_id === 4
                && !empty($prevAttendance->in) && $prevAttendance->in !== "---") {
                $prevShift = Shift::find($prevAttendance->shift_id);
                if ($prevShift && !empty($prevShift->ending_in) && !empty($prevShift->ending_out)) {
                    $tolSec = 60 * 60;
                    $windowStart = strtotime($date . ' ' . $prevShift->ending_in) - $tolSec;
                    $windowEnd   = strtotime($date . ' ' . $prevShift->ending_out) + $tolSec;

                    $rowArr = is_object($row) ? $row->toArray() : $row;
                    $row = array_values(array_filter($rowArr, function ($log) use ($windowStart, $windowEnd) {
                        $logSec = strtotime($log['LogTime']);
                        return !($logSec >= $windowStart && $logSec <= $windowEnd);
                    }));

                    if (empty($row)) {
                        $message .= "[" . $date . "] Cron:SyncAuto $UserID: all today's logs belong to prev-day Night Shift OUT.\n";
                        continue;
                    }
                }
            }

            $shifts = ((new Shift)->getAutoShiftsAll($params["company_id"], $row[0]["employee"]["branch_id"]));

            //return $row;
            if (count($shifts) > 0) {

                $nearestShift = $this->findClosest($shifts, count($shifts), $row, $date);

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




                //------------
                if ($nearestShift == null) {
                    return "Nearest Shift is not found1 " . $date;
                }
                $arr = [];
                $arr["company_id"] = $params["company_id"];
                $arr["date"] = $params["date"];
                $arr["employee_id"] = $UserID;
                $arr["shift_type_id"] = $nearestShift["shift_type_id"];
                $arr["shift_id"] = $nearestShift["id"];

                // $arr["data"] = $row;
                // $arr["nearestShift"] = $nearestShift;
                // $arr["shifts"] = $shifts;
                // return $items[] = $arr;

                // Schedule dance (ported from old software): before delegating, update the
                // auto-shift schedule to the picked shift's type/id so the delegated
                // controller (Single/Night/Filo/etc.) loads it via its type filter. Reset
                // back to shift_type_id=3 after, so the employee stays in the auto pool.
                ScheduleEmployee::where("company_id", $params['company_id'])
                    ->where("employee_id", $UserID)
                    ->where("isAutoShift", true)
                    ->update([
                        "shift_type_id" => $nearestShift['shift_type_id'],
                        "shift_id"      => $nearestShift['id'],
                    ]);

                $result = $this->renderRelatedShiftype($nearestShift['shift_type_id'], $UserID, $params, $channel);

                ScheduleEmployee::where("company_id", $params['company_id'])
                    ->where("employee_id", $UserID)
                    ->where("isAutoShift", true)
                    ->update([
                        "shift_type_id" => 3,
                    ]);

                $message .= "[" . $date . "] Cron:SyncAuto The Log(s) has been rendered against " . $UserID . " SYSTEM USER ID.\n";

                $message .= " Nearest shift ({$nearestShift['name']})";
                $message .= " Notes: " . json_encode($result);

                // if (!$params["custom_render"])
                {
                    // AttendanceLog::where("company_id", $id)->where("UserID", $UserID)->update(["checked" => true, "checked_datetime" => date('Y-m-d H:i:s')]);

                    AttendanceLog::where("company_id", $id)->whereIn("UserID", $UserIds)
                        ->where("LogTime", ">=", $date . ' 00:00:00')
                        ->where("LogTime", "<=", $date . ' 23:59:00')
                        ->update([
                            "checked" => true,
                            "checked_datetime" => date('Y-m-d H:i:s'),
                            "channel" => $channel,
                            "log_message" => substr($message, 0, 200)
                        ]);
                }
            }
        }


        return $message;
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
