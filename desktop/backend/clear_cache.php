<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Clear the cache for AE 2026
\Illuminate\Support\Facades\Cache::forget('government_holidays_AE_2026');

echo "✅ Cache cleared for AE 2026\n";
