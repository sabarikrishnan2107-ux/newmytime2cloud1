<?php

namespace App\Http\Controllers\Shift;

use App\Models\Attendance;
use Illuminate\Http\Request;
use App\Models\AttendanceLog;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use Carbon\Carbon;

class SplitShiftController extends Controller
{
    public $logFilePath = 'logs/shifts/dual_shift/controller';

    public function renderData(Request $request)
    {
        // Extract start and end dates from the JSON data
        $startDateString = $request->dates[0];
        // $endDateString = $request->dates[1];
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
            //$response[] = $this->render($company_id, $startDate->format("Y-m-d"), 5, $employee_ids, true);

            $response[] = $this->renderV1($company_id, $startDate->format("Y-m-d"), 5, $employee_ids, $request->filled("auto_render") ? false : true, $request->channel ?? "unknown");
         

            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function renderRequest(Request $request)
    {
        // return $departmentIds = Department::where("company_id",$request->company_id)->pluck("id");
        // $employee_ids = Employee::where("department_id", 31)->pluck("system_user_id");

        return $this->render($request->company_id, $request->date, $request->shift_type_id, $request->UserIds, $request->custom_render ?? true, $request->channel ?? "unknown");
    }


    public function renderV1($id, $date, $shift_type_id, $UserIds = [], $custom_render = false, $channel = "unknown")
    {
        $params = [
            "company_id" => $id,
            "date" => $date,
            "shift_type_id" => $shift_type_id,
            "UserIds" => $UserIds,
        ];

        if (!$custom_render) {
            $params["UserIds"] = (new AttendanceLog)->getEmployeeIdsForNewLogsToRender($params);
        }

        $employees = (new Employee)->attendanceEmployeeForMultiRender($params);
        $items = [];
        $debugSummary = [];

        foreach ($employees as $row) {
            $shift = $row->schedule->shift ?? null;
            if (!$shift) continue;

            // Fetch logs and load device relationship to avoid "Undefined key" errors later
            $allLogs = AttendanceLog::with('device')
                ->where("company_id", $id)
                ->where("UserID", $row->system_user_id)
                ->whereDate('LogTime', $date)
                ->orderBy("LogTime", 'asc')
                ->get();

            $totalMinutes = 0;
            $logsJson = [];
            $userSummary = [];

            // Define the two sessions from your shift object
            $sessions = [
                [
                    'name' => 'S1',
                    'in_s' => $shift["beginning_in"],
                    'in_e' => $shift["ending_in"],
                    'out_s' => $shift["beginning_out"],
                    'out_e' => $shift["ending_out"]
                ],
                [
                    'name' => 'S2',
                    'in_s' => $shift["beginning_in1"],
                    'in_e' => $shift["ending_in1"],
                    'out_s' => $shift["beginning_out1"],
                    'out_e' => $shift["ending_out1"]
                ]
            ];

            foreach ($sessions as $ses) {
                // STRICT WINDOW FILTERING
                $validInLog = $allLogs->filter(function ($log) use ($ses) {
                    $time = Carbon::parse($log->LogTime)->format('H:i');
                    return $time >= $ses['in_s'] && $time <= $ses['in_e'];
                })->first();

                $validOutLog = $allLogs->filter(function ($log) use ($ses) {
                    $time = Carbon::parse($log->LogTime)->format('H:i');
                    return $time >= $ses['out_s'] && $time <= $ses['out_e'];
                })->last();

                $min = 0;
                if ($validInLog && $validOutLog) {
                    $min = Carbon::parse($validInLog->LogTime)->diffInMinutes(Carbon::parse($validOutLog->LogTime));
                    $totalMinutes += $min;
                }

                // Include device keys to fix the "Undefined array key" error
                if ($validInLog || $validOutLog) {
                    $inTime = $validInLog ? Carbon::parse($validInLog->LogTime)->format('H:i') : "---";
                    $outTime = $validOutLog ? Carbon::parse($validOutLog->LogTime)->format('H:i') : "---";

                    $logsJson[] = [
                        "in"            => $inTime,
                        "out"           => $outTime,
                        "device_in"     => $validInLog ? ($validInLog->device->name ?? "Device") : "---",
                        "device_out"    => $validOutLog ? ($validOutLog->device->name ?? "Device") : "---",
                        "total_minutes" => $min,
                    ];

                    $userSummary[] = "({$ses['name']}: In $inTime, Out $outTime)";
                }
            }

            $debugSummary[] = "User {$row->system_user_id}: " . (empty($userSummary) ? "No valid logs" : implode(" ", $userSummary));


            $dayOfWeekThreeLetter = date('D', strtotime($date));
            $currentDayKey = Attendance::DAY_MAP[$dayOfWeekThreeLetter] ?? '';
            $status = Attendance::processWeekOffFunc($currentDayKey, $shift['weekoff_rules'] ?? "A", $id, $date, $row->system_user_id, $allLogs->first());

            // An IN punch with no matching OUT punch (in any session) = incomplete day → Missing.
            // A complete day under the worked-minutes floor → Absent.
            $hasUnpairedIn = collect($logsJson)->contains(function ($l) {
                return ($l["in"] ?? "---") !== "---" && ($l["out"] ?? "---") === "---";
            });
            $minPresentMins = (int) config('attendance.min_present_minutes', 60);
            $computedStatus = ($hasUnpairedIn || $totalMinutes <= 0)
                ? Attendance::MISSING
                : ($totalMinutes < $minPresentMins ? Attendance::ABSENT : Attendance::PRESENT);

            $items[] = [
                "employee_id"   => $row->system_user_id,
                "company_id"    => $id,
                "date"          => $date,
                "shift_id"      => $shift->id,
                "shift_type_id" => $shift->shift_type_id,
                "total_hrs"     => $this->minutesToHours($totalMinutes),
                "status"        => $status ?? $computedStatus,
                "logs"          => json_encode($logsJson),
            ];
        }

        // DB Update
        if (count($items) > 0) {
            Attendance::whereIn("employee_id", array_column($items, "employee_id"))
                ->where("date", $date)
                ->where("company_id", $id)
                ->delete();
            Attendance::insert($items);
        }

        return "Done for $date. Log Summary: " . implode(" | ", $debugSummary);
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

        // return json_encode($params);

        $employees = (new Employee)->attendanceEmployeeForMultiRender($params);



        $items = [];

        $message = "";
        foreach ($employees as $row) {

            $params["isOverTime"] = $row->schedule->isOverTime;
            $params["shift"]      = $row->schedule->shift ?? false;
            $params["shift_type_id"]      = $row->schedule->shift->shift_type_id ?? 0;

            //->whereBetween("LogTime", [$params["start"], $params["end"]])

            $logs = AttendanceLog::where("company_id", $params["company_id"])
                ->where('LogTime', ">=", Carbon::parse($params["date"])->toDateString() . " 00:00:00")
                ->where('LogTime', "<=", Carbon::parse($params["date"])->toDateString() . " 23:59:59")
                ->distinct("LogTime", "UserID", "company_id")
                ->whereHas("schedule", function ($q) use ($params) {
                    $q->where("shift_type_id", $params["shift_type_id"]);
                })
                ->when($params["UserIds"] != null && count($params["UserIds"]) > 0, function ($query) use ($params) {
                    return $query->whereIn('UserID', $params["UserIds"]);
                })
                ->orderBy("LogTime", 'asc')
                ->get()
                ->load("device")
                ->groupBy(['UserID']);


            $data = $logs[$row->system_user_id] ?? [];

            $data = collect($data)
                ->unique(function ($item) {
                    // unique by year-month-day hour:minute
                    return Carbon::parse($item->LogTime)->format('Y-m-d H:i');
                })
                ->filter(function ($log, $index) use ($data) {
                    $prev = $data[$index - 1] ?? null;

                    if (isset($log['device']) && ($log['device']['model_number'] ?? null) != 'OX-900') {
                        return true;
                    }

                    if (
                        in_array($log['log_type'], ['In', 'Out']) &&
                        $prev &&
                        $prev['log_type'] === $log['log_type']
                    ) {
                        return false;
                    }

                    return true;
                })
                ->values();


            if (! count($data)) {
                if ($row->schedule->shift && $row->schedule->shift["id"] > 0) {
                    $data1 = [
                        "shift_id"      => $row->schedule->shift["id"],
                        "shift_type_id" => $row->schedule->shift["shift_type_id"],
                        "status"        => "A",
                    ];
                    $model1 = Attendance::query();
                    $model1->where("employee_id", $row->system_user_id);
                    $model1->where("date", $params["date"]);
                    $model1->where("company_id", $params["company_id"]);
                    $model1->update($data1);
                }
                $message .= "{$row->system_user_id}   has No Logs to render";
                continue;
            }
            if (! $params["shift"]["id"]) {
                $message .= "{$row->system_user_id} : No shift configured on date: $date";
                continue;
            }

            $item = [
                "total_hrs"     => 0,
                "in"            => "---",
                "out"           => "---",
                "ot"            => "---",
                "device_id_in"  => "---",
                "device_id_out" => "---",
                "date"          => $params["date"],
                "company_id"    => $params["company_id"],
                "shift_id"      => $params["shift"]["id"] ?? 0,
                "shift_type_id" => $params["shift"]["shift_type_id"] ?? 0,
                "status"        => count($data) % 2 !== 0 ? Attendance::MISSING : Attendance::PRESENT,

            ];

            $totalMinutes = 0;
            $logsJson     = [];
            $previousOut  = null;

            // ✅ Special case: only 1 log
            if (count($data) === 1) {
                $log  = $data[0];
                $time = $log['time'] ?? '---';

                $validInTime = $this->getLogTime(
                    $log,
                    ["In", "Auto", "Option", "in", "auto", "option", "Mobile", "mobile"],
                    ["Manual", "manual", "MANUAL"]
                );

                if (strtolower($log['log_type']) == "in") {
                    $validInTime = $time;
                }

                $logsJson[] = [
                    "in"            => $validInTime !== "---" ? $validInTime : "---",
                    "out"           => "---",
                    "device_in"     => $this->getDeviceName($log, ["In", "Auto", "Option", "in", "auto", "option", "Mobile", "mobile"]),
                    "device_out"    => "---",
                    "total_minutes" => 0,
                ];
            } else {

                // ✅ Normal multiple-log processing
                $i             = 0;
                $validLogCount = 0;

                while ($i < count($data)) {
                    $currentLog  = $data[$i];
                    $currentTime = $currentLog['time'] ?? '---';

                    if (
                        isset($data[$i + 1]) &&
                        in_array(strtolower($currentLog['log_type']), ['in', 'out']) &&
                        strtolower($currentLog['log_type']) === strtolower($data[$i + 1]['log_type'])
                    ) {
                        $i++; // Jump to the next iteration, skipping the current log
                        continue;
                    }

                    $validIn = $currentTime !== '---' && $currentTime !== $previousOut;

                    $validInTime = $validIn
                        ? $this->getLogTime($currentLog, ["In", "Auto", "Option", "in", "auto", "option", "Mobile", "mobile"], ["Manual", "manual", "MANUAL"])
                        : "---";

                    if (strtolower($currentLog['log_type']) == "in") {
                        $validInTime = $currentTime;
                    }

                    if (! $validIn || $validInTime === "---") {
                        $i++;
                        continue;
                    }

                    $validLogCount++;

                    // Try to find a valid OUT log after this IN
                    $nextLog      = null;
                    $validOutTime = "---";

                    for ($j = $i + 1; $j < count($data); $j++) {
                        $candidateLog  = $data[$j];
                        $candidateTime = $candidateLog['time'] ?? '---';

                        $validOut = $candidateTime !== '---' && $candidateTime !== $currentTime;

                        $validOutTime = $validOut
                            ? $this->getLogTime($candidateLog, ["Out", "Auto", "Option", "out", "auto", "option", "Mobile", "mobile"], ["Manual", "manual", "MANUAL"])
                            : "---";

                        if (strtolower($candidateLog['log_type']) == "out") {
                            $validOutTime = $candidateTime;
                        }

                        if ($validOut && $validOutTime !== "---") {
                            $nextLog = $candidateLog;
                            $i       = $j; // jump to OUT log
                            $validLogCount++;
                            break;
                        }
                    }

                    $minutes = 0;

                    if ($nextLog) {
                        $parsedIn  = strtotime($currentTime);
                        $parsedOut = strtotime($nextLog['time'] ?? '---');

                        if ($parsedIn > $parsedOut) {
                            $parsedOut += 86400; // handle midnight
                        }

                        $minutes = ($parsedOut - $parsedIn) / 60;
                        $totalMinutes += $minutes;
                    }

                    $logsJson[] = [
                        "in"            => $validInTime,
                        "out"           => $nextLog ? $validOutTime : "---",
                        "device_in"     => $this->getDeviceName($currentLog, ["In", "Auto", "Option", "in", "auto", "option", "Mobile", "mobile"]),
                        "device_out"    => $nextLog
                            ? $this->getDeviceName($nextLog, ["Out", "Auto", "Option", "out", "auto", "option", "Mobile", "mobile"])
                            : "---",
                        "total_minutes" => $minutes,
                    ];

                    $previousOut = $nextLog['time'] ?? null;
                    $i++; // move forward
                }
            }

            // An IN punch with no matching OUT punch (in any session) = incomplete day → Missing.
            // A complete day under the worked-minutes floor → Absent.
            $hasUnpairedIn = collect($logsJson)->contains(function ($l) {
                return ($l["in"] ?? "---") !== "---" && ($l["out"] ?? "---") === "---";
            });
            $minPresentMins = (int) config('attendance.min_present_minutes', 60);
            if ($hasUnpairedIn || !count($logsJson) || $totalMinutes <= 0) {
                $item["status"] = Attendance::MISSING;
            } elseif ($totalMinutes < $minPresentMins) {
                $item["status"] = Attendance::ABSENT;
            } else {
                $item["status"] = Attendance::PRESENT;
            }

            // ✅ Final summary per employee
            $item["employee_id"] = $row->system_user_id;
            $item["total_hrs"]   = $this->minutesToHours($totalMinutes);

            if ($params["isOverTime"]) {
                $item["ot"] = $this->calculatedOT(
                    $item["total_hrs"],
                    $params["shift"]->working_hours,
                    $params["shift"]->overtime_interval
                );
            }

            $item["logs"]   = json_encode($logsJson, JSON_PRETTY_PRINT);
            $items[] = $item;
        }

        // return json_encode($items, JSON_PRETTY_PRINT);

        $logsUpdated = 0;

        try {

            if (count($items) > 0) {
                $model = Attendance::query();
                $model->whereIn("employee_id", array_column($items, "employee_id"));
                $model->where("date", $date);
                $model->where("company_id", $id);
                $model->delete();

                $chunks = array_chunk($items, 100);

                foreach ($chunks as $chunk) {
                    $model->insert($chunk);
                }

                $message = "[" . $date . " " . date("H:i:s") . "] Dual Shift.   Affected Ids: " . json_encode($UserIds) . " " . $message;

                $logsUpdated = AttendanceLog::where("company_id", $id)
                    ->whereIn("UserID", $UserIds ?? [])
                    ->where("LogTime", ">=", $date)
                    ->where("LogTime", "<=", date("Y-m-d", strtotime($date . "+1 day")))
                    // ->where("checked", false)
                    ->update([
                        "checked"          => true,
                        "checked_datetime" => date('Y-m-d H:i:s'),
                        "channel"          => $channel,
                        "log_message"      => substr($message, 0, 200),
                    ]);
            }
        } catch (\Throwable $e) {
            $this->logOutPut($this->logFilePath, $e->getMessage());
        }


        $message = "[" . $date . " " . date("H:i:s") . "] Dual Shift. "  . "$logsUpdated " . " updated logs";
        return $message;
    }

    private function getLogTime($log, $validFunctions, $manualDeviceID)
    {
        // return $log && $log['time'] ? $log['time'] : "---";

        if (isset($log["device"]["function"]) && in_array($log["device"]["function"], $validFunctions)) {
            return $log['time'];
        } else if (in_array($log["DeviceID"], $manualDeviceID)) {
            return $log['time'];
        }

        return "---";
    }
    private function getDeviceName($log, $validFunctions)
    {
        if ($log['device']['name'] == "---") {
            return "Manual";
        }

        return isset($log["device"]["function"]) && in_array($log["device"]["function"], $validFunctions) ? $log["device"]["function"] : "---";
    }
}
