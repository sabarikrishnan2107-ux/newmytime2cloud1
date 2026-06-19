<?php

namespace App\Console\Commands;

use App\Models\AttendanceLog;
use App\Models\AutoRegenerateSetting;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class RunAutoRegenerate extends Command
{
    protected $signature = 'attendance:auto-regenerate';
    protected $description = 'Run scheduled attendance regeneration based on auto_regenerate_settings';

    public function handle()
    {
        $now = Carbon::now();
        $currentTime = $now->format('H:i');
        $currentDayOfWeek = $now->dayOfWeek; // 0=Sun..6=Sat
        $currentDayOfMonth = $now->day;

        $settings = AutoRegenerateSetting::where('is_active', true)->get();

        if ($settings->isEmpty()) {
            $this->info('No active auto-regenerate settings found.');
            return;
        }

        foreach ($settings as $setting) {
            if (!$this->shouldRunNow($setting, $currentTime, $currentDayOfWeek, $currentDayOfMonth)) {
                continue;
            }

            $this->info("Running regeneration for setting #{$setting->id} (company: {$setting->company_id}, branch: {$setting->branch_id})");

            try {
                $setting->update(['last_run_status' => 'running', 'last_run_at' => now()]);

                $this->regenerate($setting);

                $setting->update([
                    'last_run_status' => 'success',
                    'last_run_message' => 'Completed at ' . now()->format('Y-m-d H:i:s'),
                ]);

                $this->info("Regeneration completed for setting #{$setting->id}");
            } catch (\Exception $e) {
                $setting->update([
                    'last_run_status' => 'failed',
                    'last_run_message' => substr($e->getMessage(), 0, 500),
                ]);

                Log::error("Auto-regenerate failed for setting #{$setting->id}: " . $e->getMessage());
                $this->error("Failed for setting #{$setting->id}: " . $e->getMessage());
            }
        }
    }

    private function shouldRunNow(AutoRegenerateSetting $setting, string $currentTime, int $dayOfWeek, int $dayOfMonth): bool
    {
        // Check time (allow 5 minute window)
        if ($setting->run_time !== $currentTime) {
            return false;
        }

        // Check if already ran today
        if ($setting->last_run_at && $setting->last_run_at->isToday() && $setting->last_run_status === 'success') {
            return false;
        }

        switch ($setting->frequency) {
            case 'daily':
                return true;

            case 'weekly':
                return $dayOfWeek === ($setting->day_of_week ?? 1); // default Monday

            case 'monthly':
                return $dayOfMonth === ($setting->day_of_month ?? 1); // default 1st

            default:
                return false;
        }
    }

    private function regenerate(AutoRegenerateSetting $setting): void
    {
        $endDate = Carbon::today();
        $startDate = $endDate->copy()->subDays($setting->lookback_days - 1);

        $companyId = $setting->company_id;
        $branchId = $setting->branch_id;

        // Get employees for this company/branch
        $employeeQuery = Employee::where('company_id', $companyId)
            ->where('status', 1);

        if ($branchId) {
            $employeeQuery->where('branch_id', $branchId);
        }

        $employees = $employeeQuery->get(['id', 'system_user_id', 'company_id', 'branch_id']);

        if ($employees->isEmpty()) {
            $this->info("No employees found for company {$companyId}" . ($branchId ? " branch {$branchId}" : ""));
            return;
        }

        $this->info("Regenerating {$employees->count()} employees from {$startDate->toDateString()} to {$endDate->toDateString()}");

        $current = $startDate->copy();
        $processedDays = 0;
        $jobsDispatched = 0;

        while ($current->lte($endDate)) {
            $dateString = $current->toDateString();

            // Step 1: Sync attendance defaults (marks H/A) for this date
            Artisan::call('attendance:sync', [
                'date' => $dateString,
                'company_id' => $companyId,
            ]);

            // Step 2: Find employees who have attendance logs on this date
            // Rejected logs (e.g. non-active employees) are excluded so their punches
            // do not get promoted to attendance records.
            $userIdsWithLogs = AttendanceLog::where('company_id', $companyId)
                ->where('LogTime', '>=', $dateString)
                ->where('LogTime', '<', Carbon::parse($dateString)->addDay()->toDateString())
                ->whereNull('rejected_reason')
                ->distinct()
                ->pluck('UserID')
                ->toArray();

            // Step 3: Only recalculate employees who actually have logs
            foreach ($employees as $employee) {
                if (!in_array($employee->system_user_id, $userIdsWithLogs)) {
                    continue; // No logs for this employee on this date
                }

                try {
                    \App\Jobs\RecalculateEmployeeAttendance::dispatch(
                        $employee->id,
                        $companyId,
                        $dateString,
                        'auto-regenerate'
                    );
                    $jobsDispatched++;
                } catch (\Exception $e) {
                    Log::warning("Recalculate failed for employee {$employee->id} on {$dateString}: " . $e->getMessage());
                }
            }

            $processedDays++;
            $current->addDay();
        }

        $this->info("Completed: {$processedDays} days processed, {$jobsDispatched} recalculation jobs dispatched");
    }
}
