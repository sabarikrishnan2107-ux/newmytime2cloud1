<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Searching for 2026 events in Google Calendar ICS...\n\n";
    
    $icsUrl = 'https://calendar.google.com/calendar/ical/en.ae%23holiday%40group.v.calendar.google.com/public/basic.ics';
    
    $response = \Illuminate\Support\Facades\Http::withoutVerifying()
        ->timeout(10)
        ->get($icsUrl);

    if ($response->successful()) {
        $content = $response->body();
        $lines = explode("\n", $content);
        
        $events2026 = [];
        $inEvent = false;
        $currentEvent = [];
        
        foreach ($lines as $line) {
            if (strpos($line, 'BEGIN:VEVENT') !== false) {
                $inEvent = true;
                $currentEvent = [];
            } elseif (strpos($line, 'END:VEVENT') !== false) {
                $inEvent = false;
                
                // Check if this event is in 2026
                if (isset($currentEvent['DTSTART']) && strpos($currentEvent['DTSTART'], '2026') !== false) {
                    $events2026[] = $currentEvent;
                }
            } elseif ($inEvent) {
                if (preg_match('/^([A-Z;=]+):(.*)$/', trim($line), $m)) {
                    $currentEvent[$m[1]] = $m[2];
                }
            }
        }
        
        echo "Found " . count($events2026) . " events in 2026\n\n";
        
        if (count($events2026) > 0) {
            echo "Sample 2026 events:\n";
            foreach (array_slice($events2026, 0, 10) as $event) {
                echo "- " . ($event['SUMMARY'] ?? 'Unknown') . " (" . ($event['DTSTART'] ?? 'No date') . ")\n";
            }
        } else {
            echo "❌ No events found for 2026\n";
            echo "\nSearching all years in calendar...\n";
            
            // Extract all years
            $years = [];
            foreach ($lines as $line) {
                if (strpos($line, 'DTSTART') !== false && preg_match('/:(20\d{2})/', $line, $m)) {
                    $years[$m[1]] = true;
                }
            }
            
            echo "Years in calendar: " . implode(", ", array_keys($years)) . "\n";
        }
    }
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
