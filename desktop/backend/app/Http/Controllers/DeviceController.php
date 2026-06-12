<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Mqtt\FaceDeviceController;

use App\Http\Requests\Device\StoreRequest;
use App\Http\Requests\Device\UpdateRequest;
use App\Mail\EmailNotificationForOfflineDevices;
use App\Mail\SendEmailNotificationForOfflineDevices;
use App\Models\AlarmLogs;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\Device;
use App\Models\DeviceActivesettings;
use App\Models\DeviceModels;
use App\Models\DeviceNotification;
use App\Models\DeviceNotificationsLog;
use App\Models\DevicesActiveWeeklySettings;
use App\Models\Employee;
use DateTime;
use DateTimeZone;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Log as Logger;

class DeviceController extends Controller
{
    const ONLINE_STATUS_ID = 1;
    const OFFLINE_STATUS_ID = 2;

    public function __construct()
    {
        // License validity gate (activated + not expired + bound machine) for
        // adding a device. The max-devices and serial-whitelist limits are
        // enforced inside store() via LicenseService.
        $this->middleware('licensed')->only('store');
    }

    public function devicesJson($id)
    {
        return Device::where("company_id", $id)->get([
            "id",
            "company_id",
            "branch_id",
            "location",
            "name",
            "short_name",
            "model_number",
            "device_id"
        ])
            ->keyBy("device_id"); // Changes the structure from [key => [obj]] to [key => obj]
    }



    public function dropdownList()
    {
        $model = Device::query();
        $model->where('company_id', request('company_id'));
        //$model->where("status_id", self::ONLINE_STATUS_ID);
        $model->excludeMobile();
        $model->when(request()->filled('branch_id'), fn($q) => $q->where('branch_id', request('branch_id')));
        $model->when(request()->filled('branch_ids'), fn($q) => $q->where('branch_id', request('branch_ids')));
        $model->orderBy(request('order_by') ?? "name", request('sort_by_desc') ? "desc" : "asc");
        return $model->get(["id", "name", "location", "device_id", "device_type", "short_name", "status_id"]);
    }
    public function deviceModelsdropdownList()
    {
        $model = DeviceModels::query();

        $model->orderBy("model_name", "asc");
        return $model->pluck("model_name");
    }

    public function index(Request $request)
    {
        $model = Device::query();

        $model->excludeMobile();

        $cols = $request->cols;

        $model->with(['status', 'company', 'branch']);

        if (!$request->source)
            $model->where('company_id', $request->company_id);


        if ($request->filter_company_id)
            $model->where('company_id', $request->filter_company_id);

        $model->when($request->filled('model_number'), function ($q) use ($request) {
            $q->where('model_number', $request->model_number);
        });

        $model->when($request->filled('name'), function ($q) use ($request) {
            $q->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->name%");
        });
        $model->when($request->filled('short_name'), function ($q) use ($request) {
            $q->where('short_name', env('WILD_CARD') ?? 'ILIKE', "$request->short_name%");
        });
        $model->when($request->filled('location'), function ($q) use ($request) {
            $q->where('location', env('WILD_CARD') ?? 'ILIKE', "$request->location%");
        });
        $model->when($request->filled('device_id'), function ($q) use ($request) {
            $q->where(function ($qq) use ($request) {
                $qq->where('device_id', env('WILD_CARD') ?? 'ILIKE', "%$request->device_id%");
                $qq->Orwhere('model_number', env('WILD_CARD') ?? 'ILIKE', "$request->device_id%");
                $qq->Orwhere('name', env('WILD_CARD') ?? 'ILIKE', "$request->device_id%");
                $qq->Orwhere('location', env('WILD_CARD') ?? 'ILIKE', "$request->device_id%");
            });
        });
        $model->when($request->filled('device_type'), function ($q) use ($request) {
            $q->where('device_type', env('WILD_CARD') ?? 'ILIKE', "$request->device_type%");
        });
        $model->when($request->filled('Status'), function ($q) use ($request) {
            $q->where('status_id', $request->Status);
        });
        $model->when($request->filled('branch_id'), function ($q) use ($request) {
            $q->where('branch_id', $request->branch_id);
        });

        $model->when($request->filled('branch_ids'), function ($q) use ($request) {
            $q->where('branch_id', $request->branch_ids);
        });

        // $model->when($request->filled('model_number'), function ($q) use ($request) {
        //     $q->where('model_number', env('WILD_CARD') ?? 'ILIKE', "$request->model_number%");
        //     $q->Orwhere('name', env('WILD_CARD') ?? 'ILIKE', "$request->model_number%");
        // });

        // array_push($cols, 'status.id');

        //$model->when(isset($cols) && count($cols) > 0, function ($q) use ($cols) {
        //$q->select($cols);
        //});

        $model->when($request->filled('sortBy'), function ($q) use ($request) {
            $sortDesc = $request->input('sortDesc');
            if (strpos($request->sortBy, '.')) {
                // if ($request->sortBy == 'department.name.id') {
                //     $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');

                // }

            } else {
                $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                }
            }
        });



        $model->orderBy("id", "desc");
        return $model->paginate($request->per_page ?? 1000);

        //return $model->with(['status', 'company'])->where('company_id', $request->company_id)->paginate($request->per_page ?? 1000);
    }
    public function getDeviceListMaster(Device $model, Request $request)
    {
        return $model->with(['company', 'status'])
            ->where("model_number", "!=", "Manual")
            ->where("model_number",  'not like', "%Mobile%")
            ->where("name",  'not like', "%Manual%")
            ->where("name",  'not like', "%manual%")

            ->orderBy(Company::select("name")->whereColumn("devices.company_id", "companies.id"),  'asc')

            // ->orderBy(function ($q) use ($request) {
            //     //$q->orderBy("companies.name", "asc");

            //     $q->orderBy(Company::select("name")->whereColumn("devices.company_id", "companies.id"),  'desc');
            // })


            // ->orderBy("name", "asc")
            ->get();
    }
    public function getDeviceList(Device $model, Request $request)
    {
        $devices = $model
            ->with(['status'])
            ->when(request()->filled('branch_ids'), fn($q) => $q->whereIn('branch_id', request('branch_ids')))
            ->where('company_id', $request->company_id)
            ->where("model_number", "!=", "Manual")
            ->where("model_number",  'not like', "%Mobile%")
            ->where("name",  'not like', "%Manual%")
            ->where("name",  'not like', "%manual%")

            ->orderBy("name", "asc")->get();


        $devices->prepend([
            'device_id' => "Mobile",                  // or remove this line completely
            'name' => 'Mobile Devices',
        ]);

        return $devices;
    }
    public function getDeviceListNotManul(Device $model, Request $request)
    {

        return $model->where('company_id', $request->company_id)
            ->where("model_number", "!=", "Manual")
            ->where("model_number",  'not like', "%Mobile%")
            ->orderBy("name", "asc")->distinct("name")
            ->orderBy("name", "asc")->get();
        // return $model->with(['status'])->where('company_id', $request->company_id)->where("model_number", "!=", "Manual")
        //     ->where("model_number",  'not like', "%Mobile%")->orderBy("name", "asc")->get();
    }

    /**
     * Probe a single device's SDK for a given employee's enrollment.
     * Aligns with getDevicePersonDetails — calls the same SDK paths
     * but returns a structured availability+capabilities array instead
     * of the legacy faceImage-only shape.
     *
     * @return array{available: bool, face: bool, rfid: bool, pin: bool}|null
     *         null = not enrolled or call failed
     */
    public function probeDevicePerson(Device $device, $systemUserId): ?array
    {
        if (!$systemUserId || $systemUserId <= 0) {
            return null;
        }

        try {
            if ($device->model_number === 'OX-900') {
                $resp = (new DeviceCameraModel2Controller(
                    $device->camera_sdk_url,
                    $device->serial_number
                ))->getPersonDetails($systemUserId);

                // Per DeviceCameraModel2Controller::getPersonDetails: returns []
                // when no person is found, or a populated array (with userCode,
                // name, faceImage) when found.
                if (!is_array($resp) || empty($resp)) {
                    return null;
                }
                return [
                    'available' => true,
                    'face'      => !empty($resp['faceImage'] ?? null),
                    'rfid'      => !empty($resp['cardNumber'] ?? null) && ($resp['cardNumber'] ?? '') !== 'FFFFFFFF',
                    'pin'       => !empty($resp['password'] ?? null),
                ];
            }

            if ($device->model_number === 'MYTIME1') {
                $resp = (new FaceDeviceController())
                    ->gatewayRequest(
                        'GET',
                        "api/device/{$device->serial_number}/person/{$systemUserId}",
                        [],
                        ['picture' => 1]
                    );
                $resp = $resp instanceof \Illuminate\Http\JsonResponse
                    ? $resp->getData(true)
                    : $resp;
                // Matches getDevicePersonDetails MYTIME1 branch: info presence
                // indicates an enrolled person.
                if (!is_array($resp) || empty($resp['info'])) {
                    return null;
                }
                $info = is_array($resp['info']) ? $resp['info'] : [];
                $card = $info['cardNo'] ?? null;
                return [
                    'available' => true,
                    'face'      => !empty($resp['pic'] ?? null) || !empty($info['faceTemplate'] ?? null),
                    'rfid'      => !empty($card) && $card !== 'FFFFFFFF',
                    'pin'       => !empty($info['password'] ?? null),
                ];
            }

            // Generic / unknown model (e.g. OXAI, OX-866) — delegate to
            // SDKController, which routes to the external SDK URL.
            $resp = (new SDKController())->getPersonDetails($device->device_id, $systemUserId);
            if (!is_array($resp)) {
                return null;
            }

            // Real SDK failures use status 102 (exception). Status 200 / 0
            // can both be "success" depending on SDK firmware, so we don't
            // gate on status alone.
            if (($resp['status'] ?? null) === 102) {
                return null;
            }

            $data = $resp['data'] ?? null;
            // SDK can return either {data: {...person...}} or a flatter
            // payload (some firmwares put fields at the top level).
            if (!is_array($data) || empty($data)) {
                // Fall back to top-level payload — strip wrapper fields
                $data = $resp;
                unset($data['status'], $data['message'], $data['code']);
                if (empty($data)) {
                    return null;
                }
            }

            $face = !empty($data['faceImage'] ?? null)
                || !empty($data['face'] ?? null)
                || !empty($data['photo'] ?? null)
                || !empty($data['picture'] ?? null);
            $card = $data['cardData'] ?? $data['cardNumber'] ?? $data['card'] ?? $data['rfid'] ?? null;
            $rfid = !empty($card) && $card !== 'FFFFFFFF';
            $pin  = !empty($data['password'] ?? null)
                || !empty($data['pin'] ?? null)
                || !empty($data['Password'] ?? null);

            // Any positive signal — including the mere presence of a
            // userCode / name record — means the user is enrolled.
            $hasRecord = $face
                || $rfid
                || $pin
                || !empty($data['userCode'] ?? null)
                || !empty($data['UserCode'] ?? null)
                || !empty($data['user_code'] ?? null)
                || !empty($data['system_user_id'] ?? null)
                || !empty($data['name'] ?? null)
                || array_key_exists('faceImage', $data);

            if (!$hasRecord) {
                return null;
            }

            return [
                'available' => true,
                'face'      => $face,
                'rfid'      => $rfid,
                'pin'       => $pin,
            ];
        } catch (\Throwable $e) {
            Logger::warning('probeDevicePerson failed', [
                'device_id'      => $device->device_id,
                'system_user_id' => $systemUserId,
                'error'          => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function getDevicePersonDetails(Request $request)
    {
        if ($request->system_user_id > 0) {
            $deviceName = '';
            //$deviceName = Device::where('device_id', $request->device_id)->pluck('name')[0];
            $device = Device::where('device_id', $request->device_id)->get()->first();
            $responseData = [];
            if (isset($device["name"])) {
                $deviceName = $device["name"];

                if ($device["model_number"] == 'OX-900') {
                    $responseData['data'] = (new DeviceCameraModel2Controller($device["camera_sdk_url"], $device["serial_number"]))->getPersonDetails($request->system_user_id);
                } else if ($device["model_number"] == 'MYTIME1') {


                    try {
                        $query = [];

                        $query['picture'] = 1;

                        $responseSDK =  (new FaceDeviceController())
                            ->gatewayRequest('GET', "api/device/{$device["serial_number"]}/person/{$request->system_user_id}", [], $query);;



                        $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                            ? $responseSDK->getData(true)
                            : $responseSDK;



                        if (($responseSDK["info"])) {

                            $picture_data = str_replace("data:image/jpeg;base64,", "", $responseSDK["pic"]);

                            $responseData['data']   = [
                                "name" => $responseSDK["info"]["name"],
                                "userCode" => $responseSDK["info"]["customId"],
                                "expiry" =>  $responseSDK["info"]["cardValidEnd"] == "0000-00-00 00:00:00" ? '---' : $responseSDK["info"]["cardValidEnd"],
                                "faceImage" => $picture_data,
                                "timeGroup" => "--"
                            ];
                        } else {
                            $responseData['data'] = [
                                "SDKresponseData" => "",
                                "message" => "User ID is not available on  Device  ",
                                "deviceName" => $deviceName,
                                "device_id" => $request->device_id
                            ];
                        }
                    } catch (\Exception $e) {
                        $responseData['data'] = [
                            "SDKresponseData" => "",
                            "message" => "User ID is not available on  Device  ",
                            "deviceName" => $deviceName,
                            "device_id" => $request->device_id
                        ];
                    }
                } else {
                    $responseData = (new SDKController())->getPersonDetails($request->device_id, $request->system_user_id);
                }

                $employeeDetails = Employee::where("company_id", $request->company_id)->where("system_user_id", $request->system_user_id)->first();
            }

            if (isset($responseData['data']['faceImage'])) {
                return ["SDKresponseData" => ($responseData), "deviceName" => $deviceName, "device_id" => $request->device_id,  "employee" => $employeeDetails];
            }
            return ["SDKresponseData" => "", "message" => "User ID is not available on  Device  ", "deviceName" => $deviceName, "device_id" => $request->device_id];
        } else {
            // return ["SDKresponseData" => "", "message" => "User ID is not available on  Device ", "deviceName" => $deviceName, "device_id" => $request->device_id];
        }
    }
    public function copytoProfilePicture(Request $request)
    {

        if ($request->system_user_id > 0) {

            $employeeDetails = Employee::where("company_id", $request->company_id)->where("system_user_id", $request->system_user_id)->get();
            if (count($employeeDetails) > 0) {
                $base64Image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', ($request->face_image)));
                $imageName = $request->system_user_id . '.jpg';
                file_put_contents(public_path('media/employee/profile_picture/') . '/' . $imageName, $base64Image);

                $data = ["profile_picture" => $imageName];

                Employee::where("company_id", $request->company_id)->where("system_user_id", $request->system_user_id)->update($data);

                return $this->response('Profile Picture is successfully Updated', null, true);
            } else {
                return $this->response('Employee Details are not Avaiallbe. Create Employees Data', null, false);
            }
        }
    }
    public function downloadProfilePictureSdk(Request $request)
    {


        $base64Image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', ($request->face_image)));
        $imageName = (time() + rand(10000, 20000)) . ".png";
        $publicDirectory = public_path("temp");
        if (!file_exists($publicDirectory)) {
            mkdir($publicDirectory, 0777, true);
        }
        file_put_contents($publicDirectory . '/' . $imageName, $base64Image);

        // Define the path to the file in the public folder
        $filePath =  $publicDirectory . '/' . $imageName;


        return $imageName;
        // Check if the file exists
        if (file_exists($filePath)) {
            // Create a response to download the file
            return response()->download($filePath, $imageName);
        } else {
            // Return a 404 Not Found response if the file doesn't exist
            return 'File not found';
        }


        // if ($request->id > 0) {
        //     $base64Image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', ($request->faceImage)));
        //     $imageName = $request->id . '.jpg';
        //     file_put_contents(public_path('media/employee/profile_picture/') . '/' . $imageName, $base64Image);
        // }



    }
    public function downloadProfilePicture(Request $request)
    {


        $imageName = $request->image;
        $publicDirectory = public_path("temp");

        $filePath =  $publicDirectory . '/' . $imageName;

        // Check if the file exists
        if (file_exists($filePath)) {
            // Create a response to download the file
            return response()->download($filePath,  $request->name . "-" . $imageName)->deleteFileAfterSend(true);
        } else {
            // Return a 404 Not Found response if the file doesn't exist
            return 'File not found';
        }


        // if ($request->id > 0) {
        //     $base64Image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', ($request->faceImage)));
        //     $imageName = $request->id . '.jpg';
        //     file_put_contents(public_path('media/employee/profile_picture/') . '/' . $imageName, $base64Image);
        // }



    }
    public function store(StoreRequest $request)
    {
        try {

            $company = Company::find($request->company_id);

            // License enforcement: max devices, device-serial whitelist, expiry.
            // The licensed serial is the device_id (stored as serial_number below).
            if ($company && $company->account_type == "company") {
                $licenseError = app(\App\Services\LicenseService::class)
                    ->canAddDevice($request->company_id, $request->device_id);
                if ($licenseError) {
                    return $this->response($licenseError, null, false);
                }
            }

            $model = Device::query();
            //$model->where("company_id", $request->company_id);
            $model->with(["company"])->where("device_id", $request->device_id);
            //$model->where("name", $request->name);

            if ($model->exists()) {
                return $this->response('Device already exist with ' . $model->first()->company->name, null, false);
            }

            $data = $request->validated();
            if (!empty($data['camera_rtsp_ip']) && empty($data['camera_rtsp_port'])) {
                $data['camera_rtsp_port'] = 554;
            }
            if (!empty($data['camera_password'])) {
                $data['camera_password'] = \Illuminate\Support\Facades\Crypt::encryptString($data['camera_password']);
            }

            if ($data["model_number"] == "OX-900") {
                $data["camera_sdk_url"] = env('OX900_SDK_URL');
            }

            // Auto-generate device_id for Camera model if not provided
            if (empty($data["device_id"]) && ($data["model_number"] ?? '') === 'Camera') {
                $data["device_id"] = 'CAM-' . time() . '-' . rand(1000, 9999);
            }
            $data["serial_number"] = $data["device_id"];
            $data["ip"] = "0.0.0.0";
            $data["port"] = "0000";
            $record = $model->create($data);
            $this->updateDevicesJson();
            if ($record) {
                return $this->response('Device successfully added.', $record, true);
            } else {
                return $this->response('Device cannot add.', null, 'device_api_error');
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(Device $model, $id)
    {
        $device = $model->with(['status', 'company'])->find($id);
        
        // Decrypt camera password if it exists
        if ($device && !empty($device->camera_password)) {
            try {
                $device->camera_password = \Illuminate\Support\Facades\Crypt::decryptString($device->camera_password);
            } catch (\Exception $e) {
                // Password may not be encrypted (legacy data), use as-is
            }
        }
        
        return $device;
    }

    public function getDeviceByUserId(Device $model, $id)
    {
        return $model->where("device_id", $id)->first();
    }
    public function getDevicesArray(Device $model)
    {
        return $model->pluck("company_id", "device_id");
    }

    public function getDeviceCompany(Request $request)
    {
        $device = DB::table("devices")->where("company_id", $request->company_id)->where("device_id", $request->SN)->first(['name as device_name', 'short_name', 'device_id', 'location', "company_id"]);
        $model = DB::table("employees")->where("company_id", $request->company_id)->where("system_user_id", $request->UserCode)->first(['first_name', 'display_name', 'profile_picture']);

        if ($model && $model->profile_picture) {
            $model->profile_picture = asset('media/employee/profile_picture/' . $model->profile_picture);
        }

        return [
            "UserID" => $request->UserCode,
            "time" => date("H:i", strtotime($request->RecordDate)),
            "employee" => $model,
            "device" => $device,
        ];
    }
    public function getLastRecordsHistory_old($id = 0, $count = 0, Request $request)
    {
        $startTime = microtime(true); // Start time
        $startMemory = memory_get_usage(); // Get memory usage before query

        // return Employee::select("system_user_id")->where('company_id', $request->company_id)->get();

        $model = AttendanceLog::query();
        $model->with(array('employee' => function ($query) use ($request) {
            $query->where('company_id', $request->company_id);
        }))->first();

        $model->with(['device']);
        $model->where('company_id', $id);
        $model->when($request->filled("branch_id"), function ($q) use ($request) {
            $q->whereHas("employee", fn($q) => $q->where("branch_id", $request->branch_id));
        });
        $model->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
            $q->whereHas("employee", fn($q) => $q->where("department_id", $request->department_id));
        });
        $model->whereIn('UserID', function ($query) use ($request) {
            // $model1 = Employee::query();
            // $model1->select("system_user_id")->where('employees.company_id', $request->company_id);

            $query->select('system_user_id')->from('employees')->where('employees.company_id', $request->company_id);
        });
        $model->when($request->filled('system_user_id'), function ($q) use ($request) {

            $q->Where('UserID',   $request->system_user_id);
        });
        $model->when($request->filled('search_time'), function ($q) use ($request) {
            $key = date('Y-m-d') . ' ' . $request->search_time;
            $q->Where('LogTime', 'LIKE', "$key%");
        });
        $model->when($request->filled('search_device_id'), function ($q) use ($request) {
            $key = strtoupper($request->search_device_id);
            //$q->Where(DB::raw('lower(DeviceID)'), 'LIKE', "$key%");
            $q->Where('DeviceID', 'LIKE', "$key%");
        });
        $model->Where('LogTime', '<=', date('Y-m-d 23:59:59'));
        if (!$request->sortBy) {

            $model->orderBy("LogTime", 'desc');
        }
        //$model->orderByDesc("LogTime");
        $logs = $model->paginate($request->per_page);

        $endMemory = memory_get_usage(); // Get memory usage after query

        $executionTime = microtime(true) - $startTime; // Calculate execution time
        $memoryUsed = $endMemory - $startMemory;

        // return response()->json([
        //     'execution_time' => $executionTime,
        //     'memory_used' => number_format($memoryUsed / 1024, 2) . ' KB',
        //     'data' => $logs
        // ]);

        return $logs;
    }

    public function getLastRecordsHistory($id = 0, $count = 0, Request $request)
    {

        $model = AttendanceLog::query();

        $model->where("company_id", $id);

        $model->when(request()->filled("branch_ids"), function ($q) {
            $q->whereHas("employee", fn($q) =>  $q->whereIn('branch_id', request("branch_ids")));
        });

        $model->when(request()->filled("department_ids"), function ($q) {
            $q->whereHas("employee", fn($q) =>  $q->whereIn('department_id', request("department_ids")));
        });


        if ($request->filled("branch_id")) {
            $model->whereIn("UserID", function ($query) use ($request) {
                $query->select("system_user_id")
                    ->from("employees")
                    ->where("branch_id", $request->branch_id);
            });
        }

        if ($request->filled("department_id") && $request->department_id > 0) {
            $model->whereIn("UserID", function ($query) use ($request) {
                $query->select("system_user_id")
                    ->from("employees")
                    ->where("department_id", $request->department_id);
            });
        }

        $model->with('employee', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
            $q->withOut(["schedule",  "sub_department", "user"]);

            $q->select(
                "first_name",
                "last_name",
                "profile_picture",
                "employee_id",
                "branch_id",
                "system_user_id",
                "display_name",
                "timezone_id",
            );
        });

        $model->with('device', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
            $q->select(
                "id",
                "company_id",
                "branch_id",
                "status_id",
                "name",
                "short_name",
                "device_id",
                "location",
                "model_number",
            );
        });

        $model->where('LogTime', '>', date('Y-m-01'));
        $model->where('LogTime', '<=', date('Y-m-d 23:59:59'));
        $model->orderBy('LogTime', 'DESC');

        return $model->paginate(request("per_page", 10));

        // Generate a unique cache key using company_id and request parameters
        $cacheKey = "attendance_logs_{$id}_" . md5(json_encode($request->all()));

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($id, $request) {});
    }

    public function updateDeviceCamVIISettingsToSDK(Request $request)
    {
        if ($request->deviceSettings['device_id'] > 0) {

            $device = Device::where("device_id", $request->deviceSettings['device_id'])->first();
            $responseData['data'] = (new DeviceCameraModel2Controller($device->camera_sdk_url))->updateSettings($request);


            return ["SDKresponseData" =>  $responseData, "message" => " Settings Updated Successfully", "device_id" => $request->deviceSettings['device_id'], "status" => true];
        } else {
            return ["SDKresponseData" => "", "message" => "  Device id is not avaialble ", "deviceName" => false, "status" => false, "device_id" => $request->device_id];
        }
    }
    public function getDevicecamviiSettingsFromSDK(Request $request)
    {


        $device = Device::where("device_id", $request->device_id)->first();
        if ($device->model_number == "MYTIME1") {



            //getTime
            $deviceTime = "";
            $devicePersonsCount = 0;

            try {
                $responseSDK = (new FaceDeviceController())
                    ->gatewayRequest('GET', "api/device/{$request->device_id}/timezone");

                $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                    ? $responseSDK->getData(true)
                    : $responseSDK;

                if (isset($responseSDK['code']) && $responseSDK['code'] == 200) {


                    if (($responseSDK["info"]["SysTime"])) {
                        $deviceTime = $responseSDK["info"]["SysTime"];
                    }
                }
            } catch (\Exception $e) {
            }
            try {
                $responseSDK = (new FaceDeviceController())
                    ->gatewayRequest('GET', "api/device/{$request->device_id}/persons/list");

                $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                    ? $responseSDK->getData(true)
                    : $responseSDK;

                if (isset($responseSDK['code']) && $responseSDK['code'] == 200) {


                    if (($responseSDK["info"]["TotalPersonNum"])) {
                        $devicePersonsCount = $responseSDK["info"]["TotalPersonNum"];
                    }
                }
            } catch (\Exception $e) {
            }
            $wifiIp = "";
            try {
                $responseSDK = (new FaceDeviceController())
                    ->gatewayRequest('GET', "api/device/{$request->device_id}/GetDeviceInfo");

                $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                    ? $responseSDK->getData(true)
                    : $responseSDK;

                if (isset($responseSDK['code']) && $responseSDK['code'] == 200) {


                    if (($responseSDK["info"]["wifiIp"])) {
                        $wifiIp = $responseSDK["info"]["wifiIp"];
                    }
                }
            } catch (\Exception $e) {
            }

            return [
                "SDKresponseData" => [
                    "data" => [
                        "model_spec" => "MYTIME1",
                        "voice_volume" => "",
                        "local_time" => str_replace("T", " ", $deviceTime),
                        "door_open_stat" => "",
                        "wifi_ip" => $wifiIp ?? "",
                        "lan_ip" => "",
                        "ipaddr" => "",
                        "open_duration" => "",
                        "verification_mode" => "",
                        "recognition_mode" => "",
                        "persons_count" => $devicePersonsCount,
                    ]
                ],
                "device_id" => $request->device_id,
                "status" => true
            ];
        } else {

            if ($request->device_id > 0) {

                $device = Device::where("device_id", $request->device_id)->first();
                $responseData['data'] = (new DeviceCameraModel2Controller($device->camera_sdk_url))->getSettings($device);


                return ["SDKresponseData" =>  $responseData,  "device_id" => $request->device_id, "status" => true];
            } else {
                return ["SDKresponseData" => "", "message" => "  Device id is not avaialble ", "deviceName" => false, "status" => false, "device_id" => $request->device_id];
            }
        }
        return ["SDKresponseData" => "", "message" => "  Device id is not avaialble ", "deviceName" => false, "status" => false, "device_id" => $request->device_id];
    }
    public function AlarmOffToDeviceSDK(Request $request)
    {


        if ($request->filled('serial_number')) {

            $device_settings = [];




            $device = Device::where("serial_number", $request->serial_number)->first();
            // if ($device->status_id == 2) {
            //     return $this->response("Device is offline. Please Check Device Online status.", null, false);
            // }
            try {

                if ($device->device_category_name == 'CAMERA') {

                    if ($device->model_number == 'CAMERA1') {
                        //(new DeviceCameraController())->updateTimeZone();
                    }
                } else  if ($device->model_number == 'OX-900') {

                    (new DeviceCameraModel2Controller($device->camera_sdk_url))->closeDoor($device);
                } else {

                    $url = env('SDK_URL') . "/$request->serial_number/CloseDoor";

                    if (env('APP_ENV') == 'desktop') {
                        $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/$request->serial_number/CloseDoor";
                    }
                    $response = $this->callCURL($url);



                    $data = [
                        "IllegalVerificationAlarm" => false,
                        "PasswordAlarm" => false,
                        "DoorMagneticAlarm" => false,
                        "BlacklistAlarm" => false,
                        "FireAlarm" => true,
                        "OpenDoorTimeoutAlarm" => false,
                        "AntiDisassemblyAlarm" => false,
                    ];
                    if ($request->status == 0) {
                        (new SDKController)->processSDKRequestCloseAlarm($request->serial_number, $data);
                        //always open the door till close manually
                        $this->CallAlwaysOpenDoor($request->serial_number);
                    }
                }

                $data = ["alarm_status" => 0, "alarm_end_datetime" => date('Y-m-d H:i:s')];
                Device::where("serial_number", $request->serial_number)->update($data);

                $data = ["status" => 0, "device_id" => $request->serial_number, "log_time" => date('Y-m-d H:i:s')];
                AlarmLogs::create($data);

                return $this->response('Device Alarm OFF status Updated Successfully',  null, true);
            } catch (\Exception $e) {
                return $this->response("Unkown Error. Please retry again after 1 min or contact   technical team", null, false);
            }




            return $this->response('Device settings are updated successfully.',  null, true);
        } else {
            return $this->response('Device ID is not found',  null, false);
        }
    }
    public function updateDeviceSettingsToSDK(Request $request)
    {


        if ($request->deviceSettings && $request->deviceSettings['device_id']) {

            $device_settings = [];

            $utc_time_zone  = Device::where('device_id', $request->deviceSettings['device_id'])->pluck("utc_time_zone")->first();;

            $dateObj  = new DateTime("now", new DateTimeZone($utc_time_zone));
            $currentDateTime = $dateObj->format('Y-m-d H:i:00');


            $device_settings = [
                // "name" => $request->deviceSettings['name'] ?? '',
                "name" =>  '',
                // "door" => $request->deviceSettings['door'] ?? '1',


                "language" => $request->deviceSettings['language'] ?? '2',
                "volume" => $request->deviceSettings['volume'] ?? '5',
                "menuPassword" => $request->deviceSettings['menuPassword'] ?? '',
                "msgPush" => $request->deviceSettings['msgPush'] ?? '0',
                "time" => $currentDateTime,


            ];
            if (isset($request->deviceSettings['maker_manufacturer'])) {


                if ($request->deviceSettings['maker_manufacturer'] != '' &&  $request->deviceSettings['maker_webAddr'] != '' &&  $request->deviceSettings['maker_deliveryDate'] != '') {
                    $device_settings["maker"] = [
                        "manufacturer" => $request->deviceSettings['maker_manufacturer'] ?? '',
                        "webAddr" => $request->deviceSettings['maker_webAddr'] ?? '',
                        "deliveryDate" => $request->deviceSettings['maker_deliveryDate'] ?? ''
                    ];
                }
            }
            (new SDKController)->processSDKRequestSettingsUpdate($request->deviceSettings['device_id'], $device_settings);

            return $this->response('Device settings are updated successfully.',  null, true);
        } else {
            return $this->response('Device ID is not found',  null, false);
        }
    }
    public function getDeviceSettingsFromSDK(Request $request)
    {

        if ($request->device_id > 0) {


            $responseData = (new SDKController())->getDeviseSettingsDetails($request->device_id);

            $responseDataArray = json_decode($responseData, true);

            if (!isset($responseDataArray->data->maker['manufacturer'])) {
                $responseDataArray['data']['maker_manufacturer'] = "OXAI";
                $responseDataArray['data']['maker_webAddr']   = env("APP_URL");
                $responseDataArray['data']['maker_deliveryDate']  = date("Y-01-01");
            }
            if (!isset($responseDataArray['data']['name'])) {
                $responseDataArray['data']['name'] = "OXSAI866";
            }





            return ["SDKresponseData" =>  $responseDataArray,  "device_id" => $request->device_id, "status" => true];
        } else {
            return ["SDKresponseData" => "", "message" => "  Device id is not avaialble ", "deviceName" => false, "status" => false, "device_id" => $request->device_id];
        }
    }
    public function getLastRecordsByCount($id = 0, $count = 0, Request $request)
    {
        $model = AttendanceLog::query();
        $model->where('company_id', $id);
        $model->with(["employee" => function ($q) use ($id) {
            $q->where('company_id', $id);
            $q->withOut(['schedule', 'department', 'sub_department', 'designation', 'user', 'role']);
            $q->select('first_name', 'last_name', 'employee_id', 'system_user_id', 'display_name', 'profile_picture', 'company_id');
        }]);
        $model->take($count);
        $model->orderByDesc("id");
        return $model->get()->toArray();

        // Cache::forget("last-five-logs");
        return Cache::remember('last-five-logs', 300, function () use ($id, $count) {

            $model = AttendanceLog::query();
            $model->where('company_id', $id);
            $model->take($count);

            $logs = $model->get(["UserID", "LogTime", "DeviceID"]);

            $arr = [];

            foreach ($logs as $log) {

                $employee = Employee::withOut(['schedule', 'department', 'sub_department', 'designation', 'user', 'role'])
                    ->where('company_id', $id)
                    ->where('system_user_id', $log->UserID)
                    ->first(['first_name', 'profile_picture', 'company_id']);

                $dev = Device::where('device_id', $log->DeviceID)
                    ->first(['name as device_name', 'short_name', 'device_id', 'location']);

                if ($employee) {
                    $arr[] = [
                        "company_id" => $employee->company_id,
                        "UserID" => $log->UserID,
                        "time" => date("H:i", strtotime($log->LogTime)),
                        "device" => $dev,
                        "employee" => $employee,
                    ];
                }
            }

            return $arr;
        });
    }

    public function update(Device $Device, UpdateRequest $request)
    {
        // License requirement: devices are license-bound, so an existing device
        // cannot be edited. Delete and re-add the device to make a change.
        return $this->response('Devices cannot be edited.', null, false);

        try {
            $data = $request->validated();
            if (!empty($data['camera_rtsp_ip']) && empty($data['camera_rtsp_port'])) {
                $data['camera_rtsp_port'] = 554;
            }
            if (empty($data['camera_password'])) {
                unset($data['camera_password']);
            } else {
                $data['camera_password'] = \Illuminate\Support\Facades\Crypt::encryptString($data['camera_password']);
            }
            $record = $Device->update($data);

            //update to Device
            if ($request->model_number == 'OX-900') {

                $status = $request->function == 'option'  ? 'true' : 'false';
                $json = '{


                "custom_enable": false,
                "function_keys": [],

                        "enable":  ' . $status . '


                    }';

                // return  $json;
                (new DeviceCameraModel2Controller($request->camera_sdk_url))->updateAttendanceSDKData($request->device_id, $json);
            } else {

                $device_settings = [
                    "door" => $request->function == 'In' ? 0 : '1'

                ];
                (new SDKController)->processSDKRequestSettingsUpdate($request->device_id, $device_settings);
            }



            $this->updateDevicesJson();

            if ($record) {
                return $this->response('Device successfully updated.', $record, true);
            } else {
                return $this->response('Device cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function updateDevicesJson()
    {
        $devices = Device::where("device_category_name", "CAMERA")->get();

        $filePath = storage_path('app') . '' . '/devices_list.json';


        file_put_contents($filePath, json_encode($devices));
    }

    public function destroy(Device $device)
    {
        try {
            $record = $device->delete();

            if ($record) {
                return $this->response('Device successfully deleted.', $record, true);
            } else {
                return $this->response('Device cannot delete.', null, 'device_api_error');
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function search(Request $request, $key)
    {
        $model = Device::query();

        $fields = [
            'name',
            'device_id',
            'location',
            'short_name',
            'status' => ['name'],
            'company' => ['name'],
        ];

        $model = $this->process_search($model, $key, $fields);

        $model->with(['status', 'company']);

        return $model->paginate($request->per_page);
    }

    public function deleteSelected(Device $model, Request $request)
    {
        try {
            $record = $model->whereIn('id', $request->ids)->delete();

            if ($record) {
                return $this->response('Device successfully deleted.', $record, true);
            } else {
                return $this->response('Device cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function openDoor(Request $request)
    {


        $device = Device::where("device_id", $request->device_id)->first();
        if ($device->status_id == 2) {
            return $this->response("Device is offline. Please Check Device Online status.", null, false);
        }
        try {

            if ($device->device_category_name == 'CAMERA') {

                if ($device->model_number == 'CAMERA1') {
                    //(new DeviceCameraController())->updateTimeZone();
                }
            } else  if ($device->model_number == 'OX-900') {
                (new DeviceCameraModel2Controller($device->camera_sdk_url))->openDoor($device);
                return $this->response('Open Door Command Successfull',  null, true);
            } else  if ($device->model_number == 'MYTIME1') {


                try {
                    (new FaceDeviceController())
                        ->gatewayRequest('POST', "api/device/{$device->device_id}/open-door");

                    return $this->response('Open Door Command Successfull',  null, true);
                } catch (\Exception $e) {
                    return $this->response(
                        $e->getMessage() . " - Unknown error occurred. Please try again after 1 minute or contact the technical team.",
                        null,
                        false
                    );
                }

                return $this->response('Open Door Command Successfull',  null, true);
            } else {

                $url = env('SDK_URL') . "/$request->device_id/OpenDoor";

                if (env('APP_ENV') == 'desktop') {
                    $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/$request->device_id/OpenDoor";
                }

                $response = $this->callCURL($url);


                if ($response['status'] == 200)
                    return $this->response('Open Door Command Successfull',  null, true);
                else
                    return $this->response("Unkown Error. Please retry again after 1 min or contact   technical team", null, false);
            }
        } catch (\Exception $e) {
            return $this->response("Unkown Error. Please retry again after 1 min or contact   technical team", null, false);
        }
    }

    public function deviceAccessControllAllwaysOpen($schedule)
    {

        $date = date('Y-m-d');
        $devices =  DeviceActivesettings::where(function ($q) {
            $q->orWhere('date_from', ">=", date("Y-m-d"));
            $q->orWhere('date_to', "<=", date("Y-m-d"));
        })->get();




        $weekDays = [0 => "Sun", 1 => "Mon", 2 => "Tue", 3 => "Wed", 4 => "Thu", 5 => "Fri", 6 => "Sat"];
        // $file_name_raw = "kernal_logs/$date-device-access.log";
        // Storage::append($file_name_raw,  date("d-m-Y H:i:s") .   '_door_open_logs.log');

        foreach ($devices as $key => $device) {


            if ($device["devices"]) {

                $openJson =  $device['open_json'];

                $openJsonArray = json_decode($openJson, true);

                foreach ($openJsonArray as  $key => $time) {


                    if (count($time) > 0) {
                        foreach ($time as $keyDay => $timeValue) {


                            if ($weekDays[$keyDay] == date("D")) {

                                $timeArray = explode(":", $timeValue);
                                if (date("H:i") == $timeValue) {
                                    $file_name_raw = "kernal_logs/$date-device-HoldDoor-access-live.log";
                                    Storage::append($file_name_raw,  date("d-m-Y H:i:s")  . $device["devices"]->model_number . '-' . $device["devices"]->device_id . '_door_HoldDoor_logs-' . $timeValue);


                                    if ($device["devices"]->model_number == 'OX-900') {
                                        (new DeviceCameraModel2Controller($device["devices"]->camera_sdk_url))->openDoorAlways($device["devices"]);
                                        $this->response('Always Open  Command is Successfull',  null, true);
                                    } else

                                        $result = (new SDKController)->handleCommand($device["devices"]->device_id, "HoldDoor");
                                }


                                $schedule
                                    ->command("task:AccessControlTimeSlots {$device["devices"]->device_id} HoldDoor")
                                    ->cron($timeArray[1] . ' ' . $timeArray[0] . ' * * *')
                                    ->withoutOverlapping()
                                    ->appendOutputTo(storage_path("kernal_logs/$date-device-access-control-time-slot-open-logs.log"))
                                    ->emailOutputOnFailure(env("ADMIN_MAIL_RECEIVERS"));
                            }
                        }
                    }
                }
                //

                $closeJson =  $device['close_json'];

                $closeJsonArray = json_decode($closeJson, true);

                foreach ($closeJsonArray as  $key => $time) {
                    if (count($time) > 0) {
                        foreach ($time as $keyDay => $timeValue) {



                            if ($weekDays[$keyDay] == date("D")) {
                                // $file_name_raw = "kernal_logs/$date-device-close-access.log";
                                // Storage::append($file_name_raw,  date("d-m-Y H:i:s") . '_door_close_logs-' . $timeValue);

                                $timeArray = explode(":", $timeValue);

                                if (date("H:i") == $timeValue) {
                                    $file_name_raw = "kernal_logs/$date-device-closeDoor-access-live.log";
                                    Storage::append($file_name_raw,  date("d-m-Y H:i:s") . $device["devices"]->model_number . '-' . $device["devices"]->device_id . '_door_closeDoor_logs-' . $timeValue);
                                    if ($device["devices"]->model_number == 'OX-900') {
                                        (new DeviceCameraModel2Controller($device["devices"]->camera_sdk_url))->closeDoor($device["devices"]);
                                        $this->response('Always Open  Command is Successfull',  null, true);
                                    } else
                                        $result = (new SDKController)->handleCommand($device["devices"]->device_id, "CloseDoor");
                                }

                                $schedule
                                    ->command("task:AccessControlTimeSlots {$device["devices"]->device_id} CloseDoor")
                                    ->cron($timeArray[1] . ' ' . $timeArray[0] . ' * * *')
                                    ->withoutOverlapping()
                                    ->appendOutputTo(storage_path("kernal_logs/$date-device-access-control-time-slot-open-logs.log"))
                                    ->emailOutputOnFailure(env("ADMIN_MAIL_RECEIVERS"));
                            }
                        }
                    }
                }
            }
        }
    }
    public function closeDoor(Request $request)
    {
        $device = Device::where("device_id", $request->device_id)->first();
        if ($device->status_id == 2) {
            return $this->response("Device is offline. Please Test Device Online status.", null, false);
        }
        try {

            if ($device->device_category_name == 'CAMERA') {

                if ($device->model_number == 'CAMERA1') {
                    //(new DeviceCameraController())->updateTimeZone();
                }
            } else  if ($device->model_number == 'OX-900') {
                (new DeviceCameraModel2Controller($device->camera_sdk_url))->closeDoor($device);
                return $this->response('Close Door Command Successfull',  null, true);
            } else  if ($device->model_number == 'MYTIME1') {


                try {
                    (new FaceDeviceController())
                        ->gatewayRequest('POST', "api/device/{$device->device_id}/close-door");

                    return $this->response('Close Door Command Successfull',  null, true);
                } catch (\Exception $e) {
                    return $this->response(
                        "   Unknown error occurred. Please try again after 1 minute or contact the technical team.",
                        null,
                        false
                    );
                }

                return $this->response('Close Door Command Successfull',  null, true);
            } else {


                $url = env('SDK_URL') . "/$request->device_id/CloseDoor";

                if (env('APP_ENV') == 'desktop') {
                    $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/$request->device_id/CloseDoor";
                }

                $response = $this->callCURL($url);



                if ($response['status']  == 200)
                    return $this->response('Close Door Command Successfull',  null, true);
                else
                    return $this->response("Unkown Error. Please retry again after 1 min or contact   technical team", null, false);
            }
        } catch (\Exception $e) {
            return $this->response("Unkown Error. Please retry again after 1 min or contact   technical team", null, false);
        }
    }

    public function getAlarmNotification(Request $request)
    {
        return  $devices = Device::with(["branch", "zone"])->where("company_id", $request->company_id)->where("alarm_status", 1)->get();
    }
    public function triggerAllDeviceAlarmSDK(Request $request)
    {
        $company_ids = Device::where("device_id", $request->device_id)->pluck('company_id');
        $branch_ids = Device::where("device_id", $request->device_id)->pluck('branch_id');
        $devices_to_call = Device::wherein("company_id", $company_ids)->wherein("branch_id", $branch_ids)->where("serial_number", "!=", null)->get();
        $return = [];
        foreach ($devices_to_call as $key => $device) {
            try {
                $return[] =  (new DeviceController())->CallAlwaysOpenDoor($device->serial_number);
                $data = ["alarm_status" => 1, "alarm_start_datetime" => date('Y-m-d H:i:s')];
                Device::where("serial_number", $device->serial_number)->update($data);
            } catch (\Exception $e) {
            }
        }
    }
    public function openDoorAlways(Request $request)
    {
        if ($request->filled("device_id"))
            return  $this->CallAlwaysOpenDoor($request->device_id);
    }

    public function CallAlwaysOpenDoor($device_id)
    {

        if ($device_id == null || $device_id == '') return "";
        $device = Device::where("device_id", $device_id)->first();

        // if ($device->status_id == 2) {
        //     return $this->response("Device is offline. Please Test Device Online status.", null, false);
        // }
        try {

            if ($device->device_category_name == 'CAMERA') {

                if ($device->model_number == 'CAMERA1') {
                    //(new DeviceCameraController())->updateTimeZone();
                }
            } else  if ($device->model_number == 'OX-900') {
                (new DeviceCameraModel2Controller($device->camera_sdk_url))->openDoorAlways($device);
                return $this->response('Always Open  Command is Successfull',  null, true);
            } else {
                $url = env('SDK_URL') . "/$device_id/HoldDoor";

                if (env('APP_ENV') == 'desktop') {
                    $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/$device_id/HoldDoor";
                }

                $response = $this->callCURL($url);

                if ($response['status']  == 200)
                    return $this->response('Always Open  Door Command is Successfull',  null, true);
                else
                    return $this->response("Unkown Error. Please retry again after 1 min or contact   technical team", null, false);
            }
        } catch (\Exception $e) {
            return $this->response("Unkown Error. Please retry again after 1 min or contact   technical team", null, false);
        }
    }

    public function sync_device_date_time($device_id, $company_id)
    {
        $device = Device::where("company_id", $company_id)->where("device_id", $device_id)->first();

        if (!$device) {
            return $this->response('Device not found.',  null, true);
        }

        try {

            $sdkResponse = [];

            $currentDateTime = (new DateTime("now", new DateTimeZone($device->utc_time_zone)))->format('Y-m-d H:i:s');

            if ($device->model_number == 'OX-900') {
                return (new DeviceCameraModel2Controller($device->camera_sdk_url))->updateTimeZone($device);
            } else  if ($device->model_number == 'MYTIME1') {


                try {
                    $currentDateTime = (new DateTime("now", new DateTimeZone($device->utc_time_zone)))->format('Y-m-d H:i:s');

                    $currentDateTime = str_replace(' ', 'T', $currentDateTime);

                    (new FaceDeviceController())
                        ->gatewayRequest('POST', "api/device/{$device->device_id}/timezone", [
                            'sysTime' => $currentDateTime,
                        ]);
                    return $this->response('Time   synced to the Device.', null, false);
                } catch (\Exception $e) {
                    return $this->response(
                        "   Unknown error occurred. Please try again after 1 minute or contact the technical team.",
                        null,
                        false
                    );
                }
            } else {
                $sdkResponse = (new SDKController)->processSDKRequestSettingsUpdateTime($device_id, $currentDateTime);
            }

            $payload = [
                "sync_date_time" => $currentDateTime,
            ];

            Device::where("device_id", $device_id)->update($payload);

            return $this->response($sdkResponse, null, true);
        } catch (\Throwable $th) {
            return $this->response('Time cannot synced to the Device.', null, false);
        }


        return $this->response("Unkown Error. Please retry again after 1 min or contact to technical team", null, false);
    }


    public function sync_device_date_time_old($device_id, $company_id)
    {

        $device = Device::where("company_id", $company_id)->where("device_id", $device_id)->first();

        if (!$device) {
            return $this->response('Device not found.',  null, true);
        }

        if ($device->model_number == 'OX-900') {
            return (new DeviceCameraModel2Controller($device->camera_sdk_url))->updateTimeZone($device);
        }

        try {

            $currentDateTime = (new DateTime("now", new DateTimeZone($device->utc_time_zone)))->format('Y-m-d H:i:s');

            (new SDKController)->processSDKRequestSettingsUpdateTime($device_id, $currentDateTime);

            $payload = [
                "sync_date_time" => $currentDateTime,
            ];

            Device::where("device_id", $device_id)->update($payload);

            return $this->response("Time <b>$currentDateTime</b> has been synced to the Device.", null, true);
        } catch (\Throwable $th) {
            return $this->response('Time cannot synced to the Device.', null, false);
        }


        return $this->response("Unkown Error. Please retry again after 1 min or contact to technical team", null, false);
    }

    public function devcieCountByStatus($company_id)
    {


        $company_id = (int)$company_id;
        if ($company_id > 0) {
            $statusCounts = Device::where('company_id', $company_id)
                ->when(request()->filled("branch_ids"), function ($q) {
                    $q->whereIn("branch_id", request("branch_ids"));
                })
                ->whereIn('status_id', [1, 2])
                ->where('device_id', "!=", "Manual")
                ->selectRaw('status_id, COUNT(*) as count')
                ->groupBy('status_id')
                ->get();

            $onlineDevices = 0;
            $offlineDevices = 0;

            foreach ($statusCounts as $statusCount) {
                if ($statusCount->status_id == 1) {
                    $onlineDevices = $statusCount->count;
                } elseif ($statusCount->status_id == 2) {
                    $offlineDevices = $statusCount->count;
                }
            }

            return [
                "total" => $onlineDevices + $offlineDevices,
                "labels" => ["Online", "Offline"],
                "series" => [$onlineDevices, $offlineDevices],
            ];
        } else {
            return [
                "total" => 0,
                "labels" => ["Online", "Offline"],
                "series" => [0, 0]
            ];
        }
    }
    public function getActiveTimeSettings(Request $request, $key_id)
    {
        $model =  DeviceActivesettings::where('company_id', $request->company_id)
            ->where('device_id', $key_id)
            // ->where('date_from', $request->date_from)
            // ->where('date_to', $request->date_to)
            ->get();
        $input_time_slots = $request->input_time_slots;

        $open_array = [];
        $date_from = '';
        $date_to = '';

        if (isset($model[0])) {

            $open_json = $model[0]->open_json;
            $open_array = json_decode($open_json, true);

            $date_from = $model[0]->date_from;
            $date_to = $model[0]->date_to;
        }
        $return_araay = [];

        foreach ($open_array as $values) {

            foreach ($values as $key => $val) {

                $return_araay[] = $key . '-' . $key = array_search($val, $input_time_slots);
            }
        }


        return ["data" => $return_araay, "date_from" => $date_from, "date_to" => $date_to];
    }
    public function checkDeviceHealth(Request $request)
    {
        $companyId = (int) $request->company_id;
        if ($companyId <= 0) {
            return response()->json(['message' => 'company_id is required', 'status' => false], 400);
        }
        return $this->checkDevicesHealthCompanyId($companyId);
    }

    public function checkDevicesHealthCompanyId($company_id = 0)
    {

        //log_message("----------------------------------", "check_device_health");
        //log_message("step1-checkDevicesHealthCompanyId_" . $company_id, "check_device_health");

        $total_devices_count = Device::where("device_type", "!=", "Mobile")
            ->when($company_id > 0, fn($q) => $q->where('company_id', $company_id))
            ->where("device_id", "!=", "Manual")
            ->where('device_id', "NOT " . (env('WILD_CARD') ?? 'ILIKE'), '%mobile%')
            ->count();

        $devicesHealth = (new SDKController())->GetAllDevicesHealth();

        $companyDevices = Device::where("device_type", "!=", "Mobile")
            ->when($company_id > 0, fn($q) => $q->where('company_id', $company_id))
            // ->where("device_type", "!=", "Manual")
            ->where("device_id", "!=", "Manual")
            ->where("device_id", "!=", "mobile")
            // ->where('device_id', "NOT " . (env('WILD_CARD') ?? 'ILIKE'), '%mobile%')


            ->Where(function ($q) {
                $q->where('device_category_name', "!=", "CAMERA");
                $q->orWhere('device_category_name', null);
            })
            ->get();
        $total_iterations = count($companyDevices);
        $online_devices_count = 0;
        $offline_devices_count = 0;
        $companiesIds = [];
        foreach ($companyDevices as $key => $Device) {
            $companyDevice_id = $Device["device_id"];
            $companiesIds[] = $Device["company_id"];
            if (isset($devicesHealth["data"])) {
                $SDKDeviceResponce = array_filter($devicesHealth["data"], function ($device) use ($companyDevice_id) {
                    return $companyDevice_id == $device['sn'];
                });

                if (count($SDKDeviceResponce) && current($SDKDeviceResponce)["keepAliveTime"] != '') {
                    $date  = new DateTime(current($SDKDeviceResponce)["keepAliveTime"], new DateTimeZone('Asia/Dubai'));
                    $DeviceDateTime = $date->format('Y-m-d H:i:00');
                    $online_devices_count++;
                    Device::where("device_id", $companyDevice_id)->update(["status_id" => 1, "last_live_datetime" => $DeviceDateTime]);


                    try {
                        if ($company_id == 0) {


                            //update missing logs - By Date - Morning
                            $requestArray = array(
                                'device_id' => $companyDevice_id,
                                'date' => date("Y-m-d"),
                                'source' => "device_healthcheck",

                            );
                            $renderRequest = Request::create('/readMissingRecords', 'get', $requestArray);
                            (new AttendanceLogMissingController())->GetMissingLogs($renderRequest);


                            // // update missing logs - By Recent Serial Number
                            // $requestArray = array(
                            //     'device_id' => $companyDevice_id,
                            //     'date' => date("Y-m-d"),
                            //     'source' => "device_healthcheck_serial_number",


                            // );
                            // $renderRequest = Request::create('/readMissingRecords', 'get', $requestArray);
                            // (new AttendanceLogMissingController())->GetMissingLogs($renderRequest);
                        }
                    } catch (\Exception $e) {


                        // $this->info("Cron:  DeviceController.php  - GetMissingLogs. Error Details: " . $e->getMessage());
                        // Logger::error("Cron:  DeviceController.php  - GetMissingLogs. Error Details: " . $e->getMessage());

                        //log_message("step3-exception_read_missing_logs_" . $company_id . "_device_" . $companyDevice_id . $e->getMessage(), "check_device_health");
                    }
                    // (new ThemeController)->whatsappTodayStats($renderRequest);
                } else {
                    // $offline_devices_count++;
                    Device::where("device_id", $companyDevice_id)->update(["status_id" => 2,]);

                    // info($count . "companies has been updated");
                }
            }
            ////$company_id = $Device["company_id"];
        } //for

        $array_unique = array_unique($companiesIds);
        // Re-indexing the array to maintain a clean index sequence
        $companiesIds = array_values($array_unique);
        foreach ($companiesIds as $key => $company_id) {
            # code...

            try {

                $count = (new DeviceCameraController(''))->updateCameraDeviceLiveStatus($company_id);


                if ($count)
                    $online_devices_count = $online_devices_count +  $count;
            } catch (\Exception $e) {
            }
            try {
                //139.59.69.241:8888 //OX-900


                $count = (new DeviceCameraModel2Controller(''))->getCameraDeviceLiveStatus($company_id);
                if ($count)
                    $online_devices_count = $online_devices_count +  $count;
            } catch (\Exception $e) {
            }


            try {
                //MYTIME1-MQTT




                //139.59.69.241:8888
                $online_devices_count_mytime = 0;
                $devices = Device::where('company_id', $company_id)->where('model_number', "MYTIME1");

                $devices->clone()->update(["status_id" => 2]);



                foreach ($devices->get() as $device) {



                    $responseSDK = (new FaceDeviceController())
                        ->gatewayRequest('GET', "api/device/{$device->device_id}/status");

                    $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                        ? $responseSDK->getData(true)
                        : $responseSDK;

                    if (isset($responseSDK['online']) && $responseSDK['online'] == true) {

                        Device::where("device_id", $device->device_id)->update(["status_id" => 1, "last_live_datetime" => date("Y-m-d H:i:s")]);
                        $online_devices_count_mytime++;
                    }
                }















                if ($online_devices_count_mytime)
                    $online_devices_count = $online_devices_count +  $online_devices_count_mytime;
            } catch (\Exception $e) {
            }
        }

        //get offline devices list
        $offlineDevices = Device::with(["company"])->where("device_type", "!=", "Mobile")
            ->when($company_id > 0, fn($q) => $q->where('company_id', $company_id))
            ->where("device_id", "!=", "Manual")
            ->where('device_id', "NOT " . (env('WILD_CARD') ?? 'ILIKE'), '%mobile%')
            ->where("status_id", 2)->get();

        $test = [];
        foreach ($offlineDevices as $key => $device) {
            try {
                $test[] = $message = "Company:" . $device->company->name . "\nDevice " . $device->name . " OFFLINE detected at  " . date("H:i:s d-m-Y ");
                //(new WhatsappNotificationsLogController())->addMessage($device->company_id, "", $message);
            } catch (\Throwable $e) {
                $test[] = $e;
            }
        }


        $offline_devices_count = $total_devices_count - $online_devices_count;

        Company::whereIn("id", array_values($companiesIds))->update(["is_offline_device_notificaiton_sent" => false]);
        return   " $online_devices_count Devices online. $offline_devices_count Devices offline. $total_devices_count records found.";
    }
    // public function checkDeviceHealth_old(Request $request)
    // {
    //     $devices = Device::where("company_id", $request->company_id ?? 0)->where("device_type", "!=", "Mobile")
    //         ->where("device_type", "!=", "Manual")
    //         ->pluck("device_id");

    //     $total_iterations = 0;
    //     $online_devices_count = 0;
    //     $offline_devices_count = 0;

    //     $sdk_url = env("SDK_URL");

    //     if (checkSDKServerStatus($sdk_url) === 0) {
    //         return "Failed to connect to the SDK Server: $sdk_url";
    //     }
    //     $return_araay = [];
    //     foreach ($devices as $device_id) {
    //         $curl = curl_init();

    //         if (!$sdk_url) {
    //             return "sdk url not defined.";
    //         }

    //         curl_setopt_array($curl, array(

    //             // CURLOPT_URL => "https://sdk.ideahrms.com/CheckDeviceHealth/$device_id",
    //             // CURLOPT_URL => "http://139.59.69.241:5000/CheckDeviceHealth/$device_id",
    //             CURLOPT_URL => "$sdk_url/CheckDeviceHealth/$device_id",
    //             CURLOPT_RETURNTRANSFER => true,
    //             CURLOPT_ENCODING => '',
    //             CURLOPT_MAXREDIRS => 10,
    //             CURLOPT_TIMEOUT => 0,
    //             CURLOPT_FOLLOWLOCATION => true,
    //             CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    //             CURLOPT_CUSTOMREQUEST => 'POST',
    //         ));

    //         $response = curl_exec($curl);



    //         curl_close($curl);

    //         $status = json_decode($response);

    //         if ($status && $status->status == 200) {
    //             $online_devices_count++;
    //         } else {
    //             $offline_devices_count++;
    //         }

    //         Device::where("device_id", $device_id)->update(["status_id" => $status->status == 200 ? 1 : 2]);

    //         $total_iterations++;
    //     }

    //     return   "$offline_devices_count Devices offline. $online_devices_count Devices online. $total_iterations records found.";
    // }

    public function callCURL($url)
    {
        $curl = curl_init();
        //$device_id = $request->device_id;
        //$url = env('SDK_URL') . "$device_id/CloseDoor";
        curl_setopt_array($curl, array(
            CURLOPT_URL => $url,
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
        //echo $response;
        return  $response = json_decode($response, true);
    }
    public function updateActiveTimeSettings(Request $request, $device_id)
    {




        $input_days = $request->input_days;
        $input_time_slots = $request->input_time_slots;
        $span_time_minutes = $request->span_time_minutes;

        $selected_matrix = json_decode($request->selected_matrix);


        $days_array = [];
        $open_time_array = [];
        $closing_time_array = [];

        $input_strings = $selected_matrix; //["0-0", "1-1", "2-2", "3-3", "4-4", "5-5", "6-6", "0-2", "1-3", "2-4", "3-5", "4-6", "5-7", "6-8"];

        $open_time_array = [];
        $closing_time_array = [];

        foreach ($input_strings as $string) {
            list($key, $value) = explode('-', $string);
            if (isset($input_time_slots[$value])) {
                $newtimestamp = strtotime(date('Y-m-d ' . $input_time_slots[$value] . ':00 ') . '+ ' . $span_time_minutes . ' minute');
                $close_time = date('H:i', $newtimestamp);

                $open_time_array[] = ['' .  $key . '' => $input_time_slots[$value]]; //$key . '-' . $input_time_slots[$value];
                $closing_time_array[] = ['' .  $key . '' => $close_time]; //$key . '-' . $input_time_slots[$value];

            }
        }

        $device_settings_id = '';

        $devices_active_settings_array = [
            'device_id' => $device_id,
            'company_id' =>  $request->company_id,
            'date_from' => $request->date_from,
            'date_to' => $request->date_to,
            'open_json' => json_encode($open_time_array),
            'close_json' => json_encode($closing_time_array)
        ];

        $record = DeviceActivesettings::where("device_id", $device_id)->where("company_id", $request->company_id);
        if ($record->count()) {


            $device_settings_id = $record->get()[0]->id;
            $record->update($devices_active_settings_array);
        } else {
            $device_settings_id =  DeviceActivesettings::create($devices_active_settings_array)->id;
        }


        return   [
            'record' => $device_settings_id,
            'message' => 'Successfully Updated.',
            'status' => true
        ];
    }

    public function handleNotification($id)
    {

        $company = Company::where("id", $id)->where("is_offline_device_notificaiton_sent", false)->first();

        if ($company) {
            $notifications = DeviceNotification::with("managers")->where("company_id", $id)
                ->with("managers", function ($query) use ($id) {
                    $query->where("company_id", $id);
                })->get();


            foreach ($notifications as $key => $notification) {



                $company = $company->load(['devices' => function ($q) use ($notification) {
                    $q->where("status_id", self::OFFLINE_STATUS_ID)
                        ->where("branch_id", $notification->branch_id)
                        ->where("name", "!=", "Mobile")
                        ->where("device_type", "!=", "Manual")
                        ->where("device_id", "!=", "Manual")
                        ->where("device_id", "!=", "Manual")
                        ->where("model_number", "!=", "Manual")
                        ->where("model_number",  'not like', "%Mobile%")
                        ->where("name",  'not like', "%Manual%")
                        ->where("name",  'not like', "%manual%");
                }]);

                $counter = 1;
                if ($company) {
                    $offlineDevicesCount = count($company->devices);

                    // if (!$offlineDevicesCount) {
                    //     return $this->getMeta("SendNotificatinForOfflineDevices", "All Devices Online");
                    // }
                    $location_array = array_column($company->devices->toArray(), "location");
                    $devicesLocation = json_encode($location_array);
                    $devicesLocations = '';
                    foreach ($location_array as $key => $location) {
                        $devicesLocations .= ($counter++) . ':' . $location;
                        if ($key < count($location_array) - 1) {
                            $devicesLocations .= ",\n";
                        }
                    }

                    // $this->sendWhatsappNotification($message, '971554501483');
                    // $this->sendWhatsappNotification($message, '971553303991');


                    $this->sendNotification($notification, $company, $offlineDevicesCount, $devicesLocations, "", $company->devices);

                    $company->update(["is_offline_device_notificaiton_sent" => true, "offline_notification_last_sent_at" => date('Y-m-d H:i:s')]);
                }
            }
            return "Notification sent to WhatsApp and email.";
        } else {
            return "Already sent. Waiting for schedule time";
        }
    }

    public function sendNotification($notification, $company, $offlineDevicesCount, $devicesLocations, $message, $devices)
    {

        foreach ($notification->managers as $key => $manager) {

            $message = "🔔 *Notification for offline devices* 🔔\n\n";
            $message .= "*Hello, {$manager->name}*\n\n";
            $message .= "*Company: , {$company->name}*\n\n";
            $message .= "Total *({$offlineDevicesCount})* of your devices are currently offline. Please take a look and address the issue as needed to avoid any errors in report.\n\n";
            $message .= "*Devices location(s):* \n{$devicesLocations}  \n\n";
            $message .= "If you have any questions or need assistance, feel free to reach out.\n\n";
            $message .= "Best regards\n";
            $message .= "*MyTime2Cloud*";



            $data = [
                "company_id" => $company->id,
                "branch_id" => $notification->branch_id,
                "notification_id" => $notification->id,
                "notification_manager_id" => $manager->id,
                "email" => null,
                "whatsapp_number" => null,
                "message" => $message
            ];

            // return  view('emails.TestmailFormat', ["company" => $company, "offlineDevicesCount" => $offlineDevicesCount, "devicesLocations" => $devicesLocations, "manager" => $manager]);
            // return false;
            $branch_name = $notification->branch ?  $notification->branch->branch_name :  '---';
            if (in_array("Email", $notification->mediums)) {
                if ($manager->email != '') {
                    Mail::to($manager->email)->send(new EmailNotificationForOfflineDevices($company, $offlineDevicesCount, $devices, $manager, $branch_name));

                    $data["email"] = $manager->email;
                }
            }
            if (in_array("Whatsapp", $notification->mediums)) {
                if ($manager->whatsapp_number != '' && strlen($manager->whatsapp_number) > 10) {
                    (new WhatsappController)->sendWhatsappNotification($company, $message, $manager->whatsapp_number);
                    $data["whatsapp_number"] = $manager->whatsapp_number;
                }
            }

            DeviceNotificationsLog::create($data);
        }
    }

    public function seedDefaultData($company_id)
    {
        $data = [];

        foreach (range(1, 10) as $i) {
            $data[] = [
                "company_id" => $company_id,
                "branch_id" => 1,
                "status_id" => 1,
                "name" => "demo-" . $i,
                "short_name" => "demo-" . $i,
                "device_id" => "OX-886202011" . $i,
                "location" => "demo-" . $i,
                "ip" => "0.0.0.0",
                "port" => "00000",
                "model_number" => "demo-" . $i,
                "device_type" => "Access Control",
                "synced" => 0,
                "function" => "demo",
                "serial_number" => "demo-" . $i,
                "utc_time_zone" => "demo"
            ];
        }

        Device::insert($data);

        return "Cron DeviceSeeder: " . count($data) . " record has been inserted.";
    }

    public function encrypt()
    {
        return $this->response("Your Key", encrypt(request()->all()), true);
    }


    public function decrypt()
    {
        //Device::truncate();
        try {
            // Insert only new devices (skip duplicates)
            $devices = request()->input('devices');
            if (!empty($devices)) {
                $deviceIds = collect($devices)->pluck('device_id')->all();
                $existingDeviceIds = Device::whereIn('device_id', $deviceIds)->pluck('device_id')->toArray();

                $newDevices = collect($devices)->filter(function ($device) use ($existingDeviceIds) {
                    return !in_array($device['device_id'], $existingDeviceIds);
                })->values()->all();

                if (!empty($newDevices)) {
                    Device::insert($newDevices);
                }
            }

            // Update company_id for specified devices
            $deviceIdsToUpdate = request()->input('device_ids');
            $companyId = request()->input('company_id');
            if (!empty($deviceIdsToUpdate) && !empty($companyId)) {
                Device::whereIn('device_id', $deviceIdsToUpdate)->update(['company_id' => $companyId]);
            }

            return $this->response('Devices have been inserted and updated.', request()->all(), true);
        } catch (\Exception $e) {
            return $this->response($e->getMessage(), null, false);
        }
    }


    public function modes()
    {
        return [
            "Face",
            "RFID",
            "Finger Print",
            "Password"
        ];
    }
}
