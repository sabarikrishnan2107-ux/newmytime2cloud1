<?php

namespace App\Console\Commands\AI;

use App\Http\Controllers\Controller;
use App\Models\AIFeeds;
use App\Models\Company;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AIBirthdayFeed extends Command
{
    protected $signature = 'ai:birthday-feed';

    protected $description = 'Insert ai_feeds rows for employees whose birthday is today';

    public function handle()
    {
        $logger = new Controller;
        $logFilePath = 'logs/ai/birthday_feed';
        $logger->logOutPut($logFilePath, "***** Cron started: ai:birthday-feed *****");

        $today = Carbon::now()->format('m-d');
        $todayDate = Carbon::now()->toDateString();
        $insertedCount = 0;
        $skippedCount = 0;

        $companyIds = Company::pluck('id');

        foreach ($companyIds as $companyId) {
            // DOB can live on employees.date_of_birth (new form) OR emirates_info.date_of_birth (legacy).
            // Match either.
            $employees = Employee::where('company_id', $companyId)
                ->with(['emirate', 'department', 'branch', 'designation'])
                ->where(function ($q) use ($today) {
                    // employees.date_of_birth is varchar 'YYYY-MM-DD' — string-match the MM-DD suffix
                    // to avoid casting (some rows have empty/invalid values that would crash TO_CHAR).
                    $q->whereRaw("SUBSTRING(date_of_birth FROM 6 FOR 5) = ?", [$today])
                      ->orWhereHas('emirate', function ($eq) use ($today) {
                          // emirates_infos.date_of_birth is already a date type → safe to use TO_CHAR.
                          $eq->whereRaw("TO_CHAR(date_of_birth, 'MM-DD') = ?", [$today]);
                      });
                })
                ->get();

            foreach ($employees as $employee) {
                $status = self::insertForEmployee($employee);
                if ($status === 'inserted') {
                    $insertedCount++;
                    $fullName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));
                    $logger->logOutPut($logFilePath, "Inserted birthday feed for {$fullName} (id={$employee->id})");
                } elseif ($status === 'skipped') {
                    $skippedCount++;
                } else {
                    $logger->logOutPut($logFilePath, "FAILED for employee id={$employee->id}: {$status}");
                    $this->error("Failed for employee {$employee->id}: {$status}");
                }
            }
        }

        $summary = "Birthday feed complete: {$insertedCount} inserted, {$skippedCount} skipped (already existed).";
        $this->info($summary);
        $logger->logOutPut($logFilePath, $summary);
        $logger->logOutPut($logFilePath, "***** Cron ended: ai:birthday-feed *****");

        return 0;
    }

    /**
     * Insert an ai_feeds 'birthday' row for the given employee if today is their
     * birthday and a row does not already exist for today. Returns one of:
     *   'inserted' | 'skipped' | 'not_birthday' | '<error message>'
     *
     * Used by the daily cron AND by EmployeeController on new-hire creation so the
     * popup surfaces immediately without waiting for the next 00:05 run.
     */
    public static function insertForEmployee(Employee $employee): string
    {
        $dob = $employee->date_of_birth ?? ($employee->emirate->date_of_birth ?? null);
        if (! $dob) return 'not_birthday';

        $today = Carbon::now()->format('m-d');
        // date_of_birth is stored as 'YYYY-MM-DD' string. Extract MM-DD.
        $dobMd = is_string($dob) ? substr($dob, 5, 5) : Carbon::parse($dob)->format('m-d');
        if ($dobMd !== $today) return 'not_birthday';

        $exists = AIFeeds::where('company_id', $employee->company_id)
            ->where('employee_id', $employee->id)
            ->where('type', 'birthday')
            ->whereDate('created_at', Carbon::now()->toDateString())
            ->exists();
        if ($exists) return 'skipped';

        $fullName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));
        $age = Carbon::parse($dob)->age;

        // Lazy-load relations that may not be eager-loaded by the caller.
        $department = $employee->department ?? null;
        $branch = $employee->branch ?? null;
        $designation = $employee->designation ?? null;

        try {
            AIFeeds::create([
                'company_id' => $employee->company_id,
                'employee_id' => $employee->id,
                'type' => 'birthday',
                'description' => "🎉 Today is {$fullName}'s Birthday! Wishing a year full of joy, success, and milestones.",
                'data' => [
                    'employee_id' => $employee->id,
                    'employee_code' => $employee->employee_id ?? null,
                    'first_name' => $employee->first_name,
                    'last_name' => $employee->last_name,
                    'full_name' => $fullName,
                    'profile_picture' => $employee->profile_picture ?? null,
                    'department' => $department->name ?? null,
                    'branch' => $branch->branch_name ?? null,
                    'designation' => $designation->name ?? null,
                    'age' => $age,
                ],
            ]);
            return 'inserted';
        } catch (\Throwable $e) {
            return $e->getMessage();
        }
    }
}
