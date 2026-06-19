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
        $company_id = $request->company_ids[0];
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

        $items = [];

        // Mapping for Day Keys
        $dayMap = [
            'Mon' => 'M',
            'Tue' => 'T',
            'Wed' => 'W',
            'Thu' => 'Th',
            'Fri' => 'F',
            'Sat' => 'S',
            'Sun' => 'Su'
        ];
        $dayOfWeekThreeLetter = date('D', strtotime($date));
        $currentDayKey = $dayMap[$dayOfWeekThreeLetter] ?? '';

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

            $shift = Attendance::processHalfDay($currentDayKey, $shift['halfday_rules'] ?? null, $shift);

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
                "status" => $status ?? "M",
                "late_coming" => "---",
                "early_going" => "---",
            ];


            // --- 1. LATE COMING RULES (Check these before processing OUT logs) ---

            // Normal Late Coming
            if (($shift["attendanc_rule_late_coming"] ?? 'No Action') !== 'No Action') {
                $lcMins = calculateTimeDiff($item["in"], $shift["on_duty_time"], 'late', $shift["late_time"]);
                if ($lcMins) {
                    $item["late_coming"] = formatMinutes($lcMins);
                    $item["status"] = "LC";
                }
            }

            // Significant Late Coming (Overwrites Status to HD or A)
            $sigLateRule = $shift["significant_attendanc_rule_late_coming"] ?? 'No Action';
            if ($sigLateRule !== 'No Action') {
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

                // --- 3. EARLY GOING RULES ---

                // Normal Early Going
                if (($shift["attendanc_rule_early_going"] ?? 'No Action') !== 'No Action') {
                    $egMins = calculateTimeDiff($item["out"], $shift["off_duty_time"], 'early', $shift["early_time"]);
                    if ($egMins) {
                        $item["early_going"] = formatMinutes($egMins);
                        // Only update status to EG if it hasn't been escalated to HD/A by late coming
                        if (!in_array($item["status"], ["HD", "A"])) {
                            $item["status"] = "EG";
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
