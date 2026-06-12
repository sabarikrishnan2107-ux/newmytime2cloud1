<?php
namespace App\Console\Commands\Shift;

use App\Http\Controllers\Shift\MultiShiftController;
use App\Models\Shift;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Collection;

class SyncMultiShiftForDualDay extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_multi_shift_dual_day {company_id} {date} {checked?} {UserID?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronizes multi-shift data for dual-day shifts, processing employees in chunks to avoid timeouts.';

    /**
     * Define the size of the chunks for processing.
     *
     * @var int
     */
    protected $chunkSize = 100;

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        // --- 1. SET RESOURCE LIMITS FOR LONG-RUNNING TASK ---
        // Set execution time to unlimited (0) to prevent process termination
        ini_set('max_execution_time', 0); 
        // Increase memory limit to a high value (e.g., 512MB) for safety
        ini_set('memory_limit', '512M'); 
        
        $id = $this->argument("company_id");
        $date = $this->argument("date");

        $this->info("Starting multi-shift sync for Company ID: {$id} on Date: {$date}");

        // 1. Initial Check for Shift Type 2
        $found = Shift::where("company_id", $id)->where("shift_type_id", 2)->count();

        if ($found == 0) {
            $this->warn("No 'Dual Day' shifts (shift_type_id 2) found for company ID {$id}. Exiting.");
            return 0;
        }

        // 2. Query Construction to get all unique User IDs
        $model = DB::table('schedule_employees as se')
            ->join('attendance_logs as al', 'se.employee_id', '=', 'al.UserID')
            ->join('shifts as sh', 'sh.id', '=', 'se.shift_id')
            ->select('al.UserID')
            // IMPORTANT: Re-enable distinct() to ensure each employee ID is processed once, 
            // otherwise pluck() will return duplicates, severely impacting performance.
            ->distinct() 
            ->where('sh.shift_type_id', "=", 2)
            ->where('se.company_id', $id)
            ->where('al.company_id', $id)
            ->whereDate('al.log_date', $date);

        // Apply optional UserID filter if provided
        $model->when($this->argument("UserID"), function ($query, $userID) {
            return $query->where('al.UserID', $userID);
        });

        // 3. Execute the query and process the results in chunks
        $totalProcessed = 0;
        $controller = new MultiShiftController();

        $this->info("Fetching all unique employee IDs scheduled for shift type 2 with logs on {$date}...");

        $model->pluck('al.UserID') // Fetch the collection of all unique User IDs
            ->chunk($this->chunkSize) // Split the collection into smaller chunks (e.g., 10 IDs)
            // The type hint is correct (Illuminate\Support\Collection)
            ->each(function (Collection $employeeIdsChunk) use ($id, $date, $controller, &$totalProcessed) {
                
                // --- FIX FOR LIVE SERVER STUCK/TIMEOUT ISSUE ---
                // Reconnect to the database to prevent connection loss during long idle periods (PHP processing)
                DB::reconnect();
                // ---------------------------------------------
                
                $employeeIdsArray = $employeeIdsChunk->toArray();
                // Removed the echo json_encode(), as it may interfere with console output
                $count = count($employeeIdsArray);

                $this->comment("Processing batch of {$count} employees...");

                // Call the controller's render method with the small chunk
                $result = $controller->render($id, $date, 2, $employeeIdsArray, true, "kernel");
                
                $totalProcessed += $count;

                // Output feedback for the processed batch
                $this->info("  -> Batch processed. Total employees synced so far: {$totalProcessed}");
                
                // --- MEMORY CLEANUP ---
                // Force garbage collection to free up memory immediately after expensive operation
                gc_collect_cycles();
                $this->line("  -> Current Memory Usage: " . round(memory_get_usage(true) / 1024 / 1024, 2) . " MB");
                // ----------------------
            });

        $this->info("========================================");
        $this->info("✅ Multi-shift sync successfully completed for {$date}.");
        $this->info("Total unique employees processed: {$totalProcessed}.");
        $this->info("========================================");

        return 0;
    }
}
