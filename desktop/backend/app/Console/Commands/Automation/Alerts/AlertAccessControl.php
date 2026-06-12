<?php

namespace App\Console\Commands\Automation\Alerts;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsappMessageJob;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\ReportNotification;
use App\Models\WhatsappClient;
use DateTime;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class AlertAccessControl extends Command
{
    protected $signature = 'alert:access_control {company_id}';

    protected $description = 'Alert users when someone comes between a given time on selected days';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle()
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        $logger = new Controller;

        $logFilePath = 'logs/automation/access_control';

        $company_id = $this->argument("company_id", 0);

        $logFilePath = "$logFilePath/$company_id";

        $logger->logOutPut($logFilePath, "*****Cron started for alert:access_control at " . date("H:i") . " $company_id *****");

        $clientId = null;

        $accounts = WhatsappClient::where("company_id", $company_id)->value("accounts");

        if (!$accounts || !is_array($accounts) || empty($accounts[0]['clientId'])) {
            $this->info("No Whatsapp Client found.");
            $logger->logOutPut($logFilePath, "No Whatsapp Client found.");
            $executionTime = microtime(true) - $startTime;
            $endMemory = memory_get_usage();
            $memoryUsed = $endMemory - $startMemory;
            $logger->logOutPut($logFilePath, "execution_time $executionTime");
            $logger->logOutPut($logFilePath, "memory_used " . number_format($memoryUsed / 1024, 2) . " KB");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
            return;
        }

        $clientId = $accounts[0]['clientId'];

        $models = ReportNotification::with("managers")
            ->where('type', 'access_control')
            ->where('company_id', $company_id)
            ->orderBy("id", "desc")
            ->get();

        if ($models->isEmpty()) {
            $logger->logOutPut($logFilePath, "No Report Notification found.");
            $this->info("No ReportNotification found.");
            $executionTime = microtime(true) - $startTime;
            $endMemory = memory_get_usage();
            $memoryUsed = $endMemory - $startMemory;
            $logger->logOutPut($logFilePath, "execution_time $executionTime");
            $logger->logOutPut($logFilePath, "memory_used " . number_format($memoryUsed / 1024, 2) . " KB");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
            return;
        }

        $records = AttendanceLog::with(['employee', 'company', 'device'])
            ->with(["employee" => function ($q) use ($company_id) {
                $q->where('company_id', $company_id);
            }])
            ->where("LogTime", ">=", date("Y-m-d 00:00:00"))
            ->where("LogTime", "<=", date("Y-m-d 23:59:00"))
            ->where('company_id', $company_id)
            ->where('is_notified_by_whatsapp_proxy', false)
            // ->where('UserID', "5656")
            ->limit(10)
            ->orderBy("id", "asc")
            ->get();


        if (!count($records->toArray())) {
            $logger->logOutPut($logFilePath, "Record count " . count($records->toArray()));
            $executionTime = microtime(true) - $startTime;
            $endMemory = memory_get_usage();
            $memoryUsed = $endMemory - $startMemory;
            $logger->logOutPut($logFilePath, "execution_time $executionTime");
            $logger->logOutPut($logFilePath, "memory_used " . number_format($memoryUsed / 1024, 2) . " KB");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
            $this->info("Record count " . count($records->toArray()));
            return;
        }

        $logIds = [];

        foreach ($models as $model) {

            $days = $model->days;
            $from_time = $model->from_time;
            $to_time = $model->to_time;
            $managers = $model->managers ?? [];

            $currentDay = date("w"); // day value as number
            if (!in_array($currentDay, $days) || !count($days)) {
                $logger->logOutPut($logFilePath, "Day not found");
                $executionTime = microtime(true) - $startTime;
                $endMemory = memory_get_usage();
                $memoryUsed = $endMemory - $startMemory;
                $logger->logOutPut($logFilePath, "execution_time $executionTime");
                $logger->logOutPut($logFilePath, "memory_used " . number_format($memoryUsed / 1024, 2) . " KB");
                $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
                $this->info("Day not found");
                return;
            }

            // Check if there are no managers
            if ($managers->isEmpty()) {
                $logger->logOutPut($logFilePath, "No managers found for the specified company ID.");
                $this->info("No managers found for the specified company ID.");
                $executionTime = microtime(true) - $startTime;
                $endMemory = memory_get_usage();
                $memoryUsed = $endMemory - $startMemory;
                $logger->logOutPut($logFilePath, "execution_time $executionTime");
                $logger->logOutPut($logFilePath, "memory_used " . number_format($memoryUsed / 1024, 2) . " KB");
                $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
                return;
            }

            foreach ($records as $logID => $record) {
                $logIds[] = $record->id;

                if ($model->branch_id == $record->device->branch_id) {

                    if ($record->company && $record->employee && $record->device) {
                        foreach ($managers as $manager) {

                            $time = $record->time;
                            if (
                                ($time >= $from_time && $time <= "23:59") || // Time is on the same day between from_time and midnight
                                ($time >= "00:00" && $time <= $to_time)      // Time is on the next day between midnight and to_time
                            ) {
                                $name = ucfirst($record->employee->first_name) . " " . ucfirst($record->employee->last_name);

                                //"22 Jan 2025 at 13:32:00"
                                $formattedDate = (new DateTime($record->LogTime))->format('d M Y \a\t H:i:s');
                                $message = $this->generateMessage($name, $record->device->name, $formattedDate, $record->id);

                                if ($manager->branch_id == $record->device->branch_id) {
                                    if (in_array("Whatsapp", $model->mediums)) {

                                        SendWhatsappMessageJob::dispatch(
                                            $manager->whatsapp_number,
                                            $message,
                                            $record->id,
                                            $clientId,
                                            $logFilePath
                                        );
                                    }

                                    if (in_array("Email", $model->mediums)) {
                                        // process for email
                                    }
                                    sleep(5);
                                }
                            }
                        }
                    } else {
                        $this->info("else" . " " . $record->UserID . " " . $record->company_id);
                        $logger->logOutPut($logFilePath, "*****No employee found for {$record->UserID} *****");
                    }
                }
            }
        }


        $records = AttendanceLog::whereIn("id", $logIds)
            ->update(["is_notified_by_whatsapp_proxy" => true]);

        $logger->logOutPut($logFilePath, "*****$records logs updated *****");

        $executionTime = microtime(true) - $startTime;
        $endMemory = memory_get_usage();
        $memoryUsed = $endMemory - $startMemory;
        $logger->logOutPut($logFilePath, "execution_time $executionTime");
        $logger->logOutPut($logFilePath, "memory_used " . number_format($memoryUsed / 1024, 2) . " KB");
        $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
    }

    private function generateMessage($name, $deviceName, $formattedDate, $logId)
    {
        return "Access Control Alert !\n" .
            "\n" .
            "Dear Admin,\n\n" .
            "*$name* accessed the door at  *$deviceName* on $formattedDate\n\n" .
            // "Log Id: $logId\n" .
            "Thank you!\n";
    }
}
