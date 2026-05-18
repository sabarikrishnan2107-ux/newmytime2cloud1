<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Company;
use App\Models\CompanyBranch;
use App\Models\Employee;
use App\Models\EmployeeLeaves;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

class AbsentReportService
{
    public function buildPayload(Request $request): array
    {
        $mode = $request->input('mode') === 'daily' ? 'daily' : 'monthly';

        if ($mode === 'daily') {
            return $this->buildDailyPayload($request);
        }
        return $this->buildMonthlyPayload($request);
    }

    /**
     * Resolve the in-scope employees for an absent report.
     * Returns an Eloquent Collection keyed by system_user_id, eager-loaded with
     * department, branch, designation, and current schedule.shift.
     */
    public function resolveEmployees(Request $request): Collection
    {
        $companyId = (int) $request->input('company_id');

        $branchIds = $this->parseIds($request->input('branch_ids'));
        $departmentIds = $this->parseIds($request->input('department_ids'));
        $employeeIds = $this->parseIds($request->input('employee_ids'));
        $employeeTypes = (array) $request->input('employee_types', []);

        $query = Employee::query()
            ->where('company_id', $companyId)
            ->where('status', 1)
            ->select([
                'id', 'system_user_id', 'employee_id',
                'first_name', 'last_name', 'full_name', 'display_name',
                'department_id', 'branch_id', 'designation_id',
                'profile_picture', 'local_email', 'whatsapp_number',
                'employee_type',
            ])
            ->with([
                'department:id,name',
                'branch:id,branch_name',
                'designation:id,name',
                'schedule:id,employee_id,shift_id',
                'schedule.shift:id,name,on_duty_time,off_duty_time',
            ])
            ->when($branchIds, fn($q) => $q->whereIn('branch_id', $branchIds))
            ->when($departmentIds, fn($q) => $q->whereIn('department_id', $departmentIds))
            ->when($employeeIds, fn($q) => $q->whereIn('system_user_id', $employeeIds))
            ->when($employeeTypes, fn($q) => $q->whereIn('employee_type', $employeeTypes));

        return $query->get()->keyBy('system_user_id');
    }

    public function buildDailyPayload(Request $request): array
    {
        $companyId = (int) $request->input('company_id');
        $date = $request->input('from_date');
        $employees = $this->resolveEmployees($request);
        $employeeSystemIds = $employees->pluck('system_user_id')->all();
        $employeeIds = $employees->pluck('id')->all();

        // 1. Attendances for the date, status = 'A'
        $absentRows = Attendance::query()
            ->where('company_id', $companyId)
            ->whereDate('date', $date)
            ->where('status', 'A')
            ->whereIn('employee_id', $employeeSystemIds)
            ->with(['shift:id,name,on_duty_time,off_duty_time'])
            ->get();

        // 2. Approved leaves covering this date for these employees
        $approvedLeaves = EmployeeLeaves::query()
            ->where('company_id', $companyId)
            ->where('status', EmployeeLeaves::APPROVED)
            ->whereIn('employee_id', $employeeIds)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->with('leave_type:id,name,short_name')
            ->get()
            ->keyBy('employee_id');

        // 3. Build rows
        $rows = [];
        foreach ($absentRows as $att) {
            $emp = $employees->get($att->employee_id);
            if (!$emp) continue;

            $leave = $approvedLeaves->get($emp->id);
            $absentType = $leave
                ? strtoupper($leave->leave_type->name ?? 'APPROVED')
                : 'NO-SHOW';

            $shift = $att->shift ?? optional($emp->schedule)->shift;
            $shiftName = $shift->name ?? '—';
            $shiftTime = $shift
                ? $this->formatTime($shift->on_duty_time) . '–' . $this->formatTime($shift->off_duty_time)
                : '—';

            $rows[] = [
                'id' => $emp->system_user_id,
                'initials' => $this->initialsOf($emp),
                'name' => $this->displayName($emp),
                'emp_id' => $this->formatEmpId($emp->employee_id, $emp->system_user_id),
                'designation' => optional($emp->designation)->name ?? '—',
                'branch' => optional($emp->branch)->branch_name ?? '—',
                'dept' => optional($emp->department)->name ?? '—',
                'shift_name' => $shiftName,
                'shift_time' => $shiftTime,
                'phone' => $emp->whatsapp_number ?? '—',
                'email' => $emp->local_email ?? '—',
                'absent_type' => $absentType,
                'streak' => $this->computeStreak($companyId, $emp->system_user_id, $date),
                'last_present' => $this->lastPresent($companyId, $emp->system_user_id, $date),
                'approved' => (bool) $leave,
            ];
        }

        // Sort: unapproved first, then streak desc
        usort($rows, function ($a, $b) {
            if ($a['approved'] !== $b['approved']) {
                return $a['approved'] ? 1 : -1;
            }
            return $b['streak'] <=> $a['streak'];
        });

        // 4. Summary
        $approvedCount = collect($rows)->where('approved', true)->count();
        $unapprovedCount = count($rows) - $approvedCount;
        $totalEmployees = $employees->count();
        $absentCount = count($rows);
        $absentPct = $totalEmployees > 0 ? round(($absentCount / $totalEmployees) * 100, 2) : 0;

        return [
            'mode' => 'daily',
            'company' => $this->companyMeta($companyId, $request),
            'period' => [
                'date' => $date,
                'day_name' => Carbon::parse($date)->format('l'),
                'date_label' => Carbon::parse($date)->format('d M Y'),
                'generated_at' => now()->format('h:i A'),
                'branches_label' => $this->branchesLabel($request),
            ],
            'summary' => [
                'total_employees' => $totalEmployees,
                'absent_count' => $absentCount,
                'absent_pct' => $absentPct,
                'approved_count' => $approvedCount,
                'unapproved_count' => $unapprovedCount,
                'branches_count' => $employees->pluck('branch_id')->unique()->filter()->count(),
            ],
            'rows' => $rows,
        ];
    }

    public function buildMonthlyPayload(Request $request): array
    {
        $companyId = (int) $request->input('company_id');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $employees = $this->resolveEmployees($request);
        $employeeSystemIds = $employees->pluck('system_user_id')->all();
        $employeeIds = $employees->pluck('id')->all();

        // 1. All absent attendances in the window
        $absentRows = Attendance::query()
            ->where('company_id', $companyId)
            ->whereBetween('date', [$fromDate, $toDate])
            ->where('status', 'A')
            ->whereIn('employee_id', $employeeSystemIds)
            ->orderBy('employee_id')
            ->orderBy('date')
            ->get(['employee_id', 'date', 'status']);

        // 2. All approved leaves that overlap the window
        $approvedLeaves = EmployeeLeaves::query()
            ->where('company_id', $companyId)
            ->where('status', EmployeeLeaves::APPROVED)
            ->whereIn('employee_id', $employeeIds)
            ->where(function ($q) use ($fromDate, $toDate) {
                $q->whereDate('start_date', '<=', $toDate)
                  ->whereDate('end_date', '>=', $fromDate);
            })
            ->get(['employee_id', 'start_date', 'end_date']);

        // Build a lookup: employee.id => set of approved date strings within window
        $approvedDates = [];
        foreach ($approvedLeaves as $lv) {
            $start = Carbon::parse($lv->start_date)->max(Carbon::parse($fromDate));
            $end = Carbon::parse($lv->end_date)->min(Carbon::parse($toDate));
            for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
                $approvedDates[$lv->employee_id][$d->toDateString()] = true;
            }
        }

        // 3. Group absences per employee
        $perEmp = [];
        foreach ($absentRows as $att) {
            $sid = $att->employee_id;
            $emp = $employees->get($sid);
            if (!$emp) continue;

            $dateStr = Carbon::parse($att->date)->toDateString();
            $day = (int) Carbon::parse($att->date)->format('d');
            $isApproved = isset($approvedDates[$emp->id][$dateStr]);

            if (!isset($perEmp[$sid])) {
                $perEmp[$sid] = ['total' => 0, 'approved' => 0, 'unapproved' => 0, 'dates' => [], 'date_strs' => []];
            }
            $perEmp[$sid]['total']++;
            $isApproved ? $perEmp[$sid]['approved']++ : $perEmp[$sid]['unapproved']++;
            $perEmp[$sid]['dates'][] = ['day' => $day, 'approved' => $isApproved];
            $perEmp[$sid]['date_strs'][] = $dateStr;
        }

        // 4. Build rows + compute longest_streak per employee
        $rows = [];
        foreach ($perEmp as $sid => $agg) {
            $emp = $employees->get($sid);
            $shift = optional($emp->schedule)->shift;
            $rows[] = [
                'id' => $emp->system_user_id,
                'initials' => $this->initialsOf($emp),
                'name' => $this->displayName($emp),
                'emp_id' => $this->formatEmpId($emp->employee_id, $emp->system_user_id),
                'branch' => optional($emp->branch)->branch_name ?? '—',
                'dept' => optional($emp->department)->name ?? '—',
                'shift' => $shift->name ?? '—',
                'phone' => $emp->whatsapp_number ?? '—',
                'email' => $emp->local_email ?? '—',
                'total' => $agg['total'],
                'approved' => $agg['approved'],
                'unapproved' => $agg['unapproved'],
                'dates' => $agg['dates'],
                'longest_streak' => $this->longestStreak($agg['date_strs']),
            ];
        }

        // Sort: total desc
        usort($rows, fn($a, $b) => $b['total'] <=> $a['total']);

        // 5. Summary
        $totalEmployees = $employees->count();
        $employeesWithAbs = count($rows);
        $totalAbsentDays = array_sum(array_column($rows, 'total'));
        $approvedDays = array_sum(array_column($rows, 'approved'));
        $unapprovedDays = $totalAbsentDays - $approvedDays;
        $absencesPct = $totalEmployees > 0 ? round(($employeesWithAbs / $totalEmployees) * 100, 2) : 0;
        $avgPerEmployee = $employeesWithAbs > 0 ? round($totalAbsentDays / $employeesWithAbs, 2) : 0;

        $top = $rows[0] ?? null;
        $topAbsentee = $top ? [
            'initials' => $top['initials'],
            'name' => $top['name'],
            'days' => $top['total'],
            'dept' => $top['dept'],
            'branch' => $top['branch'],
        ] : null;

        return [
            'mode' => 'monthly',
            'company' => $this->companyMeta($companyId, $request),
            'period' => [
                'from' => $fromDate,
                'to' => $toDate,
                'from_label' => Carbon::parse($fromDate)->format('d M Y'),
                'to_label' => Carbon::parse($toDate)->format('d M Y'),
                'generated_at' => now()->format('h:i A'),
                'branches_label' => $this->branchesLabel($request),
            ],
            'summary' => [
                'total_employees' => $totalEmployees,
                'employees_with_absences' => $employeesWithAbs,
                'absences_pct' => $absencesPct,
                'total_absent_days' => $totalAbsentDays,
                'approved_days' => $approvedDays,
                'unapproved_days' => $unapprovedDays,
                'avg_per_employee' => $avgPerEmployee,
                'top_absentee' => $topAbsentee,
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Walk back from $date day-by-day. Returns the count of consecutive absent
     * days ending on $date (inclusive). Week-off and Holiday are skipped (they
     * neither count nor break the streak); explicit Present (P) stops the walk;
     * a missing attendance row stops the walk.
     */
    public function computeStreak(int $companyId, int $systemUserId, string $date): int
    {
        $rangeStart = Carbon::parse($date)->subDays(60)->toDateString();
        $records = Attendance::query()
            ->where('company_id', $companyId)
            ->where('employee_id', $systemUserId)
            ->whereBetween('date', [$rangeStart, $date])
            ->orderBy('date', 'desc')
            ->get(['date', 'status'])
            ->keyBy(fn($r) => Carbon::parse($r->date)->toDateString());

        $streak = 0;
        $cursor = Carbon::parse($date);
        for ($i = 0; $i < 60; $i++) {
            $key = $cursor->toDateString();
            $rec = $records->get($key);
            if (!$rec) break;
            $status = strtoupper($rec->status ?? '');
            if ($status === 'A') {
                $streak++;
            } elseif (in_array($status, ['O', 'WO', 'WEEKOFF', 'H', 'HOLIDAY'], true)) {
                // skip — neither count nor break
            } else {
                break;
            }
            $cursor->subDay();
        }
        return $streak;
    }

    /**
     * Most recent date strictly before $date where status = 'P'.
     * Returns formatted "DD MMM YYYY" or null.
     */
    public function lastPresent(int $companyId, int $systemUserId, string $date): ?string
    {
        $rec = Attendance::query()
            ->where('company_id', $companyId)
            ->where('employee_id', $systemUserId)
            ->whereDate('date', '<', $date)
            ->where('status', 'P')
            ->orderBy('date', 'desc')
            ->value('date');
        return $rec ? Carbon::parse($rec)->format('d M Y') : null;
    }

    /**
     * Longest run of consecutive absent days within the supplied date strings.
     */
    public function longestStreak(array $dateStrs): int
    {
        if (empty($dateStrs)) return 0;
        $dates = array_unique($dateStrs);
        sort($dates);
        $longest = 1;
        $current = 1;
        for ($i = 1; $i < count($dates); $i++) {
            $prev = Carbon::parse($dates[$i - 1]);
            $cur = Carbon::parse($dates[$i]);
            if ($cur->diffInDays($prev) === 1) {
                $current++;
                $longest = max($longest, $current);
            } else {
                $current = 1;
            }
        }
        return $longest;
    }

    private function parseIds($input): array
    {
        if (is_array($input)) {
            return array_values(array_filter($input, fn($v) => $v !== '' && $v !== null));
        }
        if (is_string($input) && $input !== '') {
            return array_values(array_filter(explode(',', $input)));
        }
        return [];
    }

    private function formatTime(?string $t): string
    {
        if (!$t) return '—';
        return substr($t, 0, 5);
    }

    private function formatEmpId($empId, $systemUserId): string
    {
        $id = $empId !== null && $empId !== '' ? (string) $empId : (string) $systemUserId;
        if (preg_match('/^EMP-/i', $id)) return $id;
        return 'EMP-' . $id;
    }

    private function initialsOf($emp): string
    {
        $first = strtoupper(substr($emp->first_name ?? '', 0, 1));
        $last  = strtoupper(substr($emp->last_name ?? '', 0, 1));
        $two = $first . $last;
        if (strlen($two) >= 2) return $two;
        $name = $emp->full_name ?? $emp->display_name ?? '';
        $parts = preg_split('/\s+/', trim($name));
        $a = strtoupper(substr($parts[0] ?? '', 0, 1));
        $b = strtoupper(substr($parts[1] ?? '', 0, 1));
        return ($a . $b) ?: '—';
    }

    private function displayName($emp): string
    {
        $full = trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? ''));
        return $full !== '' ? $full : ($emp->full_name ?? $emp->display_name ?? '—');
    }

    private function companyMeta(int $companyId, Request $request): array
    {
        $company = Company::find($companyId);
        $name = $company->name ?? $request->input('company_name', 'Company');
        return [
            'name' => $name,
            'initials' => $this->companyInitials($name),
            'branch_name' => $request->input('branch_label', ''),
        ];
    }

    private function companyInitials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $a = strtoupper(substr($parts[0] ?? '', 0, 1));
        $b = strtoupper(substr($parts[1] ?? '', 0, 1));
        return ($a . $b) ?: strtoupper(substr($name, 0, 2));
    }

    private function branchesLabel(Request $request): string
    {
        $ids = $this->parseIds($request->input('branch_ids'));
        if (empty($ids)) return 'All Branches';
        if (count($ids) === 1) {
            $b = CompanyBranch::find($ids[0]);
            return $b->branch_name ?? '1 Branch';
        }
        return count($ids) . ' Branches';
    }
}
