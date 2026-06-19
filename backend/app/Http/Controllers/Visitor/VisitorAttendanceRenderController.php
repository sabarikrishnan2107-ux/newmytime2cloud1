<?php

namespace App\Http\Controllers\Visitor;

use App\Models\Attendance;
use Illuminate\Http\Request;
use App\Models\AttendanceLog;
use App\Http\Controllers\Controller;
use App\Http\Controllers\SDKController;
use App\Models\Device;
use App\Models\Visitor;
use App\Models\VisitorAttendance;
use App\Models\Zone;
use DateTime;
use DateTimeZone;

class VisitorAttendanceRenderController extends Controller
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
        $visitor_ids = $request->visitor_ids;

        // Convert start and end dates to DateTime objects
        $startDate = new \DateTime($startDateString);
        $endDate = new \DateTime($endDateString);
        $currentDate = new \DateTime();

        $response = [];

        while ($startDate <= $currentDate && $startDate <= $endDate) {
            $response[] = $this->render($company_id, $startDate->format("Y-m-d"), 1, $visitor_ids, true);
            $startDate->modify('+1 day');
        }

        return $response;
    }

    public function renderRequest(Request $request)
    {
        return $this->render($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->shift_type_id, $request->UserIds, true);
    }

    public function render($id, $date, $shift_type_id, $UserIds = [], $custom_render = false)
    {


        $devicesListArray = Device::where("company_id", $id);
        $params = [
            "company_id" => $id,
            "date" => $date,
            "shift_type_id" => $shift_type_id,
            "custom_render" => $custom_render,
            "UserIds" => $UserIds,
        ];

        if (!$custom_render) {
            $params["UserIds"] = (new AttendanceLog)->getVisitorIdsForNewLogsToRender($params);
        }

        $logsEmployees =  (new AttendanceLog)->getLogsForRender($params);

        $items = [];
        $message = "";
        foreach ($logsEmployees as $key => $logs) {

            $logs = $logs->toArray() ?? [];



            // $firstLog = collect($logs)->filter(fn ($record) => $record['log_type'] !== "out")->first();
            // $lastLog = collect($logs)->filter(fn ($record) => $record['log_type'] !== "in")->last();

            // $firstLog = collect($logs)->filter(function ($record) {
            //     return isset($record["device"]["function"]) && ($record["device"]["function"] == "In" || $record["device"]["function"] == "all" || $record["device"]["function"] == "auto");
            // })->first();

            // $lastLog = collect($logs)->filter(function ($record) {
            //     return isset($record["device"]["function"]) && ($record["device"]["function"] == "Out" || $record["device"]["function"] == "all"  || $record["device"]["function"] == "auto");
            // })->last();

            $firstLog = collect($logs)->filter(function ($record) {
                return $record["log_type"] == "In";
            })->first();

            $lastLog = collect($logs)->filter(function ($record) {
                return $record["log_type"] == "Out";
            })->last();
            if ($firstLog == null) {

                $firstLog = collect($logs)->filter(function ($record) {
                    return (isset($record["device"]["function"]) && ($record["device"]["function"] != "Out"));
                })->first();
            }
            if ($lastLog == null) {
                $lastLog = collect($logs)->filter(function ($record) {
                    return isset($record["device"]["function"]) && ($record["device"]["function"] != "In");
                })->last();
            }

            //echo $firstLog["time"] . '---' . $lastLog["time"];
            //print_r($lastLog);
            //exit;
            // $schedule = $firstLog["schedule"] ?? false;
            // $shift = $schedule["shift"] ?? false;

            // if (!$schedule) {
            //     $message .= ".  No schedule is mapped with combination  System User Id: $key   and Date : " . $params["date"] . " ";
            //     continue;
            // }
            // if (!$firstLog["schedule"]["shift_type_id"]) {
            //     $message .= "$key : None f=of the  Master shift configured on  date:" . $params["date"];
            //     continue;
            // }

            $device_id = $devicesListArray->clone()->where("device_id", "=", $firstLog["DeviceID"])->pluck('id')[0];

            $item = [

                "total_hrs" => "---",
                "in" => $firstLog["time"] ?? "---",
                "out" =>  null,

                "device_id_in" => $device_id  ?? "---",
                "device_id_out" => "---",
                "date" => $params["date"],
                "date_in" => $params["date"],

                "branch_id" => $logs[0]['visitor']["branch_id"] ?? 0,

                "company_id" => $params["company_id"],
                "visitor_id" => $logs[0]['visitor']['id'],
                "system_user_id" => $key,
                // "shift_id" => $firstLog["schedule"]["shift_id"] ?? 0,
                // "shift_type_id" => $firstLog["schedule"]["shift_type_id"] ?? 0,
                "status" => "M",
                "total_hrs" => '---',
                "over_stay" => '---',

            ];



            if (count($logs) > 1) {

                $device_id = $devicesListArray->clone()->where("device_id", "=", $lastLog["DeviceID"])->pluck('id')[0];

                $item["status"] = "P";
                $item["device_id_out"] = $device_id ?? null;
                $item["out"] = $lastLog["time"] ?? null;
                $item["date_out"] = $params["date"] ?? null;
                if ($item["out"] !== null) {
                    $item["total_hrs"] = $this->getTotalHrsMins($item["in"], $item["out"]);
                }

                $visitor_over_stay_inMin = (strtotime($lastLog["time"]) - strtotime($logs[0]['visitor']["time_out"]));



                //Duration 
                $time1 = new DateTime($firstLog["time"]);
                $time2 = new DateTime($lastLog["time"]);
                $interval = $time1->diff($time2);

                $item["total_hrs"] = $interval->format("%H:%I");
                //echo $item["total_hrs"];


                if ($visitor_over_stay_inMin > 0) {
                    $item["over_stay"] =  gmdate("H:i:s", $visitor_over_stay_inMin);;
                }
            }
            $items[] = $item;
        }

        if (!count($items)) {
            // $message = '[' . $date . " " . date("H:i:s") . '] Visitor Attendances: No data found' . $message;
            $this->devLog("visitor-attenadnce-log", $message);
            return $message;
        }



        try {
            $UserIds = array_column($items, "visitor_id");
            $model = VisitorAttendance::query();
            $model->where("company_id", $id);
            $model->whereIn("visitor_id", $UserIds);
            $model->where("date", $date);
            $model->delete();
            $model->insert($items);

            //print_r($items);

            if (!$custom_render) {
                AttendanceLog::where("company_id", $id)->whereIn("UserID", $UserIds)->update(["checked" => true]);
            }
            $message = "[" . $date . " " . date("H:i:s") .  "] Visitor Attendance.  Affected Ids: " . json_encode($UserIds) . " " . $message;
        } catch (\Throwable $e) {
            $message = "[" . $date . " " . date("H:i:s") .  "] Visitor Attendance. " . $e->getMessage();
        }

        $this->devLog("visitor-attenadnce-log", $message);
        return ($message);
    }
    public function deleteVisitorExpireDates($company_id)
    {
        $currentDate = date('Y-m-d');

        $visitorsList = Visitor::with(["zone", "zone.devices"])
            ->where('company_id', $company_id)
            ->where('visit_to',  $currentDate)
            ->where('sdk_deleted_visitor_date_time',  null)
            ->get();

        if (count($visitorsList) == 0) {
            $this->devLog("cron-visitor-setVisitorExpireDates-log", "{Visitor count is 0}");
            return "Visitor count is 0";
        }
        //echo  "Visitor Count is  " . count($visitorsList);


        foreach ($visitorsList as $key => $visitor) {

            if ($visitor['zone_id'] == 0) {
                continue;
            }
            $zoneDevices = Zone::with(["devices"])->find($visitor['zone_id']);

            foreach ($zoneDevices->devices as $key => $device) {


                $date  = new DateTime("now", new DateTimeZone($device['utc_time_zone'] != '' ? $device['utc_time_zone'] : 'Asia/Dubai'));
                $currentDateTime = $date->format('Y-m-d H:i:00');
                $currentDate  = $date->format('Y-m-d');


                echo '<br/>' . $visitor['sdk_expiry_datetime'] . '-' . $currentDateTime . '<br/>';

                if (
                    strtotime($visitor['sdk_expiry_datetime']) >= strtotime($currentDateTime)
                    || strtotime($currentDateTime) >= strtotime($currentDate . ' ' . $visitor["time_out"])
                ) {
                    //if existing SDK expiration date is greater than current date
                    $msg = "{Deleted - " . $visitor["system_user_id"] . " Current Time" . $currentDateTime . "  and SDK Exp Time " . $visitor['sdk_expiry_datetime'] . '}';
                    echo $msg . ' <br/>';
                    $this->devLog("cron-visitor-setVisitorExpireDates-log", $msg);
                    $this->deleteVisitorDetailsfromDevice($visitor["system_user_id"], $device['device_id']);

                    Visitor::where("id", $visitor["id"])->update(["sdk_deleted_visitor_date_time" => date('Y-m-d H:i:s'),  "status_id" => 5]);
                }
            }
        }
    }
    public function setVisitorExpireDates($company_id)
    {
        $currentDate = date('Y-m-d');

        $visitorsList = Visitor::with(["zone", "zone.devices"])
            ->where('company_id', $company_id)
            ->where('visit_from', "<=", $currentDate)
            ->where('visit_to', ">=", $currentDate)
            ->where('sdk_deleted_visitor_date_time',  null)
            ->where(
                fn($query) => $query
                    ->where('sdk_expiry_datetime', '2023-01-01 00:00:00')
                    ->orwhereColumn("visit_from", "!=", "visit_to")
                    //->orwhereColumn("visit_from",  null)
                    ->orWhereNull("visit_from")

            )->get();

        if (count($visitorsList) == 0) {
            $this->devLog("cron-visitor-setVisitorExpireDates-log", "{Visitor count is 0}");
            return "Visitor count is 0";
        }
        //echo  "Visitor Count is  " . count($visitorsList);

        $msg = "";


        foreach ($visitorsList as $key => $visitor) {

            if ($visitor['zone_id'] == 0) {
                continue;
            }
            $zoneDevices = Zone::with(["devices"])->find($visitor['zone_id']);

            foreach ($zoneDevices->devices as $key => $device) {


                $date  = new DateTime("now", new DateTimeZone($device['utc_time_zone'] != '' ? $device['utc_time_zone'] : 'Asia/Dubai'));
                $currentDateTime = $date->format('Y-m-d H:i:00');
                $currentDate  = $date->format('Y-m-d');


                //echo '<br/>' . $visitor['sdk_expiry_datetime'] . '-' . $currentDateTime . '<br/>';
                if ($visitor['sdk_expiry_datetime'] != '') {
                    if (strtotime($visitor['sdk_expiry_datetime']) >= strtotime($currentDateTime)) {

                        continue;
                    }
                }
                if ($currentDate . ' ' . $visitor["time_out"] != $visitor['sdk_expiry_datetime']) {


                    if (
                        strtotime($currentDate) >= strtotime($visitor["visit_from"])
                        && strtotime($currentDate) <= strtotime($visitor["visit_to"])
                        && strtotime($currentDateTime) >= strtotime($currentDate . ' ' . $visitor["time_in"])
                        && strtotime($currentDateTime) <= strtotime($currentDate . ' ' . $visitor["time_out"])
                    ) {

                        $personList = [];
                        $personList["userCode"] = $visitor["system_user_id"];
                        $personList["expiry"] = $currentDate . ' ' . $visitor["time_out"];

                        Visitor::where("id", $visitor["id"])->update(["sdk_expiry_datetime" => $personList["expiry"]]);

                        $this->updateVisitorExpiryDateToDevice($personList, $device['device_id']);

                        $m = "{Updated Exptime - " . $visitor["system_user_id"] . " - SDK Exp Time " . $personList["expiry"] . "}" . "\n";
                        // echo $msg . ' ';
                        $this->devLog("cron-visitor-setVisitorExpireDates-log", $m);

                        $msg .= $m;
                    } else {

                        $msg .= $visitor["visit_from"] . ' ' . $visitor["time_in"] . '---' . $currentDateTime . '----' . $visitor["visit_to"] . ' ' . $visitor["time_out"];

                        $msg .= " {Current Time is not matching with Visitor Intime " . $currentDate . ' ' . $visitor["time_in"] . "-" . $visitor["system_user_id"] . "}" . "\n";
                    }
                } else {
                    $msg .= "Expiry time is already Updated to " . $visitor["system_user_id"] . "\n";
                }
            }
        }

        return $msg;
    }
    public function deleteVisitorFromDevice(Request $request)
    {
        if ($request->system_user_id != '' && $request->device_id != '') {
            Visitor::where("id", $request->visitor_id)->update(["sdk_deleted_visitor_date_time" => date('Y-m-d H:i:s'), "status_id" => 5]);
            $this->deleteVisitorDetailsfromDevice($request->system_user_id, $request->device_id);

            return [
                "status" => true,
                "message" => "Visitor deleted successfully",

            ];
        } else {
            return [
                "status" => false,
                "message" => "Visitor can not delete",

            ];
        }
    }
    public function deleteVisitorDetailsfromDevice($system_user_id, $device_id)
    {
        $preparedJson = [
            "userCodeArray" => [$system_user_id],
        ];

        try {
            (new SDKController)->processSDKRequestJobDeletePersonJson($device_id, $preparedJson);
        } catch (\Throwable $th) {
        }
    }
    public function updateVisitorExpiryDateToDevice($personList, $device_id)
    {
        $preparedJson = [
            "snList" => [$device_id],
            "personList" => [$personList],
        ];

        try {
            (new SDKController)->processSDKRequestPersonAddJobJson('', $preparedJson);
        } catch (\Throwable $th) {
        }
    }
}
