<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SyncAttendanceStatuses extends Command
{
    /**
     * Usage: 
     * php artisan attendance:sync {date?} {company_id?}
     */
    protected $signature = 'attendance:sync {date?} {company_id?}';
    protected $description = 'Syncs attendance records with O(1) holiday lookup and optional company filtering.';

    public function handle()
    {
        $dateArgument = $this->argument('date');
        $companyArgument = $this->argument('company_id');

        $date = $dateArgument ? Carbon::parse($dateArgument) : Carbon::yesterday();
        $dateString = $date->toDateString();

        $this->info("--- Initializing Sync: $dateString ---");

        // 1. Delete Previous Records for this date
        $deleteQuery = Attendance::whereDate('date', $dateString);

        if ($companyArgument) {
            $deleteQuery->where('company_id', $companyArgument);
            $this->warn("Clearing existing records for Company ID: $companyArgument on $dateString");
        } else {
            $this->warn("Clearing ALL existing records for $dateString");
        }

        $deletedCount = $deleteQuery->delete();
        $this->info("Deleted $deletedCount existing records.");

        // 2. Fetch Holidays (O(1) lookup preparation)
        $holidayQuery = DB::table('holidays')
            ->whereDate('start_date', '<=', $dateString)
            ->whereDate('end_date', '>=', $dateString);

        if ($companyArgument) {
            $holidayQuery->where('company_id', $companyArgument);
        }

        $holidayCompanyIds = $holidayQuery->pluck('company_id')->flip()->toArray();

        // 3. Process All Employees (Since we deleted previous logs, we don't need whereNotIn)
        $employeeQuery = Employee::query();

        if ($companyArgument) {
            $employeeQuery->where('company_id', $companyArgument);
        }

        // Always eager load schedule relationship
        $employeeQuery->with(['schedule' => function ($q) use ($companyArgument) {
            if ($companyArgument) {
                $q->where('company_id', $companyArgument);
            }
        }]);

        $totalEmployees = $employeeQuery->count();
        $this->info("Processing $totalEmployees employees.");

        $employeeQuery->chunkById(500, function ($employees) use ($dateString, $holidayCompanyIds) {
            $batch = [];
            $counts = ['H' => 0, 'A' => 0];

            foreach ($employees as $employee) {
                $status = isset($holidayCompanyIds[$employee->company_id]) ? "H" : "A";
                $counts[$status]++;

                $shiftId = $employee->schedule?->shift?->id ?? null;
                $shiftTypeId = $employee->schedule?->shift?->shift_type_id ?? null;

                $payload = [
                    // Use system_user_id (not the badge `employee_id`) — `attendances.employee_id`
                    // is the FK that joins to `employees.system_user_id` (see Attendance::employee
                    // relation). Writing the badge here was the source of the long-running bug
                    // where employees with employee_id != system_user_id (legacy data) showed as
                    // ABSENT in every report: this every-minute job kept overwriting their real
                    // recalculated rows with empty placeholder rows under the wrong key.
                    'employee_id'   => $employee->system_user_id,
                    'company_id'    => $employee->company_id,
                    'branch_id'     => $employee->branch_id,
                    'date'          => $dateString,
                    'status'        => $status,
                    'roster_id'     => 0,
                    'total_hrs'     => '---',
                    'in'            => '---',
                    'out'           => '---',
                    'ot'            => '---',
                    'device_id_in'  => '---',
                    'device_id_out' => '---',
                    'shift_id'      => $shiftId,
                    'shift_type_id' => $shiftTypeId,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ];

                $batch[] = $payload;
            }

            if (!empty($batch)) {
                Attendance::insert($batch);
                $this->line("<fg=cyan>Batch Inserted:</> H: {$counts['H']} | A: {$counts['A']}");
            }
        });

        $this->info("--- Sync Completed Successfully ---");
    }
}
