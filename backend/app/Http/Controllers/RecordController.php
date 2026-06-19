<?php

namespace App\Http\Controllers;

use App\Models\AttendanceLog;
use App\Models\Device;
use Illuminate\Http\Request;

class RecordController extends Controller
{
    public function get_devices()
    {
        return Device::pluck(["company_id", "name", "device_id"]) ?? [];
    }

    public function get_logs_from_sdk()
    {
        $devices = $this->get_devices();

        $count = 0;

        foreach ($devices as $device) {

            $command = "$device->device_id/GetRecord";

            $result = $this->process_command($command);

            if ($result && $result->status == 200) {

                $data = $result->data ?? "";

                $new_records = $data->readable ?? 0;

                if ($new_records > 0) {
                    $rows = $data->recordList ?? [];

                    $data = $this->getCustomArray($rows, $device);

                    if (AttendanceLog::insert($data)) {
                        $count += count($data);
                    }
                }
            }

            Device::where("synced", 0)->where("device_id", $device->device_id)->update(["synced" => 1]);
        }

        return $count;
    }

    public function getCustomArray($rows, $device)
    {
        return array_map(function ($row) use ($device) {
            return [
                "UserID" => $row->userCode,
                "LogTime" => date("Y-m-d H:i:s", strtotime($row->recordDate)),
                "DeviceID" => $device->device_id,
                "SerialNumber" => $row->recordNumber,
                "company_id" => $device->company_id,


            ];
        }, $rows);
    }
}
