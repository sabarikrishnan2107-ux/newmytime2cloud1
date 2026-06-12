<?php

namespace App\Console\Commands;

use App\Models\Device;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use WebSocket\Client;

class HeartbeatListener extends Command
{
    protected $signature = 'heartbeat:listener'; // ✅ Updated here
    protected $description = 'Listen to WebSocket heartbeat events';

    public function handle()
    {
        $endpoint = "ws://192.168.2.5:8080/WebSocket";

        // $devices = [
        //     "FC-8300T20094123",
        //     "OX-8862021010010",
        // ];

        $ignoredDeviceList = [
            "M014200892205000674",
            "M014200892205000295",
            "M014200892110000134",
            "M014200892205000733",
            "OX-9662210080085",
            "OX-9662210080057",
            "OX-9662210080061",
            "OX-9662210080041",
            "OX-8862021010010",
        ];

        $devices = Device::whereNotIn("device_id", $ignoredDeviceList)->pluck('device_id')->toArray();

        $lastSeen = [];
        $lastWarned = []; // Track when the last warning was issued for each device

        foreach ($devices as $deviceId) {
            $lastSeen[$deviceId] = null;
            $lastWarned[$deviceId] = null;
        }

        try {
            $this->info("Connecting to WebSocket at $endpoint");

            $client = new Client($endpoint, [
                'timeout' => 300
            ]);

            while (true) {
                $message = $client->receive();
                $decoded = json_decode($message, true);

                if (isset($decoded['Data'])) {
                    $data = $decoded['Data'];
                    $sn = $data['SN'] ?? null;
                    $rawTime = $data['KeepAliveTime'] ?? null;

                    if ($sn && in_array($sn, $devices)) {
                        $keepAliveTime = $rawTime
                            ? Carbon::parse($rawTime)->format('Y-m-d H:i:s')
                            : 'N/A';

                        $lastSeen[$sn] = now();
                        $lastWarned[$sn] = null; // Reset warning when we receive heartbeat

                        $this->info("💓 KeepAliveTime: $keepAliveTime | SN: $sn");
                    }
                } else {
                    $this->warn("Unknown message format: $message");
                }

                // Check only every 30 seconds
                static $lastCheck = null;
                if (!$lastCheck || now()->diffInSeconds($lastCheck) >= 30) {
                    $lastCheck = now();

                    $offlineDevices = []; // Collect devices to be marked offline
                    $offlineCompanies = []; // Collect unique company IDs for Artisan call


                    foreach ($devices as $deviceId) {
                        $lastTime = $lastSeen[$deviceId];
                        $warnedTime = $lastWarned[$deviceId];

                        if (is_null($lastTime)) {
                            // Never received any heartbeat
                            if (is_null($warnedTime) || now()->diffInHours($warnedTime) >= 1) {
                                $this->warn("❌ No heartbeat received yet from $deviceId!");
                                $found = Device::where("device_id", $deviceId)->select("status_id", "company_id", "id", "device_id")->first();
                                if ($found) {
                                    $offlineDevices[] = $found->id;
                                    $offlineCompanies[$found->company_id] = true; // Using associative array to avoid duplicates
                                }
                                $lastWarned[$deviceId] = now();
                            }
                        } elseif (now()->diffInSeconds($lastTime) > 30) {
                            // Heartbeat missed
                            if (is_null($warnedTime) || now()->diffInHours($warnedTime) >= 1) {
                                $this->warn("❌ No heartbeat from $deviceId in the last 30 seconds!");
                                $found = Device::where("device_id", $deviceId)->select("status_id", "company_id", "id", "device_id")->first();
                                if ($found) {
                                    $offlineDevices[] = $found->id;
                                    $offlineCompanies[$found->company_id] = true;
                                }
                                $lastWarned[$deviceId] = now();
                            }
                        }
                    }

                    if (!empty($offlineDevices)) {
                        Device::whereIn('id', $offlineDevices)->update(['status_id' => 2]);
                        $this->info("🔧 Updated status for " . count($offlineDevices) . " offline device(s).");
                    }

                    foreach (array_keys($offlineCompanies) as $companyId) {

                        Artisan::call('alert:offline_device', [
                            'company_id' => $companyId,
                        ]);
                        $this->info("📣 Alert sent to company_id: $companyId");
                    }
                }

                usleep(100000); // Small delay
            }
        } catch (\Exception $e) {
            $this->error("WebSocket error: " . $e->getMessage());
        }
    }
}
