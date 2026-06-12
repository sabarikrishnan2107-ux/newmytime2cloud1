<?php

namespace App\Http\Controllers;

use App\Jobs\OxsaiPhotoUpload;
use App\Models\Attendance;
use App\Models\Device;
use App\Models\Employee;
use DateTime;
use DateTimeZone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use SimpleXMLElement;

class DeviceCameraModel2Controller extends Controller
{
    public  $camera_sdk_url = '';
    public  $sxdmToken = '7VOarATI4IfbqFWLF38VdWoAbHUYlpAY';
    public  $sxdmSn = '';
    public  $session_id_local = '';


    public $adminUsername = null;
    public $adminPassword = null;

    public function __construct($camera_sdk_url, $sxdmSn = '', $adminUsername = null, $adminPassword = null)
    {
        $url = $camera_sdk_url ?: (gethostbyname(gethostname()) . ':8888');
        if (!preg_match('#^https?://#', $url)) {
            $url = 'http://' . $url;
        }
        $this->camera_sdk_url = rtrim($url, '/');
        if ($sxdmSn != '')
            $this->sxdmSn = $sxdmSn;
        $this->adminUsername = $adminUsername;
        $this->adminPassword = $adminPassword;
    }

    public function getAllPersons($limit)
    {
        $data = [];
        $json = '{
             
            "limit": ' . $limit . ',
            "offset": 0,
            "sort": "asc",
            "query_string": ""
          }';
        $response = $this->postCURL('/api/persons/query', $json);


        return $response;
    }
    public function deletePersonFromDevice($system_user_id)
    {
        $json = json_encode([
            'cmd'          => 'person_list_query',
            'limit'        => 10,
            'offset'       => 0,
            'sort'         => 'asc',
            'query_string' => (string) $system_user_id,
        ]);
        $response = $this->postCURL('/api/persons/query', $json, $this->sxdmSn);

        if (!isset($response['data']) || !is_array($response['data']) || count($response['data']) === 0) {
            return ['status' => 'not_found'];
        }

        $deleted = [];
        foreach ($response['data'] as $personList) {
            if (!isset($personList['id'])) {
                continue;
            }
            $deleted[] = $this->deleteCURL('/api/persons/item/' . $personList['id']);
        }

        return ['status' => 'ok', 'deleted' => $deleted];
    }

    public function getPersonDetails($system_user_id)
    {

        $data = [];
        $json = '{
            "cmd": "person_list_query",
            
            "limit": 10,
            "offset": 0,
            "sort": "asc",
            "query_string": "' . $system_user_id . '"
          }';
        $response = $this->postCURL('/api/persons/query', $json);
        if (isset($response['data'])) {
            foreach ($response['data'] as $key => $personList) {



                $person = $this->getCURL('/api/persons/item/' . $personList['id']);

                if (isset($person['picture_data'])) {

                    $picture_data = $person['picture_data'];
                    $picture_data = str_replace("data:image/jpg;base64,", "", $picture_data);

                    $data = ["name" => $person["person_name"], "userCode" => $system_user_id, "expiry" => '---',  "faceImage" => $picture_data, "timeGroup" => "0"];
                } else {
                    $data = ["name" => $person["person_name"], "userCode" => $system_user_id, "expiry" => '---',  "faceImage" =>  null, "timeGroup" => "0"];
                }
            }
        } else {
            return $data;
        }
        return $data;
    }



    public function openDoor($device)
    {

        $this->openDoorAlways($device);
        // $this->resetDoorStatus($device);
        // $this->sxdmSn = $device->device_id;
        // $json = '{
        //     "tips": {
        //         "text": "Door Open",
        //         "person_type": "admin-software"
        //     }
        // }';
        // $response = $this->postCURL('/api/devices/io', $json);
    }
    public function closeDoor($device)
    {
        $this->resetDoorStatus($device);
        //reset the always open door settings and then close the door automatically after 1 sec 

        $this->sxdmSn = $device->device_id;
        $json = '{
            "tips": {
                "text": "Door Closed",
                "person_type": "admin-software"
            }
        }';
        $response = $this->postCURL('/api/devices/io', $json);
    }
    public function openDoorAlways($device)
    {
        //$this->resetDoorStatus($device);

        $this->sxdmSn = $device->device_id;
        $json = '{             
                "door_open_stat": "open"                 
            
        }';
        $response = $this->putCURL('/api/devices/door', $json);

        $this->sxdmSn = $device->device_id;
        $json = '{
            "tips": {
                "text": "Door Open",
                "person_type": "admin-software"
            }
        }';
        $response = $this->postCURL('/api/devices/io', $json);
    }
    public function getHistory($deviceId, $json)
    {

        // return    $response = '{
        //     "query_id": "",
        //     "data": [
        //         {
        //             "id_number": "",
        //             "card_number": "",
        //             "liveness": "true",
        //             "person_name": "SATHISH KUMAR.P",
        //             "picture_data": "data:image/jpg;base64, AAA=",
        //             "pass_mode": "face",
        //             "person_code": "3002",
        //             "recognition_type": "staff",
        //             "recognition_score": 70.664115905761719,
        //             "health_code": 0,
        //             "puid": "531987724894585701",
        //             "verification_mode": "face_or_card",
        //             "temperature": 0.0,
        //             "passed": true,
        //             "liveness_score": 99.992279052734375,
        //             "clock_status": "Clock On",
        //             "person_id": "3002",
        //             "timestamp": "2024-11-15T09:31:17+05:30",
        //             "mask": "unknown",
        //             "therm": "unknown"
        //         }
        //     ],
        //     "paging": {
        //         "total": 1,
        //         "offset": 0,
        //         "limit": 1
        //     }
        // }';


        return  $response = $this->postCURL('/api/passes/query', $json, $deviceId);
    }
    public function resetDoorStatus($device)
    {
        $this->sxdmSn = $device->device_id;
        $json = '{             
                "door_open_stat": "none"   


        }';
        //     $json = '{             
        //         "door_open_stat": "close" //it will close permanent   


        // }';
        $response = $this->putCURL('/api/devices/door', $json);
    }
    public function updateSettings($request)
    {
        $this->sxdmSn = $request->deviceSettings['device_id'];
        $json = '{             
                "voice_volume": ' . round($request->deviceSettings['voice_volume']) . '   }';
        $response = $this->putCURL('/api/devices/profile', $json);
        //---------------------------


        $data["verification_mode"] = $request->deviceSettings['verification_mode'];
        $data["open_duration"] = $request->deviceSettings['open_duration']  * 1000;

        $response1  = $this->putCURL('/api/devices/door', json_encode($data));
        //---------------------------
        $json = '{             
            "recognition_mode": "' .  ($request->deviceSettings['recognition_mode']) . '"}';
        $response = $this->putCURL('/api/devices/recognition', $json);

        return $response1;
    }

    public function updateAttendanceSDKData($device_id, $json)
    {
        $this->sxdmSn = $device_id;

        $response = $this->putCURL('/api/custom/attendance', $json);
    }

    public function updateSDKData($device_id, $json)
    {
        $this->sxdmSn = $device_id;

        $response = $this->putCURL('/api/devices/profile', $json);
    }
    public function getSettings($device)
    {
        $row = [];
        try {
            $this->sxdmSn = $device->device_id;
            $status = $this->getCURL('/api/devices/status');
            $profile = $this->getCURL('/api/devices/profile');
            $time = $this->getCURL('/api/devices/time');
            $door = $this->getCURL('/api/devices/door');
            $network = $this->getCURL('/api/devices/network');
            $server = $this->getCURL('/api/devices/server');
            $recognition = $this->getCURL('/api/devices/recognition');

            $json = '{
                "cmd": "person_list_query",
                 
                "limit": 100,
                "offset": 0,
                "sort": "asc",
               
              }';
            $persons = $this->postCURL('/api/groups/query', $json);

            $row['model_spec'] = $status['model_spec'];
            $row['voice_volume'] = $profile['voice_volume'];
            $row['local_time'] = $time['local_time'];
            $row['door_open_stat'] = $door['door_open_stat'];
            $row['wifi_ip'] = $network['wifi']['ip'];
            $row['lan_ip'] = $network['lan']['ip'];
            $row['ipaddr'] = $server['ipaddr'];
            $row['open_duration'] =   $door['open_duration'] / 1000;
            $row['verification_mode'] = $door['verification_mode'];
            $row['recognition_mode'] = $recognition['recognition_mode'];

            $persons_count = 0;
            foreach ($persons['data'] as $key => $value) {
                $persons_count = $persons_count + $value['person_count'];
            }
            $row['persons_count'] =  ($persons_count);


            $inputDateString = $row['local_time'];
            $inputDateTime = new DateTime($inputDateString);
            $row['local_time'] = $inputDateTime->format("Y-m-d H:i P");
        } catch (\Exception $e) {
        }

        return  $row;
    }

    public function pushUserToCameraDevice($name,  $system_user_id, $base65Image, $device_id, $persons = null,  $session_id = '')
    {
        $card_number = "";
        if ($persons) {
            if (isset($persons['cardData']) && $persons['cardData'] != 0) {
                $card_number = $persons['cardData'];
            }
        }
        $password = "";
        if ($persons) {
            if (isset($persons['password'])) {

                $password = $persons['password'];
                if (strlen($password) != 6) {
                    $password = '';
                }
            }
        }

        // Honour the caller's enabled flag when provided; default true so existing
        // photo-uploads switch from the legacy hardcoded `false` to a usable state.
        $enabledFlag = 'true';
        if ($persons && array_key_exists('enabled', $persons)) {
            $enabledFlag = filter_var($persons['enabled'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        }

        try {
            if ($this->sxdmSn == '')
                $this->sxdmSn = $device_id;

            if ($session_id != '') {
                $sessionId = $session_id;
            } else {

                $sessionId = (new SDKController())->getSessionusingDeviceIdData($device_id);
                if ($sessionId == '' || $sessionId == null) {
                    $sessionId = $this->getActiveSessionId();
                    //$_SESSION[$value['device_id']] = $sessionId;
                    if ($sessionId != '') (new SDKController())->storeSessionid($device_id, $sessionId);
                }
            }

            //$sessionId = $session_id;

            // return $session_id;

            // if ($sessionId == '') {
            //     sleep(5);
            //     $sessionId = $this->getActiveSessionId();
            // }


            // if ($this->session_id_local == '') {
            //     $sessionId = $this->getActiveSessionId();
            //     $this->session_id_local = $sessionId;
            // } else {
            //     $sessionId = $this->session_id_local; // = $sessionId;
            // }

            $json = '{
                        "person_code": ' . $system_user_id . ', 
                        "visit_begin_time": "",
                        "visit_end_time": "",
                        "recognition_type": "staff",
                        "person_name":  "' . $name . '",
                        "person_id": "",
                        "id":  ' . $system_user_id . ', 
                        "card_number": "' . $card_number . '",
                        "id_number": "", 
                        "pass": "",
                        "password": "' . $password . '",
                        "phone_num": "",
                        "is_admin": false,
                        "enabled": ' . $enabledFlag . ',
                        "group_list": [
                          "1"
                        ],
                        "face_list": [
                          {
                            "idx": 0,
                            "data":  "' . $base65Image . ' "
                          }
                        ]
                      }';
            $json2_withourimage = '{
                        "person_code": ' . $system_user_id . ', 
                        "visit_begin_time": "",
                        "visit_end_time": "",
                        "recognition_type": "staff",
                        "person_name":  "' . $name . '",
                        "person_id": "",
                        "id":  ' . $system_user_id . ', 
                        "card_number": "' . $card_number . '",
                        "id_number": "", 
                        "pass": "",
                        "password": "' . $password . '",
                        "phone_num": "",
                        "is_admin": false,
                        "enabled": ' . $enabledFlag . ',
                        "group_list": [
                          "1"
                        ],
                         
                      }';
            //$return = OxsaiPhotoUpload::dispatch($sessionId, $this->sxdmToken, $this->sxdmSn,  $json, $json2_withourimage, $this->camera_sdk_url);

            //return;

            if ($sessionId != '') {

                $curl = curl_init();

                curl_setopt_array($curl, array(
                    CURLOPT_URL => $this->camera_sdk_url . '/api/persons/item',
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_ENCODING => '',
                    CURLOPT_MAXREDIRS => 1,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_CONNECTTIMEOUT => 5,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                    CURLOPT_CUSTOMREQUEST => 'POST',
                    CURLOPT_POSTFIELDS => '{
                        "person_code": ' . $system_user_id . ', 
                        "visit_begin_time": "",
                        "visit_end_time": "",
                        "recognition_type": "staff",
                        "person_name":  "' . $name . '",
                        "person_id": "",
                        "id":  ' . $system_user_id . ', 
                        "card_number": "' . $card_number . '",
                        "id_number": "", 
                        "pass": "",
                        "password": "' . $password . '",
                        "phone_num": "",
                        "is_admin": false,
                        "enabled": ' . $enabledFlag . ',
                        "group_list": [
                          "1"
                        ],
                        "face_list": [
                          {
                            "idx": 0,
                            "data":  "' . $base65Image . ' "
                          }
                        ]
                      }',
                    CURLOPT_HTTPHEADER => array(
                        'Content-Type: application/json',
                        'Cookie: sessionID=' . $sessionId,
                        'sxdmToken: ' . $this->sxdmToken, //get from Device manufacturer
                        'sxdmSn:  ' . $this->sxdmSn //get from Device serial number
                    ),
                ));

                // CURLOPT_POSTFIELDS => '{
                //     "recognition_type": "staff",
                //     "is_admin": false,
                //     "person_name": "' . $name . '",
                //     "id": ' . $system_user_id . ',
                //     "password": "123456",
                //     "card_number": ' . $system_user_id . ',
                //     "person_code":' . $system_user_id . ',
                //     "visit_begin_time": "' . date('Y-m-d 00:00:00') . '",
                //     "visit_end_time": "' .  date('Y-m-d 00:00:00', strtotime(date("Y-m-d 23:00:00") . " + 365 day")) . '",
                //     "phone_num":"18686868686",
                //     "group_list": [
                //       1
                //     ],
                //     "feature_version":"8903",
                //     "face_list": [
                //       {
                //         "idx": 3,
                //         "data": "' . $base65Image . '"
                //       }
                //     ]
                //   }',

                $response = curl_exec($curl);

                curl_close($curl);


                $this->devLog("camera-megeye-info", "Successfully Added ID:" . $system_user_id . ", Name :  " . $name);

                return $response;
            } else {



                $this->devLog("camera-megeye-error", "Unable to Conenct Device");

                return "Unable to Conenct Device";
            }
        } catch (\Throwable $th) {
            //throw $th;
            $this->devLog("camera-megeye-error", "Exception - Unable to Conenct Device" . $th);

            return "Expection failed" . $th;
        }
    }

    // Toggle the SDK-side `enabled` flag for an already-enrolled person without
    // re-uploading their face image. Returns ['status' => '...', 'response' => ...]
    // so callers (job, controller) can decide how to log/report each device.
    public function updatePersonEnabledStatus($systemUserId, $enabled)
    {
        if ($this->sxdmSn == '') {
            return ['status' => 'no_serial'];
        }

        $sessionId = (new SDKController())->getSessionusingDeviceIdData($this->sxdmSn);
        if (empty($sessionId)) {
            $sessionId = $this->getActiveSessionId();
            if (!empty($sessionId)) {
                (new SDKController())->storeSessionid($this->sxdmSn, $sessionId);
            }
        }
        if (empty($sessionId)) {
            return ['status' => 'no_session'];
        }

        // Resolve the device-internal person id from system_user_id (we set both
        // `id` and `person_code` to the same value on upload, but the SDK indexes
        // its primary key separately on some firmwares — query is the safe path).
        $queryJson = json_encode([
            'limit'        => 10,
            'offset'       => 0,
            'sort'         => 'asc',
            'query_string' => (string) $systemUserId,
        ]);

        $queryResp = $this->postCURL('/api/persons/query', $queryJson, $this->sxdmSn);
        $personId = $queryResp['data'][0]['id'] ?? null;
        if (!$personId) {
            return ['status' => 'not_found'];
        }

        // Flip recognition_type alongside enabled so the device plays the appropriate
        // customtip (staff greeting vs blacklist denial). Without this the device keeps
        // playing the default staff "Thank you" even when door access is blocked.
        $updateJson = json_encode([
            'enabled'          => (bool) $enabled,
            'recognition_type' => $enabled ? 'staff' : 'blacklist',
        ]);
        $putResp = $this->putCURL('/api/persons/item/' . $personId, $updateJson);

        return ['status' => 'ok', 'response' => $putResp];
    }

    // Idempotent: ensures the device has a usable blacklist customtip so denied
    // recognitions actually announce something instead of staying silent. Only
    // writes when the device has no existing text/audio configured, so we don't
    // overwrite admin customisations.
    public function ensureBlacklistTipConfigured($defaultText = 'Access Denied')
    {
        if ($this->sxdmSn == '') {
            return ['status' => 'no_serial'];
        }

        $current = $this->getCURL('/api/devices/customtips?type=blacklist');

        $hasContent = false;
        if (isset($current['schedule_list']) && is_array($current['schedule_list'])) {
            foreach ($current['schedule_list'] as $entry) {
                if (!empty($entry['text']) || !empty($entry['audio_data'])) {
                    $hasContent = true;
                    break;
                }
            }
        }

        if ($hasContent && !empty($current['enable'])) {
            return ['status' => 'already_configured'];
        }

        $payload = json_encode([
            'enable'        => true,
            'person_type'   => 'blacklist',
            'schedule_list' => [[
                'start_time' => '00:00',
                'end_time'   => '00:00',
                'text'       => $defaultText,
                'audio_data' => '',
            ]],
        ]);

        $resp = $this->putCURL('/api/devices/customtips?type=blacklist', $payload);
        return ['status' => 'configured', 'response' => $resp];
    }

    public function updateTimeZone($device)

    {
        $this->sxdmSn = $device->device_id;

        $utc_time_zone  = $device->utc_time_zone;
        if ($utc_time_zone != '') {

            $timezone = new DateTimeZone($utc_time_zone);
            $utcOffset = $timezone->getOffset(new DateTime());
            $offsetHours = $utcOffset / 3600;
            $offsetMinutes = abs(($utcOffset % 3600) / 60);
            $utcOffsetString = sprintf('GMT%+03d:%02d:00', $offsetHours, $offsetMinutes);

            //
            $dateObj = new DateTime("now", $timezone);
            $output_time_zone = new DateTimeZone($utc_time_zone);

            $dateObj->setTimezone($output_time_zone);
            $output_format = 'Y-m-d\TH:i:sP'; // "2024-01-26T11:59:00+04:00"
            $currentTime = $dateObj->format($output_format);
        }


        $json = '{
            "local_time": "' . $currentTime . '",
            "ntp": {
                "mode": false,
                "time_zone": "' . $utcOffsetString . '",
                "server_port": 123,
                "sync_interval": 60,
                "server_address": "cn.pool.ntp.org"
            }
        }';


        return   $response = $this->putCURL('/api/devices/time', $json);
    }
    public function getCameraDeviceLiveStatus($company_id)
    {
        //139.59.69.241:8888
        $online_devices_count = 0;
        $devices = Device::where('company_id', $company_id)->where('model_number', "OX-900"); //OX-900

        $devices->clone()->update(["status_id" => 2]);



        foreach ($devices->get() as $device) {

            $this->sxdmSn = $device->device_id;
            $url = $device->camera_sdk_url ?? gethostbyname(gethostname()) . ':8888';
            if (!preg_match('#^https?://#', $url)) {
                $url = 'http://' . $url;
            }
            $this->camera_sdk_url = rtrim($url, '/');
            $this->adminUsername = $device->admin_username ?: null;
            $this->adminPassword = $device->admin_password ?: null;
            $this->session_id_local = '';


            $response = $this->getCURL('/api/devices/status');

            if (isset($response["serial_no"])) {

                Device::where("device_id", $response["serial_no"])->update(["status_id" => 1, "last_live_datetime" => date("Y-m-d H:i:s")]);
                $online_devices_count++;
            }
        }

        return  $online_devices_count;
    }
    public function deleteCURL($serviceCall)
    {
        $sessionId = $this->getActiveSessionId();

        //return $this->camera_sdk_url . $serviceCall;
        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => $this->camera_sdk_url . $serviceCall,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 1,
            CURLOPT_TIMEOUT => 59,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => array(
                'Cookie: sessionID=' . $sessionId,
                'sxdmToken: ' . $this->sxdmToken, //get from Device manufacturer
                'sxdmSn:  ' . $this->sxdmSn //get from Device serial number
            ),
        ));

        $response = curl_exec($curl);

        curl_close($curl);
        return  $response = json_decode($response, true);
    }
    public function getCURL($serviceCall)
    {
        $sessionId = $this->getActiveSessionId();

        //return $this->camera_sdk_url . $serviceCall;
        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => $this->camera_sdk_url . $serviceCall,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 1,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_HTTPHEADER => array(
                'Cookie: sessionID=' . $sessionId,
                'sxdmToken: ' . $this->sxdmToken, //get from Device manufacturer
                'sxdmSn:  ' . $this->sxdmSn //get from Device serial number
            ),
        ));

        $response = curl_exec($curl);

        curl_close($curl);
        return  $response = json_decode($response, true);
    }
    public function putCURL($serviceCall, $post_json)
    {


        $sessionId = $this->getActiveSessionId();
        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => $this->camera_sdk_url . $serviceCall,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 1,
            CURLOPT_TIMEOUT => 59,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'PUT',
            CURLOPT_POSTFIELDS =>  $post_json,
            CURLOPT_HTTPHEADER => array(
                'Content-Type: application/json',
                'Cookie: sessionID=' . $sessionId,
                'sxdmToken: ' . $this->sxdmToken, //get from Device manufacturer
                'sxdmSn:  ' . $this->sxdmSn //get from Device serial number
            ),
        ));

        $response = curl_exec($curl);

        curl_close($curl);
        return  $response = json_decode($response, true);
    }
    public function postCURL($serviceCall, $post_json, $device_id = '')
    {


        //$sessionId = $this->getActiveSessionId();






        $sessionId = (new SDKController())->getSessionusingDeviceIdData($device_id);
        if ($sessionId == '' || $sessionId == null) {


            $sessionId = $this->getActiveSessionId();
            //$_SESSION[$value['device_id']] = $sessionId;
            if ($sessionId != '') (new SDKController())->storeSessionid($device_id, $sessionId);
        }







        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => $this->camera_sdk_url . $serviceCall,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 1,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS =>  $post_json,
            CURLOPT_HTTPHEADER => array(
                'Content-Type: application/json',
                'Cookie:sessionID=' . $sessionId,
                'sxdmToken:' . $this->sxdmToken, //get from Device manufacturer
                'sxdmSn:' . $this->sxdmSn //get from Device serial number
            ),
        ));

        $response = curl_exec($curl);

        curl_close($curl);
        return  $response = json_decode($response, true);
    }

    public function getActiveSessionId()
    {
        set_time_limit(120);

        $username = $this->adminUsername ?: env('OX900_USERNAME', 'admin');
        $password = $this->adminPassword ?: env('OX900_PASSWORD', 'admin1234');
        $baseUrl = rtrim($this->camera_sdk_url, '/');
        if (!preg_match('#^https?://#', $baseUrl)) {
            $baseUrl = 'http://' . $baseUrl;
        }

        // Helper — runs the full challenge → hash → login handshake and returns the
        // logged-in session_id (or '' on failure). Optionally sends sxdmToken/sxdmSn
        // headers needed by the gateway to authorise the request path.
        $auth = function ($gatewayHeaders) use ($baseUrl, $username, $password) {
            $baseHeaders = array_merge(['Content-Type: application/json'], $gatewayHeaders);

            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => $baseUrl . '/api/auth/login/challenge?username=' . urlencode($username),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 8,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_HTTPHEADER => $gatewayHeaders,
            ]);
            $chResp = json_decode((string) curl_exec($curl), true);
            curl_close($curl);
            if (! isset($chResp['session_id'], $chResp['challenge'], $chResp['salt'])) {
                return '';
            }

            $hashed = hash('sha256', $password . $chResp['salt'] . $chResp['challenge']);
            $body = json_encode([
                'session_id' => $chResp['session_id'],
                'username'   => $username,
                'password'   => $hashed,
            ]);

            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL            => $baseUrl . '/api/auth/login',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $body,
                CURLOPT_HTTPHEADER     => $baseHeaders,
                CURLOPT_TIMEOUT        => 8,
                CURLOPT_CONNECTTIMEOUT => 5,
            ]);
            $loginResp = json_decode((string) curl_exec($curl), true);
            curl_close($curl);

            if (isset($loginResp['status'], $loginResp['session_id']) && $loginResp['status'] == 200) {
                return $loginResp['session_id'];
            }
            return '';
        };

        // 1. Direct-to-device (no gateway headers) — works when the SDK is running
        // on a standalone device that doesn't enforce sxdmToken auth.
        $sid = $auth([]);
        if ($sid !== '') return $sid;

        // 2. Gateway path — the shared SDK at 139.59.69.241:8888 rejects the challenge
        // outright without these headers. Re-run the full handshake with them so we
        // return a *logged-in* session_id, not the pre-login one from the challenge.
        if ($this->sxdmToken !== '' && $this->sxdmSn !== '') {
            $sid = $auth([
                'sxdmToken: ' . $this->sxdmToken,
                'sxdmSn: ' . $this->sxdmSn,
            ]);
            if ($sid !== '') return $sid;
        }

        return '';
    }
}
