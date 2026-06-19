<?php

namespace App\Console\Commands;

use App\Jobs\RenderWeekOffJob;
use App\Models\Attendance;
use App\Models\Company;
use Illuminate\Console\Command;

class RenderWeekOffAllCompanies extends Command
{
    /**
     * Usage:
     *   php artisan render:weekoff-all 4             → April of current year
     *   php artisan render:weekoff-all 4 2026        → April 2026
     *   php artisan render:weekoff-all 2026-04       → April 2026
     */
    protected $signature = 'render:weekoff-all {month} {year?}';

    protected $description = 'Render weekoffs for every company for the given month (and optional year).';

    public function handle()
    {
        [$month, $year] = $this->parseMonthYear($this->argument('month'), $this->argument('year'));
        if (!$month) {
            $this->error('Invalid month. Use 1-12 or YYYY-MM.');
            return Command::FAILURE;
        }

        $companies = Company::orderBy('id')->get(['id', 'name']);
        if ($companies->isEmpty()) {
            $this->warn('No companies found.');
            return Command::SUCCESS;
        }

        $totalDispatched = 0;

        foreach ($companies as $company) {
            $employeeIds = Attendance::where('company_id', $company->id)
                ->whereYear('date', $year)
                ->whereMonth('date', $month)
                ->distinct()
                ->pluck('employee_id');

            if ($employeeIds->isEmpty()) {
                continue;
            }

            foreach ($employeeIds as $empId) {
                RenderWeekOffJob::dispatch($company->id, $month, $empId, $year);
                $totalDispatched++;
            }

            $this->info("✓ {$company->name} (id {$company->id}) — queued {$employeeIds->count()} jobs for {$year}-" . str_pad($month, 2, '0', STR_PAD_LEFT));
        }

        $this->newLine();
        $this->info("Done. Total jobs dispatched: {$totalDispatched}.");

        return Command::SUCCESS;
    }

    protected function parseMonthYear($rawMonth, $rawYear): array
    {
        if (is_string($rawMonth) && preg_match('/^(\d{4})-(\d{1,2})$/', $rawMonth, $m)) {
            return [(int) $m[2], (int) $m[1]];
        }
        $month = (int) $rawMonth;
        if ($month < 1 || $month > 12) return [null, null];
        $year = $rawYear ? (int) $rawYear : (int) now()->year;
        return [$month, $year];
    }
}
