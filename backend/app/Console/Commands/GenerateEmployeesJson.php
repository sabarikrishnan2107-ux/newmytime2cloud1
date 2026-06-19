<?php

namespace App\Console\Commands;

use App\Models\Employee;
use Illuminate\Console\Command;

class GenerateEmployeesJson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'employees:generate-json';

    /**
     * The command description.
     *
     * @var string
     */
    protected $description = 'Generate and store employees JSON file for fast retrieval';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            $this->info('Generating employees JSON file...');

            // Fetch employees data
            $employees = Employee::withOut("schedule")->get([
                "id",
                "company_id",
                "employee_id",
                "system_user_id",
                "branch_id",
                "department_id",
                "first_name as name",
            ])
                ->groupBy("company_id")
                ->map(function ($group) {
                    return $group->keyBy("employee_id");
                });

            // Define file path
            $filePath = storage_path('app') . '/employees_list.json';

            // Create directory if it doesn't exist
            $directory = dirname($filePath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            // Store JSON file
            file_put_contents($filePath, json_encode($employees, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            $this->info('Employees JSON file generated successfully at: ' . $filePath);
            $this->info('File size: ' . number_format(filesize($filePath) / 1024, 2) . ' KB');

            return 0;
        } catch (\Exception $e) {
            $this->error('Error generating employees JSON: ' . $e->getMessage());
            return 1;
        }
    }
}
