<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\Device;
use App\Models\Employee;
use App\Models\Shift;
use App\Models\WhatsappNotificationsLog;
use DateTime;
use Exception;
use Illuminate\Http\Request;
use WebSocket\Client;

class WhatsappNotificationsLogController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $model = WhatsappNotificationsLog::where("company_id", $request->company_id)
            ->whereBetween("created_datetime", [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59']);


        $model->when($request->filled("commonSearch"), function ($q) use ($request) {
            $q->where(function ($q) use ($request) {


                $q->where('whatsapp_number', 'ILIKE', "%$request->commonSearch%");
                $q->orWhere('message', 'ILIKE', "%$request->commonSearch%");
            });
        });



        return   $model->orderBy("created_at", "desc")
            ->paginate($request->perPage);
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
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\WhatsappNotificationsLog  $whatsappNotificationsLog
     * @return \Illuminate\Http\Response
     */
    public function show(WhatsappNotificationsLog $whatsappNotificationsLog)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\WhatsappNotificationsLog  $whatsappNotificationsLog
     * @return \Illuminate\Http\Response
     */
    public function edit(WhatsappNotificationsLog $whatsappNotificationsLog)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\WhatsappNotificationsLog  $whatsappNotificationsLog
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, WhatsappNotificationsLog $whatsappNotificationsLog)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\WhatsappNotificationsLog  $whatsappNotificationsLog
     * @return \Illuminate\Http\Response
     */
    public function destroy(WhatsappNotificationsLog $whatsappNotificationsLog)
    {
        //
    }

    public function addNewMessage(Request $request)
    {
        return $this->addMessage($request->company_id, $request->whatsapp_number, $request->message);

        // $company = Company::with(["contact"])->where("id", $request->company_id)->first();


        // if ($company->enable_desktop_whatsapp == true) {

        //     if ($request->filled("whatsapp_number") && $request->filled("message"))
        //         WhatsappNotificationsLog::create([
        //             "company_id" =>  $request->company_id,
        //             "whatsapp_number" => $request->whatsapp_number,
        //             "message" => $request->message
        //         ]);

        //     return $this->response("Whatsapp Request Created Successfully", null, true);
        // } else {
        //     return $this->response("Desktop Whatsapp is not enabled", null, false);
        // }
    }

    public function addMessage($company_id, $whatsapp_number, $message)
    {

        $company = Company::with(["contact"])->where("id", $company_id)->first();

        if ($whatsapp_number == '') {
            $whatsapp_number = $company->contact['whatsapp'];
        }

        //$whatsapp_number = "971552205149";
        if ($company && $company->enable_desktop_whatsapp == true) {

            if ($whatsapp_number != '' && $message != '') {


                $count = WhatsappNotificationsLog::where("whatsapp_number", $whatsapp_number)->where("company_id", $company_id)->where("message", $message)->count();

                if ($count == 0) {
                    WhatsappNotificationsLog::create([
                        "company_id" =>  $company_id,
                        "whatsapp_number" => $whatsapp_number,
                        "message" => $message,
                        "created_datetime" => date("Y-m-d H:i:s")
                    ]);


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
                }
            }


            return $this->response("Whatsapp Request Created Successfully", null, true);
        } else {
            return $this->response("Desktop Whatsapp is not enabled", null, false);
        }
    }
    public function addAttendanceMessageEmployeeIdLog($logIdsArray)
    {




        $companies = Company::pluck("id");
        foreach ($companies as $key => $company_id) {
            # code...


            $records = AttendanceLog::with(['employee', 'company', 'device'])
                ->with(["employee" => function ($q) use ($company_id) {
                    $q->where('company_id', $company_id);
                }])
                ->where('company_id', $company_id)
                ->whereIn('id', $logIdsArray)
                ->get();



            $whatsapp_number = '';

            foreach ($records as $key => $record) {

                if ($record->company && $record->employee && $record->device) {

                    try {
                        $company_id = $record->company_id;
                        $company_whatsapp_number = $record->company->contact->whatsapp;
                        $whatsapp_number = $record->employee->whatsapp_number;
                        $name = ucfirst($record->employee->first_name)   . " " . ucfirst($record->employee->last_name);
                        if (strlen($whatsapp_number) != 12) {
                            $whatsapp_number = $company_whatsapp_number;
                        }
                        $date = $record->LogTime;
                        $datetime = new DateTime($date);
                        $formattedDate = $datetime->format('H:i');
                        $formattedDate1 = $datetime->format('jS M Y');

                        // $message = $record->employee->title . ". " . $name . " ,  Your attendance log is received  @ " . $formattedDate . "  in " . $record->device->name;


                        $message = "🌟 *Attendance Notification* 🌟\n";
                        $message .= "Dear " . $record->employee->title . ". " . $name . ", \n\n";

                        $message .= "✅ Your attendance has been logged at *" . $formattedDate . "* on *" . $formattedDate1 . "*, in *" . $record->device->name . "*.\n\n";

                        $message .= "Thank you!\n";


                        if (strlen($whatsapp_number) == 12) {
                            //$this->addMessage($company_id, "971552205149",  $whatsapp_number . '-' . $message);
                            $this->addMessage($company_id, $whatsapp_number,  $message);
                        }
                    } catch (\Throwable $e) {
                        return $e;
                    }
                } else {
                    return "empty";
                }
            }
        }
    }
    public function addAttendanceMessageEmployeeId($attendace)
    {


        $company_id = $attendace["company_id"];
        $whatsapp_number = '';

        // Fetch company with contact details
        $company = Company::with("contact")->find($company_id);

        // Ensure company exists before proceeding
        if ($company) // && $attendace["date"] == date("Y-m-d"))
        {


            $employee = Employee::where("company_id", $company_id)
                ->where("employee_id", $attendace["employee_id"])
                ->first();

            // $shift = Shift::where("id", $attendace["shift_id"])

            //     ->first();



            if ($employee) {

                $whatsapp_number = $employee->whatsapp_number;
                $status = $attendace["out"] === '---' ? 'IN' : 'OUT';
                $device_id = $status === 'IN' ? $attendace["device_id_in"] : $attendace["device_id_out"];

                $time = $status === 'IN' ? $attendace["in"] : $attendace["out"];

                // Fetch device details
                $device = Device::where("serial_number", $device_id)->first();

                // Compose the message
                $message = ucfirst($employee->first_name) . " " . ucfirst($employee->first_name) . ", Clock " . $status . " @" . $time . " ,  " . $this->formatDateWithOrdinal($attendace["date"]) . "  at " . $device->name;

                //$this->addMessage($company_id, "971552205149", $employee->whatsapp_number . "-" . $message);
                // Send WhatsApp message
                return $this->addMessage($company_id, $whatsapp_number, $message);
            } else {
                return "Employee Details are not exist";
            }
        }
    }

    function formatDateWithOrdinal($date)
    {
        $timestamp = strtotime($date);
        $day = date('j', $timestamp); // Day without leading zeros
        $month = date('M', $timestamp); // Short month name
        $year = date('Y', $timestamp); // Full year

        // Get the ordinal suffix
        if ($day % 10 == 1 && $day != 11) {
            $ordinal = 'st';
        } elseif ($day % 10 == 2 && $day != 12) {
            $ordinal = 'nd';
        } elseif ($day % 10 == 3 && $day != 13) {
            $ordinal = 'rd';
        } else {
            $ordinal = 'th';
        }

        return "$month $day{$ordinal} $year";
    }
}
