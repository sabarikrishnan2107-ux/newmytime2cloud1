<?php

namespace App\Console\Commands\Automation\Alerts;

use App\Http\Controllers\Controller;
use App\Jobs\SendOfflineDeviceAlertJob;
use App\Models\Company;
use App\Models\Device;
use App\Models\DeviceNotification;
use Illuminate\Console\Command;

class AlertOfflineDeviceAll extends Command
{
    protected $signature = 'alert:offline_device_all';
    protected $description = 'Send offline device alerts for ALL companies';

    public function handle()
    {
        $logger = new Controller;
        $currentTime = now();
        $dateTime = $currentTime->format('F j, Y \a\t h:i:s A');

        $logger->logOutPut("logs/whatsapp/device", "===== GLOBAL OFFLINE DEVICE CRON STARTED =====");

        $companies = Company::select("id", "name")->get();

        foreach ($companies as $company) {

            $company_id = $company->id;
            $logFilePath = "logs/whatsapp/device/$company_id";

            $logger->logOutPut($logFilePath, "---- Processing Company: {$company->name} ----");

            $reportNotifications = DeviceNotification::with("managers")
                ->where("company_id", $company_id)
                ->get();

            if ($reportNotifications->isEmpty()) {
                $logger->logOutPut($logFilePath, "No alerts configured.");
                continue;
            }

            $devices = Device::where("company_id", $company_id)
                ->where("status_id", 2)
                ->excludeOtherDevices()
                ->with("branch")
                ->get();

            if ($devices->isEmpty()) {
                $logger->logOutPut($logFilePath, "No offline devices.");
                continue;
            }

            foreach ($reportNotifications as $reportNotification) {
                foreach ($devices as $device) {

                    if ($reportNotification->branch_id != $device->branch_id) {
                        continue;
                    }

                    foreach ($reportNotification->managers as $manager) {

                        if (!$manager) continue;


                        $this->info("Queueing Offline Alert → Company: {$company->id} {$company->name}, Device: {$device->name}, Manager: {$manager->email}");
                        
                        $logger->logOutPut($logFilePath, "Queueing Offline Alert → Company: {$company->id} {$company->name}, Device: {$device->name}, Manager: {$manager->email}");

                        SendOfflineDeviceAlertJob::dispatch(
                            $device,
                            $manager,
                            $reportNotification,
                            $company,
                            $logFilePath,
                            $dateTime
                        );
                    }
                }
            }

            $logger->logOutPut($logFilePath, "Company completed.");
        }

        $logger->logOutPut("logs/whatsapp/device", "===== GLOBAL OFFLINE DEVICE CRON COMPLETED =====");
        $this->info("All companies processed successfully.");
    }
}
