<?php

namespace App\Http\Controllers;;

use App\Models\AlarmLogs;
use App\Models\Company;
use App\Models\Device;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log as Logger;

class AlarmLogsController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $model = AlarmLogs::where('company_id', $request->company_id);
        if ($request->filled('from_date')) {
            $startDate = Carbon::parse($request->from_date . ' 00:00:00');
            $endDate = Carbon::parse($request->to_date . ' 23:59:59');


            $model->whereBetween('log_time', [$startDate, $endDate]);
        } else {
            $startDate = Carbon::parse(date("Y-m-d") . ' 00:00:00');
            $endDate = Carbon::parse(date("Y-m-d") . ' 23:59:59');


            $model->whereBetween('log_time', [$startDate, $endDate]);
        }
        $model->with(["devices"])->orderBy("log_time", "desc");

        return $model->paginate($request->input("per_page", 100));
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    // public function store(Request $request)
    // {
    //     //
    // }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\AlarmLogs  $AlarmLogs
     * @return \Illuminate\Http\Response
     */
    public function show(AlarmLogs $AlarmLogs)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\AlarmLogs  $AlarmLogs
     * @return \Illuminate\Http\Response
     */
    public function edit(AlarmLogs $AlarmLogs)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\AlarmLogs  $AlarmLogs
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, AlarmLogs $AlarmLogs)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\AlarmLogs  $AlarmLogs
     * @return \Illuminate\Http\Response
     */
    public function destroy(AlarmLogs $AlarmLogs)
    {
        //
    }

    public function store()
    {
        $result = $this->handleFile();

        // if (array_key_exists("error", $result)) {
        //     return $this->getMeta("Sync Attenance alarm Logs", $result["message"] . "\n");
        // }
        if (is_array($result)) {
            if (isset($result["error"])) {
                return $this->getMeta("Sync Attenance alarm Logs", $result["message"] . "\n");
            }
        }


        $result["data"] = array_values(array_unique($result["data"]));

        $records = [];
        $device_ids = [];
        foreach ($result["data"] as $row) {
            $columns = explode(',', $row);


            $datetime = substr(str_replace("T", " ", $columns[1]), 0, 16);


            if ($datetime != 'undefined') {
                $records[] = [
                    "device_id" => $columns[0],
                    "log_time" =>  $datetime,
                    "status" =>  1,


                ];
                $data = ["alarm_status" => 1, "alarm_start_datetime" => $datetime];
                $device_ids[] = $columns[0];
                Device::where("device_id", $columns[0])->update($data);
            }
        }


        try {

            $company_ids = Device::wherein("device_id", $device_ids)->pluck('company_id');
            $branch_ids = Device::wherein("device_id", $device_ids)->pluck('branch_id');
            $devices_to_call = Device::wherein("company_id", $company_ids)->wherein("branch_id", $branch_ids)->get();
            $return = [];
            foreach ($devices_to_call as $key => $device) {
                try {
                    $return[] =  (new DeviceController())->CallAlwaysOpenDoor($device->serial_number);
                } catch (\Exception $e) {
                }
            }
        } catch (\PDOException $e) {
        }

        try {
            AlarmLogs::insert($records);


            // Logger::channel("custom")->info(count($records) . ' new logs has been inserted.');
            Storage::put("alarm/alarm-logs-count-" . $result['date'] . ".txt", $result['totalLines']);
            ///Storage::append("camera/camera-logs-count-" . $result['date'] . ".txt", $result['totalLines']);
            return $this->getMeta("Sync Attenance alarm Logs", count($records) . " new logs has been inserted." . "\n");
        } catch (\Throwable $th) {

            Logger::channel("custom")->error('Error occured while inserting logs.');
            Logger::channel("custom")->error('Error Details: ' . $th);
            return $this->getMeta("Sync Attenance alarm Logs", " Error occured." . $th . "\n");

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

        $csvPath = "app/alarm/alarm-logs-$date.csv"; // The path to the file relative to the "Storage" folder

        $fullPath = storage_path($csvPath);

        if (!file_exists($fullPath)) {


            return ["error" => true, "message" => 'File doest not exist.'];
        }

        $file = fopen($fullPath, 'r');

        $data = file($fullPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if (!count($data)) {
            return ["error" => true, "message" => 'File is empty.'];
        }

        $previoulyAddedLineNumbers = Storage::get("alarm/alarm-logs-count-$date.txt") ?? 0;
        $previoulyAddedLineNumbers = explode("\n", $previoulyAddedLineNumbers)[0];
        if (is_array($previoulyAddedLineNumbers)) {
            $previoulyAddedLineNumbers = $previoulyAddedLineNumbers[0];
        }


        // return $this->getMeta("Sync Attenance Logs", $previoulyAddedLineNumbers . "\n");

        $totalLines = count($data);

        $currentLength = 0;

        if ($previoulyAddedLineNumbers == $totalLines) {
            return ["error" => true, "message" => 'No new data found.'];
            //} else if ($previoulyAddedLineNumbers > 0 && $totalLines > 0) {
        } else if ($totalLines > 0) {
            $currentLength = $previoulyAddedLineNumbers;
        }

        fclose($file);



        // if ($currentLength > 0) {
        return [
            "date" => $date,
            "totalLines" => $totalLines,
            "data" => array_slice($data, $currentLength)

        ];
        // } else {
        //     return ["error" => true, "message" => 'Data Reading Failed.'];
        // }
    }
}
