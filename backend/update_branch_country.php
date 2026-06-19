<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    $branch = \App\Models\CompanyBranch::find(86);
    $branch->country = 'AE';
    $branch->timezone = 'Asia/Dubai'; // Also set timezone for Dubai
    $branch->save();
    
    echo "✅ Updated branch 86\n";
    echo "Country: " . $branch->country . "\n";
    echo "Timezone: " . $branch->timezone . "\n";
    echo json_encode($branch->toArray(), JSON_PRETTY_PRINT) . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
