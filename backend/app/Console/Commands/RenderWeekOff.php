<?php

namespace App\Console\Commands;

use App\Jobs\RenderWeekOffJob;
use App\Models\Attendance;
use App\Models\Company;
use Illuminate\Console\Command;

class RenderWeekOff extends Command
{
    // Keeping the signature
    protected $signature = 'render:weekoff {month=10} {employee_id?}';
    protected $description = 'Set attendance status for weekoffs. Runs for all companies or a specified employee.';

    public function handle()
    {
        $month = $this->argument('month');
        $employeeId = $this->argument('employee_id');

        // --- Initialize companyIds as an empty collection ---
        $companyIds = collect([]); 

        // --- Determine Target Company/Companies ---
        
        if ($employeeId) {
            // Case 1: Single Employee specified
            
            // Ask the user for the company_id
            $companyId = $this->ask("Please enter the **Company ID** for Employee **{$employeeId}** (e.g., 1, 5, 22)");

            if (empty($companyId) || !is_numeric($companyId)) {
                $this->error('Company ID cannot be empty and must be a number. Aborting.');
                return Command::FAILURE;
            }

            // Optional: Basic validation to ensure the company exists
            if (!Company::where('id', $companyId)->exists()) {
                 $this->error("Company ID **{$companyId}** does not exist in the database. Aborting.");
                 return Command::FAILURE;
            }

            $companyId = (int) $companyId; // Cast to integer for safety
            
            // Set the company IDs collection to just the one company
            $companyIds = collect([$companyId]);
            $this->info("Processing single employee **{$employeeId}** belonging to confirmed Company **{$companyId}**.");

        } else {
            // Case 2: No Employee specified (Run for ALL companies)
            
            // Get all company IDs directly from the Company model
            $companyIds = Company::pluck('id');

            if ($companyIds->isEmpty()) {
                $this->info('No companies found in the database. Aborting.');
                return Command::SUCCESS;
            }

            $this->info('Starting weekoff rendering for ' . $companyIds->count() . ' companies.');
        }
        
        // --- Loop over the determined Company IDs ---

        $this->newLine();
        foreach ($companyIds as $companyId) {
            
            // Determine which employee(s) to process for the current company
            $employeeIdsToProcess = $employeeId
                ? collect([$employeeId]) 
                // Only select employees who belong to this company (relevant only for Case 2 / ALL companies run)
                : Attendance::where('company_id', $companyId)
                ->distinct()
                ->pluck('employee_id'); 

            if ($employeeIdsToProcess->isEmpty()) {
                $this->comment("Skipping Company {$companyId}: No employees to process.");
                continue; // Move to the next company
            }

            $this->line("--- Processing Company: **{$companyId}** (Employees: {$employeeIdsToProcess->count()}) ---");

            foreach ($employeeIdsToProcess as $empId) {
                // Dispatch the job
                RenderWeekOffJob::dispatch($companyId, $month, $empId);

                $this->comment("RenderWeekOff job dispatched for employee **{$empId}** of company **{$companyId}**, month {$month}.");
            }
        }

        $this->info('✅ All RenderWeekOff jobs have been dispatched.');

        return Command::SUCCESS;
    }
}