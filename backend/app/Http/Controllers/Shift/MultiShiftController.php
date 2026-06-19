<?php
namespace App\Http\Controllers\Shift;

use App\Http\Controllers\Controller;
use App\Jobs\SyncMultiShiftDualDayJob;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;

class MultiShiftController extends Controller
{
    public $logFilePath = 'logs/shifts/multi_shift/controller';

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
        $company_id   = $request->company_ids[0];
        $employee_ids = $request->employee_ids;
        $channel      = $request->channel ?? "browser";

        // Convert start and end dates to DateTime objects
        $startDate = new \DateTime($startDateString);
        $endDate   = new \DateTime($endDateString);

        $response = [];

        // while ($startDate <= $currentDate && $startDate <= $endDate) {
        while ($startDate <= $endDate) {
            // $response[] = $this->render($company_id, $startDate->format("Y-m-d"), 2, $employee_ids, true);
            $response[] = $this->render($company_id, $startDate->format("Y-m-d"), 2, $employee_ids, $request->filled("auto_render") ? false : true, $channel);

            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function renderRequest(Request $request)
    {
        // return $departmentIds = Department::where("company_id",$request->company_id)->pluck("id");
        // $employee_ids = Employee::where("department_id", 31)->pluck("system_user_id");
        $channel = $request->channel ?? "browser";
        return $this->render($request->company_id, $request->date, $request->shift_type_id, $request->UserIds, $request->custom_render ?? true, $channel);
    }

    public function render($id, $date, $shift_type_id, $UserIds = [], $custom_render = false, $channel)
    {
        $params = [
            "company_id"    => $id,
            "date"          => $date,
            "shift_type_id" => $shift_type_id,
            "custom_render" => $custom_render,
            "UserIds"       => $UserIds,
        ];

        if (! $custom_render) {
            //$params["UserIds"] = (new AttendanceLog)->getEmployeeIdsForNewLogsToRender($params);
            $params["UserIds"] = (new AttendanceLog)->getEmployeeIdsForNewLogsNightToRender($params);
        }

        // return json_encode($params);

        $employees = (new Employee)->attendanceEmployeeForMultiRender($params);

        //update shift ID for No logs
        if (count($employees) == 0) {
            $employees = (new Employee)->GetEmployeeWithShiftDetails($params);

            foreach ($employees as $key => $value) {

                if ($value->schedule->shift && $value->schedule->shift["id"] > 0) {
                    $data1 = [
                        "shift_id"      => $value->schedule->shift["id"],
                        "shift_type_id" => $value->schedule->shift["shift_type_id"],
                    ];
                    $model1 = Attendance::query();
                    $model1->whereIn("employee_id", $UserIds);
                    $model1->where("date", $params["date"]);
                    $model1->where("company_id", $params["company_id"]);
                    $model1->update($data1);
                }
            }
        }

        $items       = [];
        $message     = "";
        $logsUpdated = 0;

        foreach ($employees as $row) {

            $params["isOverTime"] = $row->schedule->isOverTime;
            $params["shift"]      = $row->schedule->shift ?? false;

            $logs = (new AttendanceLog)->getLogsWithInRangeNew($params);

            $data = $logs[$row->system_user_id] ?? [];

            $data = collect($data)
                ->unique('LogTime')
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
                        return false; // skip duplicate consecutive type
                    }

                    return true;
                })
                ->values();


            $dayOfWeekThreeLetter = date('D', strtotime($date));
            $currentDayKey = Attendance::DAY_MAP[$dayOfWeekThreeLetter] ?? '';
            $status = Attendance::processWeekOffFunc($currentDayKey, $shift['weekoff_rules'] ?? "A", $id, $date, $row->system_user_id, $data->first());


            if (! count($data)) {
                if ($row->schedule->shift && $row->schedule->shift["id"] > 0) {
                    $data1 = [
                        "shift_id"      => $row->schedule->shift["id"],
                        "shift_type_id" => $row->schedule->shift["shift_type_id"],
                        "status"        => $status ?? "A",
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
                "status"        => $status ?? (count($data) % 2 !== 0 ? Attendance::MISSING : Attendance::PRESENT),

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

            $item["status"] = $status ?? (count($logsJson) ? Attendance::PRESENT : Attendance::MISSING);

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

        $items = collect($items)->unique('employee_id')->values()->all();

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

                $message = "[" . $date . " " . date("H:i:s") . "] Multi Shift.   Affected Ids: " . json_encode($UserIds) . " " . $message;

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

        $this->logOutPut($this->logFilePath, [
            "UserIds" => $UserIds,
            "params"  => $params,
            "items"   => $items,
        ]);

        $this->logOutPut($this->logFilePath, "[" . $date . " " . date("H:i:s") . "] " . "$logsUpdated " . " updated logs");
        $this->logOutPut($this->logFilePath, $message);
        return "[" . $date . " " . date("H:i:s") . "] " . $message;
    }

    public function sync(Request $request)
    {
        $request->validate([
            'company_id' => 'required|numeric',
            'from_date'  => 'required|date_format:Y-m-d',
            'to_date'    => 'required|date_format:Y-m-d',
            'UserID'     => 'nullable',
        ]);

        $id        = $request->input('company_id');
        $startDate = Carbon::parse($request->input('from_date'));
        $endDate   = Carbon::parse($request->input('to_date'));
        $flag      = 'true';
        $UserID    = $request->input('UserID');

        // Check if the date range exceeds 5 days
        if ($startDate->diffInDays($endDate) > 5) {
            return response()->json(['error' => 'You cannot select more than 5 dates.'], 400);
        }

        if ($startDate->greaterThan($endDate)) {
            return response()->json(['error' => 'Start date must be before end date.'], 400);
        }

        while ($startDate->lte($endDate)) {
            SyncMultiShiftDualDayJob::dispatch($id, $startDate->toDateString(), $flag, $UserID);
            $startDate->addDay();
        }

        return response()->json([
            'message' => 'Report has been regerated!',
        ]);
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
