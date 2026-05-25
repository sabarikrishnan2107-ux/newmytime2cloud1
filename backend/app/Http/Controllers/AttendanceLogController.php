<?php

namespace App\Http\Controllers;

use App\Jobs\StoreAttendanceLogsJobWithLocation;
use App\Models\AttendanceLog;
use App\Models\Device;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log as Logger;
use Illuminate\Support\Facades\Storage;

class AttendanceLogController extends Controller
{
    public function index(AttendanceLog $model, Request $request)
    {
        $paginator = $model->filter($request)->orderBy("LogTime", "desc")->paginate($request->per_page);

        if ($request->boolean('with_shift_type')) {
            $logs = $paginator->getCollection();
            $employeeIds = $logs->pluck('UserID')->unique()->filter()->values();
            $normalizedDates = $logs->map(fn ($log) => date('Y-m-d', strtotime($log->LogTime)))
                ->unique()
                ->values();

            if ($employeeIds->isNotEmpty()) {
                $companyId = $request->company_id;

                // Per-date attendance has the most accurate shift_type for past dates,
                // but isn't populated for "today" until the nightly calculation runs.
                $attendanceMap = [];
                if ($normalizedDates->isNotEmpty()) {
                    $rows = DB::table('attendances')
                        ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                        ->whereIn('employee_id', $employeeIds)
                        ->whereIn('date', $normalizedDates)
                        ->get(['employee_id', 'date', 'shift_type_id']);
                    foreach ($rows as $a) {
                        $attendanceMap[$a->employee_id . '|' . $a->date] = $a->shift_type_id;
                    }
                }

                // Fallback: latest schedule_employees row per employee (works for any date including today).
                $scheduleMap = [];
                $scheduleRows = DB::table('schedule_employees')
                    ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                    ->whereIn('employee_id', $employeeIds)
                    ->orderBy('updated_at', 'desc')
                    ->get(['employee_id', 'shift_type_id']);
                foreach ($scheduleRows as $s) {
                    if (!isset($scheduleMap[$s->employee_id])) {
                        $scheduleMap[$s->employee_id] = $s->shift_type_id;
                    }
                }

                $logs->transform(function ($log) use ($attendanceMap, $scheduleMap) {
                    $normDate = date('Y-m-d', strtotime($log->LogTime));
                    $key = $log->UserID . '|' . $normDate;
                    $log->shift_type_id = $attendanceMap[$key] ?? ($scheduleMap[$log->UserID] ?? null);
                    return $log;
                });
            }
        }

        return $paginator;
    }

    public function getAttendanceLogs(AttendanceLog $model, Request $request)
    {
        return $model->where("company_id", $request->company_id)->paginate($request->per_page);
    }

    public function handleFileForCron()
    {
        $date = date("d-m-Y", strtotime("yesterday"));

        $csvPath = "app/logs-$date.csv"; // The path to the file relative to the "Storage" folder

        $fullPath = storage_path($csvPath);

        if (! file_exists($fullPath)) {
            return ["error" => true, "message" => "File doest not exist on $date."];
        }

        $file = fopen($fullPath, 'r');

        $data = file($fullPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if (! count($data)) {
            return ["error" => true, "message" => 'File is empty.'];
        }

        $previoulyAddedLineNumbers = Storage::get("logs-count-$date.txt") ?? 0;

        // return $this->getMeta("Sync Attenance Logs", $previoulyAddedLineNumbers . "\n");

        $totalLines = count($data);

        $currentLength = 0;

        if ($previoulyAddedLineNumbers == $totalLines) {
            return ["error" => true, "message" => 'No new data found.'];
        } else if ($previoulyAddedLineNumbers > 0 && $totalLines > 0) {
            $currentLength = $previoulyAddedLineNumbers;
        }

        fclose($file);

        return [
            "date"       => $date,
            "totalLines" => $totalLines,
            "data"       => array_slice($data, $currentLength),

        ];
    }

    public function renderMissing()
    {
        $result = $this->handleFileForCron();

        if (array_key_exists("error", $result)) {
            return $this->getMeta("Sync Attenance Logs", $result["message"] . "\n");
        }

        $result["data"] = array_values(array_unique($result["data"]));

        $records = [];

        foreach ($result["data"] as $row) {
            $columns = explode(',', $row);

            $records[] = [
                "UserID"              => $columns[0],
                "DeviceID"            => $columns[1],
                "LogTime"             => str_replace("T", " ", $columns[2]),
                "SerialNumber"        => $columns[3],
                "log_date_time"       => str_replace("T", " ", $columns[2]),
                "index_serial_number" => $columns[3],
                "source_info"         => "renderMissing",
                "log_date"            => explode('T', $columns[2])[0] ?? date("Y-m-d"),
            ];
        }

        try {
            AttendanceLog::insert($records);
            // Logger::channel("custom")->info(count($records) . ' new logs has been inserted.');
            Storage::put("logs-count-" . $result['date'] . ".txt", $result['totalLines']);
            return $this->getMeta("Sync Attenance Logs", count($records) . " new logs has been inserted." . "\n");
        } catch (\Throwable $th) {

            Logger::channel("custom")->error('Error occured while inserting logs.');
            Logger::channel("custom")->error('Error Details: ' . $th);
            return $this->getMeta("Sync Attenance Logs", " Error occured." . "\n");

            // return $data = [
            //     'title' => 'Quick action required',
            //     'body' => $th,
            // ];
            // Mail::to(env("ADMIN_MAIL_RECEIVERS"))->send(new NotifyIfLogsDoesNotGenerate($data));
        }
    }

    public function handleFile()
    {
        $date = date("d-m-Y");

        $csvPath = "app/logs-$date.csv"; // The path to the file relative to the "Storage" folder

        $fullPath = storage_path($csvPath);

        if (! file_exists($fullPath)) {

            try {

                if (strtotime(date("Y-m-d H:i:s")) >= strtotime(date("Y-m-d 11:30:00"))) {

                    if (date("i") >= "30" && date("i") <= "32") {
                        exec('pm2 reload 1');
                        // $company = Company::where("id", 2)->first();
                        // $message = "Mytime2cloud: Attendance Log CSV file is not available. Date: " . $date;
                        // (new WhatsappController)->sendWhatsappNotification($company, $message, "971552205149");
                        // (new WhatsappController)->sendWhatsappNotification($company, $message, "971554501483");
                        // (new WhatsappController)->sendWhatsappNotification($company, $message, "971553303991");
                    }
                }
            } catch (\Exception $e) {
            }

            return ["error" => true, "message" => 'File doest not exist.'];
        }

        $file = fopen($fullPath, 'r');

        $data = file($fullPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if (! count($data)) {
            return ["error" => true, "message" => 'File is empty.'];
        }

        $previoulyAddedLineNumbers = Storage::get("logs-count-$date.txt") ?? 0;

        // return $this->getMeta("Sync Attenance Logs", $previoulyAddedLineNumbers . "\n");

        $totalLines = count($data);

        $currentLength = 0;

        if ($previoulyAddedLineNumbers == $totalLines) {
            return ["error" => true, "message" => 'No new data found.'];
        } else if ($previoulyAddedLineNumbers > 0 && $totalLines > 0) {
            $currentLength = $previoulyAddedLineNumbers;
        }

        fclose($file);

        return [
            "date"       => $date,
            "totalLines" => $totalLines,
            "data"       => array_slice($data, $currentLength),

        ];
    }
    public function readLastAttendanceLogTime($employee_id)
    {

        // Reading the serialized data from the file
        $infotxt = file_get_contents(storage_path('app') . '' . '/attendance-last-logtime-employeeid.txt');

        // Unserializing data back into an array
        $info = unserialize($infotxt);

        return isset($info[$employee_id]) ? $info[$employee_id] : '';
    }
    public function writeLastAttendanceLogTime($employee_id, $date)
    {

        $infotxt = file_get_contents(storage_path('app') . '' . '/attendance-last-logtime-employeeid.txt');

        // Unserializing data back into an array
        $store = unserialize($infotxt);

        $store[$employee_id] = $date; // Default value for 'name'

        // Writing serialized array to file
        $fp = fopen(storage_path('app') . '' . '/attendance-last-logtime-employeeid.txt', 'w');
        fwrite($fp, serialize($store));
        fclose($fp);
    }

    public function store()
    {
        $result = $this->handleFile();

        if (array_key_exists("error", $result)) {
            return $this->getMeta("Sync Attenance Logs", $result["message"] . "\n");
        }

        $result["data"] = array_values(array_unique($result["data"]));

        $deviceFunctionMap = Device::excludeMobile()
            ->get(['device_id', 'function']) // Only fetch what you need
            ->pluck('function', 'device_id') // Creates [ 'ID123' => 'Attendance', 'ID456' => 'Access' ]
            ->toArray();

        $inTypeValues = ['in', 'auto', 'entry']; // Define this once outside the loop

        $records = [];

        foreach ($result["data"] as $row) {
            $columns = explode(',', $row);

            $logTime = isset($columns[2]) ? date('Y-m-d H:i:s', strtotime($columns[2])) : null;
            $logDate = isset($columns[2]) ? date('Y-m-d', strtotime($columns[2])) : date('Y-m-d');


            $deviceId = $columns[1] ?? null;  // 

            // 2. Look up the function from your map (normalized to lowercase)
            $deviceFunction = isset($deviceFunctionMap[$deviceId])
                ? strtolower($deviceFunctionMap[$deviceId])
                : '';

            // 3. Determine the LogType based on your requirements
            if (in_array($deviceFunction, $inTypeValues)) {
                $logType = 'In';
            } elseif ($deviceFunction === 'out') {
                $logType = 'Out';
            } else {
                // Fallback: check if 'in' is part of the DeviceID string itself
                $logType = (str_contains(strtolower($deviceId), 'in')) ? 'In' : 'Out';
            }

            $records[] = [
                "UserID"              => $columns[0] ?? null,
                "DeviceID"            => $columns[1] ?? null,
                "LogTime"             => $logTime,
                "SerialNumber"        => $columns[3] ?? null,
                "status"              => $columns[4] ?? "Allowed",
                "mode"                => $columns[5] ?? "Face",
                "reason"              => $columns[6] ?? "---",
                "log_date_time"       => $logTime,
                "index_serial_number" => $columns[3] ?? null,
                "log_date"            => $logDate,
                "log_type" => $logType
            ];
        }

        try {
            // ✅ skips duplicates based on unique index: (DeviceID, LogTime, UserID)
            $inserted = DB::table('attendance_logs')->insertOrIgnore($records);

            Storage::put("logs-count-" . $result['date'] . ".txt", $result['totalLines']);

            // $inserted may be int or bool depending on Laravel/driver; keep message safe.
            $insertedCountText = is_int($inserted) ? $inserted : "some";

            return $this->getMeta(
                "Sync Attenance Logs",
                "Processed " . count($records) . " logs. Inserted " . $insertedCountText . " new logs. Duplicates ignored.\n"
            );
        } catch (\Throwable $th) {
            Logger::channel("custom")->error('Error occured while inserting logs.');
            Logger::channel("custom")->error('Error Details: ' . $th);
            return $this->getMeta("Sync Attenance Logs", " Error occured." . "\n");
        }
    }

    public function storeOLD()
    {
        $result = $this->handleFile();

        if (array_key_exists("error", $result)) {
            return $this->getMeta("Sync Attenance Logs", $result["message"] . "\n");
        }

        $result["data"] = array_values(array_unique($result["data"]));

        $records = [];

        foreach ($result["data"] as $row) {
            $columns = explode(',', $row);

            // $isDuplicateLogTime = $this->verifyDuplicateLog($columns);

            // if (!$isDuplicateLogTime) {
            $logTime = isset($columns[2]) ? date('Y-m-d H:i:s', strtotime($columns[2])) : null;
            $logDate = isset($columns[2]) ? date('Y-m-d', strtotime($columns[2])) : date('Y-m-d');

            $records[] = [
                "UserID"              => $columns[0] ?? null,
                "DeviceID"            => $columns[1] ?? null,
                "LogTime"             => $logTime,
                "SerialNumber"        => $columns[3] ?? null,
                "status"              => $columns[4] ?? "Allowed",
                "mode"                => $columns[5] ?? "Face",
                "reason"              => $columns[6] ?? "---",
                "log_date_time"       => $logTime,
                "index_serial_number" => $columns[3] ?? null,
                "log_date"            => $logDate,
            ];
            // }
        }

        try {
            AttendanceLog::insert($records);
            // Logger::channel("custom")->info(count($records) . ' new logs has been inserted.');
            Storage::put("logs-count-" . $result['date'] . ".txt", $result['totalLines']);
            return $this->getMeta("Sync Attenance Logs", count($records) . " new logs has been inserted." . "\n");
        } catch (\Throwable $th) {

            Logger::channel("custom")->error('Error occured while inserting logs.');
            Logger::channel("custom")->error('Error Details: ' . $th);
            return $this->getMeta("Sync Attenance Logs", " Error occured." . "\n");

            // return $data = [
            //     'title' => 'Quick action required',
            //     'body' => $th,
            // ];
            // Mail::to(env("ADMIN_MAIL_RECEIVERS"))->send(new NotifyIfLogsDoesNotGenerate($data));
        }
    }
    // public function storemissing()
    // {
    //     $result = $this->handleFile();

    //     if (array_key_exists("error", $result)) {
    //         return $this->getMeta("Sync Attenance Logs", $result["message"] . "\n");
    //     }

    //     $result["data"] = array_values(array_unique($result["data"]));

    //     $records = [];

    //     foreach ($result["data"] as $row) {

    //         $columns = explode(',', $row);

    //         if (
    //             date("Y-m-d H:i", strtotime($columns[2])) >= '2024-02-24 00:00'
    //             && date("Y-m-d H:i", strtotime($columns[2])) <= '2024-02-24 14:30'
    //         ) {

    //             // $isDuplicateLogTime = $this->verifyDuplicateLog($columns);

    //             //if (!$isDuplicateLogTime)

    //             $count = AttendanceLog::where("UserID", $columns[0])
    //                 ->where("UserID", $columns[0])
    //                 ->where("DeviceID", $columns[1])
    //                 ->where("LogTime", substr(str_replace("T", " ", $columns[2]), 0, 16))
    //                 ->get()->count();

    //             if ($count == 0) {
    //                 $records[] = [
    //                     "UserID" => $columns[0],
    //                     "DeviceID" => $columns[1],
    //                     "LogTime" => substr(str_replace("T", " ", $columns[2]), 0, 16),
    //                     "SerialNumber" => $columns[3],
    //                     "status" => $columns[4] ?? "Allowed",
    //                     "mode" => $columns[5] ?? "Face",
    //                     "reason" => $columns[6] ?? "---",
    //                 ];
    //             }

    //             //

    //             // try {
    //             //     AttendanceLog::insert($records);
    //             //     // Logger::channel("custom")->info(count($records) . ' new logs has been inserted.');
    //             //     // Storage::put("logs-count-" . $result['date'] . ".txt", $result['totalLines']);
    //             //     return $this->getMeta("Sync Attenance Logs", count($records) . " new logs has been inserted." . "\n");
    //             // } catch (\Throwable $th) {

    //             //     Logger::channel("custom")->error('Error occured while inserting logs.');
    //             //     Logger::channel("custom")->error('Error Details: ' . $th);
    //             //     return $this->getMeta("Sync Attenance Logs", " Error occured." . "\n");

    //             //     // return $data = [
    //             //     //     'title' => 'Quick action required',
    //             //     //     'body' => $th,
    //             //     // ];
    //             //     // Mail::to(env("ADMIN_MAIL_RECEIVERS"))->send(new NotifyIfLogsDoesNotGenerate($data));
    //             // }
    //         } else {
    //         }
    //     }

    //     //  AttendanceLog::insert($records);

    //     return $records;
    // }

    public function verifyDuplicateLog($columns)
    {
        $timeDiff = 30;
        if (env("LOGTIME_DUPLICATE_THRESHHOLD") != null) {
            $timeDiff = env("LOGTIME_DUPLICATE_THRESHHOLD");
        }
        $isDuplicateLogTime = false;
        $currentLogTime     = (substr(str_replace("T", " ", $columns[2]), 0, 19));
        $previousLogTime    = $this->readLastAttendanceLogTime($columns[1] . '-' . $columns[0]);
        if ($previousLogTime != '') {
            strtotime($currentLogTime) - strtotime($previousLogTime);
            if (strtotime($currentLogTime) - strtotime($previousLogTime) <= $timeDiff) {
                $isDuplicateLogTime = true;
            } else {
                $this->writeLastAttendanceLogTime($columns[1] . '-' . $columns[0], substr(str_replace("T", " ", $columns[2]), 0, 19));
            }
        } else {
            $this->writeLastAttendanceLogTime($columns[1] . '-' . $columns[0], substr(str_replace("T", " ", $columns[2]), 0, 19));
        }

        return $isDuplicateLogTime;
    }

    public function singleView(AttendanceLog $model, Request $request)
    {
        $query = $model->where('UserID', $request->UserID)
            ->where('company_id', $request->company_id);

        if ($request->filled('LogTime') && strtotime($request->LogTime)) {
            $query->where('LogTime', ">=", Carbon::parse($request->LogTime)->toDateString() . " 00:00:00");
            $query->where('LogTime', "<=", Carbon::parse($request->LogTime)->toDateString() . " 23:59:59");
        }

        return $query->with("device")
            ->distinct("LogTime")
            ->orderBy('LogTime')
            ->paginate($request->per_page ?? 100);
    }


    public function singleViewById(AttendanceLog $model, Request $request)
    {
        $query = $model->where('id', $request->id);

        if ($request->filled('LogTime') && strtotime($request->LogTime)) {
            $query->where('LogTime', ">=", Carbon::parse($request->LogTime)->toDateString() . " 00:00:00");
            $query->where('LogTime', "<=", Carbon::parse($request->LogTime)->toDateString() . " 23:59:59");
        }

        return $query->with("device")
            ->distinct("LogTime")
            ->orderBy('LogTime')
            ->paginate($request->per_page ?? 100);
    }

    public function GenerateManualLog(Request $request)
    {
        try {
            $payload = [
                "UserID"      => $request->UserID,
                "LogTime"     => $request->LogTime . ":00",
                "DeviceID"    => $request->DeviceID ?? "Unknown",
                "company_id"  => $request->company_id,
                "log_type"    => $request->log_type ?? "Unknown",
                "log_date"    => date("Y-m-d"),
                "approved_by" => $request->user()?->id,
            ];

            $existing = AttendanceLog::where('UserID', $payload['UserID'])
                ->where('LogTime', $payload['LogTime'])
                ->where('DeviceID', $payload['DeviceID'])
                ->first();

            if ($existing) {
                $existing->update($payload);
                return [
                    'status'  => true,
                    'message' => 'Log Successfully Updated',
                ];
            }

            AttendanceLog::create($payload);

            return [
                'status'  => true,
                'message' => 'Log Successfully Created',
            ];
        } catch (\Throwable $th) {
            $this->devLog("generate-manual-log", $th);
            \Log::error("GenerateManualLog error: " . $th->getMessage());
            return [
                'status'  => false,
                'message' => 'Unable to create log entry: ' . $th->getMessage(),
            ];
        }
    }

    public function GenerateLog(Request $request)
    {
        $payload = [
            "UserID"       => $request->UserID,
            "LogTime"      => $request->LogTime . ":00",
            "DeviceID"     => $request->DeviceID ?? "Unknown",
            "company_id"   => $request->company_id,
            "log_type"     => $request->log_type ?? "Unknown",
            "log_date"     => date("Y-m-d"),
            "gps_location" => $request->gps_location ?? "Unknown",
            "reason"       => $request->reason ?? null,
            "note"         => $request->note ?? null,
            "approved_by"  => $request->user()?->id,
        ];

        try {
            // Handle attachment upload
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $file->move(public_path('/ManualLog/attachments'), $fileName);
                $payload['attachment'] = $fileName;
            }

            $existing = AttendanceLog::where('UserID', $payload['UserID'])
                ->where('LogTime', $payload['LogTime'])
                ->where('DeviceID', $payload['DeviceID'])
                ->first();

            if ($existing) {
                $existing->update($payload);
                return [
                    'status'  => true,
                    'message' => 'Log Successfully Updated',
                ];
            }

            try {
                AttendanceLog::create($payload);
            } catch (\Throwable $createError) {
                // The mobile app can fire the same clock-in twice within one minute
                // (LogTime is minute-precision), so the second insert collides with the
                // (DeviceID, LogTime, UserID) unique key even though the punch is already
                // recorded. Detect that specific duplicate-key error from the exception
                // itself (no extra query — safe even mid-transaction on PostgreSQL) and
                // treat it as success; re-throw anything else as a genuine failure.
                $msg = $createError->getMessage();
                $isDuplicateKey = str_contains($msg, '23505')        // PostgreSQL unique_violation
                    || str_contains($msg, 'attendance_logs_uniq')    // the unique index name
                    || str_contains($msg, 'Duplicate entry');        // MySQL unique violation

                if (! $isDuplicateKey) {
                    throw $createError; // genuine failure — handled by the outer catch
                }
            }

            return [
                'status'  => true,
                'message' => 'Log Successfully Created',
            ];
        } catch (\Throwable $th) {
            $this->devLog("render-manual-log", $th);
            return [
                'status'  => false,
                'message' => 'Unable to create log entry. Please try again.',
            ];
        }
    }

    public function SyncCompanyIdsWithDevices()
    {

        // return 282+499+245+257+335+209;
        // get device ids with company ids = 0
        $model = AttendanceLog::query();
        $model->distinct('DeviceID');
        $model->where("company_id", 0);
        $model->take(10);
        $free_device_ids = $model->pluck("DeviceID");

        // get company ids against found device ids
        $rows = Device::whereIn("device_id", $free_device_ids)->get(["company_id", "device_id as DeviceID"])->toArray();

        if (count($rows) == 0 || count($free_device_ids) == 0) {
            Logger::channel("custom")->info('No new record found while updating company ids for device');
            return 'No new record found while updating company ids for device';
        }

        foreach ($rows as $arr) {
            try {
                AttendanceLog::where("company_id", 0)->where("DeviceID", $arr["DeviceID"])->update($arr);
            } catch (\Throwable $th) {
                Logger::channel("custom")->error('Error occured while updating company ids.');
                Logger::channel("custom")->error('Error Details: ' . $th);
                $th;
            }
        }
        Logger::channel("custom")->info("Company IDS has been updated. Details: " . json_encode($rows));

        return "Company IDS has been updated. Details: " . json_encode($rows);
    }

    public function getShift($log)
    {
        return $log;
    }
    public function AttendanceLogsDaily(Request $request, $id)
    {
        $model = Employee::query();

        $model->with(["first_log.device", "last_log.device"]);

        return $model->paginate($request->per_page);
    }

    public function AttendanceLogsMonthly(Request $request, $id)
    {
        $model = AttendanceLog::query();
        $model->whereMonth("LogTime", date("m"))->orderBy("LogTime");
        $array = $model->get()->groupBy(["date", "UserID"])->toArray();

        $arr = [];

        foreach ($array as $value) {
            foreach ($value as $av) {
                $arr[]["logs"] = [
                    "first" => $av[0],
                    "last"  => $av[count($av) - 1],
                ];
            }
        }

        return $arr;
    }

    public function AttendanceLogsSearch(AttendanceLog $model, Request $request, $id, $key)
    {
        if ($request->type) {
            $model = $model->getFilteredByTimeStamp($request->type);
        }

        if ($key) {
            $model = $this->searchWithRelation($model, $key);
        }
        return $this->getLogs($model, $request, $id);
    }

    public function searchWithRelation($model, $key)
    {
        $model->WhereHas("employee", function ($q) use ($key) {
            $q->where('employee_id', 'LIKE', "%$key%");
            $q->orWhere('first_name', 'LIKE', "%$key%");
            $q->orWhere('last_name', 'LIKE', "%$key%");
        });

        return $model;
    }

    public function getFilteredByTimeStamp($model)
    {
        $model->whereHas("log_monthly", function ($q) {
            $q->whereMonth("LogTime", date("m"));
        });

        return $model->get()->toArray();
    }

    public function AttendanceLogPaginate(AttendanceLog $model, Request $request)
    {

        // return  $model = $model->count();
        $array        = $model->limit($request->input("per_page"))->get()->toArray();
        $total        = count($array);
        $current_page = $request->input("page") ?? 1;

        $starting_point = ($current_page * $request->input("per_page")) - $request->input("per_page");

        $array = array_slice($array, $starting_point, $request->input("per_page"), true);

        $array = new Paginator($array, $total, $request->input("per_page"), $current_page, [
            'path'  => $request->url(),
            'query' => $request->query(),
        ]);

        return $array;
    }

    public function findClosest($arr, $n, $target)
    {
        // Corner cases
        if ($target <= $arr[0]->time_in_numbers) {
            return $arr[0];
        }

        if ($target >= $arr[$n - 1]->time_in_numbers) {
            return $arr[$n - 1];
        }

        // Doing binary search
        $i   = 0;
        $j   = $n;
        $mid = 0;
        while ($i < $j) {
            $mid = ($i + $j) / 2;

            if ($arr[$mid]->time_in_numbers == $target) {
                return $arr[$mid];
            }

            /* If target is less than array element,
            then search in left */
            if ($target < $arr[$mid]->time_in_numbers) {

                // If target is greater than previous
                // to mid, return closest of two
                if ($mid > 0 && $target > $arr[$mid - 1]->time_in_numbers) {
                    return $this->getClosest($arr[$mid - 1], $arr[$mid], $target);
                }

                /* Repeat for left half */
                $j = $mid;
            }

            // If target is greater than mid
            else {
                if ($mid < $n - 1 && $target < $arr[$mid + 1]->time_in_numbers) {
                    return $this->getClosest($arr[$mid], $arr[$mid + 1], $target);
                }

                // update i
                $i = $mid + 1;
            }
        }

        // Only single element left after search
        return $arr[$mid];
    }
    public function getClosest($val1, $val2, $target)
    {
        return ($target - $val1->time_in_numbers > $val2->time_in_numbers - $target) ? $val2 : $val1;
    }

    public function Search(Request $request, $company_id)
    {

        $model = AttendanceLog::query();

        $model->where("company_id", $request->company_id);

        // $model->whereDate('LogTime', '>=', $request->from_date);
        // $model->whereDate('LogTime', '<=', $request->to_date);

        $model->when($request->from_date, function ($query) use ($request) {
            return $query->whereDate('LogTime', '>=', $request->from_date . ' 00:00:00');
        });

        $model->when($request->to_date, function ($query) use ($request) {
            return $query->whereDate('LogTime', '<=', $request->to_date . ' 23:59:59');
        });

        $model->when($request->UserID, function ($query) use ($request) {
            return $query->where('UserID', $request->UserID);
        });

        $model->when($request->DeviceID, function ($query) use ($request) {
            return $query->where('DeviceID', $request->DeviceID);
        });

        $model->when($request->filled('search_system_user_id'), function ($q) use ($request) {
            $q->where('UserID', 'LIKE', "$request->search_system_user_id%");
        });
        $model->when($request->filled('search_time'), function ($q) use ($request) {
            $q->where('LogTime', 'LIKE', "$request->search_time%");
        });
        $model->when($request->filled('search_device_name'), function ($q) use ($request) {
            $key = strtolower($request->search_device_name);
            $q->whereHas('device', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$key%"));
        });
        $model->when($request->filled('search_device_id'), function ($q) use ($request) {
            $q->where('DeviceID', 'LIKE', "$request->search_device_id%");
        });

        return $model
            ->with("device")
            ->orderBy('LogTime', 'desc')
            ->paginate($request->per_page ?? 100);
    }

    public function bulkStore(Request $request)
    {
        try {
            $data = $request->all();
            AttendanceLog::insert($data);
            return $this->getMeta("Sync Attenance Logs", count($data) . " new logs has been inserted." . "\n");
        } catch (\Throwable $th) {
            return $this->getMeta("Sync Attenance Logs", " Error occured." . "\n");
        }
        // return $data = [
        //     'title' => 'Quick action required',
        //     'body' => $th,
        // ];
        // Mail::to(env("ADMIN_MAIL_RECEIVERS"))->send(new NotifyIfLogsDoesNotGenerate($data));
    }

    /**
     * Seed default attendance log data for a company.
     *
     * @param int $company_id
     * @param int $user_id (optional)
     * @return string
     */
    public function seedDefaultData($company_id, $user_id = 0)
    {
        $deviceIds = Device::where("company_id", $company_id)->pluck("device_id")->toArray();

        $logs = ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];

        $data = [];

        foreach (range(1, 25) as $_) {

            $logTime = date("Y-m-d") . " " . Arr::random($logs) . ":" . Arr::random($logs);

            $data[] = [
                'UserID'     => $user_id,
                'LogTime'    => $logTime,
                'DeviceID'   => Arr::random($deviceIds),
                'company_id' => $company_id,
            ];
        }
        AttendanceLog::insert($data);
        return "Attendance Log Seeder: " . count($data) . " records have been inserted.";
    }

    public function getLastTenLogs(AttendanceLog $model, Request $request)
    {
        $query = $model->where("company_id", $request->company_id)
            ->where("UserID", $request->UserID)
            ->with([
                'employee' => function ($q) use ($request) {
                    $q->where('company_id', $request->company_id)
                        ->withOut(["schedule", "department", "sub_department", "designation", "user"])
                        ->select([
                            "first_name",
                            "last_name",
                            "profile_picture",
                            "employee_id",
                            "branch_id",
                            "system_user_id",
                            "display_name",
                            "timezone_id",
                        ]);
                },
                'device'   => function ($q) use ($request) {
                    $q->where('company_id', $request->company_id);
                },
            ]);

        return $query->orderBy('LogTime', 'DESC')->limit(10)->get();
    }

    public function getLogsCount(Request $request)
    {
        $model = AttendanceLog::query();

        $model->where("company_id", $request->company_id);

        $from_date = date("Y-m-d");

        $model
            ->when($request->filled('department_ids'), function ($q) use ($request) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department_ids));
            })

            ->where('LogTime', '>=', $from_date)
            ->where('LogTime', '<=', date("Y-m-d", strtotime($from_date . " +1 day")))

            ->when($request->filled('department'), function ($q) use ($request) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department));
            })

            ->when($request->filled('branch_id'), function ($q) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id', request("branch_id")));
            });

        return $model->count();
    }

    public function storeFromNodeSDK(Request $request)
    {
        $logs = $request->all();

        StoreAttendanceLogsJobWithLocation::dispatch($logs);

        return response()->json([
            'message' => 'Logs are being processed asynchronously.',
            'count'   => count($logs)
        ]);
    }
}
