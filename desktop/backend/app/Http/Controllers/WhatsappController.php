<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Company;
use App\Models\Device;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;


class WhatsappController extends Controller
{
    public function api1($data)
    {
        $url = "https://messages-sandbox.nexmo.com/v1/messages";

        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

        $headers = array(
            "Content-Type: application/json",
            "Accept: application/json",
            "Authorization: Basic NmU3MzVjYzA6ZU5UeXd3N1BuMTcyM3RQSg==",
        );
        curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);


        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));

        //for debug only!
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);

        $resp = curl_exec($curl);
        curl_close($curl);
        return $resp;
    }

    public function SendNotification(Request $request)
    {

        $device = Device::where("device_id", $request->DeviceID)->first(["company_id"]);

        $model = Employee::query();

        $model->withOut(["department"]);
        $model->whereHas("schedule", function ($q) {
            $q->where('shift_type_id', 6);
        });
        $model->where("company_id", $device->company_id);
        $model->where("system_user_id", $request->UserID);
        $found  = $model->first(["display_name", "phone_number", "system_user_id", "employee_id"]);

        if (!$found) {
            return response()->noContent();
        }

        $shift = $found->schedule->shift;
        $time = date('H:i', strtotime($request->LogTime));
        $late = $this->calculatedLateComing($time, $shift->on_duty_time, $shift->late_time);

        $data = [
            "from"          => "14157386102",
            "message_type"  => "text",
            "channel"       => "whatsapp",
            "to"            => "971502848071",
            "text"          => "testing...",
            // "to" => $request->to,
            // "text" => $request->text,
        ];

        return $late ? $this->api($data) : "keep sleeping";
    }

    private function api($data)
    {
        $url = env('NEXMO_URL');
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Authorization' => env('NEXMO_AUTHORIZATION'),
        ];

        $response = Http::withHeaders($headers)->post($url, $data);
        $data = $response->body();
        Storage::put('whatsapp.txt', $data);
        return $data;
    }


    public function calculatedLateComing($time, $on_duty_time, $grace)
    {
        $interval_time = date("i", strtotime($grace));

        $late_condition = strtotime("$on_duty_time + $interval_time minute");

        $in = strtotime($time);

        if ($in > $late_condition && $grace != "---") {
            return true;
        }

        return false;
    }

    public function sentOTP($data)
    {

        return false;
        try {
            if ($data['instance_id']) {
                $response = Http::withoutVerifying()->get(env('WHATSAPP_URL'), [
                    'number' => $data['to'],
                    'type' => 'text',
                    'message' => $data['message'],
                    'instance_id' => $data['instance_id'],
                    'access_token' => $data['access_token'],
                ]);

                $msg = 'company Id: ' . $data['company']['id'] . ' User Name : ' . $data['userName'] . ' '
                    . $data['type'] . ' from: ' . $data['to'];

                // dd($response->status());

                //if ($response->status() == 200) 
                {
                    // Log::channel('whatsapp_logs')->info($msg);
                    //Log::channel('whatsapp_logs')->info($response);
                }
            } else {
                Log::channel('whatsapp_logs')->info('Company Insance ID is not exist');
            }
        } catch (\Throwable $th) {
            Log::channel("custom")->error("BookingController: " . $th);
        }
    }

    public function attendanceSummary()
    {
        $companies = Company::pluck("id");

        $result = [];

        foreach ($companies as $id) {
            return $result[] = $this->prepareSummary($id);
        }

        return $result;
    }

    //working method
    public function sendWhatsappNotification($company, $message, $number, $attachments = [])
    {


        return false;
        $data = [
            'number' => $number,
            'type' => 'text',
            'message' => $message,
            'instance_id' => $company->whatsapp_instance_id, //'64DB354A9EBCC',
            'access_token' =>  $company->whatsapp_access_token, //'a27e1f9ca2347bb766f332b8863ebe9f',
        ];



        if (count($attachments)) {
            $data = [
                'number' => $number,
                'type' => 'media',
                'message' => $message,
                'instance_id' => $company->whatsapp_instance_id, //'64DB354A9EBCC',
                'access_token' =>  $company->whatsapp_access_token, //'a27e1f9ca2347bb766f332b8863ebe9f',
                'media_url' => $attachments['media_url'],
                'filename' => $attachments['filename'],
            ];
        }

        $response = Http::withoutVerifying()->get(env('WHATSAPP_URL'), $data);

        // You can check the response status and get the response content as needed
        if ($response->successful()) {
            //Log::channel('whatsapp_logs')->info($response->json());
        } else {
            Log::channel('whatsapp_logs')->info($response->body());
        }
        return $response->body();
    }
    public function prepareSummary($id)
    {
        $date = date("d-M-Y");

        $attendance = Attendance::where("company_id", $id)
            ->whereHas("company")
            ->where('date', $date)
            ->whereIn("status", ["P", "A", "M", "O", "LC", "EG"])
            ->selectRaw("status, COUNT(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status');

        $presentCount = $attendance->get("P", 0);
        $absentCount = $attendance->get("A", 0);
        $missingCount = $attendance->get("M", 0);
        $offCount = $attendance->get("O", 0);
        $lateInCount = $attendance->get("LC", 0);
        $earlyOutCount = $attendance->get("EG", 0);

        $company = Company::withCount("employees")->where("id", $id)->first();

        $message = "📊 *Daily Attendance Report* 📊\n\n";
        $message .= "*Hello, {$company->name}*\n\n";
        $message .= "This is your daily attendance summary report.\n\n";
        $message .= "*Date:* $date\n\n";
        $message .= "👥 Total Employees: *{$company->employees_count}*\n";
        $message .= "✅ Total Present: *$presentCount*\n";
        $message .= "❌ Total Absent: *$absentCount*\n";
        $message .= "⏰ Total Late In: *$lateInCount*\n"; // Using ⏰ for Late In
        $message .= "🚪 Total Early Out: *$earlyOutCount*\n"; // Using 🚪 for Early Out
        $message .= "❓ Total Missing: *$missingCount*\n"; // Using ❓ for Missing
        $message .= "🏖️ Total Employee on Holiday: *$offCount*\n\n"; // Using 🏖️ for Off

        $message .= "Best regards\n";
        $message .= "*EZTime*";

        return $message;

        return $this->sendMessage($message, '971553303991');
    }

    public function sendMessage($message, $number)
    {
        $response = Http::withoutVerifying()->get('https://ezwhat.com/api/send.php', [
            'number' => $number,
            'type' => 'text',
            'message' => $message,
            'instance_id' => '65772646BBF76',
            'access_token' => 'a27e1f9ca2347bb766f332b8863ebe9f',
        ]);

        // You can check the response status and get the response content as needed
        if ($response->successful()) {
            // Log::channel('whatsapp_logs')->info($response->json());
        } else {
            Log::channel('whatsapp_logs')->info($response->body());
        }
        return $message;
    }
}
