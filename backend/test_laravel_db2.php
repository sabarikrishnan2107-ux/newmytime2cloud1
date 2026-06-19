<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    $pdo = \Illuminate\Support\Facades\DB::connection()->getPdo();
    echo "DB Connected! Driver: " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) . "\n";

    // Try to find the user
    $user = \App\Models\User::where('email', 'sabari@gmail.com')->first();
    if ($user) {
        echo "User found: " . $user->email . " | user_type: " . $user->user_type . "\n";
    } else {
        echo "User NOT found with email sabari@gmail.com\n";
        // List some users
        $users = \App\Models\User::select('email','user_type')->limit(5)->get();
        echo "Sample users:\n";
        foreach ($users as $u) {
            echo "  - " . $u->email . " (" . $u->user_type . ")\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
