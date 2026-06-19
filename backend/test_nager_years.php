<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Testing Nager.Date API for different years...\n\n";
    
    foreach ([2024, 2025, 2026] as $year) {
        $response = \Illuminate\Support\Facades\Http::withoutVerifying()
            ->timeout(10)
            ->get("https://date.nager.at/api/v3/PublicHolidays/{$year}/AE");

        echo "Year $year: Status " . $response->status();
        
        if ($response->status() === 200) {
            $holidays = $response->json();
            echo " - Found " . count($holidays) . " holidays\n";
            if (count($holidays) > 0) {
                echo "  First 3:\n";
                foreach (array_slice($holidays, 0, 3) as $h) {
                    echo "    - " . $h['name'] . " (" . $h['date'] . ")\n";
                }
            }
        } else {
            echo " - No data\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
