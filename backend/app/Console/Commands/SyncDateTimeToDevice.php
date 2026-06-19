<?php

namespace App\Console\Commands;

use App\Http\Controllers\DeviceCameraModel2Controller;
use App\Jobs\SyncDateTimeToDeviceJob;
use App\Models\Device;
use DateTime;
use DateTimeZone;
use Illuminate\Console\Command;

class SyncDateTimeToDevice extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_datetime_to_device';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $devices = Device::where("status_id", Device::Active)->excludeOtherDevices()->get(["camera_sdk_url", "utc_time_zone", "device_id", "name"]);

        if ($devices->isEmpty()) {
            $this->error("No active devices found.");
            return 0;
        }

        foreach ($devices as $device) {

            $deviceTime = (new DateTime("now", new DateTimeZone($device->utc_time_zone)))->format('Y-m-d H:i:s');

            if ($device->model_number == 'OX-900') {
                (new DeviceCameraModel2Controller($device->camera_sdk_url))->updateTimeZone($device);
            } else {

                SyncDateTimeToDeviceJob::dispatch([
                    'deviceTime' => $deviceTime,
                    'device_id' => $device->device_id,
                    'name' => $device->name,
                ]);

                $this->info("Dispatched time sync for device [{$device->device_id}]");
            }
        }

        $this->info("Successfully synced time to all active devices.");
    }
}
