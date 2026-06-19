<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use Illuminate\Console\Command;
use App\Models\AttendanceLog;
use Carbon\Carbon;

class DeleteOldRecords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * Run using: php artisan attendance_logs:cleanup
     */
    protected $signature = 'delete_old_records';

    /**
     * The console command description.
     */
    protected $description = 'Delete attendance logs older than the first day of the current month of last year';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the start of the current month of last year
        $cutoffDate = Carbon::now()->subYear()->startOfMonth();

        // Delete logs that are older than the cutoff date
        $deletedAttendanceLogs = AttendanceLog::where('LogTime', '<', $cutoffDate)->delete();
        $deletedAttendances = Attendance::where('date', '<', $cutoffDate)->delete();

        // Inform the user how many records were deleted
        $this->info("Deleted {$deletedAttendanceLogs} attendance logs older than " . $cutoffDate->toDateString());
        $this->info("Deleted {$deletedAttendances} attendance logs older than " . $cutoffDate->toDateString());
    }
}
