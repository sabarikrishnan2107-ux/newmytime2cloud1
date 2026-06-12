<?php

namespace App\Http\Controllers\Shift;

use App\Models\Attendance;
use Illuminate\Http\Request;
use App\Models\AttendanceLog;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use DateTime;

class NightShiftController extends Controller
{
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
        $endDate->modify('+1 day');
        $currentDate = new \DateTime();

        $response = [];

        // while ($startDate <= $currentDate && $startDate <= $endDate) {
        while ($startDate <= $endDate) {
            //$response[] = $this->render($company_id, $startDate->format("Y-m-d"), 4, $employee_ids, true);
            $response[] = $this->render($company_id, $startDate->format("Y-m-d"), 4, $employee_ids, $request->filled("auto_render") ? false : true, $request->channel ?? "unknown");

            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function renderRequest(Request $request)
    {
        return $this->render($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->shift_type_id, $request->UserIds, true, $request->channel ?? "unknown");
    }

    public function render($id, $date, $shift_type_id, $UserIds = [], $custom_render = false, $isRequestFromAutoshift = false, $channel = "unknown")
    {
        $params = [
            "company_id" => $id,
            "date" => $date,
            "shift_type_id" => $shift_type_id,
            "custom_render" => $custom_render,
            "UserIds" => $UserIds,
        ];

        if (!$custom_render) {
            //$params["UserIds"] = (new AttendanceLog)->getEmployeeIdsForNewLogsToRender($params);
            $params["UserIds"] = (new AttendanceLog)->getEmployeeIdsForNewLogsNightToRender($params);
        }

        //$logsEmployees =  (new AttendanceLog)->getLogsForRender($params);

        $logsEmployees = [];


        if ($isRequestFromAutoshift) {
            $logsEmployees =  (new AttendanceLog)->getLogsForRenderOnlyAutoShift($params);
        } else {
            //$logsEmployees =  (new AttendanceLog)->getLogsForRender($params);
            $logsEmployees =  (new AttendanceLog)->getLogsForRenderNotAutoShift($params);
        }

        //update atendance table with shift ID if shift with employee not found 
        if (count($logsEmployees) == 0) {
            $employees = (new Employee())->GetEmployeeWithShiftDetails($params);
            foreach ($employees as $key => $value) {
                if ($value->schedule->shift && $value->schedule->shift["id"] > 0) {
                    $data1 = [
                        "shift_id" => $value->schedule->shift["id"],
                        "shift_type_id" => $value->schedule->shift["shift_type_id"]
                    ];
                    $model1 = Attendance::query();
                    $model1->whereIn("employee_id", $UserIds);
                    $model1->where("date", $params["date"]);
                    $model1->where("company_id", $params["company_id"]);
                    $model1->where("shift_id", 0);
                    $model1->where("shift_type_id", 0);
                    $model1->update($data1);
                }
            }
        }


        $items = [];
        $keys = [];
        $message = "";


        $dayOfWeekThreeLetter = date('D', strtotime($date));
        $currentDayKey = Attendance::DAY_MAP[$dayOfWeekThreeLetter] ?? '';

        foreach ($logsEmployees as $key => $logs) {

            $logs = $logs->toArray() ?? [];

            // Cross-day filter (auto-shift only): skip today's morning logs that
            // belong to yesterday's Night Shift OUT so today's firstLog is correct.
            if ($isRequestFromAutoshift) {
                $prevDate = date("Y-m-d", strtotime($params['date'] . " -1 day"));
                $prevAttendance = Attendance::where("company_id", $params["company_id"])
                    ->where("employee_id", $key)
                    ->where("date", $prevDate)
                    ->first();

                if ($prevAttendance && (int) $prevAttendance->shift_type_id === 4
                    && !empty($prevAttendance->in) && $prevAttendance->in !== "---") {
                    $prevShift = \App\Models\Shift::find($prevAttendance->shift_id);
                    if ($prevShift && !empty($prevShift->ending_in) && !empty($prevShift->ending_out)) {
                        $tolSec = 60 * 60;
                        $windowStart = strtotime($params['date'] . ' ' . $prevShift->ending_in) - $tolSec;
                        $windowEnd   = strtotime($params['date'] . ' ' . $prevShift->ending_out) + $tolSec;

                        $logs = array_values(array_filter($logs, function ($log) use ($windowStart, $windowEnd) {
                            $logSec = strtotime($log['LogTime']);
                            return !($logSec >= $windowStart && $logSec <= $windowEnd);
                        }));
                    }
                }
            }

            $firstLog = null;
            $lastLog = null;

            $firstLog = collect($logs)->filter(function ($record) {
                return $record["log_type"] == "In" || $record["log_type"] == null || $record["log_type"] == "Auto";
            })->first();

            // Smart lastLog (auto-shift only) — respects explicit "Out" type + next-day OUT window
            if ($isRequestFromAutoshift && $firstLog) {
                $scheduleShift = $firstLog["schedule"]["shift"] ?? null;
                $nextDay = date("Y-m-d", strtotime($params['date'] . " +1 day"));
                $outWinStart = null;
                $outWinEnd   = null;
                if ($scheduleShift && !empty($scheduleShift["ending_in"]) && !empty($scheduleShift["ending_out"])) {
                    $outWinStart = strtotime($nextDay . ' ' . $scheduleShift["ending_in"]) - 60 * 60;
                    $outWinEnd   = strtotime($nextDay . ' ' . $scheduleShift["ending_out"]) + 60 * 60;
                }

                // Priority 1: explicit "Out" in next-day OUT window
                if ($outWinStart && $outWinEnd) {
                    $lastLog = collect($logs)->filter(function ($record) use ($firstLog, $outWinStart, $outWinEnd) {
                        $t = strtotime($record['LogTime']);
                        return $record['log_type'] === 'Out'
                            && $record['LogTime'] > $firstLog['LogTime']
                            && $t >= $outWinStart && $t <= $outWinEnd;
                    })->first();
                }

                // Priority 2: any log in next-day OUT window
                if (!$lastLog && $outWinStart && $outWinEnd) {
                    $lastLog = collect($logs)->filter(function ($record) use ($firstLog, $outWinStart, $outWinEnd) {
                        $t = strtotime($record['LogTime']);
                        return $record['LogTime'] > $firstLog['LogTime']
                            && $t >= $outWinStart && $t <= $outWinEnd;
                    })->first();
                }

                // Priority 3: explicit "Out" anywhere after firstLog
                if (!$lastLog) {
                    $lastLog = collect($logs)->filter(function ($record) use ($firstLog) {
                        return $record['log_type'] === 'Out'
                            && $record['LogTime'] > $firstLog['LogTime'];
                    })->first();
                }
            }

            // Fallback (existing behaviour): first log of Out/null/Auto/auto after firstLog
            if (!$lastLog && $firstLog) {
                $lastLog = collect($logs)->filter(function ($record) use ($firstLog) {
                    return ($record["log_type"] == "Out" || $record["log_type"] == null || $record["log_type"] == "Auto" || $record["log_type"] == "auto") && $record["LogTime"] > $firstLog['LogTime'];
                })->first();
            }

            if ($isRequestFromAutoshift) {

                if ($firstLog == null) {
                    $firstLog = collect($logs)->filter(function ($record) {
                        return (isset($record["device"]["function"]) && ($record["device"]["function"] == "In"));
                    })->first();
                }
                if ($lastLog == null) {
                    $lastLog = collect($logs)->filter(function ($record) use ($firstLog) {
                        return isset($record["device"]["function"]) && ($record["device"]["function"] == "Out") && $record["LogTime"] > $firstLog['LogTime'];
                    })->first();
                }
            } else {

                if ($firstLog == null) {

                    $firstLog = collect($logs)->filter(function ($record) {
                        return (isset($record["device"]["function"]) && ($record["device"]["function"] != "Out"));
                    })->first();
                }
                if ($lastLog == null) {
                    $lastLog = collect($logs)->filter(function ($record) use ($firstLog) {
                        return isset($record["device"]["function"]) && ($record["device"]["function"] != "In") && $record["LogTime"] > $firstLog['LogTime'];
                    })->first();
                }
            }


            $schedule = $firstLog["schedule"] ?? false;

            $shift = $schedule["shift"] ?? false;

            if (!$schedule) {
                $keys[] = $key;
                $message .= ".  No schedule is mapped with combination  System User Id: $key   and Date : " . $params["date"] . " ";
                continue;
            }
            if (!$firstLog["schedule"]["shift_type_id"]) {
                $keys[] = $key;
                $message .= "$key : None f=of the  Master shift configured on  date:" . $params["date"];
                continue;
            }

            $beginningIn =  $params['date'] . ' ' . $shift["beginning_in"];
            $beginningOut = $params['date'] . ' ' . $shift["beginning_out"];

            // Auto-shift only: 60-min IN window tolerance; bypass entirely if explicit "In".
            if ($isRequestFromAutoshift) {
                if (($firstLog['log_type'] ?? null) === 'In') {
                    $inOutOfRange = false;
                } else {
                    $tolSec = 60 * 60;
                    $beginningInSoft  = date("Y-m-d H:i:s", strtotime($beginningIn)  - $tolSec);
                    $beginningOutSoft = date("Y-m-d H:i:s", strtotime($beginningOut) + $tolSec);
                    $inOutOfRange = ($firstLog['LogTime'] < $beginningInSoft || $firstLog['LogTime'] > $beginningOutSoft);
                }
            } else {
                $inOutOfRange = ($firstLog['LogTime'] < $beginningIn || $firstLog['LogTime'] > $beginningOut);
            }

            if ($inOutOfRange) {
                $keys[] = $key;
                $message .= "{$key} LogTime({$firstLog["LogTime"]}) OUT time  is out of range ({$beginningIn} to {$beginningOut})";
                $message .= " Device: {$firstLog["DeviceID"]}";
                continue;
            }

            $status = Attendance::processWeekOffFunc($currentDayKey, $shift['weekoff_rules'] ?? "A", $id, $date, $key, $firstLog);


            $item = [
                "roster_id" => 0,
                "total_hrs" => "---",
                "in" => $firstLog["time"] ?? "---",
                "out" =>  "---",
                "ot" => "---",
                "device_id_in" =>  $firstLog["DeviceID"] ?? "---",
                "device_id_out" => "---",
                "date" => $params["date"],
                "company_id" => $params["company_id"],
                "employee_id" => $key,
                "shift_id" => $firstLog["schedule"]["shift_id"] ?? 0,
                "shift_type_id" => $firstLog["schedule"]["shift_type_id"] ?? 0,
                "status" => $status ?? "A",
                "late_coming" => "---",
                "early_going" => "---",
            ];

            if ($shift && $item["shift_type_id"] == 4) {
                $item["late_coming"] =  $this->calculatedLateComing($item["in"], $shift["on_duty_time"], $shift["late_time"]);

                if ($item["late_coming"] != "---") {
                    $item["status"] = "LC";
                }
            }
            //commented because last log is not exist dual to device type is manual
            // $lastLog = $this->getLogsForOutOnly(
            //     $item["company_id"],
            //     $key,
            //     $item["date"],
            //     $shift,
            //     $custom_render
            // );
            /*
            $lastLog = collect($logs)->filter(function ($record) {
                return $record["log_type"] == "Out";
            })->last();


            if ($lastLog == null) {

                $lastLog = collect($logs)->filter(function ($record) {
                    return (isset($record["device"]["function"]) && ($record["device"]["function"] != "In"));
                })->last();
            }*/

            if ($lastLog) {

                $function = $lastLog["device"]["function"];

                if (!isset($function) && ($function !== "In")) {
                    $keys[] = $key;
                    $message .= " $key : Wrong Punch Out(" . $lastLog["LogTime"] . ") from (" . $lastLog["DeviceID"] . ")";
                    continue;
                }


                $lastLogSchedule = $lastLog["schedule"] ?? false;
                $lastLogShift = $lastLogSchedule["shift"] ?? false;


                $endingIn =  date("Y-m-d", strtotime($params['date'] . " +1 day")) . " " . $lastLogShift["ending_in"];
                $endingOut =  date("Y-m-d", strtotime($params['date'] . " +1 day")) . " " . $lastLogShift["ending_out"];

                // Auto-shift only: 60-min OUT window tolerance; bypass if explicit "Out".
                if ($isRequestFromAutoshift) {
                    if (($lastLog['log_type'] ?? null) === 'Out') {
                        $outOfRange = false;
                    } else {
                        $tolSec = 60 * 60;
                        $endingInSoft  = date("Y-m-d H:i:s", strtotime($endingIn)  - $tolSec);
                        $endingOutSoft = date("Y-m-d H:i:s", strtotime($endingOut) + $tolSec);
                        $outOfRange = ($lastLog['LogTime'] < $endingInSoft || $lastLog['LogTime'] > $endingOutSoft);
                    }
                } else {
                    $outOfRange = ($lastLog['LogTime'] < $endingIn || $lastLog['LogTime'] > $endingOut);
                }

                if ($outOfRange) {
                    $keys[] = $key;
                    $message .= "{$key} LogTime({$lastLog["LogTime"]}) IN time  is out of range ({$endingIn} to {$endingOut})";
                    $message .= " Device: {$lastLog["DeviceID"]}";
                    continue;
                }



                $item["status"] = "P";
                $item["device_id_out"] = $lastLog["DeviceID"] ?? "---";
                $item["out"] = $lastLog["time"] ?? "---";

                if ($item["out"] !== "---") {
                    //$item["total_hrs"] = $this->calculatedHours($item["in"], $item["out"]);
                    $item["total_hrs"] = $this->calculatedHours($firstLog['LogTime'], $lastLog['LogTime']);
                }



                if ($schedule["isOverTime"] ?? false) {
                    $otTime = $this->calculatedOT($item["total_hrs"], $lastLogShift["working_hours"], $lastLogShift["overtime_interval"]);

                    if ($otTime == "---") {
                        $otTime = "00:00";
                    }

                    // Convert "HH:MM" to total minutes
                    [$otHours, $otMinutes] = explode(':', $otTime);
                    $totalOtMinutes = ($otHours * 60) + $otMinutes;

                    $in = $item["in"];               // e.g. 08:20
                    $out = $item["out"];             // e.g. 19:00
                    $on_duty_time = $shift["on_duty_time"];
                    $off_duty_time = $shift["off_duty_time"] ?? null;

                    $inTime = new DateTime($in);
                    $onDutyTime = new DateTime($on_duty_time);
                    $outTime = new DateTime($out);
                    $offDutyTime = $off_duty_time ? new DateTime($off_duty_time) : null;

                    if ($shift["overtime_type"] === "Both") {
                        $item["ot"] = $otTime;
                    } else if ($shift["overtime_type"] === "After") {
                        $earlyMinutes = 0;
                        if ($inTime < $onDutyTime) {
                            $earlyDiff = $onDutyTime->diff($inTime);
                            $earlyMinutes = ($earlyDiff->h * 60) + $earlyDiff->i;
                        }

                        $totalOtMinutes = max(0, $totalOtMinutes - $earlyMinutes);
                    } else if ($shift["overtime_type"] === "Before") {
                        $lateMinutes = 0;
                        if ($offDutyTime && $outTime > $offDutyTime) {
                            $lateDiff = $outTime->diff($offDutyTime);
                            $lateMinutes = ($lateDiff->h * 60) + $lateDiff->i;
                        }

                        $totalOtMinutes = max(0, $totalOtMinutes - $lateMinutes);
                    }

                    // Convert total minutes back to HH:MM
                    $otHours = floor($totalOtMinutes / 60);
                    $otMinutes = $totalOtMinutes % 60;
                    $item["ot"] = str_pad($otHours, 2, "0", STR_PAD_LEFT) . ":" . str_pad($otMinutes, 2, "0", STR_PAD_LEFT);
                }

                if ($item["shift_type_id"] == 4) {


                    if ($shift["halfday"] == date("l")) {

                        $time2 = $lastLogShift["on_duty_time"];
                        $time1 = $lastLogShift["halfday_working_hours"];
                        $lastLogShift["off_duty_time"] = gmdate("H:i", (strtotime($time1) - strtotime('00:00')) + strtotime($time2) - strtotime('00:00'));
                    }

                    $item["early_going"] = $this->calculatedEarlyGoing($item["out"], $lastLogShift["off_duty_time"], $lastLogShift["early_time"]);

                    if ($item["early_going"] != "---") {
                        $item["status"] = "EG";
                    }
                }
            }

            // Finalize: only one punch (in OR out missing) → Missing; both present but under the worked-minutes floor → Absent
            $minPresentMins = (int) config('attendance.min_present_minutes', 60);
            if (!in_array($item["status"], ["O", "H", "L", "A", "HD"])) {
                $hasIn  = $item["in"]  !== "---";
                $hasOut = $item["out"] !== "---";
                if ($hasIn !== $hasOut) {
                    $item["status"] = "M";
                } elseif ($hasIn && $hasOut && is_string($item["total_hrs"]) && str_contains($item["total_hrs"], ":") && time_to_minutes($item["total_hrs"]) < $minPresentMins) {
                    $item["status"] = "A";
                }
            }

            $items[] = $item;
        }

        if (!count($logsEmployees)) {
            $message = '[' . $date . " " . date("H:i:s") . '] Night Shift: No data found.';
            $this->devLog("render-manual-log", $message);
            return $message;
        }

        // if (count($keys)) {
        //     $message = '[' . $date . " " . date("H:i:s") . '] Night Shift: ' . $message;
        //     $this->devLog("render-manual-log", $message);
        //     return $message;
        // }

        try {
            $model = Attendance::query();
            $model->where("company_id", $id);
            $model->whereIn("employee_id", array_column($items, "employee_id"));
            $model->where("date", $date);
            $model->delete();
            $model->insert($items);

            $message = "[" . $date . " " . date("H:i:s") .  "] Night Shift. Affected Ids: " . json_encode($UserIds) . " " . $message;


            //if (!$custom_render)
            {
                // AttendanceLog::where("company_id", $id)->whereIn("UserID", $UserIds)->update(["checked" => true, "checked_datetime" => date('Y-m-d H:i:s')]);
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
        } catch (\Throwable $e) {
            $message = "[" . $date . " " . date("H:i:s") .  "] Night Shift. " . $e->getMessage();
        }

        $this->devLog("render-manual-log", $message);
        return ($message);
    }


    public function getLogsForOutOnly($company_id, $UserId, $date, $shift, $custom_render)
    {


        $model = AttendanceLog::query();
        $model->when(!$custom_render, fn($q) => $q->where("checked", false));
        $model->where("company_id", $company_id);
        $model->where("UserID", $UserId);
        $model->where("LogTime", ">=", date("Y-m-d", strtotime($date . " +1 day")) . " " . $shift["ending_in"]);
        $model->where("LogTime", "<=", date("Y-m-d", strtotime($date . " +2 day")) . " " . $shift["ending_out"]);
        $model->distinct("LogTime", "UserID", "company_id");
        $model->orderBy("LogTime", "desc");
        //$model->whereHas("device", fn ($q) => $q->whereIn("function", ["Out", "all"]));
        $model->whereHas("device", fn($q) => $q->whereIn("function", ["Out", "all"]));
        $model->with(["schedule", "device"]);
        return $model->first();
    }

    public function calculatedHours($in, $out)
    {

        //$diff = abs(((strtotime($in)) - (strtotime($out) + 86400)));
        $diff =  strtotime($out) - strtotime($in);
        $h = floor($diff / 3600);
        $m = floor(($diff % 3600) / 60);
        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }
}
