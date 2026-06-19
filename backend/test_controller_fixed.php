<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Testing GovernmentHolidaysController with fixed ICS parser...\n\n";
    
    $controller = new \App\Http\Controllers\GovernmentHolidaysController();
    
    $request = new \Illuminate\Http\Request([
        'country_code' => 'AE',
        'year' => 2026
    ]);
    
    $response = $controller->index($request);
    $result = json_decode($response->content(), true);
    
    echo "Response Status: " . $response->status() . "\n";
    echo "Success: " . ($result['success'] ? 'true' : 'false') . "\n";
    echo "Country: " . $result['country'] . "\n";
    echo "Holidays found: " . count($result['data']) . "\n";
    
    if (count($result['data']) > 0) {
        echo "\n✅ Sample 2026 holidays:\n";
        foreach (array_slice($result['data'], 0, 5) as $h) {
            echo "- " . $h['name'] . " (" . $h['start_date'] . ")\n";
        }
    } else {
        echo "\nMessage: " . $result['message'] . "\n";
    }
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
