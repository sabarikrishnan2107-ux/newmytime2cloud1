<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Mqtt\FaceDeviceController;
use App\Jobs\AddPerson;
use App\Jobs\TimezonePhotoUploadJob;
use App\Models\Device;
use App\Models\Timezone;
use App\Models\TimezoneDefaultJson;
use Exception;
use Illuminate\Support\Facades\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;

class SDKController extends Controller
{


    protected $SDKResponseArray, $storagePath, $expirationTime;

    public function __construct()
    {
        $this->SDKResponseArray = [];
        $this->SDKResponseArray['设备未连接到服务器或者未注册'] = 'The device is not connected to the server or not registered';
        $this->SDKResponseArray['查询成功"翻译成英语是'] = 'Query successful';
        $this->SDKResponseArray['没有找到编号为'] = 'The device is not connected to the server or visitor id not registered';
        $this->SDKResponseArray['设备未连接到服务器或者未注册'] = 'The personnel information with ID number  is was not found';

        $this->SDKResponseArray['100'] = 'Timeout or The device is not connected to the server. Try again';
        $this->SDKResponseArray['102'] = 'offline or not connected to this server';
        $this->SDKResponseArray['200'] = 'Successful';
        $this->storagePath = storage_path('app/oxsaicamera_log_session_values.json');


        $this->expirationTime =  60 * 4; //5 minutes
    }
    public function WriteResetDefaultTimeGroup(Request $request, $id)
    {



        //return false;
        (new TimezoneController)->storeTimezoneDefaultJson();
        $TimezoneDefaultJson = TimezoneDefaultJson::query();
        $data = $TimezoneDefaultJson->get(["index", "dayTimeList"])->toArray();
        asort($data);


        $url = env('SDK_URL') . "/" . "{$id}/WriteTimeGroup";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/$id/WriteTimeGroup";
        }

        $sdkResponse = $this->processSDKRequestBulk($url, $data);

        return $sdkResponse;
    }
    public function processTimeGroup(Request $request, $id)
    {




        (new TimezoneController)->storeTimezoneDefaultJson();


        $timezones = Timezone::where('company_id', $request->company_id)->where('timezone_id', "!=", 1)
            ->select('timezone_id', 'json')

            ->get();





        $timezoneIDArray = $timezones->pluck('timezone_id')->toArray();;

        //delete timezone 1 - defailt 1 is for 24 access
        $key = array_search(1,  $timezoneIDArray); // Search for the value 1
        if ($key !== false) {
            unset($timezoneIDArray[$key]); // Remove the value
        }


        $jsonArray = $timezones->pluck('json')->toArray();

        $defaultArray = TimezoneDefaultJson::whereNotIn("index", $timezoneIDArray)
            ->get(["index", "dayTimeList"])->toArray();

        $data = array_merge($defaultArray, $jsonArray);
        ksort($data);


        asort($data);


        $url = env('SDK_URL') . "/" . "{$id}/WriteTimeGroup";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/$id/WriteTimeGroup";
        }

        $sdkResponse = $this->processSDKRequestBulk($url, $data);



        return $sdkResponse;
    }

    // Push timezone *definitions* (the weekly grids) to every access device in one call.
    // Returns a per-device {device_id, ok} summary so the UI can report offline devices.
    public function syncTimeGroupAllDevices(Request $request)
    {
        $devices = Device::where('company_id', $request->company_id)
            ->excludeMobile()
            ->get(['device_id']);

        $results = [];
        foreach ($devices as $device) {
            $req = new Request(['company_id' => $request->company_id]);
            try {
                $this->processTimeGroup($req, $device->device_id);
                $results[] = ['device_id' => $device->device_id, 'ok' => true];
            } catch (\Throwable $e) {
                $results[] = ['device_id' => $device->device_id, 'ok' => false, 'error' => $e->getMessage()];
            }
        }

        return $this->response('Timezone definitions synced', $results, true);
    }

    public function renderEmptyTimeFrame()
    {
        $arr = [];

        for ($i = 0; $i <= 6; $i++) {
            $arr[] = [
                "dayWeek" => $i,
                "timeSegmentList" => [
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                    [
                        "begin" => "00:00",
                        "end" => "23:59",
                    ],
                ],
            ];
        }
        return $arr;
    }
    public function PersonAddRangePhotos(Request $request)
    {
        $url = env('SDK_URL') . "/Person/AddRange";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/Person/AddRange";
        }
        $cameraResponse1 = [];
        $cameraResponse2 = [];
        try {
            $cameraResponse1 = $this->filterCameraModel1Devices($request);
            $cameraResponse2 = $this->filterCameraModel2Devices($request);
            if ($cameraResponse2 == "")
                $cameraResponse2 = [];

            $deviceResponse = $cameraResponse2;
        } catch (\Exception $e) {
        }
        $deviceResponse = $this->processSDKRequestJob($url, $request->all());

        Log::channel("camerasdk")->error(json_encode(["cameraResponse2" => $cameraResponse2, "cameraResponse1" => $cameraResponse1, "deviceResponse" => $deviceResponse]));

        return ["cameraResponse" => $cameraResponse1, "cameraResponse2" => $cameraResponse2, "deviceResponse" => $deviceResponse];
    }
    public function deviceRequestLogs(Request $request): JsonResponse
    {
        $date = $request->query('date', now()->format('Y-m-d'));

        // company_id can come from query or from logged-in user
        $companyId = $request->query('company_id');

        if (!$companyId && auth()->check()) {
            $companyId = auth()->user()->company_id;
        }

        $path = storage_path("logs/device-employee-upload-{$date}.log");

        if (!file_exists($path)) {
            return response()->json([
                'message' => "Log file not found for {$date}",
                'lines'   => [],
            ], 404);
        }

        // Read all lines (oldest → newest), then reverse (newest first)
        $allLines = array_reverse(
            file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)
        );

        $filteredLines = [];

        foreach ($allLines as $line) {
            if (!trim($line)) {
                continue;
            }

            // Find start of JSON: after the log prefix
            $pos = strpos($line, '{');
            if ($pos === false) {
                // line has no JSON (maybe plain warning) → skip
                continue;
            }

            $jsonStr = substr($line, $pos);

            $data = json_decode($jsonStr, true);
            if (!is_array($data)) {
                // bad JSON → skip
                continue;
            }

            // If we have a companyId filter, apply it
            if ($companyId !== null) {
                if (!isset($data['company_id'])) {
                    continue;
                }

                if ((string) $data['company_id'] !== (string) $companyId) {
                    continue;
                }
            }

            // if passed all checks, keep the original line
            $filteredLines[] = $line;
        }

        return response()->json([
            'date'       => $date,
            'company_id' => $companyId,
            'lines'      => $filteredLines,
        ]);
    }

    public function AddPerson(Request $request)
    {


        $cameraResponse1 = "";
        $cameraResponse2 = "";
        $mqtt_mytime_devices_response = "";

        $deviceResponse = [];
        try {
            $cameraResponse1 = $this->filterCameraModel1Devices($request);
            $cameraResponse2 = $this->filterCameraModel2Devices($request);
            if ($cameraResponse2 == "")
                $cameraResponse2 = [];
            $deviceResponse = $cameraResponse2;
        } catch (\Exception $e) {
        }
        try {
            $mqtt_mytime_devices_response = $this->filterMQTTMytimeModelDevices($request);






            $deviceResponse = array_merge($deviceResponse, $mqtt_mytime_devices_response);
        } catch (\Exception $e) {
            $deviceResponse[] = [
                "error" => "Error in MQTT Mytime Device Processing: "
            ];
        }


        $payload = $request->all();
        $personList = $payload['personList'];
        $snList = $payload['snList'];

        $Devices = Device::whereIn('device_id',  $snList)
            ->where("model_number", "!=", "MYTIME1")
            ->where("model_number", "!=", "CAMERA1")
            ->where("model_number", "!=", "OX-900")

            ->pluck("device_id");

        foreach ($Devices as $device_id) {
            $url = env('SDK_URL') . "/$device_id/AddPerson";
            if (env('APP_ENV') == 'desktop') {
                $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/$device_id/AddPerson";
            }

            // $url = "https://sdk.mytime2cloud.com/OX-9662210080054/AddPerson";

            foreach ($personList as $person) {
                $deviceResponse[] = $this->processUploadPersons($url, $device_id, $person);
            }
        }

        //logging

        $devicesList = Device::where('company_id', $request->company_id)
            ->whereIn('device_id', $snList)
            ->get()
            ->keyBy('device_id');   // device_id → Device model

        foreach ($deviceResponse as $value) {
            $deviceId = $value['device_id'] ?? null;

            $persons = [
                'name'     => $value['name'] ?? null,
                'userCode' => $value['userCode'] ?? null,
            ];

            $gatewayResponse = [
                'status'       => $value['status'] ?? null,
                'sdk_response' => $value['sdk_response'] ?? null,
            ];

            $deviceResponseSDK = [
                'status'       => is_array($value['sdk_response'] ?? null)
                    ? ($value['sdk_response']['status'] ?? null)
                    : null,
                'sdk_response' => $value['sdk_response'] ?? null,
            ];

            // Get device model for this device_id (if exists)
            $device = $deviceId && isset($devicesList[$deviceId])
                ? $devicesList[$deviceId]
                : null;

            $logRow = [
                'company_id'  => $request->company_id ?? null,

                'name'        => $persons['name'] ?? null,
                'userCode'    => $persons['userCode'] ?? null,
                'device_id'   => $deviceId,

                'action'      => 'upload',

                // prefer device_name; fallback to name; if none, null
                'device_name' => $device
                    ? ($device->device_name ?? $device->name ?? null)
                    : null,

                // gateway / SDK side
                'gateway_status'  => $gatewayResponse['status'] ?? null,
                'gateway_success' => ($gatewayResponse['status'] ?? null) == 200 ? 1 : 0,

                'gateway_raw'     => is_array($gatewayResponse['sdk_response'] ?? null)
                    ? json_encode($gatewayResponse['sdk_response'])
                    : ($gatewayResponse['sdk_response'] ?? null),

                // device side (detailed sdk_response)
                'device_status'   => is_array($deviceResponseSDK['sdk_response'] ?? null)
                    ? ($deviceResponseSDK['sdk_response']['status'] ?? null)
                    : null,

                'device_message'  => is_array($deviceResponseSDK['sdk_response'] ?? null)
                    ? ($deviceResponseSDK['sdk_response']['message'] ?? null)
                    : null,
            ];

            // This will produce:
            // [time] local.INFO: DEVICE_EMPLOYEE_UPLOAD {"name":"..","userCode":..,"device_id":"..", ...}
            Log::channel('device_employee_upload')->info('DEVICE_EMPLOYEE_UPLOAD', $logRow);
        }


        return ["cameraResponse" => $cameraResponse1, "cameraResponse2" => $cameraResponse2, "deviceResponse" => $deviceResponse];

        // return ["cameraResponse" => $cameraResponse1, "cameraResponse2" => $cameraResponse2, "deviceResponse" => $deviceResponse];
    }

    public function processUploadPersons($url, $device_id, $person)
    {
        // Refuse to push a face-less person. An empty faceImage does not enrol a
        // usable face on OX face devices and, on re-upload, collapses the device's
        // working set to a single blank record — which customers experience as
        // "uploading the 2nd employee deleted the 1st". Surface it as an error
        // instead of silently corrupting the enrolment.
        $faceImage = $this->resolveFaceImageBase64($person);
        if ($faceImage === null) {
            return $this->noPhotoResult($person, $device_id);
        }

        $person["faceImage"] = $faceImage;

        try {
            // Send HTTP POST request
            $response = Http::timeout(30)
                ->withoutVerifying()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post($url, $person);

            return [
                "name" => $person["name"] ?? null,
                "userCode" => $person["userCode"] ?? null,
                "device_id" => $device_id,
                'status' => $response->status(),
                'sdk_response' => $response->json(),
            ];
        } catch (\Exception $e) {
            return [
                "name" => $person["name"] ?? null,
                "userCode" => $person["userCode"] ?? null,
                "device_id" => $device_id,
                'status' => 500,
                'sdk_response' => $e->getMessage(),
            ];
        }
    }

    /**
     * Structured "photo unavailable, did not push" result, shared by every
     * device-upload path. Logs the skip so a missing photo is visible in the
     * device_employee_upload channel instead of failing silently.
     */
    protected function noPhotoResult($person, $deviceId): array
    {
        Log::channel('device_employee_upload')->warning('DEVICE_EMPLOYEE_UPLOAD_NO_PHOTO', [
            'name'                => $person['name'] ?? null,
            'userCode'            => $person['userCode'] ?? null,
            'device_id'           => $deviceId,
            'profile_picture_raw' => $person['profile_picture_raw'] ?? null,
        ]);

        return [
            "name"         => $person["name"] ?? null,
            "userCode"     => $person["userCode"] ?? null,
            "device_id"    => $deviceId,
            'status'       => 422,
            'sdk_response' => [
                'status'  => 422,
                'message' => 'Employee photo not found or not a supported image format on the device server — not pushed (would have sent an empty face).',
            ],
        ];
    }

    /**
     * Resolve an employee's face photo to raw base64 (no `data:` prefix) from the
     * local media folder (public/media/employee/profile_picture/<filename>).
     *
     * Security notes:
     *  - `profile_picture_raw` is request-supplied, so we basename() it and verify
     *    the resolved path stays inside the profile-picture directory — no path
     *    traversal (e.g. "../../etc/passwd").
     *  - We deliberately DO NOT fetch a caller-supplied URL here. Doing so would be
     *    an SSRF vector (the request body could point at internal hosts / cloud
     *    metadata). The photo must exist on the server that runs the push; if it
     *    doesn't, callers get null and refuse to push (see noPhotoResult).
     *
     * Returns null when no real image bytes can be obtained, so callers can refuse
     * to push an empty face instead of silently blanking the device enrolment.
     */
    protected function resolveFaceImageBase64(array $person): ?string
    {
        $raw = basename(trim((string) ($person['profile_picture_raw'] ?? '')));
        if ($raw === '' || $raw === '.' || $raw === '..') {
            return null;
        }

        $dir  = public_path('media/employee/profile_picture');
        $path = $dir . DIRECTORY_SEPARATOR . $raw;

        // Defence in depth on top of basename(): confirm the real path is contained.
        $real    = realpath($path);
        $realDir = realpath($dir);
        if ($real === false || $realDir === false
            || !str_starts_with($real, rtrim($realDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR)) {
            return null;
        }

        $bytes = @file_get_contents($real);
        if (!$this->isImageData($bytes)) {
            return null;
        }

        return base64_encode($bytes);
    }

    /**
     * Best-effort check that a byte string is a real image (JPEG/PNG/GIF/BMP/WebP)
     * rather than an HTML error page returned with a 200.
     */
    protected function isImageData($bytes): bool
    {
        if (!is_string($bytes) || strlen($bytes) < 12) {
            return false;
        }
        $sig = substr($bytes, 0, 12);
        return str_starts_with($sig, "\xFF\xD8\xFF")                       // JPEG
            || str_starts_with($sig, "\x89PNG\x0D\x0A\x1A\x0A")            // PNG
            || str_starts_with($sig, "GIF87a") || str_starts_with($sig, "GIF89a") // GIF
            || str_starts_with($sig, "BM")                                 // BMP
            || (str_starts_with($sig, "RIFF") && substr($bytes, 8, 4) === 'WEBP'); // WebP
    }
    // public function PersonAddRange(Request $request)
    // {
    //     $url = env('SDK_URL') . "/Person/AddRange";

    //     return $this->processSDKRequestBulk($url, $request->all());
    // }
    public function filterMQTTMytimeModelDevices($request)
    {
        $snList = $request->snList;
        //$Devices = Device::where('device_category_name', "CAMERA")->get()->all();
        $Devices = Device::where('company_id', $request->company_id)->where('model_number', "MYTIME1")
            ->whereIn('serial_number',  $request['snList'])->get()->all();



        $filteredCameraArray = array_filter($Devices, function ($item) use ($snList) {
            return in_array($item['device_id'], $snList);
        });
        $message = [];
        foreach ($filteredCameraArray as  $value) {

            foreach ($request->personList as  $persons) {
                if (isset($persons['faceImage'])) {

                    $personProfilePic = $persons['faceImage'];
                    if ($personProfilePic != '') {


                        //$path = public_path('media/employee/profile_picture/' . $persons['userCode'] . '.jpg');

                        $path = public_path('media/employee/profile_picture/' . $persons['profile_picture_raw']);


                        if (file_exists($path)) {
                            $imageData = file_get_contents($path);
                            $md5string = base64_encode($imageData);



                            $responseSDK = (new FaceDeviceController())
                                ->gatewayRequest('POST', "api/device/{$value['device_id']}/person", [

                                    "customId" => $persons['userCode'],
                                    "RFIDCard" => $persons['userCode'],
                                    "name" => $persons['name'],
                                    "personType" => 0,
                                    "RFCardMode" => 0,
                                    "tempCardType" => 0,

                                    "pic" => $md5string
                                ]);
                            $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                                ? $responseSDK->getData(true)
                                : $responseSDK;
                            if (isset($responseSDK['code']) && $responseSDK['code'] == 200)
                                $message[] = [
                                    "name" => $persons['name'],
                                    "userCode" => $persons['userCode'],
                                    "device_id" => $value['device_id'],
                                    "sdk" => "mqtt_mytime",
                                    'status' => 200,
                                    'sdk_response' => 200,
                                ];
                            else {
                                $message[] = [
                                    "name" => $persons['name'],
                                    "userCode" => $persons['userCode'],
                                    "device_id" => $value['device_id'],
                                    "sdk" => "mqtt_mytime",
                                    'status' => 500,
                                    'sdk_response' => "Error: " . ($responseSDK['error'] ?? 'Unknown Error'),
                                ];
                            }
                        } else
                            $message[] = [
                                "name" => $persons['name'],
                                "userCode" => $persons['userCode'],
                                "device_id" => $value['device_id'],
                                "sdk" => "mqtt_mytime",
                                'status' => 500,
                                'sdk_response' => "Image not found in path: " . $path,
                            ];
                    }
                }
            }
        }

        return  $message;
    }
    public function filterCameraModel1Devices($request)
    {

        $snList = $request->snList;
        //$Devices = Device::where('device_category_name', "CAMERA")->get()->all();
        $Devices = Device::where('company_id', $request->company_id)->where('model_number', "CAMERA1")
            ->whereIn('serial_number',  $request['snList'])->get()->all();



        $filteredCameraArray = array_filter($Devices, function ($item) use ($snList) {
            return in_array($item['device_id'], $snList);
        });
        $message = [];
        foreach ($filteredCameraArray as  $value) {

            foreach ($request->personList as  $persons) {
                // Read the photo from the local media folder (traversal-safe) and skip
                // the push when it is missing/invalid — never send an empty face.
                $md5string = $this->resolveFaceImageBase64($persons);
                if ($md5string === null) {
                    $message[] = $this->noPhotoResult($persons, $value['device_id']);
                    continue;
                }
                $message[] = (new DeviceCameraController($value['camera_sdk_url']))->pushUserToCameraDevice($persons['name'],  $persons['userCode'], $md5string);
            }
        }

        return  $message;
    }
    protected function getAllData()
    {
        if (!File::exists($this->storagePath)) {
            // Return an empty array if the file doesn't exist
            return [];
        }

        try {
            $json = File::get($this->storagePath);
            return json_decode($json, true);
        } catch (Exception $e) {
            // Handle error (e.g., log it)
            return [];
        }
    }

    public function storeSessionid($id, $value)
    {
        $data = $this->getAllData();
        $data[$id] = [
            'value' => $value,
            'timestamp' => time()
        ];

        try {
            File::put($this->storagePath, json_encode($data));
        } catch (Exception $e) {
            // Handle error (e.g., log it)
        }
    }

    public function getSessionid($id)
    {
        return $this->getSessionData($id);
    }
    protected function clearSessionData($id)
    {
        $data = $this->getAllData();

        if (!isset($data[$id])) {
            return null;
        }

        $session = $data[$id];

        // Session has expired
        unset($data[$id]);
        File::put($this->storagePath, json_encode($data)); // Update the file without the expired




    }
    protected function getSessionData($id)
    {
        $data = $this->getAllData();

        if (!isset($data[$id])) {
            return null;
        }

        $session = $data[$id];
        if (isset($session['timestamp'])) {
            if ((time() - $session['timestamp']) > $this->expirationTime) {
                // Session has expired
                unset($data[$id]);
                File::put($this->storagePath, json_encode($data)); // Update the file without the expired session
                return null;
            }
        } else {
            return null;
        }



        return $session['value'];
    }

    public function getSessionusingDeviceIdData($id)
    {
        return $this->getSessionData($id);
    }
    public function filterCameraModel2Devices($request)
    {



        $snList = $request->snList;
        //$Devices = Device::where('device_category_name', "CAMERA")->get()->all();
        $Devices = Device::where('company_id', $request->company_id)
            ->where('model_number', "OX-900")
            ->whereIn('serial_number',  $request['snList'])



            ->get()->all();



        $filteredCameraArray = array_filter($Devices, function ($item) use ($snList) {
            return in_array($item['device_id'], $snList);
        });
        $message = [];




        foreach ($filteredCameraArray as  $value) {


            $camera2Object = new DeviceCameraModel2Controller($value['camera_sdk_url']);

            if ($camera2Object->sxdmSn == '')
                $camera2Object->sxdmSn = $value['device_id'];


            $sessionId = $this->getSessionusingDeviceIdData($value['device_id']);
            if ($sessionId == '' || $sessionId == null) {
                $sessionId = $camera2Object->getActiveSessionId();
                //$_SESSION[$value['device_id']] = $sessionId;

                $this->storeSessionid($value['device_id'], $sessionId);
            }




            foreach ($request->personList as  $persons) {
                // Read the photo from the local media folder (traversal-safe) and skip
                // the push when it is missing/invalid — never send an empty face (the
                // old `else` branch pushed "" here, which blanked the enrolment).
                $md5string = $this->resolveFaceImageBase64($persons);
                if ($md5string === null) {
                    $message[] = $this->noPhotoResult($persons, $value['device_id']);
                    continue;
                }

                $response = (new DeviceCameraModel2Controller($value['camera_sdk_url']))->pushUserToCameraDevice($persons['name'],  $persons['userCode'], $md5string, $value['device_id'], $persons, $sessionId);

                if ($response != '') {
                    $decoded = json_decode($response);
                    if (isset($decoded->errors) && !empty($decoded->errors)) {
                        $response = $decoded->errors[0]->detail ?? 'Error';
                    } else {
                        $response = 200;
                    }
                } else {
                    $response = 200;
                }

                $message[] =  [
                    "name" => $persons['name'],
                    "userCode" => $persons['userCode'],
                    "device_id" => $value['device_id'],
                    'status' => ($response === '' || $response === null) ? 200 : $response,
                    'sdk_response' => ["message" => ($response === '' || $response === null) ? 200 : $response],
                ];
            }
        } //

        return  $message;
    }



    public function GetAllDevicesHealth()
    {
        $url = env('SDK_URL') . "/getDevices";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/getDevices";
        }


        return $this->processSDKRequestBulk($url, null);
    }

    public function processSDKTimeZoneONEJSONData($url, $json)
    {
        $url = env('SDK_URL') . "/Person/AddRange";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/Person/AddRange";
        }

        $return = TimezonePhotoUploadJob::dispatch($json, $url);
    }
    public function PersonAddRangeWithData($data)
    {
        $url = env('SDK_URL') . "/Person/AddRange";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/Person/AddRange";
        }

        return $this->processSDKRequestBulk($url, $data);
    }
    public function processSDKRequestPersonAddJobJson($url, $json)
    {
        $url = env('SDK_URL') . "/Person/AddRange";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/Person/AddRange";
        }

        info("Visitor Upload:", [$json, $url]);

        $return = TimezonePhotoUploadJob::dispatch($json, $url);
    }
    public function processSDKRequestJobDeletePersonJson($device_id, $json)
    {
        $url = env('SDK_URL') . "/" . $device_id . "/DeletePerson";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/" . $device_id . "/DeletePerson";
        }

        $return = TimezonePhotoUploadJob::dispatch($json, $url);
    }
    public function processSDKRequestSettingsUpdateTime(string $deviceId, string $time)
    {
        $baseUrl = env('SDK_URL');

        if (env('APP_ENV') === 'desktop') {
            $hostIp = gethostbyname(gethostname());
            $baseUrl = "http://{$hostIp}:8080";
        }

        $url = rtrim($baseUrl, '/') . "/{$deviceId}/SetWorkParam";

        $payload = [
            'time' => $time,
        ];

        try {
            $response = Http::timeout(30)
                ->withoutVerifying()
                ->post($url, $payload)
                ->json();

            if ($response['status'] !== 200) {
                return "Failed to sync time.";
            }

            return "Time <b>{$time}</b> has been synced to the device.";
        } catch (\Exception $e) {
            return 'Failed to communicate with SDK device.';
        }
    }

    public function processSDKRequestSettingsUpdate($device_id, $data)
    {
        $url = env('SDK_URL') . "/" . $device_id . "/SetWorkParam";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/" . $device_id . "/SetWorkParam";
        }



        $return = TimezonePhotoUploadJob::dispatch($data, $url);
        return $data;
    }
    public function processSDKRequestCloseAlarm($device_id, $data)
    {
        $url = env('SDK_URL') . "/" . $device_id . "/CloseAlarm";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/" . $device_id . "/CloseAlarm";
        }


        $return = TimezonePhotoUploadJob::dispatch($data, $url);
        return $data;
    }

    public function processSDKRequestJobAll($json, $url)
    {
        $return = TimezonePhotoUploadJob::dispatch($json, $url);
    }
    public function processSDKRequestJob($url, $data)
    {

        $personList = $data['personList'];
        $snList = $data['snList'];
        $returnFinalMessage = [];
        $devicePersonsArray = [];

        $sdk_url = env("SDK_URL");
        // if (env("APP_ENV") == "production") {
        //     $sdk_url = env("SDK_PRODUCTION_COMM_URL");
        // } else {
        //     $sdk_url = env("SDK_STAGING_COMM_URL");
        // }

        if ($sdk_url == '') {
            return false;
        }
        $sdk_url = $sdk_url . '/Person/AddRange';
        foreach ($snList as $key => $device) {

            $returnMsg = '';

            foreach ($personList as $keyPerson => $valuePerson) {
                # code...
                $newArray = [
                    "personList" => [$valuePerson],
                    "snList" => [$device],
                ];
                // // $newArray[] = $newArray;
                // $return = TimezonePhotoUploadJob::dispatch($newArray, $sdk_url);

                // $url = env('SDK_URL') . "/Person/AddRange";
                // $return = TimezonePhotoUploadJob::dispatch($json, $url);

                // $returnContent[] = $newArray;
                $return = (new SDKController)->processSDKRequestPersonAddJobJson('', $newArray);
            }
        }
        $returnFinalMessage = $this->mergeDevicePersonslist($returnFinalMessage);
        $returnContent = [
            "data" => $returnFinalMessage,
            "status" => 200,
            "message" => "",
            "transactionType" => 0
        ];
        return $returnContent;
    }
    public function mergeDevicePersonslist($data)
    {
        $mergedData = [];

        foreach ($data as $item) {
            $sn = $item['sn'];
            $userList = $item['userList'];

            if (array_key_exists($sn, $mergedData)) {
                if (!empty($userList)) {
                    $mergedData[$sn] = array_merge($mergedData[$sn], $userList);
                }
            } else {
                $mergedData[$sn] = $item;
            }
        }

        $mergedList = [];

        foreach ($mergedData as $sn => $userList) {
            $mergedList[] = [
                "sn" => $sn,
                "state" => $userList['state'],
                "message" => $userList['message'],
                "userList" => $userList['userList'],
            ];
        }
        return $mergedList;
    }

    public function getDeviseSettingsDetails($device_id)
    {

        if ($device_id != '') {


            $url = env('SDK_URL') . "/" . "{$device_id}/GetWorkParam";

            if (env('APP_ENV') == 'desktop') {
                $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/" . $device_id . "/GetWorkParam";
            }

            $data =   null;


            // return [$url, $data];
            try {
                $return = Http::timeout(60 * 60 * 5)->withoutVerifying()->withHeaders([
                    'Content-Type' => 'application/json',
                ])->post($url, $data);

                $return = json_decode($return, true);
                if (array_key_exists($return['status'], $this->SDKResponseArray)) {
                    $return['message'] =  $this->SDKResponseArray[$return['status']];
                }

                return json_encode($return);
            } catch (\Exception $e) {
                return [
                    "status" => 102,
                    "message" => $e->getMessage(),
                ];
            }
        } else {
            return [
                "status" => 102,
                "message" => "Invalid Details",
            ];
        }
        // You can log the error or perform any other necessary actions here

    }
    public function getPersonDetails($device_id, $user_code)
    {

        $device = Device::where("serial_number", $device_id)->first();
        if ($device && $device->model_number  && $device->model_number == 'OX-900') {
            $response = (new DeviceCameraModel2Controller($device->camera_sdk_url, $device["serial_number"]))->getPersonDetails($user_code);
            if ($response)
                return  ["data" => $response];
            else
                return ["data" => null];
        } else    if ($device && $device->model_number  && $device->model_number == 'MYTIME1') {
            $query = [];

            $query['picture'] = 1;

            $responseSDK =  (new FaceDeviceController())
                ->gatewayRequest('GET', "api/device/{$device["serial_number"]}/person/{$user_code}", [], $query);;



            $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                ? $responseSDK->getData(true)
                : $responseSDK;



            if (($responseSDK["info"]) && $responseSDK["code"] == 200) {




                return  [
                    "data" => [
                        "company_id" => $device["company_id"],
                        "name" => $responseSDK["info"]["name"],
                        "userCode" => $responseSDK["info"]["customId"],
                        "system_user_id" => $responseSDK["info"]["customId"],
                        "faceImage" => null,
                        "cardData" => "",
                        "password" => "",
                        "fp" => null,
                        "palm" => null,
                        "pin" => null,
                        "face" => null,
                        "fpCount" => 0,
                        "face" => $responseSDK["pic"] != ''   ? true : false,


                    ]
                ];
            } else {
                return [
                    "data" => null
                ];
            }
        } else {


            $url = env('SDK_URL') . "/" . "{$device_id}/GetPersonDetail";

            if (env('APP_ENV') == 'desktop') {
                $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/" . "{$device_id}/GetPersonDetail";
            }

            try {
                $response = Http::timeout(3600)->withoutVerifying()->withHeaders([
                    'Content-Type' => 'application/json',
                ])->post($url, ["usercode" => $user_code]);

                $res = $response->json();


                // $base64Image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $res["data"]["faceImage"]));
                // $imageName = time() . ".png";
                // $publicDirectory = public_path("test");
                // if (!file_exists($publicDirectory)) {
                //     mkdir($publicDirectory, 0777, true);
                // }
                // file_put_contents($publicDirectory . '/' . $imageName, $base64Image);

                unset($res["data"]["faceImage"]);

                return $res;
            } catch (\Exception $e) {
                return [
                    "status" => 102,
                    "message" => $e->getMessage(),
                ];
            }
        }
    }

    public function deletePersonDetails($device_id, Request $request)
    {
        try {
            $device = Device::where("serial_number", $device_id)->first();
            if ($device && $device->model_number  && $device->model_number == 'OX-900') {
                $response = (new DeviceCameraModel2Controller($device->camera_sdk_url, $device["serial_number"]))->deletePersonFromDevice($request->userCodeArray[0]);

                return  ["data" => $response];
            } else    if ($device && $device->model_number  && $device->model_number == 'MYTIME1') {


                $user_code = $request->userCodeArray[0];
                $query = [];

                $query['picture'] = 1;

                $responseSDK =  (new FaceDeviceController())
                    ->gatewayRequest('DELETE', "api/device/{$device_id}/person/{$user_code}");;

                $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                    ? $responseSDK->getData(true)
                    : $responseSDK;
                if (($responseSDK["info"]) && $responseSDK["code"] == 200) {

                    return  [
                        "data" => [
                            "Deleted Successfully"
                        ]
                    ];
                } else {
                    return [
                        "data" => "Cannot Delete User"
                    ];
                }
            } else {
                $response = Http::timeout(3600)->withoutVerifying()->withHeaders([
                    'Content-Type' => 'application/json',
                ])->post(env('SDK_URL') . "/" . "{$device_id}/DeletePerson", ["userCodeArray" => $request->userCodeArray]);

                return $response->json();
            }
        } catch (\Exception $e) {
            return [
                "status" => 102,
                "message" => $e->getMessage(),
            ];
        }
    }

    public function processSDKRequestBulk($url, $data)
    {

        // $response = Http::timeout(3600)
        //     ->withoutVerifying()
        //     ->withHeaders([
        //         'Content-Type' => 'application/json',
        //     ])
        //     ->post($url, $data);

        // // Combine the original $data with the response content
        // if ($response->successful()) {
        //     return [
        //         'request_data' => $data, // Include the data you sent
        //         'response_data' => $response->json(), // Include the response content
        //     ];
        // } else {
        //     return [
        //         'request_data' => $data, // Include the data you sent
        //         'status_code' => $response->status(), // HTTP status code
        //         'error_message' => $response->body(), // Response body in case of error
        //     ];
        // }

        try {
            return Http::timeout(3600)->withoutVerifying()->withHeaders([
                'Content-Type' => 'application/json',
            ])->post($url, $data);
        } catch (\Exception $e) {
            return [
                "status" => 102,
                "message" => $e->getMessage(),
                "data" => $data,
            ];
            // You can log the error or perform any other necessary actions here
        }

        // $data = '{
        //     "personList": [
        //       {
        //         "name": "ARAVIN",
        //         "userCode": 1001,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1686213736.jpg"
        //       },
        //       {
        //         "name": "francis",
        //         "userCode": 1006,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1686330253.jpg"
        //       },
        //       {
        //         "name": "kumar",
        //         "userCode": 1005,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1686330320.jpg"
        //       },
        //       {
        //         "name": "NIJAM",
        //         "userCode": 670,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1688228907.jpg"
        //       },
        //       {
        //         "name": "saran",
        //         "userCode": 1002,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1686579375.jpg"
        //       },
        //       {
        //         "name": "sowmi",
        //         "userCode": 1003,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1686330142.jpg"
        //       },
        //       {
        //         "name": "syed",
        //         "userCode": 1004,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1686329973.jpg"
        //       },
        //       {
        //         "name": "venu",
        //         "userCode": 1007,
        //         "faceImage": "https://stagingbackend.ideahrms.com/media/employee/profile_picture/1686578674.jpg"
        //       }
        //     ],
        //     "snList": [
        //       "OX-8862021010076","OX-11111111"
        //     ]
        //   }';
        // $emailJobs = new TimezonePhotoUploadJob();
        // $this->dispatch($emailJobs);

        // $data = json_decode($data, true);
        // $return = TimezonePhotoUploadJob::dispatch($data);
        // // echo exec("php artisan backup:run --only-db");

        // return json_encode($return, true);
    }
    public function getDevicesCountForTimezone(Request $request)
    {
        if ($request->source) //master
        {


            return Device::where("model_number", "!=", "Manual")
                ->where("model_number",  'not like', "%Mobile%")
                ->where("name",  'not like', "%Manual%")
                ->where("name",  'not like', "%manual%")
                ->pluck('device_id');
        }


        return Device::where('company_id', $request->company_id)
            ->where("model_number", "!=", "Manual")
            ->where("model_number",  'not like', "%Mobile%")
            ->where("name",  'not like', "%Manual%")
            ->where("name",  'not like', "%manual%")
            ->where("model_number",   "!=", "OX-900")
            ->get();
    }

    public function handleCommand($id, $command)
    {
        // http://139.59.69.241:5000/CheckDeviceHealth/$device_id"

        $url = env('SDK_URL') . "/$id/$command";

        if (env('APP_ENV') == 'desktop') {
            $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/" . "/$id/$command";
        }

        try {
            return Http::timeout(3600)->withoutVerifying()->withHeaders([
                'Content-Type' => 'application/json',
            ])->post($url);
        } catch (\Exception $e) {
            return [
                "status" => 102,
                "message" => $e->getMessage(),
            ];
        }
    }

    public function setUserExpiry(Request $request, $id)
    {
        // Employee::where([
        //     "company_id" => $id,
        //     "system_user_id" => $request->userCode
        // ])->update(["lockDevice" => $request->lockDevice]);

        $data = [
            'personList' => [
                [
                    'name' => $request->name,
                    'userCode' => $request->userCode,
                    'timeGroup' => 1,
                    'expiry' => $request->lockDevice ? '2023-01-01 00:00:00' : '2089-01-01 00:00:00'
                ]
            ],
            'snList' =>  Device::where('company_id', $id)->pluck('device_id') ?? []
        ];

        try {
            $response = Http::timeout(3600)->withoutVerifying()->withHeaders([
                'Content-Type' => 'application/json',
            ])->post("https://sdk.mytime2cloud.com/Person/AddRange", $data);

            return $response->json();
        } catch (\Exception $e) {
            return [
                "status" => 102,
                "message" => $e->getMessage(),
            ];
        }
    }

    public function getPersonAllV1($device_id)
    {





        $url = $this->buildUrl($device_id, 'GetPersonAll');

        return $this->sendRequest($url);
    }

    public function getPersonDetailsV1($device_id, $user_code)
    {
        $device = Device::where("serial_number", $device_id)->first();
        if ($device && $device->model_number  && $device->model_number == 'MYTIME1') {



            $query = [];

            $query['picture'] = 1;

            $responseSDK =  (new FaceDeviceController())
                ->gatewayRequest('GET', "api/device/{$device["serial_number"]}/person/{$user_code}", [], $query);;



            $responseSDK = $responseSDK instanceof \Illuminate\Http\JsonResponse
                ? $responseSDK->getData(true)
                : $responseSDK;



            if (($responseSDK["info"]) && $responseSDK["code"] == 200) {




                return  [
                    "data" => [
                        "company_id" => $device["company_id"],
                        "name" => $responseSDK["info"]["name"],
                        "userCode" => $responseSDK["info"]["customId"],
                        "system_user_id" => $responseSDK["info"]["customId"],
                        "faceImage" => null,
                        "cardData" => "",
                        "password" => "",
                        "fp" => null,
                        "palm" => null,
                        "pin" => null,
                        "face" => null,
                        "fpCount" => 0,
                        "face" => $responseSDK["pic"] != ''   ? true : false,


                    ]
                ];
            } else {
                return [
                    "data" => null
                ];
            }
        } else {
            $url = $this->buildUrl($device_id, 'GetPersonDetail');

            return $this->sendRequest($url, ['usercode' => $user_code]);
        }
    }

    private function buildUrl($device_id, $endpoint)
    {
        $baseUrl = env('SDK_URL') . "/{$device_id}/{$endpoint}";

        if (env('APP_ENV') == 'desktop') {
            $baseUrl = "http://" . gethostbyname(gethostname()) . ":" . env('SDK_PORT') . "/{$device_id}/{$endpoint}";
        }

        return $baseUrl;
    }

    private function sendRequest($url, $data = [])
    {
        try {
            $response = Http::timeout(0)
                ->withoutVerifying()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])->post($url, $data);

            return $response->json();
        } catch (\Exception $e) {
            return [
                "status" => 102,
                "message" => "Error: {$e->getMessage()}",
                "trace" => $e->getTraceAsString(), // Optional: for debugging in development
            ];
        }
    }
}
