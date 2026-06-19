<?php

namespace App\Console\Commands;

use App\Jobs\RenderWeekOffJob;
use App\Models\Attendance;
use App\Models\Company;
use Illuminate\Console\Command;

class RenderWeekOffCompany extends Command
{
    /**
     * The new signature: month first, then company_id.
     * Usage: php artisan render:weekoff-company 10 5
     */
    protected $signature = 'render:weekoff-company {month} {company_id}';

    protected $description = 'Process weekoffs for all employees within a specific company for a specific month.';

    public function handle()
    {
        $month = $this->argument('month');
        $companyId = $this->argument('company_id');

        // 1. Verify Company
        $company = Company::find($companyId);
        if (!$company) {
            $this->error("❌ Company ID {$companyId} not found.");
            return Command::FAILURE;
        }

        // 2. Identify Employees
        // We pull unique employee IDs that have attendance records in this company
        $employeeIds = Attendance::where('company_id', $companyId)
            ->distinct()
            ->pluck('employee_id');

        if ($employeeIds->isEmpty()) {
            $this->warn("⚠️ No employees found for Company: {$company->name} (ID: {$companyId}).");
            return Command::SUCCESS;
        }

        $this->info("🚀 Dispatching jobs for {$employeeIds->count()} employees in {$company->name}...");
        
        // 3. Progress Tracking
        $bar = $this->output->createProgressBar($employeeIds->count());
        $bar->start();

        foreach ($employeeIds as $empId) {
            RenderWeekOffJob::dispatch($companyId, $month, $empId);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("✅ Successfully queued all weekoff jobs for Month {$month}.");

        return Command::SUCCESS;
    }
}