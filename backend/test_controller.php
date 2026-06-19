<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    // Simulate the controller call
    $controller = new \App\Http\Controllers\GovernmentHolidaysController();
    
    // Create a mock request
    $request = new \Illuminate\Http\Request([
        'country_code' => 'AE',
        'year' => 2026
    ]);
    
    echo "Testing GovernmentHolidaysController::index()\n";
    echo "Country: AE, Year: 2026\n\n";
    
    $response = $controller->index($request);
    
    echo "Response Status: " . $response->status() . "\n";
    echo "Response Body:\n";
    echo json_encode(json_decode($response->content()), JSON_PRETTY_PRINT) . "\n";
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
