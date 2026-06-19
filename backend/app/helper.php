<?php

use App\Models\Activity;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

if (! function_exists('getStatus2')) {
    function getStatus2($employeeData)
    {
        $countA = 0;
        $countP = 0;
        $countM = 0;
        $countO = 0;
        $countL = 0;
        $countH = 0;

        foreach ($employeeData as $employee) {
            if (! is_array($employee) || empty($employee[0]) || ! isset($employee[0]['total_hrs'])) {
                throw new InvalidArgumentException("Invalid employee data: each employee must be an array with a 'total_hrs' key");
            }
            $status = $employee[0]['status'];
            if ($status == 'A') {
                $countA++;
            } elseif ($status == 'P') {
                $countP++;
            } elseif ($status == 'M') {
                $countM++;
            } elseif ($status == 'O') {
                $countO++;
            } elseif ($status == 'L') {
                $countL++;
            } elseif ($status == 'H') {
                $countH++;
            }
        }
        return [
            'A' => $countA,
            'P' => $countP,
            'M' => $countM,
            'O' => $countO,
            'L' => $countL,
            'H' => $countH,
        ];
    }
}
if (! function_exists('getTotalHours2')) {
    function getTotalHours2($employeeData, $type)
    {
        if (! is_array($employeeData)) {
            throw new InvalidArgumentException('Invalid employee data: must be an array');
        }
        $totalMinutes = 0;
        foreach ($employeeData as $employee) {
            if (! is_array($employee) || empty($employee[0]) || ! isset($employee[0]['total_hrs'])) {
                throw new InvalidArgumentException("Invalid employee data: each employee must be an array with a 'total_hrs' key");
            }
            $time = $employee[0][$type];
            if ($time != '---') {
                $parts   = explode(':', $time);
                $hours   = intval($parts[0]);
                $minutes = intval($parts[1]);
                $totalMinutes += $hours * 60 + $minutes;
            }
        }

        $hours   = floor($totalMinutes / 60);
        $minutes = $totalMinutes % 60;

        return sprintf('%02d:%02d', $hours, $minutes);
    }
}
if (! function_exists('removeFile')) {
    function removeFile($path, $file_name)
    {
        $delete = public_path($path . $file_name);
        if (File::isFile($delete)) {
            unlink($delete);
        }
    }
}
if (! function_exists('saveFile')) {
    function saveFile($request, $destination, $attribute_name = null, $prefix = "", $sufix = "", $imageObj = null, $return_ext = false)
    {
        if (isset($imageObj) && ! empty($imageObj) && $attribute_name == null) {
            $temp     = $imageObj;
            $file     = $imageObj->getClientOriginalName();
            $file_ext = $imageObj->getClientOriginalExtension();
            $fileName = pathinfo($file, PATHINFO_FILENAME);
            $image    = ((! empty($prefix)) ? (str_ireplace(" ", "-", $prefix) . "-") : "") . str_ireplace(" ", "-", $fileName) . ((! empty($sufix)) ? "-" . str_ireplace(" ", "-", $sufix) : "") . "." . $file_ext;
            $temp->move($destination, $image);
        } else if (isset($attribute_name) && $request->hasFile($attribute_name) && $attribute_name != null) {
            $temp     = $request->file($attribute_name);
            $file     = $request->$attribute_name->getClientOriginalName();
            $file_ext = $request->$attribute_name->getClientOriginalExtension();
            $fileName = pathinfo($file, PATHINFO_FILENAME);
            $image    = ((! empty($prefix)) ? (str_ireplace(" ", "-", $prefix) . "-") : "") . str_ireplace(" ", "-", $fileName) . ((! empty($sufix)) ? "-" . str_ireplace(" ", "-", $sufix) : "") . "." . $file_ext;
            $temp->move($destination, $image);
        }

        if ($return_ext) {
            return ["name" => (isset($image)) ? $image : null, "ext" => (isset($file_ext)) ? $file_ext : null];
        }
        return (isset($image)) ? $image : null;
    }
}

if (! function_exists('ld')) {
    function ld($arr)
    {
        echo "<pre>";
        echo json_encode($arr, JSON_PRETTY_PRINT);
        die;
    }
}
if (! function_exists('defaultCards')) {
    function defaultCards($id = 1)
    {
        return [
            "page"       => "dashboard1",
            "type"       => "card",
            "company_id" => $id,
            "style"      => [
                [
                    "title"            => "Total Employee",
                    "value"            => "employeeCount",
                    "color"            => "#9C27B0",
                    "icon"             => "mdi mdi-account",
                    "cols"             => "12",
                    "sm"               => "6",
                    "md"               => "2",
                    "calculated_value" => "09",
                ],
                [
                    "title"            => "Present",
                    "value"            => "presentCount",
                    "color"            => "#512DA8FF",
                    "icon"             => "mdi mdi-account",
                    "cols"             => "12",
                    "sm"               => "6",
                    "md"               => "2",
                    "calculated_value" => "00",
                ],
                [
                    "title"            => "Absent",
                    "value"            => "absentCount",
                    "color"            => "#BF360CFF",
                    "icon"             => "mdi mdi-account",
                    "cols"             => "12",
                    "sm"               => "6",
                    "md"               => "2",
                    "calculated_value" => "00",
                ],
                [
                    "title"            => "Late",
                    "value"            => "missingCount",
                    "color"            => "#263238FF",
                    "icon"             => "mdi mdi-account",
                    "cols"             => "12",
                    "sm"               => "6",
                    "md"               => "2",
                    "calculated_value" => "00",
                ],
                [
                    "title"            => "Leave",
                    "value"            => "leaveCount",
                    "color"            => "#78909CFF",
                    "icon"             => "mdi mdi-account",
                    "cols"             => "12",
                    "sm"               => "6",
                    "md"               => "2",
                    "calculated_value" => "00",
                ],
                [
                    "title"            => "Vacation",
                    "value"            => "vacationCount",
                    "color"            => "#558B2FFF",
                    "icon"             => "mdi mdi-account",
                    "cols"             => "12",
                    "sm"               => "6",
                    "md"               => "2",
                    "calculated_value" => "00",
                ],
            ],
        ];
    }
}
if (! function_exists('defaultBranch')) {
    function defaultBranch($id = 1)
    {
        return
            [
                "branch_code" => "BRN1",
                "branch_name" => "Branch1",
                "user_id"     => 0,
                "company_id"  => $id,
            ];
    }
}
if (! function_exists('defaultRoles')) {
    function defaultRoles($id = 1)
    {
        return [
            [
                "name"       => "Employee",
                "role_type"  => "employee",
                "company_id" => $id,
            ],
            [
                "name"       => "Manager",
                "role_type"  => "employee",
                "company_id" => $id,
            ],
        ];
    }
}
if (! function_exists('defaultDepartments')) {
    function defaultDepartments($id = 1, $branch_id = 1)
    {

        return [
            [
                "name"       => "Accounts",
                "company_id" => $id,
                "branch_id"  => $branch_id,
            ],
            [
                "name"       => "Admin",
                "company_id" => $id,
                "branch_id"  => $branch_id,
            ],
            [
                "name"       => "It Dep",
                "company_id" => $id,
                "branch_id"  => $branch_id,
            ],
            [
                "name"       => "Sales",
                "company_id" => $id,
                "branch_id"  => $branch_id,
            ],
        ];
    }
}
if (! function_exists('defaultDesignations')) {
    function defaultDesignations($id = 1)
    {

        return [
            [
                "name"       => "Supervisior",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
            [
                "name"       => "Technician",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
            [
                "name"       => "It Dep",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
            [
                "name"       => "General Sales",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
        ];
    }
}
if (! function_exists('defaultAnnouncementCategories')) {
    function defaultAnnouncementCategories($id = 1)
    {

        return [
            [
                "name"       => "Urgent",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
            [
                "name"       => "Informational",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
            [
                "name"       => "Meeting",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
            [
                "name"       => "Priority",
                "company_id" => $id,
                "branch_id"  => 1,
            ],
            [
                "name"       => "Low Priority",
                "company_id" => $id,
                "branch_id"  => 1,
            ],

        ];
    }
}
if (! function_exists('log_message')) {
    /**
     * Log a device message to a specific log file.
     *
     * @param string $message The message to log.
     * @param string $filename Optional custom file name.
     */
    function log_message(string $message, string $filename = null): void
    {
        $file_name_raw = $filename ?: "helper_log_";
        $file_name_raw .= date("d-m-Y") . ".txt";
        $log_entry = date("Y-m-d H:i:s") . " - " . $message;
        Storage::append("helper_logs/" . $file_name_raw, $log_entry);
    }
}
if (! function_exists('defaultMailContent')) {
    function defaultMailContent($id = 1)
    {

        return [
            [
                "name"       => "email",
                "company_id" => $id,
                "branch_id"  => 1,
                "content"    => "<p>Hi,</p><p>This is Automated Generated Mail for Daily reports. </p><p>Your email id is subscribed for Automated email reports.</p><p></p><p>Thanks ,</p><p></p>",
            ],
            [
                "name"       => "whatsapp",
                "company_id" => $id,
                "branch_id"  => 1,
                "content"    => "Automatic generated whatsapp Notifications.
            Thanks",
            ],
        ];
    }
}
if (! function_exists('defaultDeviceManual')) {
    function defaultDeviceManual($id = 1)
    {

        return [
            "company_id"    => $id,

            "name"          => "Manual",
            "short_name"    => "Manual",
            "branch_id"     => 1,
            "location"      => "Manual",
            "utc_time_zone" => "Asia/Dubai",
            "model_number"  => "Manual",
            "device_id"     => "Manual",
            "function"      => "auto",
            "device_type"   => "all",
            "status_id"     => 2,

            "ip"            => "0.0.0.0",
            "serial_number" => "Manual",
            "port"          => "0000",

        ];
    }
}

if (! function_exists('recordAction')) {
    function recordAction($arr)
    {
        $user_id = $arr["user_id"] ?? 0;

        $company_id = request("company_id", 1) ?? $arr["company_id"];

        Activity::create([
            "user_id"     => $user_id,
            "action"      => $arr["action"],
            "type"        => $arr["type"],
            "model_id"    => $user_id,
            "model_type"  => "user",
            "company_id"  => $company_id,
            "description" => "User with id ($user_id) {$arr['description']}",
        ]);
    }
}

if (! function_exists('showJson')) {
    function showJson($arr)
    {
        return json_encode($arr, JSON_PRETTY_PRINT);
    }
}

if (! function_exists('getTotalHours')) {
    function getTotalHours($times)
    {
        $sum_minutes = 0;
        foreach ($times as $time) {
            if ($time != "---") {
                $parts   = explode(":", $time);
                $hours   = intval($parts[0]);
                $minutes = intval($parts[1]);
                $sum_minutes += $hours * 60 + $minutes;
            }
        }
        $work_hours = floor($sum_minutes / 60);
        $sum_minutes -= $work_hours * 60;
        return $work_hours . ':' . $sum_minutes;
    }
}


// usage: $minutes = time_to_minutes($shift->break_duration);
if (!function_exists('time_to_minutes')) {
    function time_to_minutes(string $time): int
    {
        [$hours, $minutes] = explode(':', $time);
        return ((int)$hours * 60) + (int)$minutes;
    }
}

// usage: $minutes = time_to_minutes($shift->break_duration);
if (!function_exists('addtendanceRulesDaysMap')) {
    function addtendanceRulesDaysMap()
    {
        return [
            'Mon' => 'M',
            'Tue' => 'T',
            'Wed' => 'W',
            'Thu' => 'Th',
            'Fri' => 'F',
            'Sat' => 'S',
            'Sun' => 'Su'
        ];
    }
}

if (!function_exists('calculateTimeWithGrace')) {

    function calculateTimeWithGrace($actualTime, $referenceTime, $gracePeriod, $mode = 'late')
    {
        if ($actualTime === "---" || $gracePeriod === "00:00") return false;

        $actual = new DateTime($actualTime);
        $reference = new DateTime($referenceTime);

        list($graceH, $graceM) = explode(':', $gracePeriod);
        $graceMinutes = ($graceH * 60) + $graceM;

        // Directional calculation
        if ($mode === 'late') {
            $diffMinutes = ($actual->getTimestamp() - $reference->getTimestamp()) / 60;
        } else { // early
            $diffMinutes = ($reference->getTimestamp() - $actual->getTimestamp()) / 60;
        }

        if ($diffMinutes <= $graceMinutes) {
            return false;
        }

        $hours = floor($diffMinutes / 60);
        $minutes = $diffMinutes % 60;

        return sprintf('%02d:%02d', $hours, $minutes);
    }
}

if (!function_exists('calculateTimeDiff')) {
    /**
     * Calculates time difference based on direction and grace period.
     * Mode 'late': actual > ref | Mode 'early': ref > actual
     */
    function calculateTimeDiff($actualTime, $referenceTime, $mode = 'late', $gracePeriod = "00:00") {
        if ($actualTime === "---" || !$actualTime || !$referenceTime) return false;

        try {
            $actual = new \DateTime($actualTime);
            $reference = new \DateTime($referenceTime);

            // Handle grace period parsing
            $graceMinutes = 0;
            if (strpos($gracePeriod, ':') !== false) {
                list($graceH, $graceM) = explode(':', $gracePeriod);
                $graceMinutes = ($graceH * 60) + $graceM;
            } else {
                $graceMinutes = (int)$gracePeriod;
            }

            // Calculate difference in minutes
            $diffMinutes = ($mode === 'late') 
                ? ($actual->getTimestamp() - $reference->getTimestamp()) / 60 
                : ($reference->getTimestamp() - $actual->getTimestamp()) / 60;

            return ($diffMinutes > $graceMinutes) ? (int)$diffMinutes : false;
        } catch (\Exception $e) {
            return false;
        }
    }
}

if (!function_exists('formatMinutes')) {
    /**
     * Formats minutes into HH:MM string
     */
    function formatMinutes($totalMinutes) {
        $h = floor(max(0, (int)$totalMinutes) / 60);
        $m = max(0, (int)$totalMinutes) % 60;
        return sprintf('%02d:%02d', $h, $m);
    }
}
