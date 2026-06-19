<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Simulate exactly what the controller does
try {
    \Illuminate\Support\Facades\DB::connection()->getPdo();
    echo "SUCCESS: DB connected\n";
} catch (\Exception $e) {
    echo "FAIL: " . get_class($e) . ": " . $e->getMessage() . "\n";
}

// Check phpinfo for pdo drivers
echo "PDO drivers: " . implode(', ', PDO::getAvailableDrivers()) . "\n";
echo "DB_CONNECTION: " . env('DB_CONNECTION') . "\n";
echo "DB_HOST: " . env('DB_HOST') . "\n";
echo "DB_PORT: " . env('DB_PORT') . "\n";
