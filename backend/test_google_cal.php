<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Testing Google Calendar ICS feed...\n\n";
    
    $icsUrl = 'https://calendar.google.com/calendar/ical/en.ae%23holiday%40group.v.calendar.google.com/public/basic.ics';
    
    $response = \Illuminate\Support\Facades\Http::withoutVerifying()
        ->timeout(10)
        ->get($icsUrl);

    echo "Status: " . $response->status() . "\n";
    
    if ($response->successful()) {
        $content = $response->body();
        echo "Response length: " . strlen($content) . " bytes\n\n";
        
        // Show first 2000 bytes
        echo "First 2000 bytes:\n";
        echo substr($content, 0, 2000) . "\n\n";
        
        // Count VEVENT entries
        $eventCount = substr_count($content, 'BEGIN:VEVENT');
        echo "Total VEVENT entries: " . $eventCount . "\n\n";
        
        // Extract and show first 5 events
        echo "Sample events:\n";
        $lines = explode("\n", $content);
        $inEvent = false;
        $eventLines = 0;
        $eventNum = 0;
        
        foreach ($lines as $line) {
            if (strpos($line, 'BEGIN:VEVENT') !== false) {
                $inEvent = true;
                $eventNum++;
                if ($eventNum > 5) break;
                echo "\n--- Event $eventNum ---\n";
            } elseif (strpos($line, 'END:VEVENT') !== false) {
                $inEvent = false;
            } elseif ($inEvent && ($eventNum <= 5)) {
                if (strpos($line, 'DTSTART') !== false || strpos($line, 'SUMMARY') !== false) {
                    echo trim($line) . "\n";
                }
            }
        }
    } else {
        echo "Error: " . $response->body() . "\n";
    }
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
