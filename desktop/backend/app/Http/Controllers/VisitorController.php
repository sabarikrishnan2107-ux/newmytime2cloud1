<?php

namespace App\Http\Controllers;

use App\Http\Requests\Visitor\Register;
use App\Http\Requests\Visitor\Store;
use App\Http\Requests\Visitor\Update;
use App\Http\Requests\Visitor\UploadVisitor;
use App\Jobs\ProcessSDKCommand;
use App\Jobs\PushUserToDevice;
use App\Mail\VisitorQRNotificationMail;
use App\Models\Company;
use App\Models\Device;
use App\Models\Employee;
use App\Models\HostCompany;
use App\Models\Notification;
use App\Models\Visitor;
use App\Models\VisitorDevice;
use App\Models\Zone;
use App\Models\ZoneDevices;
use Carbon\Carbon;
use DateTime;
use DateTimeZone;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class VisitorController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function getVisitorStatusList()
    {
        return (new  Visitor)->getVisitorStatusIds();
    }
    public function visitors_with_type(Request $request)
    {
        $model = Visitor::query();

        $model->where("company_id", $request->input("company_id"));

        $model->when($request->filled('branch_id'), function ($q) use ($request) {
            $q->Where('branch_id',   $request->branch_id);
        });

        return $model->get();
    }
    public function timeTOSeconds($str_time)
    {
        // $str_time = "2:50";

        // sscanf($str_time, "%d:%d:%d", $hours, $minutes, $seconds);

        // return  $time_seconds = isset($seconds) ? $hours * 3600 + $minutes * 60 + $seconds : $hours * 60 + $minutes;

        return  $seconds = strtotime($str_time) - strtotime('TODAY');
    }

    public function index(Request $request)
    {
        $model = (new Visitor)->filters($request);

        $model->with(["branch", "zone", "zone.devices",  "host", "timezone:id,timezone_id,timezone_name", "purpose:id,name"]);

        return $model->paginate($request->input("per_page", 100));
    }


    public function search(Request $request)
    {
        $model = (new Visitor)->filters($request);

        $model->where("phone_number", $request->searchInput);

        $model->with(["branch", "zone", "host", "timezone:id,timezone_id,timezone_name", "purpose:id,name"]);

        return $model->first() ?? null;
    }


    public function index_old(Request $request)
    {
        $model = Visitor::query();

        $model->where("company_id", $request->input("company_id"));
        // $model->when($request->filled('branch_id'), function ($q) use ($request) {
        //     $q->Where('branch_id',   $request->branch_id);
        // });

        $fields = ['id', 'company_name', 'system_user_id', 'manager_name', 'phone', 'email', 'zone_id', 'phone_number', 'email', 'time_in'];

        $model = $this->process_ilike_filter($model, $request, $fields);
        $model->when($request->filled('first_name'), function ($q) use ($request) {
            $q->where(function ($q) use ($request) {
                $q->Where('first_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
                $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
            });
        });

        $model->when($request->filled("from_date"), fn($q) => $q->whereDate("visit_from", '>=', $request->from_date));
        $model->when($request->filled("to_date"), fn($q) => $q->whereDate("visit_to", '<=', $request->to_date));


        // $startDate = Carbon::parse($request->from_date);
        // $endDate = Carbon::parse($request->to_date);


        // $model = $model->where(function ($query) use ($startDate, $endDate) {
        //     $query->whereBetween('visit_from', [$startDate, $endDate])
        //         ->orWhereBetween('visit_to', [$startDate, $endDate])
        //         ->orWhere(function ($query) use ($startDate, $endDate) {
        //             $query->where('visit_from', '<', $startDate)
        //                 ->where('visit_to', '>', $endDate);
        //         });
        // });

        $fields1 = ['host_company_id', 'purpose_id', 'status_id'];
        $model = $this->process_column_filter($model, $request, $fields1);



        $model->when($request->filled('statsFilterValue'), function ($q) use ($request) {
            if ($request->statsFilterValue == 'Expected')
                $q->WhereIn('status_id',  [2, 4, 5]);

            else if ($request->statsFilterValue == 'Checked In')
                $q->Where('status_id', 6);

            else  if ($request->statsFilterValue == 'Checked Out')
                $q->Where('status_id', 7);

            else  if ($request->statsFilterValue == 'Pending')
                $q->Where('status_id', 1);
            else  if ($request->statsFilterValue == 'Approved')
                $q->WhereIn('status_id',  [2, 4, 5, 6, 7]);
            else  if ($request->statsFilterValue == 'Rejected')
                $q->Where('status_id', 3);
        });



        $model->when($request->filled('sortBy'), function ($q) use ($request) {
            $sortDesc = $request->input('sortDesc');
            if (strpos($request->sortBy, '.')) {
            } else {
                $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                }
            }
        });

        if ($request->statsFilterValue == 'Over Stayed') {
            $model->whereIn("status_id", [6, 7]);
        }


        if (!$request->sortBy)
            $model->orderBy("visit_from", "DESC");

        $results = $model->with(["zone", "host", "timezone:id,timezone_id,timezone_name", "purpose:id,name"])->paginate($request->input("per_page", 100));

        $overstayedVisitors = [];
        if ($request->statsFilterValue == 'Over Stayed') {

            $data = $results->getCollection();;


            foreach ($data  as $pending) {


                $actucalCheckOutTime = $this->timeTOSeconds($pending->time_out);
                if ($pending->checked_out_datetime) {
                    // $visitorCheckoutTime = $this->timeTOSeconds(date('H:i', strtotime($pending->checked_out_datetime)));
                } else {
                    $visitorCheckoutTime = $this->timeTOSeconds(date("H:i"));

                    $pending["actucalCheckOutTime"] = $actucalCheckOutTime;
                    $pending["visitorCheckoutTime"] = $visitorCheckoutTime;
                    $pending["over_stay"] = gmdate("H:i", $visitorCheckoutTime - $actucalCheckOutTime);
                    $pending["over_stay"] = explode(":", $pending["over_stay"])[0] . 'h:' . explode(":", $pending["over_stay"])[1] . 'm';
                    if ($visitorCheckoutTime > $actucalCheckOutTime) {

                        $overstayedVisitors[] = $pending;
                    }
                }
            }

            $overstayedVisitors = new Collection($overstayedVisitors);
            return $data = $results->setCollection($overstayedVisitors);;
        } else {

            return $results;
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Store $request)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $ext = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->logo->move(public_path('media/visitor/logo/'), $fileName);
            $data['logo'] = $fileName;
        }

        try {

            $visitor = Visitor::create($data);

            if (!$visitor) {
                return $this->response('Visitor cannot add.', null, false);
            }

            // $preparedJson = $this->prepareJsonForSDK($data);

            // // $this->SDKCommand(env('SDK_URL') . "/Person/AddRange", $preparedJson);
            // ProcessSDKCommand::dispatch(env('SDK_URL') . "/Person/AddRange", $preparedJson);

            return $this->response('Visitor successfully created.', null, true);
        } catch (\Throwable $th) {
            return $this->response($th, null, true);
        }
    }

    public function register(Register $request)
    {
        $data = $request->validated();

        $data['logo'] = $this->processImage("media/visitor/logo");
        $data['date'] = date("Y-m-d");
        $data['visitor_filled_datetime'] = date("Y-m-d H:i:s");
        $data['id_copy'] = 'jpg';
        $data['status_id'] = $request->filled('status_id') ? (int) $request->status_id : 1;

        try {
            $data['branch_id'] = $request->host_company_id
                ? HostCompany::where("company_id", $request->company_id)
                    ->where("id", $request->host_company_id)
                    ->value("branch_id")
                : null;

            // $existingVisitor = Visitor::where('phone_number', $data['phone_number'])->first();

            // if ($existingVisitor) {
            //     $existingVisitor->update($data);
            //     $data['url'] = env("APP_URL") . "/media/visitor/logo/" . $data['logo'];
            //     return $this->response('Form has been submitted successfully.', $data, true);
            // }


            // device_ids is not a visitors column — it's handled separately below.
            // Strip it so Eloquent doesn't try to write the array into the table
            // ("Array to string conversion").
            unset($data['device_ids']);

            $visitor = Visitor::create($data);
            if (!$visitor) {
                return $this->response('Form is not submitted.', null, false);
            }

            // Walk-in device assignment: temp id + visitor_devices rows + (flagged) SDK push.
            $deviceAssignment = $this->assignWalkinDevices($request, $visitor, $data);

            // $preparedJson = $this->prepareJsonForSDK([
            //     "first_name" => "first_name",
            //     "last_name" => "last_name",
            //     "system_user_id" => "system_user_id",
            //     "timezone_id" => "timezone_id",
            //     "logo" => "logo",
            //     "zone_id" => "zone_id",
            // ]);
            // ProcessSDKCommand::dispatch(env('SDK_URL') . "/Person/AddRange", $preparedJson);


            $message = "👥 *New Visitor Registered* 👥\n\n";
            $message .= "*Dear, User*\n\n";
            $message .= "New visitor has been registered.\n\n";
            $message .= "*Visitor Details*\n\n";
            $message .= "*Name* " . $data['first_name'] . " " .  $data['last_name'] . ".\n";
            $message .= "*Visit Date* " . $data['visit_from'] . " To " .  $data['visit_to'] . ".\n";
            $message .= "*Phone Number* " . $data['phone_number'] . ".\n";
            $message .= "*Visitor Company* " . $data['visitor_company_name'] . ".\n";
            $message .= "*Date:* " . date("d-M-y") . "\n";
            $message .= "*App Link:* " . "https://mobile.mytime2cloud.com/login" . "\n\n";
            $message .= "Best regards\n";
            $message .= "*MyTime2Cloud*";

            $company = Company::where("id", $data['company_id'])->first();
            $found = HostCompany::whereId($data['host_company_id'])->first();

            if ($found) {

                if (env("APP_ENV") !== "local") {
                    (new WhatsappController)->sendWhatsappNotification($company, $message, $found->number ?? 971554501483);
                }

                Notification::create([
                    "data" => "New visitor has been registered",
                    "action" => "Registration",
                    "model" => "Visitor",
                    "user_id" => $request->user_id ?? 21,
                    "company_id" => $data['company_id'],
                    "redirect_url" => "visitor_requests"
                ]);
            }

            $data['url'] = env("APP_URL") . "/media/visitor/logo/" . $data['logo'];
            $data['device_assignment'] = $deviceAssignment;

            return $this->response('Form has been submitted successfully.', $data, true);
        } catch (\Throwable $th) {
            return $this->response($th->getMessage(), null, false, 500);
        }
    }

    public function self_register(Register $request)
    {
        $data = $request->validated();

        if ($data['logo']) {
            $data['logo'] = $this->processImage("media/visitor/logo");
        }

        if ($data['id_copy']) {
            // $data['id_copy'] = $this->processImage("media/visitor/id_copy");
        }

        $data['date'] = date("Y-m-d");
        $data['visitor_filled_datetime'] = date("Y-m-d H:i:s");
        // $data['id_copy'] = 'jpg';
        $data['status_id'] = 1;
        $data['host_company_id'] = 0;


        try {

            // $existingVisitor = Visitor::where('phone_number', $data['phone_number'])->first();

            // if ($existingVisitor) {
            //     $existingVisitor->update($data);
            //     $data['url'] = env("APP_URL") . "/media/visitor/logo/" . $data['logo'];
            //     return $this->response('Form has been submitted successfully.', $data, true);
            // }


            if (!Visitor::create($data)) {
                return $this->response('Form is not submitted.', null, false);
            }

            $data['url'] = env("APP_URL") . "/media/visitor/logo/" . $data['logo'];

            return $this->response('Form has been submitted successfully.', $data, true);
        } catch (\Throwable $th) {
            return $this->response('Form is not submitted.', $th, false);
        }
    }

    public function uploadVisitorToDevice(UploadVisitor $request)
    {

        return $request;
        try {

            $ifExist = Visitor::where("id", $request->id)->where("system_user_id", ">", 0)->first();

            if ($ifExist) {
                return $this->response('Visiter got Device Id already.', $ifExist, false);
            }

            $visitor = Visitor::where("id", $request->id)->update([
                "system_user_id" => $request->system_user_id,
                "zone_id" => $request->zone_id,
                "status_id" => 4,
                "guard_changed_status_datetime" => date("Y-m-d H:i:s")

            ]);
            if (!$visitor) {
                return $this->response('Visitor cannot upload.', null, false);
            }

            // $data = $request->all();
            // $preparedJson = $this->prepareJsonForSDK($data);
            // return $this->SDKCommand( "http://139.59.69.241:5000/Person/AddRange", $preparedJson);
            // // env('SDK_URL');
            // $data['url'] = env("APP_URL") . "/media/visitor/logo/" . $data['logo'];

            return $this->response('Visitor uploaded to device.', null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function getDevicePersonDetailsZone(Request $request)
    {
        $system_user_id = $request->system_user_id;;

        $zoneDevices = ZoneDevices::with("devices")->where("zone_id", $request->zone_id)->get();

        $returnArray = [];
        foreach ($zoneDevices as $key => $devices) {



            $returnArray[] = (new SDKController())->getPersonDetails($devices['devices']['device_id'], $system_user_id);
        }

        return $returnArray;
    }

    public function getUnknownVisitorsList(Request $request)
    {
        $devicesList = Device::where('company_id', $request->company_id)->where("device_category_name", "CAMERA")->get()->all();

        $date = date('Y-m-d'); //. ' ' . date('H');

        if ($request->filled('from_date'))  $date = $request->from_date;

        $retunFiles = [];
        $directory = '../public/camera-unregsitered-faces-logs/'; // Replace this with your folder path

        $files = scandir($directory);
        $fileTimes = [];
        foreach ($files as $file) {
            $filePath = $directory . '/' . $file;
            $fileTimes[$file] = filemtime($filePath); // Use filectime() for file creation time
        }

        // Sort the files based on their modification times
        arsort($fileTimes);


        foreach ($fileTimes as $file => $key) {
            if ($file !== '.' && $file !== '..') {
                $position = strpos($file, $date);

                if ($position !== false) {

                    $fileArray = explode("_", $file);

                    $deviceName = $this->getDeviceName($devicesList, $fileArray[0]);
                    $retunFiles[] = [
                        "url" => asset("camera-unregsitered-faces-logs/" . $file),
                        "device_id" => $fileArray[0],
                        "device_name" => isset($deviceName[0]) ? $deviceName[0]['name'] : '',
                        "time" => $fileArray[3],
                        "name" => $file,
                    ];;
                } else {
                }
            }
        }

        return $retunFiles;
    }

    public function getDeviceName($data, $device_id)
    {


        $filteredData = array_filter($data, function ($item) use ($device_id) {
            // Define the key-value pairs to filter
            $filterCriteria = array(
                'device_id' => $device_id,

            );

            // Check if all the filter criteria match in the nested array
            foreach ($filterCriteria as $key => $value) {
                if (!isset($item[$key]) || $item[$key] !== $value) {
                    return false;
                }
            }

            return true; // All filter criteria matched
        });

        return $filteredData;
    }
    public function updateVisitorToZone(Request $request)
    {

        $sdkResponse = '';
        try {

            $ifVisitorExist = Visitor::where("id", "!=", $request->visitor_id)
                ->where("system_user_id",    $request->system_user_id)
                ->where("company_id",    $request->company_id)
                ->first();

            $ifEmployeeExist = Employee::where("system_user_id",    $request->system_user_id)
                ->where("company_id",    $request->company_id)
                ->first();

            if ($ifVisitorExist) {
                // return $this->response('Visitor  Id already exist in Visitors List.', $ifVisitorExist, false);
            } else if ($ifEmployeeExist) {
                return $this->response('Visitor  Id already exist in Employee List.', $ifEmployeeExist, false);
            }

            $visitor = Visitor::where("id", $request->visitor_id);


            $visitorData = $visitor->clone()->get();; // Visitor::where("id", $request->visitor_id)->get();

            $zoneDevices = Zone::with(["devices"])->where("id", $request->zone_id)->first();
            $counter = 0;
            foreach ($zoneDevices->devices as $key => $device) {
                $preparedJson = '';

                if ($device->status_id == 1) {

                    $date  = new DateTime("now", new DateTimeZone($device['utc_time_zone'] != '' ? $device['utc_time_zone'] : 'Asia/Dubai'));
                    $currentDateTime = $date->format('Y-m-d H:i:00');
                    if (strtotime($currentDateTime) < strtotime($visitorData[0]["visit_to"] . ' ' . $visitorData[0]["time_out"])) {

                        if ($counter == 0) {

                            $visitor->clone()->update([
                                "system_user_id" => $request->system_user_id,
                                "zone_id" => $request->zone_id,
                                "status_id" => 4,
                                "card_rfid_number" => $request->card_rfid_number,
                                "card_rfid_password" => $request->card_rfid_password,
                                "guard_changed_status_datetime" => date("Y-m-d H:i:s")

                            ]);
                            //upload photo 
                            if (!$visitor) {
                                return $this->response('Visitor cannot upload.', null, false);
                            }

                            $counter++;

                            $visitorData = Visitor::where("id", $request->visitor_id)->get();
                        }


                        $isCameraDevice = $device['device_category_name'] == "CAMERA" ? true : false;


                        if ($device['device_category_name'] == "CAMERA") {



                            try {
                                if (env("APP_ENV") == "local") {
                                    $visitorData[0]["logo"] = "https://backend.mytime2cloud.com/media/employee/profile_picture/1697544063.jpg";

                                    $imageData = file_get_contents("https://backend.mytime2cloud.com/media/employee/profile_picture/1697544063.jpg");
                                } else {
                                    $imageData = file_get_contents($visitorData[0]["logo"]);
                                }


                                $md5string = base64_encode($imageData);;


                                $message[] = (new DeviceCameraController($device['camera_sdk_url']))->pushUserToCameraDevice($visitorData[0]["first_name"] . ' ' . $visitorData[0]["last_name"],  $visitorData[0]['system_user_id'], $md5string);
                            } catch (\Throwable $th) {
                            }
                        } else if ($device['model_number'] == "OX-900") {


                            if ($visitorData[0]["logo"] != '') {




                                if (env("APP_ENV") == "local") {
                                    $visitorData[0]["logo"] = "https://backend.mytime2cloud.com/media/employee/profile_picture/1697544063.jpg";

                                    $imageData = file_get_contents("https://backend.mytime2cloud.com/media/employee/profile_picture/1697544063.jpg");
                                } else {
                                    $imageData = file_get_contents($visitorData[0]['logo']);
                                }
                                $md5string = base64_encode($imageData);;


                                $sdkResponse = (new DeviceCameraModel2Controller($device['camera_sdk_url']))->pushUserToCameraDevice($visitorData[0]["first_name"] . ' ' . $visitorData[0]["last_name"],  $request->system_user_id, $md5string, $device['device_id']);

                                if ($request->qr_code_binary != '') {
                                    $base64Image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', ($request->qr_code_binary)));
                                    $imageName = $request->company_id . '_' . $request->system_user_id . ".png";
                                    $publicDirectory = public_path("visitor_qr_cdoes");
                                    if (!file_exists($publicDirectory)) {
                                        mkdir($publicDirectory, 0777, true);
                                    }

                                    $filePath = $publicDirectory . '/' . $imageName;
                                    file_put_contents($filePath, $base64Image);


                                    $attachments = [];
                                    $attachments["media_url"] =  env('BASE_URL') . '\visitor_qr_cdoes/' . $imageName;
                                    $attachments["filename"] = $imageName;
                                    $company = Company::where('id', 2)->first();
                                    if ($visitorData[0]["phone_number"] != "") {
                                        //whatsapp

                                        $message  = "*Hi " .  $visitorData[0]["first_name"] . ' ' . $visitorData[0]["last_name"] . ',*\n\n';
                                        $message  =  $message . "Your Visit Details as fallows.\n";
                                        $message  =  $message . "Visit Date and Time:  " . $visitorData[0]['visit_from'] . " - " . $visitorData[0]['time_in']  . "\n";
                                        $message  =  $message . "Till Date and Time  :  " . $visitorData[0]['visit_to'] . " - " . $visitorData[0]['time_out']  . "\n";
                                        $message  =  $message . "Use QR Code (attached with this mail) as access card.\n";
                                        $message  =  $message . " \n\n";
                                        $message  =  $message . " \n\n";
                                        $message  =  $message . "Regards,\n";
                                        $message  =  $message . "*" . $company["name"] . "*\n";
                                        (new WhatsappController())->sendWhatsappNotification($company, $message, $visitorData[0]["phone_number"], $attachments);
                                    }

                                    if ($visitorData[0]["email"] != '') {
                                        $model = [
                                            "subject" => "Visitor Details with QR Code on  " . $visitorData[0]["visit_from"],
                                            "file" =>  $filePath,
                                            "mail_content" => "mail_content",
                                            "name" => $visitorData[0]["first_name"] . ' ' . $visitorData[0]["last_name"],
                                            "visitor" =>  $visitorData[0],
                                            "company" =>  $company
                                        ];
                                        Mail::to($visitorData[0]["email"])
                                            ->send(new VisitorQRNotificationMail($model));
                                    }
                                }



                                return  $sdkResponse;
                            }
                        } else {


                            $preparedJson = $this->prepareJsonForSDK($visitorData[0], $device['device_id'], $device['utc_time_zone']);
                            $sdkResponse = '';


                            try {

                                $url = env('SDK_URL') . "/Person/AddRange";

                                if (env('APP_ENV') == 'desktop') {
                                    $url = "http://" . gethostbyname(gethostname()) . ":8080" . "/Person/AddRange";
                                }

                                PushUserToDevice::dispatchSync($url,$preparedJson);

                                // (new SDKController)->processSDKRequestPersonAddJobJson('', $preparedJson);
                            } catch (\Throwable $th) {
                            }
                        }
                    } else {

                        return $this->response('ID is allocated.But, Pending to Push to Device.' . " Visting OutTime  is out of the date ", null, false);
                    }
                }
            }




            // $data = $request->all();
            // $preparedJson = $this->prepareJsonForSDK($data);
            // return $this->SDKCommand( "http://139.59.69.241:5000/Person/AddRange", $preparedJson);
            // // env('SDK_URL');
            // $data['url'] = env("APP_URL") . "/media/visitor/logo/" . $data['logo'];

            return $this->response('Visitor uploaded to device.' . $sdkResponse, null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }


    public function visitorStatusUpdate(Request $request, $id)
    {
        // $company = Company::where("id", $request->company_id)->first();

        // $message = "👥 *New Visitor Registered* 👥\n\n";
        // $message .= "*Dear, User*\n\n";
        // $message .= "New visitor has been registered.\n\n";
        // $message .= "*Date:* " . date("d-M-y") . "\n\n";
        // $message .= "Best regards\n";
        // $message .= "*MyTime2Cloud*";

        // return (new WhatsappController)->sendWhatsappNotification($company, $message, '971554501483');

        try {
            $visitor = Visitor::whereId($id)->update([
                "status_id" => $request->status_id,
                "host_changed_status_datetime" => date("Y-m-d H:i:s")
            ]);
            if (!$visitor) {
                return $this->response('Visitor cannot update.', null, false);
            }

            $statusText = $request->status_id == 1 ? 'Approved' : 'Rejected';

            return $this->response("Visitor status has been {$statusText}.", null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Assign selected devices to a walk-in visitor: allocate a temporary, company-unique
     * system_user_id, record one visitor_devices row per device, and (when VISITOR_SDK_PUSH
     * is enabled) push the visitor to the physical devices. DB-first: rows are always written;
     * the live SDK call only fires behind the flag.
     */
    private function assignWalkinDevices(Request $request, Visitor $visitor, array $data)
    {
        $deviceIds = $request->input('device_ids', []);
        if (!is_array($deviceIds) || count($deviceIds) === 0) {
            return null;
        }

        $companyId = (int) $data['company_id'];
        $tempId = $this->generateTempVisitorUserId($companyId);

        $date = $data['date'];
        $validFrom = $date . ' ' . substr((string) ($data['time_in'] ?? '00:00'), 0, 5) . ':00';
        $validTo   = $date . ' ' . substr((string) ($data['time_out'] ?? '23:59'), 0, 5) . ':00';

        $visitor->update([
            'system_user_id'      => $tempId,
            'sdk_expiry_datetime' => $validTo,
        ]);

        $devices = Device::whereIn('id', $deviceIds)
            ->where('company_id', $companyId)
            ->get();

        foreach ($devices as $dev) {
            VisitorDevice::create([
                'visitor_id'     => $visitor->id,
                'company_id'     => $companyId,
                'device_id'      => $dev->device_id,
                'device_pk'      => $dev->id,
                'system_user_id' => $tempId,
                'valid_from'     => $validFrom,
                'valid_to'       => $validTo,
                'status'         => 'pending',
            ]);
        }

        $pushResults = [];
        $pushed = false;
        if (config('visitor.sdk_push') && $devices->count() > 0) {
            $pushResults = $this->pushWalkinToDevices($visitor, $devices, $tempId, $validTo);
            $pushed = collect($pushResults)->contains('ok', true);
        }

        return [
            'system_user_id' => $tempId,
            'devices'        => $devices->pluck('device_id')->values(),
            'pushed'         => $pushed,
            'push_results'   => $pushResults,
            'valid_to'       => $validTo,
        ];
    }

    /**
     * Temporary visitor userCode in a reserved, company-prefixed band so it never collides
     * with real employees and is distinct across tenants:  1{company:5}{sequence:4}.
     * e.g. company 82, 1st free slot -> 1000820001.
     */
    private function generateTempVisitorUserId(int $companyId): int
    {
        $prefix = '1' . str_pad((string) $companyId, 5, '0', STR_PAD_LEFT);

        for ($seq = 1; $seq <= 9999; $seq++) {
            $candidate = (int) ($prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT));
            $taken = Visitor::where('company_id', $companyId)->where('system_user_id', $candidate)->exists()
                || Employee::where('company_id', $companyId)->where('system_user_id', $candidate)->exists();
            if (!$taken) {
                return $candidate;
            }
        }

        // Exhausted the daily band (>9999 temp visitors) — fall back to a time-based slot.
        return (int) ($prefix . str_pad((string) (time() % 10000), 4, '0', STR_PAD_LEFT));
    }

    /**
     * Push a walk-in visitor to the given devices. Routes through SDKController::AddPerson
     * so every device model is handled (OX-900, MYTIME1, CAMERA1 each have their own
     * upload path) — a direct /Person/AddRange call only reaches standard devices.
     * Marks each visitor_devices row pushed/failed and returns a per-device result list.
     */
    private function pushWalkinToDevices(Visitor $visitor, $devices, int $tempId, string $validTo): array
    {
        // The device handlers read the face from media/employee/profile_picture/<profile_picture_raw>.
        // The visitor photo lives in media/visitor/logo/, so copy it across so all models
        // (including the face devices) can render the visitor's picture.
        $rawLogo = $visitor->getRawOriginal('logo');
        $profilePictureRaw = null;
        if (!empty($rawLogo)) {
            try {
                $src = public_path('media/visitor/logo/' . $rawLogo);
                if (file_exists($src)) {
                    $destDir = public_path('media/employee/profile_picture');
                    if (!is_dir($destDir)) {
                        @mkdir($destDir, 0775, true);
                    }
                    @copy($src, $destDir . '/' . $rawLogo);
                    $profilePictureRaw = $rawLogo;
                }
            } catch (\Throwable $th) {
            }
        }

        $person = [
            'name'      => trim($visitor->first_name . ' ' . $visitor->last_name),
            'userCode'  => $tempId,
            'timeGroup' => 1,
            'expiry'    => $validTo,
        ];
        if ($profilePictureRaw) {
            $person['profile_picture_raw'] = $profilePictureRaw; // OX-900 / MYTIME1 / standard
            $person['faceImage'] = $visitor->logo;               // CAMERA1 / MYTIME1 guard (full URL)
        }

        $serials = $devices->pluck('device_id')->values()->all();

        $sdkRequest = new \Illuminate\Http\Request();
        $sdkRequest->setMethod('POST');
        $sdkRequest->replace([
            'company_id' => $visitor->company_id,
            'snList'     => $serials,
            'personList' => [$person],
        ]);

        $results = [];
        try {
            // Per-model routing: OX-900, MYTIME1, CAMERA1, and standard devices.
            $sdkResult = (new SDKController)->AddPerson($sdkRequest);

            // Gather per-device responses from every model bucket.
            $byDevice = [];
            foreach (['deviceResponse', 'cameraResponse', 'cameraResponse2'] as $key) {
                if (!empty($sdkResult[$key]) && is_array($sdkResult[$key])) {
                    foreach ($sdkResult[$key] as $r) {
                        if (is_array($r) && isset($r['device_id'])) {
                            $byDevice[$r['device_id']] = $r;
                        }
                    }
                }
            }

            foreach ($devices as $dev) {
                $r = $byDevice[$dev->device_id] ?? null;
                $status = $r['status'] ?? null;
                $ok = ($status === 200 || $status === '200');
                $message = $ok
                    ? 'Uploaded'
                    : (is_array($r['sdk_response'] ?? null)
                        ? json_encode($r['sdk_response'])
                        : ($r['sdk_response'] ?? ($r === null ? 'No response (offline or face photo required)' : 'Failed')));

                VisitorDevice::where('visitor_id', $visitor->id)
                    ->where('device_id', $dev->device_id)
                    ->update(['status' => $ok ? 'pushed' : 'failed', 'pushed_at' => $ok ? now() : null]);

                $results[] = [
                    'device_id' => $dev->device_id,
                    'name'      => $dev->name,
                    'ok'        => $ok,
                    'message'   => $message,
                ];
            }
        } catch (\Throwable $th) {
            VisitorDevice::where('visitor_id', $visitor->id)->whereNull('removed_at')
                ->update(['status' => 'failed']);
            Log::error('Walk-in SDK push failed: ' . $th->getMessage());
            foreach ($devices as $dev) {
                $results[] = ['device_id' => $dev->device_id, 'name' => $dev->name, 'ok' => false, 'message' => 'Push error'];
            }
        }

        return $results;
    }

    public function prepareJsonForSDK($data, $device_id, $utc_time_zone)
    {


        $date  = new DateTime("now", new DateTimeZone($utc_time_zone != '' ? $utc_time_zone : 'Asia/Dubai'));
        $currentDateTime = $date->format('Y-m-d H:i:00');

        $personList = [];

        $personList["name"] = $data["first_name"] . " " . $data["last_name"];
        $personList["userCode"] = $data["system_user_id"];
        $personList["timeGroup"] = 1;
        $personList["expiry"] =  '2026-01-01 00:00:00';

        if ($data["card_rfid_number"] != '') {
            $personList["cardData"] = $data["card_rfid_number"];
            $personList["cardStatus"] = 0;
            $personList["cardType"] = 0;
            $personList["password"] =  $data["card_rfid_password"];
        }
        if ($data["logo"] != '') {
            if (env("APP_ENV") == "local") {
                $personList["faceImage"] = "https://backend.mytime2cloud.com/media/employee/profile_picture/1697544063.jpg";
            } else {
                $personList["faceImage"] =  $data["logo"];
            }
        }





        $currentDate  = $date->format('Y-m-d');

        if (
            strtotime($currentDate) >= strtotime($data["visit_from"])
            && strtotime($currentDate) <= strtotime($data["visit_to"])
        ) {
            if (
                strtotime($currentDateTime) >= strtotime($currentDate . ' ' . $data["time_in"])
                && strtotime($currentDateTime) <= strtotime($currentDate . ' ' . $data["time_out"])
            ) {
                $personList["expiry"] = $currentDate . ' ' . $data["time_out"];
            }
        }





        Visitor::where("id", $data["id"])->update(["sdk_expiry_datetime" => $personList["expiry"]]);

        return [
            "snList" => [$device_id],
            "personList" => [$personList],
        ];
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Visitor  $visitor
     * @return \Illuminate\Http\Response
     */
    public function update(Update $request, $id)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $ext = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->logo->move(public_path('media/visitor/logo/'), $fileName);
            $data['logo'] = $fileName;
        }

        try {

            $visitor = Visitor::whereId($id)->update($data);
            if (!$visitor) {
                return $this->response('Visitor cannot update.', null, false);
            }

            return $this->response('Visitor successfully updated.', null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Visitor  $visitor
     * @return \Illuminate\Http\Response
     */
    public function destroy(Visitor $visitor)
    {
        return $visitor->delete();
    }
}
