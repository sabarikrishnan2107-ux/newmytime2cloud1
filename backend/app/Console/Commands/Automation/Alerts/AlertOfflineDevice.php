<?php

namespace App\Console\Commands\Automation\Alerts;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsappMessageJob;
use App\Mail\DeviceOfflineAlertMail;
use App\Models\Company;
use App\Models\Device;
use App\Models\DeviceNotification;
use App\Models\WhatsappClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

// use Illuminate\Support\Facades\Log as Logger;
// use Illuminate\Support\Facades\Mail;
// use App\Mail\NotifyIfLogsDoesNotGenerate;

class AlertOfflineDevice extends Command
{
    protected $signature = 'alert:offline_device {company_id}';

    protected $description = 'Alert to notfiy the user about offline devices';

    public function handle()
    {
        $company_id = $this->argument("company_id", 1);

        $logger = new Controller;

        $logFilePath = 'logs/whatsapp/device';

        $logFilePath = "$logFilePath/$company_id";

        $currentTime = new \DateTime();

        $dateTime = $currentTime->format('F j, Y \a\t h:i:s A');

        $logger->logOutPut($logFilePath, "*****Cron started for alert:offline_device *****");

        $clientId = 0;

        $accounts = WhatsappClient::where("company_id", $company_id)->value("accounts");

        $reportNotifications = DeviceNotification::with("managers")
            ->where("company_id", $company_id)
            ->orderByDesc("id")
            ->get();

        if ($reportNotifications->isEmpty()) {
            $logger->logOutPut($logFilePath, "No Alert Found");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:offline_device *****");

            $this->info("No Alert Found");
            return;
        }

        $company = Company::where("id", $company_id)->first("company_code", "name") ?? 0;

        if (!$company) {
            $logger->logOutPut($logFilePath, "No Company Found");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:offline_device *****");

            $this->info("No Company Found");
            return;
        }

        $devices = Device::where('status_id', 2)
            ->excludeOtherDevices()
            ->select("id", "company_id", "branch_id", "status_id", "name")
            ->with("branch")
            ->where('company_id', $company_id)
            ->get(); //for testing only

        if ($devices->isEmpty()) {
            $logger->logOutPut($logFilePath, "No Device Found");
            $logger->logOutPut($logFilePath, "*****Cron ended for alert:offline_device *****");

            $this->info("No Device Found");
            return;
        }

        foreach ($reportNotifications as $reportNotification) {

            foreach ($devices as $device) {

                $deviceName = $device->name;

                if ($reportNotification->branch_id == $device->branch_id) {

                    foreach ($reportNotification->managers as $manager) {

                        if ($reportNotification->managers->isEmpty()) {
                            $logger->logOutPut($logFilePath, "No Manager Found");
                            $logger->logOutPut($logFilePath, "*****Cron ended for alert:offline_device *****");

                            $this->info("No Manager Found");
                            continue;
                        }



                        if ($device->branch_id == $manager->branch_id) {

                            $name = $device->branch->branch_name;

                            if (!$name) {
                                $name = $company->name;
                            }

                            if (in_array("Email", $reportNotification->mediums ?? [])) {
                                $message = "Dear Admin,<br><br>" .
                                    "$deviceName is offline at $name since $dateTime.<br><br>" .
                                    "Thank you!";

                                Mail::to($manager->email)->queue(new DeviceOfflineAlertMail($message));
                                $this->info("Queued email to admin.");
                            }
                            if (in_array("Whatsapp", $reportNotification->mediums ?? [])) {

                                if (!$accounts || !is_array($accounts) || empty($accounts[0]['clientId'])) {
                                    $this->info("No Whatsapp Client found.");
                                    $logger->logOutPut($logFilePath, "No Whatsapp Client found.");
                                    $logger->logOutPut($logFilePath, "*****Cron ended for alert:access_control $company_id *****");
                                    $clientId = 0;
                                } else {
                                    $clientId = $accounts[0]['clientId'] ?? 1;
                                }

                                if ($clientId) {
                                    $message = "Device Offline Alert !\n" .
                                        "\n" .
                                        "Dear Admin,\n\n" .
                                        "*$deviceName* is offline at  *$name* since *$dateTime*.\n" .
                                        "Thank you!\n";
                                    SendWhatsappMessageJob::dispatch(
                                        $manager->whatsapp_number,
                                        $message,
                                        0,
                                        $clientId,
                                        $logFilePath
                                    );
                                }
                            }
                        }
                    }

                    sleep(5);
                }
            }
        }

        $logger->logOutPut($logFilePath, "*****Cron ended for alert:offline_device *****");
    }
}
