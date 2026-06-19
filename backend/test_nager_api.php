<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    // Test the Nager.Date API for UAE (AE) in 2026
    $year = 2026;
    $country = 'AE';
    
    echo "Testing Nager.Date API...\n";
    echo "URL: https://date.nager.at/api/v3/PublicHolidays/{$year}/{$country}\n\n";

    $response = \Illuminate\Support\Facades\Http::withoutVerifying()
        ->timeout(10)
        ->get("https://date.nager.at/api/v3/PublicHolidays/{$year}/{$country}");

    echo "Status: " . $response->status() . "\n";
    
    if ($response->successful()) {
        $holidays = $response->json();
        echo "Found " . count($holidays) . " holidays\n\n";
        
        foreach (array_slice($holidays, 0, 5) as $holiday) {
            echo "- " . $holiday['name'] . " (" . $holiday['date'] . ")\n";
        }
    } else {
        echo "Error: " . $response->body() . "\n";
    }
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
