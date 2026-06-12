<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Direct ICS parsing test...\n\n";
    
    $icsUrl = 'https://calendar.google.com/calendar/ical/en.ae%23holiday%40group.v.calendar.google.com/public/basic.ics';
    
    $response = \Illuminate\Support\Facades\Http::withoutVerifying()
        ->timeout(10)
        ->get($icsUrl);

    if ($response->successful()) {
        $icsContent = $response->body();
        
        $holidays = [];
        $year = 2026;
        
        $lines = explode("\n", $icsContent);
        $currentEvent = [];
        $inEvent = false;
        $eventCount = 0;

        foreach ($lines as $line) {
            $line = trim($line);
            
            if ($line === 'BEGIN:VEVENT') {
                $inEvent = true;
                $currentEvent = [];
                $eventCount++;
            } elseif ($line === 'END:VEVENT') {
                $inEvent = false;
                
                if (!empty($currentEvent)) {
                    $dtstart = null;
                    
                    // Find DTSTART regardless of format
                    foreach ($currentEvent as $key => $value) {
                        if (strpos($key, 'DTSTART') === 0) {
                            $dtstart = $value;
                            break;
                        }
                    }
                    
                    if ($dtstart && preg_match('/(\d{8})/', $dtstart, $matches)) {
                        $dateStr = $matches[1];
                        $eventYear = substr($dateStr, 0, 4);
                        
                        if ($eventYear == $year) {
                            $date = substr($dateStr, 0, 4) . "-" . substr($dateStr, 4, 2) . "-" . substr($dateStr, 6, 2);
                            $summary = $currentEvent['SUMMARY'] ?? 'Holiday';
                            
                            $holidays[] = [
                                'name' => $summary,
                                'date' => $date
                            ];
                        }
                    }
                }
            } elseif ($inEvent) {
                if (strpos($line, ':') !== false) {
                    [$key, $value] = explode(':', $line, 2);
                    $currentEvent[$key] = $value;
                }
            }
        }
        
        echo "Total events processed: " . $eventCount . "\n";
        echo "Holidays found for 2026: " . count($holidays) . "\n";
        
        if (count($holidays) > 0) {
            echo "\n✅ Sample 2026 holidays:\n";
            foreach (array_slice($holidays, 0, 10) as $h) {
                echo "- " . $h['name'] . " (" . $h['date'] . ")\n";
            }
        } else {
            echo "\n❌ No 2026 holidays found\n";
            
            // Debug: show what years we have
            $years = [];
            foreach ($lines as $line) {
                if (preg_match('/(\d{8})/', $line, $m)) {
                    $year_found = substr($m[1], 0, 4);
                    $years[$year_found] = true;
                }
            }
            echo "\nYears available: " . implode(", ", array_keys($years)) . "\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
