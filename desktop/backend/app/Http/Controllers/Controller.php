<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\AttendanceLog;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class Controller extends BaseController
{
    use AuthorizesRequests;
    use DispatchesJobs;
    use ValidatesRequests;

    public function FilterCompanyList($model, $request, $model_name = null)
    {
        $model = $model::query();

        if (is_null($model_name)) {
            $model->when($request->company_id > 0, function ($q) use ($request) {
                return $q->where('company_id', $request->company_id);
            });

            $model->when(!$request->company_id, function ($q) use ($request) {
                return $q->where('company_id', 0);
            });
        }

        return $model;
    }

    public static function process($action, $job, $model, $id = null)
    {
        try {
            $m = '\\App\\Models\\' . $model;
            $last_id = gettype($job) == 'object' ? $job->id : $id;

            $response = [
                'status' => true,
                'record' => $m::find($last_id),
                'message' => $model . ' has been ' . $action,
            ];

            if ($last_id) {
                return response()->json($response, 200);
            } else {
                return response()->json([
                    'status' => false,
                    'record' => null,
                    'message' => $model . ' cannot ' . $action,
                ], 200);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function process_command($command)
    {
        $url = env("SDK_URL");
        $post = env("LOCAL_PORT");

        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => "$url:$post/$command",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
        ));

        $response = curl_exec($curl);

        curl_close($curl);

        return json_decode($response);
    }

    public function response($msg, $record, $status, $statusCode = 200)
    {
        return response()->json(['message' => $msg, 'record' => $record,  'status' => $status], $statusCode);
    }

    public function process_search($model, $input, $fields = [])
    {
        $model->where('id', 'LIKE', "%$input%");

        foreach ($fields as $key => $value) {
            if (is_string($value)) {
                $model->orWhere($value, 'LIKE', "%$input%");
            } else {
                foreach ($value as $relation_value) {
                    $model->orWhereHas($key, function ($query) use ($input, $relation_value) {
                        $query->where($relation_value, 'like', '%' . $input . '%');
                    });
                }
            }
        }
        return $model;
    }

    public function getStatusText($status)
    {
        $arr = [
            "All" => "All",
            "A" => "Absent",
            "M" => "Missing",
            "ME" => "Manual Entry",
            "P" => "Present",
            "O" => "Week Off",
            "L" => "Leave",
            "H" => "Holiday",
            "V" => "Vaccation",
            "LC" => "Late In",
            "EG" => "Early Out",
            "-1" => "Summary"
        ];

        return $arr[$status] ?? "---";
    }

    public function getStatusSlug($status)
    {
        $arr = [
            "All" => "All",
            "A" => "Absent",
            "M" => "Missing",
            "ME" => "ManualEntry",
            "P" => "Present",
            "O" => "WeekOff",
            "L" => "Leave",
            "H" => "Holiday",
            "V" => "Vaccation",
            "LC" => "LateIn",
            "EG" => "EarlyOut",
            "-1" => "Summary"
        ];

        return $arr[$status] ?? "---";
    }

    public function process_ilike_filter($model, $request, $fields)
    {
        foreach ($fields as $field) {
            if ($request->filled($field)) {
                $model->where($field, env('WILD_CARD') ?? 'ILIKE', $request->input($field) . '%');
            }
        }
        return $model;
    }



    public function process_column_filter($model, $request, $fields)
    {
        foreach ($fields as $field) {
            if ($request->filled($field)) {
                $model->where($field,   $request->input($field));
            }
        }
        return $model;
    }

    public function custom_with($model, $relation, $company_id)
    {
        return $model->with($relation, function ($q) use ($company_id) {
            $q->where('company_id', $company_id);
        });
    }

    public function getModelDataByCompanyId($currentDate, $companyId, $UserIDs, $shift_type_id)
    {
        $model = AttendanceLog::query();

        $model->where("checked", false);
        $model->where("company_id", '>', 0);
        $model->whereDate("LogTime", $currentDate);
        $model->where("company_id", $companyId);

        $model->when(count($UserIDs) > 0, function ($q) use ($companyId, $UserIDs) {
            $q->where("company_id", $companyId);
            $q->whereIn("UserID", $UserIDs);
        });

        $model->whereHas("schedule", function ($q) use ($shift_type_id, $currentDate, $companyId) {
            $q->where('shift_type_id', $shift_type_id);
            $q->where('from_date', "<=", $currentDate);
            $q->where('to_date', ">=", $currentDate);
            $q->where("company_id", $companyId);
        });
        $model->with("schedule", function ($q) use ($shift_type_id, $currentDate, $companyId) {
            $q->where('shift_type_id', $shift_type_id);
            $q->where('from_date', "<=", $currentDate);
            $q->where('to_date', ">=", $currentDate);
            $q->where("company_id", $companyId);
        });

        $model->orderBy("LogTime");

        return $model->get(["id", "UserID", "LogTime", "DeviceID", "company_id"])->groupBy(["UserID"])->toArray();
    }

    public function getMeta($script_name, $msg)
    {
        return "[" . date("Y-m-d H:i:s") . "] Cron: " . $script_name . ". " . $msg;
    }

    public function getCurrentDate()
    {
        return date('Y-m-d');
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

    public function minutesToHoursNEW($in, $out)
    {
        $parsed_out = strtotime($out);
        $parsed_in = strtotime($in);

        if ($parsed_in > $parsed_out) {
            $parsed_out += 86400;
        }

        $diff = $parsed_out - $parsed_in;

        $mints = floor($diff / 60);

        $minutes = $mints > 0 ? $mints : 0;

        $newHours = intdiv($minutes, 60);
        $newMints = $minutes % 60;
        $final_mints = $newMints < 10 ? '0' . $newMints : $newMints;
        $final_hours = $newHours < 10 ? '0' . $newHours : $newHours;
        $hours = $final_hours . ':' . ($final_mints);
        return $hours;
    }

    public function minutesToHours($minutes)
    {
        $newHours = intdiv($minutes, 60);
        $newMints = $minutes % 60;
        $final_mints = $newMints < 10 ? '0' . $newMints : $newMints;
        $final_hours = $newHours < 10 ? '0' . $newHours : $newHours;
        $hours = $final_hours . ':' . ($final_mints);
        return $hours;
    }

    public function getTotalHrsMins($first, $last)
    {
        $diff = abs(strtotime($last) - strtotime($first));

        $h = floor($diff / 3600);
        $m = floor(($diff % 3600) / 60);
        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }

    public function uniqueRecord($table, $params)
    {
        return Rule::unique($table)->where(function ($query) use ($params) {
            return $query->where($params);
        });
    }

    public function processFile($file, $id)
    {
        $filename = $file->getClientOriginalName();
        $file->move(public_path('documents/' . $id . "/"), $filename);
        return $filename;
    }

    public function recordActivity($user_id, $action, $type, $company_id, $user_type)
    {
        return Activity::create([
            "user_id" => $user_id,
            "action" => $action,
            "type" => $type,
            "model_id" => $user_id,
            "model_type" =>  $user_type,
            "company_id" => $company_id,
            "description" =>  $user_type . " with {$user_id} Id has been logged In.",
        ]);
    }

    public function calculatedLateComing($time, $on_duty_time, $grace)
    {

        $interval_time = date("i", strtotime($grace));

        $late_condition = strtotime("$on_duty_time + $interval_time minute");

        $in = strtotime($time);

        if ($in < $late_condition) {
            return "---";
        }

        $diff = abs((strtotime($on_duty_time) - $in));

        $h = floor($diff / 3600);
        $m = floor($diff % 3600) / 60;
        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }

    public function calculatedEarlyGoing($time, $off_duty_time, $grace)
    {
        $interval_time = date("i", strtotime($grace));

        $late_condition = strtotime("$off_duty_time - $interval_time minute");

        $out = strtotime($time);

        if ($out > $late_condition) {
            return "---";
        }

        $diff = abs((strtotime($off_duty_time) - $out));

        $h = floor($diff / 3600);
        $m = floor($diff % 3600) / 60;
        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }

    public function getSchedule($currentDate, $schedule)
    {

        if (!$schedule || !$schedule->shift) {
            return false;
        }

        $nextDate = date('Y-m-d', strtotime($currentDate . ' + 1 day'));

        $start_range = $currentDate . " " . $schedule->shift->on_duty_time;

        $end_range = $nextDate . " " . $schedule->shift->off_duty_time;

        return [
            "roster_id" => $schedule["roster_id"],
            "shift_id" => $schedule["shift_id"],
            "shift_type_id" => $schedule["shift_type_id"],
            "range" => [$start_range, $end_range],
            "isOverTime" => $schedule["isOverTime"],
            "working_hours" => $schedule["shift"]["working_hours"],
            "overtime_interval" => $schedule["shift"]["overtime_interval"],
            "on_duty_time" => $schedule["shift"]["on_duty_time"],
            "late_time" => $schedule["shift"]["late_time"],
            "off_duty_time" => $schedule["shift"]["off_duty_time"],
            "early_time" => $schedule["shift"]["early_time"],
        ];
    }

    public function SDKCommand($url, $data)
    {
        try {
            return Http::timeout(3000)->withoutVerifying()->withHeaders([
                'Content-Type' => 'application/json',
            ])->post($url, $data);
        } catch (\Exception $e) {
            return [
                "status" => 102,
                "message" => $e->getMessage(),
            ];
            // You can log the error or perform any other necessary actions here
        }
    }

    public function generateRandomTime($start, $end)
    {
        $start_timestamp = strtotime($start);
        $end_timestamp = strtotime($end);
        $random_timestamp = mt_rand($start_timestamp, $end_timestamp);

        return date('H:i', $random_timestamp);
    }

    public function calculateTotalHours($inTime, $outTime)
    {
        // Convert 'in' and 'out' times to timestamps
        $inTimestamp = strtotime($inTime);
        $outTimestamp = strtotime($outTime);

        $diff = $outTimestamp - $inTimestamp;

        $h = floor($diff / 3600);
        $m = floor(($diff % 3600) / 60);
        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }



    public function devLog($file_name, $message): void
    {
        if ($message != '')
            Storage::append("dev_logs/" . $file_name . '-' . date('d-m-Y') . ".log", $message . "\n");
    }

    public function processImage($folder): string
    {
        $base64Image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', request('logo')));
        $imageName = (time() + rand(10000, 20000)) . ".png";
        $publicDirectory = public_path($folder);
        if (!file_exists($publicDirectory)) {
            mkdir($publicDirectory);
        }
        file_put_contents($publicDirectory . '/' . $imageName, $base64Image);
        return $imageName;
        $imageUrl = asset($folder . '/' . $imageName);
        return $imageUrl;
    }

    public function mergePdfFiles(array $pdfFiles, $action = "D", $outputFileName = "report.pdf", $outputPath = null)
    {
        ini_set('memory_limit', '512M'); // Adjust to the required value

        set_time_limit(60);

        // Initialize FPDI
        $pdf = new \setasign\Fpdi\Fpdi();

        // Loop through each PDF file
        foreach ($pdfFiles as $file) {
            $pageCount = $pdf->setSourceFile($file);

            // Add each page from the source PDF to the final output
            for ($i = 1; $i <= $pageCount; $i++) {
                $tplId = $pdf->importPage($i);
                $size = $pdf->getTemplateSize($tplId);  // Get the page size of the imported PDF

                // Adjust orientation based on the original page's width and height
                $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';  // Auto-detect orientation

                // Add a new page with the detected orientation
                $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                $pdf->useTemplate($tplId);
            }
        }

        // Save the merged PDF to the specified output path
        if ($outputPath) {
            $pdf->Output($outputPath, 'F');  // 'F' for saving to file
            return $outputPath;  // Return the path to the saved file
        }
        // Stream or Download the merged PDF directly to the browser
        return response($pdf->Output($outputFileName, $action))->header('Content-Type', 'application/pdf'); // download
    }

    public function logOutPut($logFilePath, $payload)
    {
        // Check if payload is an array, then JSON encode it
        if (is_array($payload)) {
            $payload = json_encode($payload, JSON_PRETTY_PRINT);
        }

        $date = date('Y-m-d');

        try {
            Storage::disk('local')->append("$logFilePath/$date.log", $payload);
        } catch (\Throwable $e) {
            // Debug logging must never break the business request. A storage
            // permission issue on the log directory (e.g. a cron created the
            // parent dir as another user) used to bubble up as a 500 from
            // endpoints like /render_logs. Degrade silently to the framework log.
            Log::warning("logOutPut failed for {$logFilePath}: " . $e->getMessage());
        }
    }

    public function throwAuthException($request, $user)
    {
        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        } else if ($user->company_id > 0 && $user->company->expiry < now()) {
            throw ValidationException::withMessages([
                'email' => ['Subscription has been expired.'],
            ]);
        } else if (!$user->mobile_app_login_access) {
            throw ValidationException::withMessages([
                'email' => ['Login access is disabled. Please contact your admin.'],
            ]);
        } else if ($user->branch_id == 0 &&  $user->is_master === false && $request->filled("source")) {
            throw ValidationException::withMessages([
                'email' => ["You do not have permission to Access this Page"],
            ]);
        }
    }
}
