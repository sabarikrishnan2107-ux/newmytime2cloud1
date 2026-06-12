<?php

namespace App\Jobs;

use App\Models\Device;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncDateTimeToDeviceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public $payload) {}

    public function handle()
    {
        $payload = $this->payload;

        $baseUrl = env('SDK_URL');

        if (env('APP_ENV') === 'desktop') {
            $hostIp = gethostbyname(gethostname());
            $baseUrl = "http://{$hostIp}:8080";
        }


        $url = rtrim($baseUrl, '/') . "/{$payload['device_id']}/SetWorkParam";

        // echo "\n$url";

        // echo json_encode($payload, JSON_PRETTY_PRINT);

        // return;


        try {
            $response = Http::timeout(3000)
                ->withoutVerifying()
                ->post($url, [
                    'time' => $payload['deviceTime'],
                ])
                ->json();

            if ($response['status'] !== 200) {
                Log::error("⚠️ Failed to sync time. Device name: {$payload['name']}.");

                echo "\n ⚠️ Failed to sync time. Device name: {$payload['name']}.";
            } else {
                echo "\n✅ Time {$payload['name']} has been synced. Device name: {$payload['name']}.";
                Log::info("Time {$payload['name']} has been synced. Device name: {$payload['name']}.");

                Device::where("device_id", $payload['device_id'])->update([
                    "sync_date_time" => $payload['deviceTime'],
                ]);
            }
        } catch (\Exception $e) {
            Log::error('⚠️ Failed to communicate with SDK device.');
        }
    }
}
