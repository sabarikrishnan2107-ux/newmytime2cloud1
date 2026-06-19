<?php

namespace App\Console\Commands\Automation\Alerts;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsappMessageJob;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\WhatsappClient;
use DateTime;
use Illuminate\Console\Command;

class Attendance extends Command
{
    protected $signature = 'alert:attendance {company_id}';

    protected $description = 'Alert users for the attendance';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle()
    {
        $logger = new Controller;

        $logFilePath = 'logs/whatsapp/attendance';

        $company_id = $this->argument("company_id", 0);

        $logFilePath = "$logFilePath/$company_id";

        $logger->logOutPut($logFilePath, "*****Cron started for alert:attendance $company_id *****");

        $isAllowWhatsappCleintToSendAttendanceAlert = Company::where("id", $company_id)
            ->where("enable_desktop_whatsapp", true)
            ->value("company_code") ?? 0;

        if (!$isAllowWhatsappCleintToSendAttendanceAlert) {
            $logger->logOutPut($logFilePath, "Whatsapp is not enabled for $company_id.");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:attendance $company_id *****");
            $this->info("Whatsapp is not enabled for Company Id: $company_id.");
            return;
        }

        $clientId = null;

        $accounts = WhatsappClient::where("company_id", $company_id)->value("accounts");

        if (!$accounts || !is_array($accounts) || empty($accounts[0]['clientId'])) {
            $this->info("No Whatsapp Client found.");
            $logger->logOutPut($logFilePath, "No Whatsapp Client found.");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
            return;
        }

        $clientId = $accounts[0]['clientId'];

        $records = AttendanceLog::where('company_id', $company_id)
            ->with(["device" => function ($q) use ($company_id) {
                $q->where('company_id', $company_id);
                $q->select("id", "device_id", "name", "short_name", "company_id", "model_number", "location");
            }])
            ->with(["employee" => function ($q) use ($company_id) {
                $q->where('company_id', $company_id);
                $q->where('status', 1);
                $q->whereNotNull('whatsapp_number');
                $q->select("title", "first_name", "last_name", "whatsapp_number", "company_id", "system_user_id", "employee_id");
                $q->withOut("schedule", "department", "designation", "sub_department", "branch", "user");
            }])
            ->where("LogTime", ">=", date("Y-m-d 00:00:00"))
            ->where("LogTime", "<=", date("Y-m-d 23:59:00"))
            ->where('is_attendance_notified_by_whatsapp_proxy', false)
            // ->where('UserID', "5656")
            ->limit(10)
            ->orderBy("LogTime", "asc")
            ->get();


        if (!count($records->toArray())) {
            $logger->logOutPut($logFilePath, "Record count " . count($records->toArray()));
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:attendance $company_id *****");
            $this->info("Record count " . count($records->toArray()));
            return;
        }

        $logIds = [];


        foreach ($records as $record) {

            $employee = $record->employee;

            $device = $record->device;

            if ($employee && $device) {

                $name = $employee->title . ". " . ucfirst($employee->first_name) . " " . ucfirst($employee->last_name);

                $whatsapp_number = $employee->whatsapp_number;
                // $whatsapp_number = "971554501483";

                // Check if the WhatsApp number is valid and contains the country code
                if (empty($whatsapp_number) && !preg_match('/^\d{11,15}$/', $whatsapp_number)) {
                    $logger->logOutPut($logFilePath, "Invalid WhatsApp number. $whatsapp_number for $name from Company Id: $company_id");
                    $this->info("Invalid WhatsApp number. $whatsapp_number for $name from Company Id: $company_id");
                    continue;
                }

                $deviceName = $record->device->name;

                //"22 Jan 2025 at 13:32:00"
                $formattedDate = (new DateTime($record->LogTime))->format('d M Y \a\t H:i:s');

                $message = "Attendance Notification !\n\n";

                $message .= "Dear $name\n\n";

                $message .= "Your attendance has been logged at *$deviceName* on *$formattedDate*\n\n";

                $message .= "Thank you!\n";

                SendWhatsappMessageJob::dispatch(
                    $whatsapp_number,
                    $message,
                    $record->id,
                    $clientId,
                    $logFilePath
                );

                $logIds[] = $record->id;

            } else {
                $this->info("else" . " " . $record->UserID . " " . $record->company_id);
                $logger->logOutPut($logFilePath, "*****No employee found for {$record->UserID} *****");
            }
        }

        $records = AttendanceLog::whereIn("id", $logIds)
            ->update(["is_attendance_notified_by_whatsapp_proxy" => true]);

        $logger->logOutPut($logFilePath, "*****$records logs updated *****");

        $logger->logOutPut($logFilePath, "*****Cron ended for alert:attendance $company_id *****");
    }
}
