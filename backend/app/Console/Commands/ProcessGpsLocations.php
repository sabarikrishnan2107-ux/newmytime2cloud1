<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use App\Models\AttendanceLog;

class ProcessGpsLocations extends Command
{
    protected $signature = 'logs:process-gps';
    protected $description = 'Process lat/lon logs and update gps_location with caching and rate control';

    public function handle()
    {
        $this->info('Processing GPS logs...');

        $address = $this->reverseGeocode("25.2632555", "55.2914216");

        $this->info($address);

        return;

        $this->info('Processing GPS logs...');

        // Fetch limited rows to avoid API overflow
        $logs = AttendanceLog::whereNotNull('lat')
            ->whereNotNull('lon')
            ->whereNull('gps_location')
            ->limit(100)     // Safe batch size
            ->select("id", "lat", "lon", "gps_location")
            ->get();

        if ($logs->isEmpty()) {
            $this->info('No logs to process.');
            return;
        }

        foreach ($logs as $log) {

            $lat = trim($log->lat);
            $lon = trim($log->lon);

            // 1️⃣ CHECK CACHE
            $cached = DB::table('gps_cache')
                ->where('lat', $lat)
                ->where('lon', $lon)
                ->first();

            if ($cached) {
                $this->info("Using cached for $lat,$lon");
                $this->updateGPSLocation($log, $lat, $lon, $cached->gps_location);
                continue;
            }

            // 2️⃣ CALL REVERSE GEOCODE API ONE TIME
            $this->info("Calling API for $lat,$lon ...");

            try {
                $address = $this->reverseGeocode($lat, $lon);

                $this->updateGPSLocation($log, $lat, $lon, $address);

                if ($address) {
                    // Save to main table
                    $log->gps_location = $address;
                    $log->save();

                    // Save to cache
                    DB::table('gps_cache')->insert([
                        'lat' => $lat,
                        'lon' => $lon,
                        'gps_location' => $address,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $this->info("Saved successfully.");
                } else {
                    $this->error("API returned empty for $lat,$lon");
                }
            } catch (\Exception $e) {
                $this->error("Error: " . $e->getMessage());
            }

            // OPTIONAL rate limit sleep
            sleep(1); // Avoid API hitting too fast
        }

        $this->info('GPS processing completed!');
    }

    private function reverseGeocode($lat, $lon)
    {
        $apiKey = env('LOCATIONIQ_KEY');

        try {
            $url = "https://us1.locationiq.com/v1/reverse.php";

            $response = Http::withoutVerifying()->get($url, [
                'key' => $apiKey,
                'lat' => $lat,
                'lon' => $lon,
                'format' => 'json',
                'normalizeaddress' => 1,
                'accept-language' => 'en'
            ]);

            if ($response->successful()) {
                $address = $response->json('address') ?? [];

                $road          = trim($address['road'] ?? '');
                $neighbourhood = trim($address['neighbourhood'] ?? '');
                $suburb        = trim($address['suburb'] ?? '');
                $city          = trim($address['city'] ?? $address['town'] ?? $address['village'] ?? '');
                $country       = trim($address['country'] ?? '');

                $parts = array_filter([$road, $neighbourhood, $suburb, $city, $country]);


                return implode(', ', $parts);
            }
        } catch (\Exception $e) {
        }

        return null; // explicit fallback if API fails
    }
}
