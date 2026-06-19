<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Debug: Checking DTSTART parsing...\n\n";
    
    $icsUrl = 'https://calendar.google.com/calendar/ical/en.ae%23holiday%40group.v.calendar.google.com/public/basic.ics';
    
    $response = \Illuminate\Support\Facades\Http::withoutVerifying()
        ->timeout(10)
        ->get($icsUrl);

    if ($response->successful()) {
        $content = $response->body();
        $lines = explode("\n", $content);
        
        echo "Sample DTSTART values:\n";
        $count = 0;
        
        foreach ($lines as $line) {
            if (strpos($line, 'DTSTART') !== false) {
                echo "Raw: " . trim($line) . "\n";
                
                $line = trim($line);
                // Try different parsing approaches
                
                // Method 1: Find date after colon
                if (preg_match('/:(\d{8})/', $line, $m)) {
                    $date = $m[1];
                    echo "  → Parsed: " . substr($date,0,4) . "-" . substr($date,4,2) . "-" . substr($date,6,2) . "\n";
                } else {
                    echo "  → Could not parse\n";
                }
                
                echo "\n";
                
                $count++;
                if ($count >= 5) break;
            }
        }
    }
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
