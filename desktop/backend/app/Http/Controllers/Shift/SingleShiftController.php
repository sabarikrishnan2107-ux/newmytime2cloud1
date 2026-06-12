<?php

namespace App\Http\Controllers\Shift;

use App\Http\Controllers\API\SharjahUniversityAPI;
use App\Models\Attendance;
use Illuminate\Http\Request;
use App\Models\AttendanceLog;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\ScheduleEmployee;
use App\Models\Shift;
use DateTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SingleShiftController extends Controller
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
        $currentDate = new \DateTime();

        $response = [];

        // while ($startDate <= $currentDate && $startDate <= $endDate) {
        while ($startDate <= $endDate) {
            // $response[] = $this->render($company_id, $startDate->format("Y-m-d"), 6, $employee_ids, true);
            $response[] = $this->render($company_id, $startDate->format("Y-m-d"), 6, $employee_ids, $request->filled("auto_render") ? false : true, false, $request->channel ?? "unknown");

            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function renderRequest(Request $request)
    {
        $version = env("VERSION");

        Log::info("Using: $version");

        if ($request->company_id == 60 || $request->company_id == 65) {
            return $this->renderV1($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->shift_type_id, $request->UserIds, true, false, $request->channel ?? "unknown");
        }

        return $this->render($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->shift_type_id, $request->UserIds, true, false, $request->channel ?? "unknown");
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
            $params["UserIds"] = (new AttendanceLog)->getEmployeeIdsForNewLogsToRender($params);
            // return json_encode($params["UserIds"]);
        }
        $logsEmployees = [];


        if ($isRequestFromAutoshift) {
            $logsEmployees =  (new AttendanceLog)->getLogsForRenderOnlyAutoShift($params);
        } else {
            //$logsEmployees =  (new AttendanceLog)->getLogsForRender($params);
            $logsEmployees =  (new AttendanceLog)->getLogsForRenderNotAutoShift($params);
        }

        $items = [];


        // $shifts = Shift::with("employee_schedule")->where("company_id", $params["company_id"])->orderBy("id", "desc")->get()->toArray();

        $schedule = ScheduleEmployee::where("company_id", $params["company_id"])->get();



        $previousShifts = Attendance::where("company_id", $params["company_id"])
            ->whereDate("date", date("Y-m-d", strtotime($params["date"] . " -1 day")))
            ->where("shift_type_id", 4)
            ->get()
            ->keyBy("employee_id");

        foreach ($logsEmployees as $key => $logs) {


            $logs = $logs->toArray() ?? [];

            // Find the first log based on the schedule and previous shift
            $firstLog = collect($logs)->first(function ($record) use ($key, $previousShifts) {
                $previousShift = $previousShifts->get($key);

                // Validate against previous shift's out time if shift type is 6
                if ($previousShift && $previousShift->shift_type_id == 6) {
                    return $previousShift->out != $record["time"];
                }

                // Validate against schedule timings
                $beginning_in = $record["schedule"]["shift"]["beginning_in"] ?? false;
                $beginning_out = $record["schedule"]["shift"]["beginning_out"] ?? false;

                return $beginning_in && $beginning_out && $record["time"] >= $beginning_in && $record["time"] <= $beginning_out;
            });

            // Auto-shift only: fallback firstLog to first chronological log if strict window missed.
            if ($isRequestFromAutoshift && !$firstLog && !empty($logs)) {
                $firstLog = collect($logs)->first();
            }

            // Last log: strictly from OUT window if defined
            $sampleShift = collect($logs)->first()["schedule"]["shift"] ?? [];
            $outStart = $sampleShift["ending_in"] ?? "---";
            $outEnd = $sampleShift["ending_out"] ?? "---";
            $hasOutWin = ($outStart !== "---" && $outEnd !== "---" && $outStart && $outEnd);

            if ($hasOutWin) {
                $lastLog = collect($logs)->last(function ($record) use ($outStart, $outEnd) {
                    return $record["time"] >= $outStart && $record["time"] <= $outEnd;
                });
            } else {
                $lastLog = collect($logs)->last(function ($record) {
                    return in_array($record["log_type"], ["Out", "out", "Auto", "auto", null], true);
                });
            }

            // Auto-shift only: fallback lastLog must be strictly AFTER IN window ends
            // (prevents morning-only punches like 08:39+08:43 being paired as IN/OUT).
            if ($isRequestFromAutoshift && !$lastLog && !empty($logs)) {
                $inWindowEnd = $sampleShift["beginning_out"] ?? null;
                if ($inWindowEnd && $inWindowEnd !== "---") {
                    $lastLog = collect($logs)->last(function ($record) use ($inWindowEnd) {
                        return $record["time"] > $inWindowEnd;
                    });
                }
            }

            $schedules = ScheduleEmployee::where("company_id", $params["company_id"])->where("employee_id", $key)->get()->toArray();

            $schedule = $firstLog["schedule"] ?? false;

            $shift =  $schedule["shift"] ?? false;

            if (!$schedule) continue;

            $dayOfWeek = date('D', strtotime($firstLog["LogTime"])); // Convert to timestamp and get the day

            foreach ($schedules as $singleSchedule) {
                $day = $singleSchedule["shift"]["days"];

                if (isset($shift["days"]) && is_array($shift["days"]) && in_array($dayOfWeek, $day, true)) {
                    $schedule = $singleSchedule ?? false;
                    $shift =  $schedule["shift"] ?? false;
                    break;
                }
            }

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
                "shift_id" => $shift["id"] ?? 0,
                "shift_type_id" => $shift["shift_type_id"] ?? 0,
                "status" => "M",
                "late_coming" => "---",
                "early_going" => "---",
            ];

            if ($shift && $item["shift_type_id"] == 6) {
                $item["late_coming"] =  $this->calculatedLateComing($item["in"], $shift["on_duty_time"], $shift["late_time"]);

                if ($item["late_coming"] != "---") {
                    $item["status"] = "LC";
                }
            }

            if ($shift && $lastLog && count($logs) > 1 && $firstLog["time"] !== $lastLog["time"]) {

                $item["status"] = "P";
                $item["device_id_out"] = $lastLog["DeviceID"] ?? "---";
                $item["out"] = $lastLog["time"] ?? "---";

                if ($item["out"] !== "---") {
                    $item["total_hrs"] = $this->getTotalHrsMins($item["in"], $item["out"]);
                }

                if ($schedule["isOverTime"] ?? false) {
                    $otTime = $this->calculatedOT($item["total_hrs"], $shift["working_hours"], $shift["overtime_interval"]);

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

                if ($item["shift_type_id"] == 6) {
                    if ($shift["halfday"] == date("l")) {
                        $time2 = $shift["on_duty_time"];
                        $time1 = $shift["halfday_working_hours"];
                        $shift["off_duty_time"] = gmdate("H:i", (strtotime($time1) - strtotime('00:00')) + strtotime($time2) - strtotime('00:00'));
                    }

                    $item["early_going"] = $this->calculatedEarlyGoing($item["out"], $shift["off_duty_time"], $shift["early_time"]);

                    if ($item["early_going"] != "---") {
                        $item["status"] = "EG";
                    }
                }
            }

            // Final check: only one punch (in OR out missing) = Missing; both present but under the worked-minutes floor = Absent
            if (!in_array($item["status"], ["O", "H", "L", "A", "HD"])) {
                $hasIn  = $item["in"]  !== "---";
                $hasOut = $item["out"] !== "---";
                if ($hasIn !== $hasOut) {
                    $item["status"] = "M";
                } elseif ($hasIn && $hasOut && is_string($item["total_hrs"]) && str_contains($item["total_hrs"], ":") && time_to_minutes($item["total_hrs"]) < (int) config('attendance.min_present_minutes', 60)) {
                    $item["status"] = "A";
                }
            }

            $items[] = $item;
        }

        if (!count($items)) {
            $message = '[' . $date . " " . date("H:i:s") . '] Single Shift: No data found';
            $this->devLog("render-manual-log", $message);
            return $message;
        }

        try {
            // Skip destructive delete if we have nothing to reinsert.
            if (empty($items)) {
                $message = "[" . $date . " " . date("H:i:s") .  "] Single Shift: No data found (skipping delete)";
                $this->devLog("render-manual-log", $message);
                return $message;
            }

            DB::beginTransaction();

            Attendance::where("company_id", $id)
                ->whereIn("employee_id", array_column($items, "employee_id"))
                ->where("date", $date)
                ->delete();

            Attendance::insert($items);

            DB::commit(); // only commit after both operations succeed

            $message = "[" . $date . " " . date("H:i:s") .  "] Single Shift.   Affected Ids: " . json_encode($UserIds);
        } catch (\Throwable $e) {
            DB::rollback();
            $message = "[" . $date . " " . date("H:i:s") .  "] Single Shift. " . $e->getMessage();
        }

        $this->devLog("render-manual-log", $message);
        return $message;
    }

    public function renderV1($id, $date, $shift_type_id, $UserIds = [], $custom_render = false, $isRequestFromAutoshift = false, $channel = "unknown")
    {
        $params = [
            "company_id" => $id,
            "date" => $date,
            "shift_type_id" => $shift_type_id,
            "custom_render" => $custom_render,
            "UserIds" => $UserIds,
        ];

        if (!$custom_render) {
            $params["UserIds"] = (new AttendanceLog)->getEmployeeIdsForNewLogsToRender($params);
            // return json_encode($params["UserIds"]);
        }
        $logsEmployees = [];


        if ($isRequestFromAutoshift) {
            $logsEmployees =  (new AttendanceLog)->getLogsForRenderOnlyAutoShift($params);
        } else {
            //$logsEmployees =  (new AttendanceLog)->getLogsForRender($params);
            $logsEmployees =  (new AttendanceLog)->getLogsForRenderNotAutoShift($params);
        }

        $items = [];


        // $shifts = Shift::with("employee_schedule")->where("company_id", $params["company_id"])->orderBy("id", "desc")->get()->toArray();

        $schedule = ScheduleEmployee::where("company_id", $params["company_id"])->get();

        $previousShifts = Attendance::where("company_id", $params["company_id"])
            ->whereDate("date", date("Y-m-d", strtotime($params["date"] . " -1 day")))
            ->where("shift_type_id", 4)
            ->get()
            ->keyBy("employee_id");

        $items = [];

        $dayOfWeekThreeLetter = date('D', strtotime($date));
        $currentDayKey = Attendance::DAY_MAP[$dayOfWeekThreeLetter] ?? '';

        // LOOP THROUGH ALL USERS (This ensures Week-offs and Absentees are processed)
        foreach ($params["UserIds"] as $employeeId) {

            // Get logs for this specific employee from the collection
            $logs = isset($logsEmployees[$employeeId]) ? $logsEmployees[$employeeId]->toArray() : [];

            // 1. Identify first/last logs
            $firstLog = collect($logs)->first(function ($record) use ($employeeId, $previousShifts) {
                $previousShift = $previousShifts->get($employeeId);
                if ($previousShift && $previousShift->shift_type_id == 6) {
                    return $previousShift->out != $record["time"];
                }
                $beginning_in = $record["schedule"]["shift"]["beginning_in"] ?? false;
                $beginning_out = $record["schedule"]["shift"]["beginning_out"] ?? false;
                return $beginning_in && $beginning_out && $record["time"] >= $beginning_in && $record["time"] <= $beginning_out;
            });

            // Last log: strictly from OUT window if defined, otherwise fallback to log_type
            $hasOutWindow = false;
            $lastLog = null;
            // Check if shift has OUT window defined
            $sampleSchedule = collect($logs)->first()["schedule"]["shift"] ?? [];
            $outWindowStart = $sampleSchedule["ending_in"] ?? "---";
            $outWindowEnd = $sampleSchedule["ending_out"] ?? "---";
            $hasOutWindow = ($outWindowStart !== "---" && $outWindowEnd !== "---" && $outWindowStart && $outWindowEnd);

            if ($hasOutWindow) {
                // Strict: only take log within OUT window
                $lastLog = collect($logs)->last(function ($record) use ($outWindowStart, $outWindowEnd) {
                    return $record["time"] >= $outWindowStart && $record["time"] <= $outWindowEnd;
                });
            } else {
                // No OUT window: take last log with Out/Auto type
                $lastLog = collect($logs)->last(function ($record) {
                    return in_array($record["log_type"], ["Out", "out", "Auto", "auto", null], true);
                });
            }

            // 2. Resolve Schedule and Shift (even if no logs exist)
            $schedule = $firstLog["schedule"] ?? ScheduleEmployee::where("company_id", $id)
                ->where("employee_id", $employeeId)
                ->with('shift')
                ->first();

            $shift = $schedule["shift"] ?? false;

            if (!$shift) continue;

            $shift = Attendance::processHalfDay($currentDayKey, $shift['halfday_rules'] ?? null, $shift);

            $status = Attendance::processWeekOffFunc($currentDayKey, $shift['weekoff_rules'] ?? "A", $id, $date, $employeeId, $firstLog);

            // Check if any log is manual
            $hasManualLog = collect($logs)->contains(fn($log) => ($log['DeviceID'] ?? '') === 'Manual');

            // 4. Initialize Item
            $item = [
                "roster_id" => 0,
                "total_hrs" => "---",
                "in" => $firstLog["time"] ?? "---",
                "out" => "---",
                "ot" => "---",
                "device_id_in" => $firstLog["DeviceID"] ?? "---",
                "device_id_out" => "---",
                "date" => $date,
                "company_id" => $id,
                "employee_id" => $employeeId,
                "shift_id" => $shift["id"] ?? 0,
                "shift_type_id" => $shift["shift_type_id"] ?? 0,
                "status" => $status ?? "A",
                "is_manual_entry" => $hasManualLog,
                "late_coming" => "---",
                "early_going" => "---",
            ];


            // --- 1. LATE COMING CALCULATION ---

            // Always calculate late time for display
            if ($item["in"] !== "---" && isset($shift["on_duty_time"])) {
                $lcMins = calculateTimeDiff($item["in"], $shift["on_duty_time"], 'late', $shift["late_time"] ?? "00:00");
                if ($lcMins) {
                    $item["late_coming"] = formatMinutes($lcMins);
                    // Only change status if rule is active
                    if (($shift["attendanc_rule_late_coming"] ?? 'No Action') !== 'No Action') {
                        $item["status"] = "LC";
                    }
                }
            }

            // Significant Late Coming (Overwrites Status to HD or A)
            $sigLateRule = $shift["significant_attendanc_rule_late_coming"] ?? 'No Action';
            if ($sigLateRule !== 'No Action' && $item["in"] !== "---") {
                $sigLcMins = calculateTimeDiff($item["in"], $shift["on_duty_time"], 'late', $shift["absent_min_in"]);
                if ($sigLcMins) {
                    $item["late_coming"] = formatMinutes($sigLcMins);
                    $item["status"] = ($sigLateRule === "Half Day") ? "HD" : "A";
                }
            }

            // --- 2. OUT LOG & OVERTIME PROCESSING ---

            if ($firstLog) {
                // Process Valid Out Log
                if ($lastLog && count($logs) > 1 && $firstLog["time"] !== $lastLog["time"]) {
                    // Initialize as Present if not already marked HD/A by late coming
                    if (!in_array($item["status"], ["HD", "A"])) {
                        $item["status"] = "P";
                    }

                    $item["device_id_out"] = $lastLog["DeviceID"] ?? "---";
                    $item["out"] = $lastLog["time"] ?? "---";

                    if ($item["out"] !== "---") {
                        $item["total_hrs"] = $this->getTotalHrsMins($item["in"], $item["out"]);
                    }

                    // Overtime Logic (Before, After, Both, None)
                    // Define permissions based on whether today is a weekend or holiday

                    // Parent Condition: Only enter if OT is enabled AND the day allows it
                    if (
                        ($schedule["isOverTime"] ?? false) &&
                        ($shift["weekend_allowed_ot"] ?? false) &&
                        ($shift["holiday_allowed_ot"] ?? false)
                    ) {
                        // 1. Calculate raw minutes based on direction
                        $otBefore = calculateTimeDiff($item["in"], $shift["on_duty_time"], 'early', '00:00') ?: 0;
                        $otAfter  = calculateTimeDiff($item["out"], $shift["off_duty_time"], 'late', '00:00') ?: 0;

                        $finalOtMins = 0;
                        switch ($shift["overtime_type"]) {
                            case "Before":
                                $finalOtMins = $otBefore;
                                break;
                            case "After":
                                $finalOtMins = $otAfter;
                                break;
                            case "Both":
                                $finalOtMins = $otBefore + $otAfter;
                                break;
                            default:
                                $finalOtMins = 0;
                                break;
                        }

                        // 2. Apply Overtime Interval (Threshold)
                        $intervalMins = 0;
                        if (!empty($shift["overtime_interval"]) && $shift["overtime_interval"] !== "00:00") {
                            list($intH, $intM) = explode(':', $shift["overtime_interval"]);
                            $intervalMins = ($intH * 60) + (int)$intM;
                        }

                        // Reset to 0 if they didn't work at least the interval amount
                        if ($finalOtMins < $intervalMins) {
                            $finalOtMins = 0;
                        }

                        // 3. Apply Daily OT Allowed Mins (The Cap)
                        if ($finalOtMins > 0 && !empty($shift["daily_ot_allowed_mins"]) && $shift["daily_ot_allowed_mins"] !== "00:00") {
                            list($capH, $capM) = explode(':', $shift["daily_ot_allowed_mins"]);
                            $allowedCapMins = ($capH * 60) + (int)$capM;

                            // Cap the minutes (e.g., if worked 90 but max is 60, result is 60)
                            $finalOtMins = min($finalOtMins, $allowedCapMins);
                        }

                        $item["ot"] = formatMinutes($finalOtMins);
                    } else {
                        $item["ot"] = "00:00";
                    }
                }

                // --- 3. EARLY GOING CALCULATION ---

                // Always calculate early going time for display
                if ($item["out"] !== "---" && isset($shift["off_duty_time"])) {
                    $egMins = calculateTimeDiff($item["out"], $shift["off_duty_time"], 'early', $shift["early_time"] ?? "00:00");
                    if ($egMins) {
                        $item["early_going"] = formatMinutes($egMins);
                        // Only change status if rule is active
                        if (($shift["attendanc_rule_early_going"] ?? 'No Action') !== 'No Action') {
                            if (!in_array($item["status"], ["HD", "A"])) {
                                $item["status"] = "EG";
                            }
                        }
                    }
                }

                // Significant Early Going (Overwrites Status to HD or A)
                $sigEarlyRule = $shift["significant_attendanc_rule_early_going"] ?? 'No Action';
                if ($sigEarlyRule !== 'No Action') {
                    $sigEgMins = calculateTimeDiff($item["out"], $shift["off_duty_time"], 'early', $shift["absent_min_out"]);
                    if ($sigEgMins) {
                        $item["early_going"] = formatMinutes($sigEgMins);
                        $item["status"] = ($sigEarlyRule === "Half Day") ? "HD" : "A";
                    }
                }
            }

            // Missing/Absent status based on logs
            if (!in_array($item["status"], ["HD", "O", "H", "L"])) {
                if ($item["in"] !== "---" && $item["out"] === "---") {
                    // Has IN but no OUT — Missing
                    $item["status"] = "M";
                } elseif ($item["in"] !== "---" && $item["out"] !== "---" && is_string($item["total_hrs"]) && str_contains($item["total_hrs"], ":") && time_to_minutes($item["total_hrs"]) < (int) config('attendance.min_present_minutes', 60)) {
                    // Has a real IN and OUT but too few worked minutes — Absent
                    $item["status"] = "A";
                } elseif ($item["in"] === "---" && count($logs) > 0) {
                    // Has logs but none in IN window — take first log as IN, mark Missing
                    $fallbackLog = collect($logs)->first();
                    if ($fallbackLog) {
                        $item["in"] = $fallbackLog["time"];
                        $item["device_id_in"] = $fallbackLog["DeviceID"] ?? "---";
                        // If more than 1 log, take last as OUT
                        if (count($logs) > 1) {
                            $lastFallback = collect($logs)->last();
                            $item["out"] = $lastFallback["time"];
                            $item["device_id_out"] = $lastFallback["DeviceID"] ?? "---";
                            $item["total_hrs"] = $this->getTotalHrsMins($item["in"], $item["out"]);
                        }
                        $item["status"] = "M";
                    }
                } elseif ($item["in"] === "---" && count($logs) === 0) {
                    // No logs at all — Absent
                    $item["status"] = $status ?? "A";
                }
            }

            $items[] = $item;

            Log::info(showJson([
                'date' => $date,
                'user_id' => $item['employee_id'] ?? 'N/A',
                'times' => [
                    'shift' => $shift["on_duty_time"] . " - " . $shift["off_duty_time"],
                    'actual' => ["in" => $item["in"], "out" => $item["out"]],
                ],
                'ot_config' => [
                    'type' => $shift["overtime_type"] ?? 'N/A',
                    'interval' => $shift["overtime_interval"] ?? '00:00',
                    'daily_cap' => $shift["daily_ot_allowed_mins"] ?? '00:00',
                    'weekend_allowed' => $shift["weekend_allowed_ot"] ?? false,
                    'holiday_allowed' => $shift["holiday_allowed_ot"] ?? false,
                ],
                'calculations' => [
                    'late_coming' => $item["late_coming"] ?? '00:00',
                    'early_going' => $item["early_going"] ?? '00:00',
                    'overtime'    => $item["ot"] ?? '00:00',
                    'total_hrs'   => $item["total_hrs"] ?? '00:00',
                ],
                'rules' => [
                    'lc_rule' => $shift["attendanc_rule_late_coming"] ?? 'N/A',
                    'eg_rule' => $shift["attendanc_rule_early_going"] ?? 'N/A',
                    'sig_lc'  => $sigLateRule ?? 'N/A',
                    'sig_eg'  => $sigEarlyRule ?? 'N/A',
                ],
                'final_status' => $item["status"]
            ]));
        }

        // Database Operations
        if (!count($items)) return "No items to process";

        try {
            DB::beginTransaction();
            Attendance::where("company_id", $id)
                ->whereIn("employee_id", array_column($items, "employee_id"))
                ->where("date", $date)
                ->delete();

            Attendance::insert($items);
            DB::commit();
            $message = "[$date] Success. Affected Ids: " . json_encode($params["UserIds"]);
        } catch (\Throwable $e) {
            DB::rollback();
            $message = "[$date] Error: " . $e->getMessage();
        }

        $this->devLog("render-manual-log", $message);
        return $message;
    }
}
