<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;

class EmailNotificationForOfflineDevices extends Mailable
{
    use SerializesModels;

    public $company;
    public $offlineDevicesCount;
    public $devices;
    public $manager;
    public $branch_name;

    public function __construct($company, $offlineDevicesCount, $devices, $manager, $branch_name)
    {
        $this->company = $company;
        $this->offlineDevicesCount = $offlineDevicesCount;

        $this->manager = $manager;
        $this->devices = $devices;
        $this->branch_name = $branch_name;
    }

    public function build()
    {



        return $this->subject('Notification for Offline Devices')
            ->markdown('emails.NotificationForOffliveDevices'); // Use the email template you created
    }
}
