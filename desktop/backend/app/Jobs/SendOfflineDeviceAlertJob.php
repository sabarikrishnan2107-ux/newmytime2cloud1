<?php

namespace App\Jobs;

use App\Jobs\SendWhatsappMessageJob;
use App\Mail\DeviceOfflineAlertMail;
use App\Models\WhatsappClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendOfflineDeviceAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $device;
    protected $manager;
    protected $reportNotification;
    protected $company;
    protected $logFilePath;
    protected $dateTime;

    public function __construct($device, $manager, $reportNotification, $company, $logFilePath, $dateTime)
    {
        $this->device = $device;
        $this->manager = $manager;
        $this->reportNotification = $reportNotification;
        $this->company = $company;
        $this->logFilePath = $logFilePath;
        $this->dateTime = $dateTime;
    }

    public function handle()
    {
        $deviceName = $this->device->name;
        $name = $this->device->branch->branch_name ?? $this->company->name;

        // Send Email
        if (in_array("Email", $this->reportNotification->mediums ?? [])) {
            $message = "Dear Admin,<br><br>" .
                "$deviceName is offline at $name since $this->dateTime.<br><br>" .
                "Thank you!";

            Mail::to($this->manager->email)->queue(new DeviceOfflineAlertMail($message));
        }

        // Send WhatsApp
        if (in_array("Whatsapp", $this->reportNotification->mediums ?? [])) {

            $accounts = WhatsappClient::where("company_id", $this->company->id)->value("accounts");
            $clientId = $accounts[0]['clientId'] ?? 0;

            if ($clientId) {
                $message = "Device Offline Alert !\n\n" .
                    "*$deviceName* is offline at  *$name* since *$this->dateTime*.\n" .
                    "Thank you!\n";

                SendWhatsappMessageJob::dispatch(
                    $this->manager->whatsapp_number,
                    $message,
                    0,
                    $clientId,
                    $this->logFilePath
                );
            }
        }
    }
}
