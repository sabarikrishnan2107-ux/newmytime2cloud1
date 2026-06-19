<?php

namespace App\Console\Commands\AI;

use Illuminate\Console\Command;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CheckConsecutiveAttendancIssue extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:check-consecutive-attendanc-issue {--company_id=} {--from_date=} {--to_date=} {--type=late} {--streak=3}';

    // php artisan ai:check-consecutive-attendanc-issue --company_id=2 --type=late --streak=3
    // php artisan ai:check-consecutive-attendanc-issue --company_id=2 --type=early --streak=3
    // php artisan ai:check-consecutive-attendanc-issue --company_id=2 --type=absent --streak=3

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Find employees with N consecutive late, early, or absent in a given period.';

    /**
     * Execute the console command.
     */
    public function handle()
    {

        $companyId = $this->option('company_id');
        if ($this->option('from_date')) {
            $fromDate = Carbon::parse($this->option('from_date'))->startOfDay();
        } else {
            $fromDate = Carbon::now()->subDays(2)->startOfDay(); // last 3 days: today, yesterday, day before
        }
        if ($this->option('to_date')) {
            $toDate = Carbon::parse($this->option('to_date'))->endOfDay();
        } else {
            $toDate = Carbon::now()->endOfDay();
        }
        $type = strtolower($this->option('type') ?? 'late');
        $streakTarget = (int) ($this->option('streak') ?? 3);

        if (!in_array($type, ['late', 'early', 'absent'])) {
            $this->error('Invalid type. Allowed: late, early, absent');
            return 1;
        }
        if ($streakTarget < 2) {
            $this->error('Streak must be at least 2.');
            return 1;
        }

        if (!$companyId) {
            $this->error('company_id is required.');
            return 1;
        }


        // Fetch all attendances for the company and date range in one query
        // Select fields based on type
        $fields = ['employee_id', 'date'];
        if ($type === 'late') {
            $fields[] = 'late_coming';
        } elseif ($type === 'early') {
            $fields[] = 'early_going';
        } elseif ($type === 'absent') {
            $fields[] = 'status';
        }

        $attendances = Attendance::where('company_id', $companyId)
            ->whereBetween('date', [$fromDate->toDateString(), $toDate->toDateString()])
            ->orderBy('employee_id')
            ->orderBy('date')
            ->get($fields);

        // Group attendances by employee_id
        $grouped = $attendances->groupBy('employee_id');
        $results = [];
        foreach ($grouped as $employeeId => $records) {
            $streak = 0;
            $streakDates = [];
            foreach ($records as $attendance) {
                $isMatch = false;
                if ($type === 'late') {
                    $isMatch = ($attendance->late_coming !== null && $attendance->late_coming !== '---');
                } elseif ($type === 'early') {
                    $isMatch = ($attendance->early_going !== null && $attendance->early_going !== '---');
                } elseif ($type === 'absent') {
                    $isMatch = (strtoupper($attendance->status ?? '') === 'A');
                }
                if ($isMatch) {
                    $streak++;
                    $streakDates[] = $attendance->date;
                    if ($streak == $streakTarget) {
                        $results[$employeeId][] = implode(', ', array_slice($streakDates, -$streakTarget));
                    } elseif ($streak > $streakTarget) {
                        $results[$employeeId][] = $attendance->date;
                    }
                } else {
                    $streak = 0;
                    $streakDates = [];
                }
            }
        }

        if (empty($results)) {
            $this->info('No employees found with 3 consecutive late comings.');
            return 0;
        }



        $typeLabel = [
            'late' => 'consecutive late',
            'early' => 'consecutive early out',
            'absent' => 'consecutive absent',
        ][$type] ?? $type;

        $feedRows = [];
        foreach ($results as $employeeId => $dates) {
            $employee = Employee::where('system_user_id', $employeeId)->first();
            $name = $employee ? ($employee->first_name) : $employeeId;
            $desc = "$name with Employee ID ({$employeeId}) has {$streakTarget}+ $typeLabel on: " . implode(' | ', $dates);
            $this->info($desc);

            foreach ($dates as $dateGroup) {
                $feedRows[] = [
                    'company_id' => $companyId,
                    'employee_id' => $employee->id ?? 0,
                    'type' => $type,
                    'description' => $desc,
                    'data' => json_encode([
                        'employee_id' => $employeeId,
                        'streak' => $streakTarget,
                        'dates' => $dateGroup,
                        'name' => $name,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if (!empty($feedRows)) {
            DB::table('ai_feeds')->insertOrIgnore($feedRows);
        }

        return 0;
    }
}
