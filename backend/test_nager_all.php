<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Testing Nager.Date API with different countries...\n\n";
    
    foreach (['US', 'GB', 'IN', 'AE', 'FR'] as $country) {
        $response = \Illuminate\Support\Facades\Http::withoutVerifying()
            ->timeout(10)
            ->get("https://date.nager.at/api/v3/PublicHolidays/2025/{$country}");

        echo "Country $country: Status " . $response->status();
        
        if ($response->status() === 200) {
            $holidays = $response->json();
            echo " - Found " . count($holidays) . " holidays\n";
        } else {
            echo " - No data\n";
        }
    }
    
    echo "\n\nTesting base API endpoint...\n";
    $response = \Illuminate\Support\Facades\Http::withoutVerifying()
        ->timeout(10)
        ->get("https://date.nager.at/api/v3/AvailableCountries");
    
    echo "Available countries endpoint: Status " . $response->status() . "\n";
    if ($response->status() === 200) {
        $countries = $response->json();
        echo "Countries available: " . count($countries) . "\n";
        
        // Check if AE is available
        $ae = array_filter($countries, fn($c) => $c['countryCode'] === 'AE');
        if (!empty($ae)) {
            echo "✅ AE is in the list\n";
        }
    }
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
