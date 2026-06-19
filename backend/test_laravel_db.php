<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    \Illuminate\Support\Facades\DB::connection()->getPdo();
    echo "Laravel DB Connected!\n";
} catch (\Exception $e) {
    echo "Laravel DB Error: " . $e->getMessage() . "\n";
}
