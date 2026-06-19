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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FiloShiftController extends Controller
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
            //$response[] = $this->render($company_id, $startDate->format("Y-m-d"), 1, $employee_ids, true);


            // Determine which method to call
            $method = 'render';

            Log::info("Caling method: $method for company_id: $company_id on date: ");

            // Call the method dynamically
            $response[] = $this->$method(
                $company_id,
                $startDate->format("Y-m-d"),
                1,
                $employee_ids,
                !$request->filled("auto_render"), // Simplified boolean logic
                $request->channel ?? "unknown"
            );

            // if ($request->company_id == 65) {
            //     $response[] = $this->renderV1($company_id, $startDate->format("Y-m-d"), 1, $employee_ids, $request->filled("auto_render") ? false : true, $request->channel ?? "unknown");
            // } else {
            //     $response[] = $this->render($company_id, $startDate->format("Y-m-d"), 1, $employee_ids, $request->filled("auto_render") ? false : true, $request->channel ?? "unknown");
            // }

            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function renderRequest(Request $request)
    {
        if ($request->company_id == 65) {
            return $this->renderV1($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->shift_type_id, $request->UserIds, true, $request->channel ?? "unknown");
        }
        return $this->render($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->shift_type_id, $request->UserIds, true, $request->channel ?? "unknown");
    }

    public function render($id, $date, $shift_type_id, $UserIds = [], $custom_render = false, $channel = "unknown")
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
        }

        $logsEmployees = (new AttendanceLog)->getLogsForRender($params);

        // Update attendance table with shift ID if shift with employee not found 
        if (count($logsEmployees) == 0) {
            $employees = (new Employee())->GetEmployeeWithShiftDetails($params);
            foreach ($employees as $key => $value) {
                if (isset($value->schedule->shift) && $value->schedule->shift["id"] > 0) {
                    $data1 = [
                        "shift_id" => $value->schedule->shift["id"],
                        "shift_type_id" => $value->schedule->shift["shift_type_id"]
                    ];
                    Attendance::whereIn("employee_id", $UserIds)
                        ->where("date", $params["date"])
                        ->where("company_id", $params["company_id"])
                        ->update($data1);
                }
            }
        }

        $items = [];
        $message = "";

        foreach ($logsEmployees as $key => $logsGroup) {
            $logsArray = $logsGroup->toArray() ?? [];

            // 1. Determine the Shift Boundaries
            $firstValidRecord = collect($logsArray)->first();
            $schedule = $firstValidRecord["schedule"] ?? false;
            $shift = $schedule["shift"] ?? false;

            if (!$shift) {
                $message .= ". No shift mapped for User: $key on " . $params["date"];
                continue;
            }

            // Logic to define shift range (handle overnight shifts)
            $onDutyStr = $params["date"] . ' ' . $shift["on_duty_time"];
            $offDutyStr = $params["date"] . ' ' . $shift["off_duty_time"];

            // If off_duty is earlier than on_duty, it ends the next day
            if (strtotime($shift["off_duty_time"]) < strtotime($shift["on_duty_time"])) {
                $offDutyStr = date("Y-m-d H:i:s", strtotime($offDutyStr . " +1 day"));
            }

            // 2. Filter logs that only fall within this shift range
            $filteredLogs = collect($logsArray)->filter(function ($record) use ($onDutyStr, $offDutyStr) {
                return $record['LogTime'] >= $onDutyStr && $record['LogTime'] <= $offDutyStr;
            });

            if ($filteredLogs->isEmpty()) {
                continue;
            }

            $firstLog = $filteredLogs->first(function ($record) {
                return !in_array(strtolower($record['log_type']), ['out'], true);
            });

            if (!$firstLog) {
                $firstLog = $filteredLogs->first();
            }

            $lastLog = $filteredLogs->last(function ($record) {
                return !in_array(strtolower($record['log_type']), ['in'], true);
            });

            // 3. Check if any log is manual
            $hasManualLog = $filteredLogs->contains(fn($log) => ($log['DeviceID'] ?? '') === 'Manual');

            // 4. Prepare the Item
            $item = [
                "roster_id" => 0,
                "total_hrs" => "---",
                "in" => $firstLog["time"] ?? "---",
                "out" => "---",
                "ot" => "---",
                "device_id_in" => $firstLog["DeviceID"] ?? "---",
                "device_id_out" => "---",
                "date" => $params["date"],
                "company_id" => $params["company_id"],
                "employee_id" => $key,
                "shift_id" => $shift["id"] ?? 0,
                "shift_type_id" => $shift["shift_type_id"] ?? 0,
                "status" => "M", // Default to Missing
                "is_manual_entry" => $hasManualLog,
                "late_coming" => "---",
                "early_going" => "---",
            ];

            // Handle Late Coming (Shift Type 6 example)
            if ($item["shift_type_id"] == 6 && $item["in"] !== "---") {
                $item["late_coming"] = $this->calculatedLateComing($item["in"], $shift["on_duty_time"], $shift["late_time"]);
                if ($item["late_coming"] != "---") {
                    $item["status"] = "LC";
                }
            }

            // Handle Check Out and Total Hours.
            // Require a DISTINCT out punch: the same punch (same time) must not be
            // counted as both IN and OUT (that produced 00:00-hour "PRESENT" rows).
            if ($lastLog && $filteredLogs->count() > 1 && $firstLog["time"] !== $lastLog["time"]) {
                $item["status"] = ($item["status"] == "LC") ? "LC" : "P";
                $item["device_id_out"] = $lastLog["DeviceID"] ?? "---";
                $item["out"] = $lastLog["time"] ?? "---";

                if ($item["out"] !== "---") {
                    if (strtotime($shift["on_duty_time"]) > strtotime($shift["off_duty_time"])) {
                        $start = strtotime($firstLog["LogTime"]);
                        $end = strtotime($lastLog["LogTime"]);
                        $diffInSeconds = $end - $start;
                        $totalMinutes = round($diffInSeconds / 60);
                        $hours = floor($totalMinutes / 60);
                        $minutes = $totalMinutes % 60;
                        $item["total_hrs"] = sprintf("%02d:%02d", $hours, $minutes);
                    } else {
                        $item["total_hrs"] = $this->getTotalHrsMins($item["in"], $item["out"]);
                    }
                }

                // OT Calculation
                if (($schedule["isOverTime"] ?? false) && isset($shift["working_hours"])) {
                    $item["ot"] = $this->calculatedOT($item["total_hrs"], $shift["working_hours"], $shift["overtime_interval"]);
                }

                // Early Going
                if ($item["shift_type_id"] == 6 && $item["out"] !== "---") {
                    $item["early_going"] = $this->calculatedEarlyGoing($item["out"], $shift["off_duty_time"], $shift["early_time"]);
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

        // 4. Save to Database
        if (!count($items)) {
            $message = '[' . $date . " " . date("H:i:s") . '] No valid logs within shift range. ' . $message;
            $this->devLog("render-manual-log", $message);
            return $message;
        }

        try {
            DB::beginTransaction();

            Attendance::where("company_id", $id)
                ->whereIn("employee_id", array_column($items, "employee_id"))
                ->where("date", $date)
                ->delete();

            Attendance::insert($items);

            DB::commit();
            $message = "[" . $date . " " . date("H:i:s") .  "] Filo Shift.  Affected Ids: " . json_encode($UserIds) . " " . $message;
        } catch (\Throwable $e) {
            DB::rollback();
            $message = "[" . $date . " " . date("H:i:s") .  "] Filo Shift. " . $e->getMessage();
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

        $items = [];
      
        $dayOfWeekThreeLetter = date('D', strtotime($date));
        $currentDayKey = Attendance::DAY_MAP[$dayOfWeekThreeLetter] ?? '';

        // LOOP THROUGH ALL USERS (This ensures Week-offs and Absentees are processed)
        foreach ($params["UserIds"] as $employeeId) {

            // Get logs for this specific employee from the collection
            $logs = isset($logsEmployees[$employeeId]) ? $logsEmployees[$employeeId]->toArray() : [];

            // 1. Identify first/last logs
            $firstLog = collect($logs)->first(function ($record) {
                return !in_array(strtolower($record['log_type']), ['out'], true);
            });

            $lastLog = collect($logs)->last(function ($record) {
                return in_array($record["log_type"], ["Out", "out", "Auto", "auto", null], true);
            });

            // 2. Resolve Schedule and Shift (even if no logs exist)
            $schedule = $firstLog["schedule"] ?? ScheduleEmployee::where("company_id", $id)
                ->where("employee_id", $employeeId)
                ->with('shift')
                ->first();

            $shift = $schedule["shift"] ?? false;

            if (!$shift) continue;

            $status = Attendance::processWeekOffFunc($currentDayKey, $shift['weekoff_rules'] ?? "A", $id, $date, $employeeId, $firstLog);

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
                "late_coming" => "---",
                "early_going" => "---",
            ];

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
                    'overtime'    => $item["ot"] ?? '00:00',
                    'total_hrs'   => $item["total_hrs"] ?? '00:00',
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
