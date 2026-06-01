<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Device;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Added Log Facade

class RectifyAttendanceLogs extends Command
{
    protected $signature = 'attendance:rectify';
    protected $description = 'Syncs attendance log_types with device function settings (Auto, In, Out, Option) - Only updates NULL log_types';

    /**
     * Helper to log to both Console and the dedicated Log File
     */
    private function logInfo($message)
    {
        $this->info($message);
        Log::channel('attendance_rectify')->info($message);
    }

    public function handle()
    {
        // Start Logging
        Log::channel('attendance_rectify')->info("--- Command Started: Rectifying all NULL log_types ---");
        $this->warn("!!! Rectifying all NULL log_types !!!");

        try {
            $deviceFunctionMap = Device::excludeMobile()
                ->get(['device_id', 'function'])
                ->pluck('function', 'device_id')
                ->toArray();

            // No date window: process every row with a NULL log_type, regardless of log_date
            // or created_at. This catches backfilled "missing logs" whose dates are old.
            $query = DB::table('attendance_logs')->whereNull('log_type');

            $totalFound = $query->count();
            
            if ($totalFound === 0) {
                $this->logInfo("Nothing to process. All logs have log_type set.");
                return;
            }

            $this->logInfo("Found {$totalFound} logs with NULL log_type to fix.");

            $correctedCount = 0;
            $processedCount = 0;

            $query->chunkById(500, function ($logs) use ($deviceFunctionMap, &$correctedCount, &$processedCount) {
                $grouped = ['Auto' => [], 'In' => [], 'Out' => [], 'Option' => []];

                foreach ($logs as $log) {
                    $deviceId = trim($log->DeviceID);
                    $deviceFunction = $deviceFunctionMap[$deviceId] ?? 'auto';

                    $expectedType = match (strtolower($deviceFunction)) {
                        'auto'   => 'Auto',
                        'in'     => 'In',
                        'out'    => 'Out',
                        'option' => 'Option',
                        default  => 'Auto',
                    };

                    $grouped[$expectedType][] = $log->id;
                    $processedCount++;
                }

                foreach ($grouped as $type => $ids) {
                    if (!empty($ids)) {
                        DB::table('attendance_logs')->whereIn('id', $ids)->update(['log_type' => $type]);
                        $correctedCount += count($ids);
                    }
                }
                
                $this->output->write(".");
            });

            $this->newLine();
            
            // Final Summary Logging
            $summary = "Summary: Processed: {$processedCount} | Corrected: {$correctedCount}";
            $this->logInfo($summary);
            $this->logInfo("✓ Successfully rectified NULL attendance logs.");

        } catch (\Exception $e) {
            $errorMessage = "Error rectifying logs: " . $e->getMessage();
            $this->error($errorMessage);
            Log::channel('attendance_rectify')->error($errorMessage, ['exception' => $e]);
        }
    }
}