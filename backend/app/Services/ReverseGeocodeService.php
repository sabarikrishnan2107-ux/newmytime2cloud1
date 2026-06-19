<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ReverseGeocodeService
{
    private $baseUrl = 'https://nominatim.openstreetmap.org/reverse';

    /**
     * Get country code from latitude and longitude
     * Uses OpenStreetMap Nominatim API for reverse geocoding
     * 
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @return string|null Country code (ISO 3166-1 alpha-2) or null if not found
     */
    public function getCountryCode($lat, $lon)
    {
        if (!$lat || !$lon) {
            return null;
        }

        try {
            // Cache for 30 days - coordinates don't change
            $cacheKey = "country_code_{$lat}_{$lon}";
            
            return Cache::remember($cacheKey, now()->addDays(30), function () use ($lat, $lon) {
                \Log::info("Reverse geocoding: lat=$lat, lon=$lon");

                $response = Http::withoutVerifying()
                    ->timeout(10)
                    ->get($this->baseUrl, [
                        'lat' => $lat,
                        'lon' => $lon,
                        'format' => 'json',
                        'zoom' => 10,
                        'addressdetails' => 1,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    // Extract country code from response
                    // Nominatim returns country_code in address
                    if (isset($data['address']['country_code'])) {
                        $countryCode = strtoupper($data['address']['country_code']);
                        \Log::info("✅ Country code found: $countryCode for lat=$lat, lon=$lon");
                        return $countryCode;
                    }
                }

                \Log::warning("Could not determine country for lat=$lat, lon=$lon");
                return null;

            });
        } catch (\Exception $e) {
            \Log::error("Reverse geocoding error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get timezone from latitude and longitude
     * Uses a free timezone API
     * 
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @return string|null Timezone (e.g., "Asia/Dubai") or null if not found
     */
    public function getTimezone($lat, $lon)
    {
        if (!$lat || !$lon) {
            return null;
        }

        try {
            // Cache for 30 days
            $cacheKey = "timezone_{$lat}_{$lon}";
            
            return Cache::remember($cacheKey, now()->addDays(30), function () use ($lat, $lon) {
                \Log::info("Getting timezone: lat=$lat, lon=$lon");

                // Using TimeZoneDB API (free tier available)
                $response = Http::withoutVerifying()
                    ->timeout(10)
                    ->get('https://api.timezonedb.com/v2.1/get-time-zone', [
                        'key' => env('TIMEZONE_API_KEY', 'free'), // Free tier key
                        'format' => 'json',
                        'by' => 'position',
                        'lat' => $lat,
                        'lng' => $lon,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    if (isset($data['zoneName']) && $data['status'] === 'OK') {
                        $timezone = $data['zoneName'];
                        \Log::info("✅ Timezone found: $timezone for lat=$lat, lon=$lon");
                        return $timezone;
                    }
                }

                \Log::warning("Could not determine timezone for lat=$lat, lon=$lon");
                return null;

            });
        } catch (\Exception $e) {
            \Log::error("Timezone API error: " . $e->getMessage());
            return null;
        }
    }
}
