<?php

use App\Http\Controllers\Alarm\DeviceSensorLogsController;
use App\Http\Controllers\AlarmLogsController;
use App\Http\Controllers\API\SharjahUniversityAPI;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttendanceLogController;
use App\Http\Controllers\CameraController;
use App\Http\Controllers\CardQRCodeController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DeviceCameraController;
use App\Http\Controllers\DeviceCameraModel2Controller;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\KeyGeneratorController;
use App\Http\Controllers\SDKController;
use App\Http\Controllers\Shift\AutoShiftController;
use App\Http\Controllers\Shift\FiloShiftController;
use App\Http\Controllers\Shift\MultiInOutShiftController;
use App\Http\Controllers\Shift\NightShiftController;
use App\Http\Controllers\Shift\RenderController;
use App\Http\Controllers\Shift\SingleShiftController;
use App\Http\Controllers\TestController;
use App\Http\Controllers\WhatsappController;
use App\Http\Controllers\WhatsappNotificationsLogController;
use App\Imports\excelEmployeesData;
use App\Mail\DeviceNotificationMail;
use App\Mail\ReportNotificationMail;
use App\Mail\TestMail;
use App\Models\AlarmLogs;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\Device;
use App\Models\DeviceActivesettings;
use App\Models\DeviceNotification;
use App\Models\Employee;
use App\Models\ReportNotification;
use App\Models\Shift;
use App\Models\WhatsappNotificationsLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log as Logger;
use Maatwebsite\Excel\Facades\Excel;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use SimpleSoftwareIO\QrCode\QrCodeServiceProvider;
use WebSocket\Client;

Route::get("update-alarm-logs-company-ids", function (Request $request) {

    try {
        $logs = AlarmLogs::with("devices")->where("company_id", null)->get()->groupBy("device_id");;
        foreach ($logs as $key => $log) {

            if (isset($log[0]))

                AlarmLogs::where("company_id", null)->where("device_id", $key)->update(["company_id" => $log[0]["devices"]->company_id]);
        }
    } catch (\Throwable $th) {
        //throw $th;
    }
});

Route::get("test900device1", function (Request $request) {


    return  $path = storage_path() . "/";;
    return public_path('camera-unregsitered-faces-logs');

    $path = '../public/camera-unregsitered-faces-logs/'; //"/mytime2cloud/backend/storage/app";


    if (!File::exists($path)) {
        echo "The specified path does not exist.";
        return 1;
    }

    //$files = File::files($path);
    $files = File::allFiles($path);



    return false;



    try {
        // Create a WebSocket client
        $client = new Client("wss://139.59.69.241:7779", [
            'timeout' => 5, // Timeout in seconds
            'context' => stream_context_create([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]),
        ]);

        $testMessage = "DB";
        // Send the message
        $client->send(json_encode($testMessage));
    } catch (\Exception $e) {
        // Handle exceptions
        //"Error: " . $e->getMessage();
    }

    return "";
    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_URL => 'http://47.88.11.117:8807/all/queryTransCmdJson?id=fsuiop00&access_token=c7499d5a-3167-472b-8d30-ca3d75a9bd89',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => '{
	"Cmd":7101,
	"Id":"fsuiop00",
	"User":12345678,
	"Def":"JSON_CMD_GET_VERSION"
}',
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json'
        ),
    ));

    $response = curl_exec($curl);

    curl_close($curl);
    echo $response;
});





Route::get("test900device", function (Request $request) {

    $device = Device::where("device_id", "M014200892110002626")->first();
    return  $responseData['data'] = (new DeviceCameraModel2Controller($device->camera_sdk_url))->getSettings($device);
});
Route::get("test900device2", function (Request $request) {

    $device = Device::where("device_id", "M014200892110002761")->first();
    return  $responseData['data'] = (new DeviceCameraModel2Controller($device->camera_sdk_url))->getSettings($device);
});
Route::get("whatsappqrcode", function (Request $request) {

    $device = Device::where("device_id", "M014200892110002761")->first();
    return  $responseData['data'] = (new DeviceCameraModel2Controller($device->camera_sdk_url))->getSettings($device);

    // phpinfo();
    // exit;

    QrCode::size(500)
        ->format('png')
        ->generate('www.google.com', storage_path('app/public/111.png'));
    exit;

    // exit;
    // QrCode::size(250)->generate('www.google.com');
    $url = 'https://example.com';
    // $qrCode = QrCodeServiceProvider::format('png')->size(300)->generate($url);


    $fileName = 'qrcode.png';
    $filePath = storage_path('app/public/' . $fileName);

    // Save the QR code to a file
    // Storage::put('public/' . $fileName, $qrCode);

    echo  QrCode::size(250)->generate('www.google.com', $filePath);
    exit;
    //send email notification and whatsapp notification
    $attachments = [];
    $attachments["media_url"] =  env('BASE_URL') . 'app/public/' . $fileName;
    //$attachments["media_url"] =  "https://backend.mytime2cloud.com/api/donwload_storage_file?file_name=app%2Fpdf%2F2%2Fdaily_missing.pdf";

    $attachments["filename"] = $fileName;


    $company = Company::where('company_id', 2);
    (new WhatsappController())->sendWhatsappNotification($company, $fileName, "971552205149", $attachments);
});
Route::get("compare2images", function (Request $request) {
    $image1 = storage_path('venu2.jpeg');;
    $image2 = storage_path('arav1.jpg');;

    $imageComparator = new ImageComparator();

    $similarity = $imageComparator->compare($image1, $image2);
    return  $similarity;
});
Route::get("test111password", function (Request $request) {
    ///////return (new AttendanceLogController)->storemissing();

    //return Hash::make("AkiL@2211");
});
Route::get("pdf-merge-test", [TestController::class, "pdfMergeTest"]);

Route::post("encrypt-devices", [DeviceController::class, "encrypt"]);
Route::post("decrypt-devices", [DeviceController::class, "decrypt"]);





// Route::get('/test/getLogs', function (Request $request) {


//     return (new DeviceSensorLogsController)->updateCompanyIds();
//     $curl = curl_init();



//     $device_id = $request->device_id;

//     curl_setopt_array($curl, array(
//         CURLOPT_URL => "https://sdk.mytime2cloud.com/$device_id/GetRecord",
//         CURLOPT_RETURNTRANSFER => true,
//         CURLOPT_ENCODING => '',
//         CURLOPT_MAXREDIRS => 10,
//         CURLOPT_TIMEOUT => 0,
//         CURLOPT_FOLLOWLOCATION => true,
//         CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
//         CURLOPT_CUSTOMREQUEST => 'POST',
//     ));

//     $response = curl_exec($curl);

//     curl_close($curl);
//     return  json_decode($response, true);
// });
Route::get('/test/resetLogCount', function (Request $request) {
    $curl = curl_init();



    $device_id = $request->device_id;

    curl_setopt_array($curl, array(
        CURLOPT_URL => "https://sdk.mytime2cloud.com/$device_id/ResetRecord",
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
    return  json_decode($response, true);
});
Route::get('/alarmtest', function (Request $request) {

    return (new AlarmLogsController())->store();
});
Route::get('/syncLogsScript', function (Request $request) {

    return time();

    // return [
    //     (new FiloShiftController)->render(),
    //     (new SingleShiftController)->render()
    // ];


    // return (new RenderController)->renderAuto($request);




    // return [
    //     "MultiInOut" => (new MultiInOutShiftController)->processByManual($request),
    //     // "Single" => (new SingleShiftController)->processByManual($request),
    //     // "Auto" => (new AutoShiftController)->processByManual($request)
    // ];
});
Route::get('/donwloadpdffile', function (Request $request) {


    return  $model = ReportNotification::with(["managers", "company.company_mail_content"])->where("id", 43)->first();

    // // Define the path to the file in the public folder
    // $filePath = Storage::url('app/payslips/8/8_3_8_2023_payslip.pdf');;;

    // $filePath = storage_path('app/payslips/8/8_3_8_2023_payslip.pdf');

    // // Check if the file exists
    // if (file_exists($filePath)) {
    //     // Create a response to download the file
    //     return response()->download($filePath, 'myfile.pdf');
    // } else {
    //     // Return a 404 Not Found response if the file doesn't exist
    //     return 'File not exist';
    //  }
});

Route::get('/testAttendanceRender111test', function (Request $request) {

    Logger::channel('custom')->info(json_encode($request->request->all()));
});

// Route::get('/testAttendanceRender111test', function (Request $request) {

//     Excel::import(new excelEmployeesData(), $request->file('file'));
// });

Route::post('/testAttendanceRender111test', function (Request $request) {

    Logger::channel('custom')->info(json_encode($request->request->all()));

    $base64Data = $request->request->all()['photo'];
    // Extract the image extension (e.g., 'jpeg', 'png') from the base64 data



    // Generate a unique filename
    $filename = 'image_' . time() .   '.jpg';

    // Decode the base64 data
    $decodedData = base64_decode($base64Data);

    // Save the decoded data to a file
    file_put_contents($filename, $decodedData);

    echo 'Image saved as ' . $filename;
    Logger::channel('custom')->info($filename);
});

Route::get('/testAttendanceRender111', function (Request $request) {




    $id = 13;
    $date = '2024-01-23';
    $requestArray = array(
        'date' => '',
        'UserID' => '',
        'updated_by' => 26,
        'company_ids' => array($id),
        'manual_entry' => true,
        'reason' => '',
        'employee_ids' => [],
        'dates' => array($date, $date),
        'shift_type_id' => 1,
        'auto_render' => false
    );

    //calling manual render method to pull all
    $renderRequest = Request::create('/render_logs', 'get', $requestArray);

    return ((new RenderController())->renderLogs($renderRequest));
});

Route::get("getqrcode", function (Request $request) {
    return (new CardQRCodeController())->generateQRCode($request);
});

Route::get("/testemployee", function (Request $request) {

    return Storage::url('8_3_8_2023_payslip.pdf');

    $data = (new EmployeeController)->getSingleEmployeeProfileAll();


    return  View('pdf.test', ["employees" => $data]);; //->donwload();
});
Route::get('/donwloadfile', function (Request $request) {
    // Define the path to the file in the public folder
    $filePath = Storage::url('app8_3_8_2023_payslip.pdf');; //public_path("1666190454.jpg");

    // Check if the file exists
    if (file_exists($filePath)) {
        // Create a response to download the file
        return response()->download($filePath, 'myfile.png');
    } else {
        // Return a 404 Not Found response if the file doesn't exist
        abort(404);
    }
});
Route::get('/testapi1', function (Request $request) {
    // return  $previousDate = date('Y-m-d', strtotime('-366 days'));
    // $previousDate = date('Y-m-d', strtotime('-20 days'));
    // return  WhatsappNotificationsLog::where("created_at", "<=", $previousDate . " 00:00:00")->get();


    $device = Device::where("device_id", "M014200892110001835")->first();

    $this->sxdmSn = $device->device_id;
    $json = '{
"request_id": "b7ccde4611cabff837ff2fa363c9fd2a",
"limit": 10,
"offset": 0,
"sort": "asc",
"begin_time": "2024-11-22T00:00:00",
"end_time": "2024-11-22T23:59:59",
"query_string": "",
"query_person_idx": "",
"query_nopass": false
}';

    return  $response = (new DeviceCameraModel2Controller($device->camera_sdk_url))->putCURL('/api/passes/query', $json);

    //$return = (new DeviceCameraModel2Controller($device->camera_sdk_url))->getHistory($device);

    return (new CompanyController())->UpdateCompanyIds();




    $items[] = [
        "company_id" => 8,
        "employee_id" => 1,
        "in" => "17:25",
        "shift_id" => 2,
        "out" => "---",
        "device_id_in" => "FC-8300T20094123",
        "device_id_out" => "---",
        "date" => "2024-11-26",

    ];
    $items[] = [
        "company_id" => 8,
        "employee_id" => 1,
        "shift_id" => 2,
        "in" => "17:25",
        "out" => "20:25",
        "device_id_in" => "FC-8300T20094123",
        "device_id_out" => "FC-8300T20094123",
        "date" => "2024-11-26",

    ];


    (new WhatsappNotificationsLogController())->addAttendanceMessageEmployeeId($items[0]);
    return (new WhatsappNotificationsLogController())->addAttendanceMessageEmployeeId($items[1]);

    // return (new SharjahUniversityAPI())->readAttendanceAfterRender($items);
});
Route::get('/handleNotification', function (Request $request) {

    $test = new DeviceController();
    return  $test->handleNotification(8);
});

Route::post('/sharjah-uni-test/login', function (Request $request) {
    return ["token" => "mytken"];
});

Route::post('/sharjah-uni-test/InsertAccessLog', function (Request $request) {
    return $request->all();
});

Route::get('/test/test/3', function (Request $request) {



    // return  $response = Http::withoutVerifying()->get("https://ezwhat.com/api/send.php", [
    //     'number' => "919701226007",
    //     'type' => 'text',
    //     'message' => "Hello",
    //     'instance_id' => "650300B673EFA",
    //     'access_token' => "a27e1f9ca2347bb766f332b8863ebe9f",
    // ]);


    return defaultCards();

    Logger::channel('custom')->info('This is a custom log message.');

    return;

    $filePath = Storage::path("data.csv"); // replace with the path to your CSV file

    // Open the CSV file
    $file = fopen($filePath, 'r');

    // Read the CSV file and convert it to an array
    $data = [];
    $header = fgetcsv($file); // Get the header row
    while (($row = fgetcsv($file)) !== false) { // Loop through the remaining rows
        $data[] = array_combine($header, $row); // Combine the header row with the current row
        list($num, $msg) = $row;
        $response = Http::withoutVerifying()->withHeaders([
            'Content-Type' => 'application/json',
        ])->get("https://ezwhat.com/api/send.php?number={$num}&type=text&message={$msg}&instance_id=64466B01B7926&access_token=a27e1f9ca2347bb766f332b8863ebe9f");

        // check if the request was successful
        if ($response->ok()) {
            $request["status"] = true;
            $request["message"] = "success";
        } else {
            $request["status"] = false;
            $request["message"] = "false";
        }
    }

    // Close the CSV file
    fclose($file);

    return $data;

    // Use the $data array as needed
    foreach ($data as $row) {
        $num = $row['number'];
        $msg = $row['message'];
        // Process the data
    }

    return;

    $Attendance = new AttendanceController;
    return $result = $Attendance->syncLogsScript();

    die;

    // if($request->company_id) {
    //     $user_ids = Employee::where("company_id", "=",$request->company_id)->pluck("user_id");
    //     return User::whereIn("id",$user_ids)->update(["company_id" => $request->company_id]);
    // }

    echo phpversion();

    echo "<br>";

    $one = 1;
    $arr1 = [&$one, 2, 3];
    $arr2 = [0, ...$arr1];
    var_dump($arr2);

    die;

    $data = [
        "from" => "14157386102",
        "to" => "971502848071",
        "message_type" => "text",
        "text" => "This is a WhatsApp Message sent from the ideahrms",
        "channel" => "whatsapp",
    ];

    // return (new WhatsappController)->toSendNotification($data);
    // WhatsappJob::dispatch($data);
    return 'done';
    // $newLog[] = [
    //     "out" => "01:01",
    // ];

    // $attendance = Attendance::where('date', '2022-12-19')->where('employee_id', 681);
    // $found = $attendance->first();

    // $oldLog = $found->logs;

    // return [
    //     $oldLog, $newLog
    // ];

    // $result = array_merge($oldLog, $newLog);

    // $found->logs = $result;
    // return $found->save();

    // // return   $found ? $attendance->update($items) : Attendance::create($items);

    // return $request->user();
    // return $dd = Auth::user();
    // return "Awesome APIs";
});

Route::get('/open_door_old', function (Request $request) {

    $curl = curl_init();

    $device_id = $request->device_id;

    // $device_id = 'OX-8862021010076';

    curl_setopt_array($curl, array(
        CURLOPT_URL => "http://139.59.69.241:5000/$device_id/OpenDoor",
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
    echo $response;

    // return "Awesome APIs";
});

Route::post('/upload-users', function (Request $request) {

    try {

        $url = "https://sdk.ideahrms.com/{$request->device_id}/AddPerson";

        $request["expiry"] = "2089-12-31 23:59:59";

        // make the POST request using Laravel's HTTP client

        $response = Http::withoutVerifying()->withHeaders([
            'Content-Type' => 'application/json',
        ])->post($url, $request->all());

        // check if the request was successful
        if ($response->ok()) {
            $request["status"] = true;
            $request["message"] = $request->name . " " . "has been uploaded to " . $request->device_id;
        } else {
            $request["status"] = false;
            $request["message"] = $request->name . " " . "cannot upload to " . $request->device_id;
            // ...
        }
    } catch (\Throwable $th) {
        $request["status"] = false;
        $request["message"] = $request->name . " " . "cannot upload to " . $request->device_id;
    }

    if ($response["status"] == 102 || $response["status"] == 103) {
        $request["status"] = false;
        $request["message"] = "The device is not connected to the server or is not registered.";
    }

    return $request->all();
});

Route::get('/open_door_always_old', function (Request $request) {

    $curl = curl_init();

    $device_id = $request->device_id;

    // $device_id = 'OX-8862021010076';

    curl_setopt_array($curl, array(
        CURLOPT_URL => "http://139.59.69.241:5000/$device_id/HoldDoor",
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
    echo $response;

    // return "Awesome APIs";
});

Route::get('/test_device_timeslots', function (Request $request) {
    //Schedule Device Access Control


    return  $result = (new SDKController)->handleCommand("FC-8300T20094123", "HoldDoor");;

    $date = date('Y-m-d');
    $devices =  DeviceActivesettings::with(["devices"])->where(function ($q) {
        $q->orWhere('date_from', ">=", date("Y-m-d"));
        $q->orWhere('date_to', "<=", date("Y-m-d"));
    })->get();

    $weekDays = [0 => "Mon", 1 => "Tue", 2 => "Wed", 3 => "Thu", 4 => "Fri", 5 => "Sat", 6 => "Sun"];

    foreach ($devices as $key => $device) {

        $openJson =  $device['open_json'];

        $openJsonArray = json_decode($openJson, true);

        foreach ($openJsonArray as  $key => $time) {

            if (isset($time[0])) {
                $key1 = $time[0];
                if (count($time) == 1) {
                    $key1 = 0;
                }


                if ($weekDays[$key1] == date("D")) {





                    // $schedule
                    //     ->command("task:AccessControlTimeSlots {$device->device_id} HoldDoor")
                    //     // ->everyThirtyMinutes()
                    //     ->everyMinute()
                    //     ->dailyAt($time)
                    //     ->withoutOverlapping()
                    //     ->appendOutputTo(storage_path("logs/$date-access-control-time-slot-logs.log"))
                    //     ->emailOutputOnFailure(env("ADMIN_MAIL_RECEIVERS"));
                }
            }
        }
        //

        $closeJson =  $device['close_json'];

        $closeJsonArray = json_decode($closeJson, true);

        foreach ($closeJsonArray as  $key => $time) {
            if (isset($time[0])) {
                $key1 = $time[0];
                if (count($time) == 1) {
                    $key1 = 0;
                }

                if ($weekDays[$key1] == date("D")) {
                    // $schedule
                    //     ->command("task:AccessControlTimeSlots {$device->device_id} CloseDoor")
                    //     // ->everyThirtyMinutes()
                    //     ->everyMinute()
                    //     ->dailyAt($time)
                    //     ->withoutOverlapping()
                    //     ->appendOutputTo(storage_path("logs/$date-access-control-time-slot-logs.log"))
                    //     ->emailOutputOnFailure(env("ADMIN_MAIL_RECEIVERS"));
                }
            }
        }
    }
    return;

    $jsonString = '{"2":"01:00"}';

    // Step 2: Decode the JSON string
    $decodedArray = json_decode($jsonString, true);
    // return $decodedArray[2];

    $date = date('Y-m-d');
    $devices =  DeviceActivesettings::where(function ($q) {
        $q->orWhere('date_from', ">=", date("Y-m-d"));
        $q->orWhere('date_to', "<=", date("Y-m-d"));
    })->get();

    $weekDays = [0 => "Mon", 1 => "Tue", 2 => "Wed", 3 => "Thu", 4 => "Fri", 5 => "Sat", 6 => "Sun"];

    foreach ($devices as $key => $device) {

        $openJson =  $device['open_json'];

        $openJsonArray = json_decode($openJson, true);

        foreach ($openJsonArray as  $key => $time) {

            if ($weekDays[$key] == date("D")) {





                // $schedule
                //     ->command("task:AccessControlTimeSlots {$device->device_id} HoldDoor")
                //     // ->everyThirtyMinutes()
                //     ->everyMinute()
                //     ->dailyAt($time)
                //     ->withoutOverlapping()
                //     ->appendOutputTo(storage_path("logs/$date-access-control-time-slot-logs.log"))
                //     ->emailOutputOnFailure(env("ADMIN_MAIL_RECEIVERS"));
            }
        }
        //

        $closeJson =  $device['close_json'];

        $closeJsonArray = json_decode($closeJson);

        foreach ($closeJsonArray as  $key => $time) {

            if ($weekDays[$key] == date("D")) {
                // $schedule
                //     ->command("task:AccessControlTimeSlots {$device->device_id} CloseDoor")
                //     // ->everyThirtyMinutes()
                //     ->everyMinute()
                //     ->dailyAt($time)
                //     ->withoutOverlapping()
                //     ->appendOutputTo(storage_path("logs/$date-access-control-time-slot-logs.log"))
                //     ->emailOutputOnFailure(env("ADMIN_MAIL_RECEIVERS"));
            }
        }
    }

    return $devices;
});


// $date = date("M-Y");

// $devices = AccessControlTimeSlot::get();


Route::get('/check_device_health_old', function (Request $request) {



    $intervals = [
        ["begin" => "11:00", "end" => "11:30"],
        ["begin" => "10:30", "end" => "11:00"],
        ["begin" => "10:00", "end" => "10:30"],
        ["begin" => "12:30", "end" => "13:00"],
        ["begin" => "11:30", "end" => "12:00"],
        ["begin" => "12:00", "end" => "12:30"],
        ["begin" => "15:00", "end" => "15:30"],
        ["begin" => "15:30", "end" => "16:00"],
        ["begin" => "16:00", "end" => "16:30"],
        ["begin" => "16:30", "end" => "17:00"]
    ];
    if (empty($intervals)) {
        return [];
    }

    // Step 1: Sort intervals by `begin` time
    usort($intervals, function ($a, $b) {
        return strcmp($a['begin'], $b['begin']);
    });

    // Step 2: Merge sequential intervals
    $merged = [];
    $current = $intervals[0]; // Start with the first interval

    for ($i = 1; $i < count($intervals); $i++) {
        if ($current['end'] === $intervals[$i]['begin']) {
            // Extend the current interval
            $current['end'] = $intervals[$i]['end'];
        } else {
            // Save the current interval and start a new one
            $merged[] = $current;
            $current = $intervals[$i];
        }
    }

    // Add the last interval
    $merged[] = $current;
    dd($merged);
    return $merged;




    return $merged;






    $devices = Device::pluck("device_id");

    $total_iterations = 0;
    $online_devices_count = 0;
    $offline_devices_count = 0;

    foreach ($devices as $device_id) {
        $curl = curl_init();

        curl_setopt_array($curl, array(

            // CURLOPT_URL => "https://sdk.ideahrms.com/CheckDeviceHealth/$device_id",
            // CURLOPT_URL => "http://139.59.69.241:5000/CheckDeviceHealth/$device_id",
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

        $status = json_decode($response)->status;

        if ($status !== 200) {
            $offline_devices_count++;
        } else {
            $online_devices_count++;
        }

        Device::where("device_id", $device_id)->update(["status_id" => $status == 200 ? 1 : 2]);

        $total_iterations++;
    }

    echo "$offline_devices_count Devices offline. $online_devices_count Devices online. $total_iterations records found.";
});


// function checkSDKServerStatus($url)
// {
//     $ch = curl_init($url);
//     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
//     curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
//     curl_setopt($ch, CURLOPT_TIMEOUT, 5);
//     curl_exec($ch);

//     $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

//     curl_close($ch);

//     return $httpCode;
// }

// Route::get('/checkSDKServerStatus/{url}', function ($url) {
//     return checkSDKServerStatus($url) ? "Server is running" : "Server is down";
// });

// Route::get('/close_door_old', function (Request $request) {

//     $curl = curl_init();

//     $device_id = $request->device_id;

//     // $device_id = 'OX-8862021010076';

//     curl_setopt_array($curl, array(
//         CURLOPT_URL => "http://139.59.69.241:5000/$device_id/CloseDoor",
//         CURLOPT_RETURNTRANSFER => true,
//         CURLOPT_ENCODING => '',
//         CURLOPT_MAXREDIRS => 10,
//         CURLOPT_TIMEOUT => 0,
//         CURLOPT_FOLLOWLOCATION => true,
//         CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
//         CURLOPT_CUSTOMREQUEST => 'POST',
//     ));

//     $response = curl_exec($curl);

//     curl_close($curl);
//     echo $response;

//     // return "Awesome APIs";
// });

// Route::post('/generate_log', [AttendanceLogController::class, 'GenerateLog']);
Route::get('/cameraevents', [CameraController::class, 'readLog']);
Route::post('/cameraevents', [CameraController::class, 'readLog']);

Route::get('/cameraevents-xml', [CameraController::class, 'readXml']);


Route::get('/generate_attendance_log', function (Request $request) {

    $arr = [];
    for ($i = 1; $i <= 5; $i++) {
        for ($j = 13; $j <= 13; $j++) {
            for ($k = 1; $k <= 1; $k++) {
                $time = rand(8, 20);
                $time = $time < 10 ? '0' . $time : $time;
                $arr[] = [
                    'UserID' => $i,
                    'LogTime' => "2022-10-$j $time:00:00",
                    'DeviceID' => "OX-8862021010097",
                    'company_id' => "1",
                ];
            }
        }
    }
    // return $arr;
    DB::table('attendance_logs')->insert($arr);
});

Route::get('/test-re', function (Request $request) {
    // Employee::truncate();
    // DB::statement('DELETE FROM users WHERE id > 2');

    // return 'done';
});

Route::get('/test-date', function (Request $request) {

    // $start = date('Y-m-d');
    // $end = date('Y-m-d');

    $start = date('Y-m-1'); // hard-coded '01' for first day
    $end = date('Y-m-t');

    $model = Attendance::query();
    return $model->whereBetween('date', [$start, $end])
        ->get();

    return 'done';
});

Route::get('/storage', function (Request $request) {
    Storage::put('example.csv', 'francis');
});

Route::post('/upload', function (Request $request) {
    $file = $request->file->getClientOriginalName();
    $request->file->move(public_path('media/employee/file/'), $file);
    return $product_image = url('media/employee/file/' . $file);
    $data['file'] = $file;
});

Route::get('/test/whatsapp', function () {
    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://graph.facebook.com/v14.0/102482416002121/messages',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => '{
                        "messaging_product": "whatsapp",
                        "to": "923108559858",
                        "type": "template",
                            "template": {
                                "name": "hello_world",
                                "language": {
                                    "code": "en_US"
                                }
                            }
                        }',
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json',
            'Authorization: Bearer EAAP9IfKKSo0BALkTWKQE6xLcyfO3eyGt69Y7SH6EfpCmKCAGb1AZCuptzmnPf5qsRZBaj4WYqSXbbxDEvaOD6WiiFwklq4P0FvASsBYOigDTrEhC3geXTNLFZCzQ1wTxNthkfzI4wSfG0KF79rrvh7cEIKdyx7mvM4ZC06MHNZBYg78yYrfGZCIcbtDUnegflDudZB5e2i9AZBDCIJ81o2xa',
        ),
    ));

    $response = curl_exec($curl);

    curl_close($curl);
    echo $response;
});
Route::get('/testAttendance', function () {


    // return $devicesListArray->clone()->where("device_id", "=", 'OX-9662022091021')->pluck('id')[0];
    // return (new AttendanceController)->seedDefaultData(20, [218], '');
});
Route::get('/getActiveSessionId', function () {

    //return (new DeviceCameraController())->getActiveSessionId();
    return (new DeviceCameraController(''))->getActiveSessionId();
});
Route::get('/pushUserToCameraDevice', function () {

    //return (new DeviceCameraController())->getActiveSessionId();
    // Get the image data from the URL
    $imageData = file_get_contents("https://backend.mytime2cloud.com/media/employee/profile_picture/1696868606.jpg");

    if ($imageData !== false) {
        // Convert the image data to base64 format
        $imageData = base64_encode($imageData);
        return (new DeviceCameraController(''))->pushUserToCameraDevice("Venu1",  "9191",  $imageData);
    }
});
Route::get('/testGetDevices', function () {

    // return Device::where("company_id", 1)->get();

    // return AttendanceLog::with(["device"])->where("company_id", 1)->where("LogTime", ">=", '2024-01-15 00:00:00')->distinct("DeviceID")->get()->pluck("DeviceID");
});
Route::get('/updateCameraDeviceLiveStatus', function () {

    //return (new DeviceCameraController())->getActiveSessionId();
    return (new DeviceCameraController(''))->updateCameraDeviceLiveStatus();
});

Route::get('/writeLastAttendanceLogTime', function () {
    return (new AttendanceLogController)->writeLastAttendanceLogTime('', '');
});
Route::get('/verifyDuplicate', function () {
    return (new AttendanceLogController)->store();
});


Route::get('/nightshift', function () {
    // return (new NightShiftController)->render();
});
Route::post('/cameratesting', function (Request $request) {

    $requestData = $request->all();
    //return $request;
    $requstJson = json_encode($requestData);


    DB::table('test_camera_api')
        ->insert([
            'json_content' => $requstJson,
        ]);
});
Route::get('/testmail', function () {
    Mail::to("venuakil2@gmail.com")->send(new TestMail());
});
Route::get('/test_attachment', function () {
    $test = new RenderController();
    return  $test->renderOffCron(8);

    return  $model = ReportNotification::with(["managers", "company.companyMailContent"])->where("id", "8")->first();

    $models = ReportNotification::get();

    foreach ($models as $model) {

        return $model;

        if ($model->frequency == "Daily") {
            if (in_array("Email", $model->mediums)) {
                Mail::to($model->tos)
                    ->cc($model->ccs)
                    ->bcc($model->bccs)
                    ->queue(new ReportNotificationMail($model));
            }
            // if (in_array("Whatsapp", $model->mediums)) {
            //     Mail::to($model->tos)->send(new TestMail($model));
            // }
        }
    }
    return "done";
});

Route::post('/ardino_testing', function (Request $request) {

    $requestData = $request->all();
    //return $request;
    $requstJson = json_encode($requestData);


    DB::table('test_camera_api')
        ->insert([
            'json_content' => $requstJson,
        ]);
});
