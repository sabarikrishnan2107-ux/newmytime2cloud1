<?php

namespace App\Console\Commands\Test;

use App\Models\CompanyBranch;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class RemoveDataByFilterId extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'remove-data-by-filter-id';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete records from a table by Company ID and Branch ID filters';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $email = $this->ask("Email");
        $password = $this->ask("Password");

        $user = User::where('email', $email)
            ->with("company:id,expiry")
            ->first();

        if ($user->company_id > 0 && $user->company->expiry < now()) {
            $this->error('Subscription has been expired.');
            return 1;
        }

        if (!$user || !Hash::check($password, $user->password)) {
            $this->error('The provided credentials are incorrect.');
            return 1;
        }

        $branchId = $this->ask("Enter Branch Id", 1);
        $table = $this->ask("Enter table name");
        $deleted = 0;

        if (empty($table)) {
            $this->error("Table name cannot be empty.");
            return 1; // Non-zero return code indicates error
        }

        if (!Schema::hasTable($table)) {
            $this->error("The table '{$table}' does not exist in the database.");
            return 1;
        }

        $confirmation = $this->confirm("Are you sure you want to delete?", false);

        if (!$confirmation) {
            $this->info("Operation cancelled.");
            return 0;
        }

        $branchName = CompanyBranch::whereId($branchId)->value("branch_name");

        try {

            $deleted = DB::table($table)
                ->where('company_id', $user->company_id)
                ->where('branch_id', $branchId)
                ->delete();

            $description = "deleted {$deleted} record(s) from the '{$table}' table for Branch '{$branchName}'.";

            recordAction([
                "user_id" => $user->id,
                "company_id" => $user->company_id,
                "action" => "Employee",
                "type" => "EmployeeDelete",
                "model_type" => "user",
                "description" => $description,
            ]);


            $this->info($description);
        } catch (\Exception $e) {
            $this->error("Error: " . $e->getMessage());
        }

        return 0;
    }
}
