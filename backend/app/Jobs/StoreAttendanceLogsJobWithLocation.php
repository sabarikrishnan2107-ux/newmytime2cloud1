<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class StoreAttendanceLogsJobWithLocation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $logs;

    /**
     * Create a new job instance.
     */
    public function __construct(array $logs)
    {
        $this->logs = $logs;
    }

    /**
     * Execute the job.
     */
    public function handle()
    {
        foreach ($this->logs as &$log) {
            info('Processing log', $log);  // Optional: log coordinates
            $log['gps_location'] = $this->reverseGeocode($log['lat'], $log['lon']);
        }

        try {
            DB::table('attendance_logs')->insert($this->logs);
            info("✅ Logs inserted successfully", ['count' => count($this->logs)]);
        } catch (\Exception $e) {
            Log::error("Insert failed in Job: " . $e->getMessage());
        }
    }

    /**
     * Reverse geocode helper
     */
    private function reverseGeocode($lat, $lon)
    {
        if (!is_numeric($lat) || !is_numeric($lon)) {
            $msg = "❌ Invalid coordinates: lat=$lat, lon=$lon";
            info($msg);
            return $msg;
        }

        $apiKey = env('GOOGLE_MAPS_KEY');
        if (!$apiKey) {
            $msg = "❌ Missing Google Maps API Key";
            info($msg);
            return $msg;
        }

        $url = "https://maps.googleapis.com/maps/api/geocode/json";

        try {
            $response = Http::timeout(10)->retry(2, 200)->get($url, [
                'latlng'   => "$lat,$lon",
                'key'      => $apiKey,
                'language' => 'en'
            ]);

            if (!$response->successful()) {
                $msg = "❌ Google API HTTP Error (Status: {$response->status()})";
                info($msg, ['body' => $response->body()]);
                return $msg;
            }

            $data = $response->json();

            if (($data['status'] ?? null) !== "OK") {
                $status = $data['status'] ?? 'UNKNOWN';
                $error  = $data['error_message'] ?? 'No message';
                $msg = "⚠ Google API Error: $status - $error";
                info($msg);
                return $msg;
            }

            $address = $data['results'][0]['formatted_address'] ?? null;

            if (!$address) {
                $msg = "⚠ No formatted address for $lat, $lon";
                info($msg);
                return $msg;
            }

            return $address;

        } catch (\Throwable $e) {
            $msg = "🔥 ReverseGeocode Exception: " . $e->getMessage();
            info($msg);
            return $msg;
        }
    }
}
