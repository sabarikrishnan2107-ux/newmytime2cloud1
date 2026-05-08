<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttendanceLogMissingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('seed_default_data', [AttendanceController::class, "seedDefaultDataManual"]);
Route::get('attendance_avg_clock', [AttendanceController::class, "attendance_avg_clock"]);
Route::get('company_stats', [AttendanceController::class, "companyStats"]);
Route::get('company_stats_hourly_trends', [AttendanceController::class, "companyStatsHourlyTrends"]);
Route::get('company_stats_day_trends', [AttendanceController::class, "companyStatsDayTrends"]);
Route::get('company_stats_department_breakdown', [AttendanceController::class, "companyStatsDepartmentBreakdown"]);
Route::get('company_stats_punctuality', [AttendanceController::class, "companyStatsPunctuality"]);
Route::get('company_stats_daily_attendance', [AttendanceController::class, "companyStatsDailyAttendance"]);
Route::get('company_stats_summary_payload', [AttendanceController::class, "companyStatsSummaryPayload"]);
Route::get('company_stats_summary_pdf', [AttendanceController::class, "companyStatsSummaryPdf"]);
Route::get('get_attendance_tabs', [AttendanceController::class, "getAttendanceTabsDisplay"]);
Route::get('regenerate-attendance', [AttendanceController::class, "regenerateAttendance"]);

Route::get('attendance-logs-missing', [AttendanceLogMissingController::class, "GetMissingLogs"]);

Route::get('employee-punctuality-stats', function (Request $request) {
    try {
    $employeeIdRaw = $request->employee_id;
    $requestCompanyId = $request->company_id ? (int) $request->company_id : null;

    if (!$employeeIdRaw) {
        return [
            'monthly' => [], 'weekly' => [], 'mom_change' => null, 'week_days_with_data' => 0,
            'debug' => ['error' => 'missing_employee_id'],
        ];
    }

    // Resolve the canonical Employee record. Accept either auto-increment id or system_user_id.
    // Scope to request company first; fall back to global lookup if not found (handles cross-company admin views).
    $empQuery = \App\Models\Employee::where(function ($q) use ($employeeIdRaw) {
        $q->where('id', $employeeIdRaw)->orWhere('system_user_id', $employeeIdRaw);
    });

    $emp = null;
    if ($requestCompanyId) {
        $emp = (clone $empQuery)->where('company_id', $requestCompanyId)
            ->first(['id', 'system_user_id', 'company_id', 'branch_id', 'department_id']);
    }
    if (!$emp) {
        $emp = $empQuery->first(['id', 'system_user_id', 'company_id', 'branch_id', 'department_id']);
    }

    if (!$emp || !$emp->system_user_id || !$emp->company_id) {
        return [
            'monthly' => [], 'weekly' => [], 'mom_change' => null, 'week_days_with_data' => 0,
            'debug' => [
                'error' => 'employee_not_resolved',
                'input' => $employeeIdRaw,
                'resolved' => $emp ? ['id' => $emp->id, 'system_user_id' => $emp->system_user_id, 'company_id' => $emp->company_id] : null,
            ],
        ];
    }

    // Use the employee's actual company_id (authoritative — works across branches/departments)
    $companyId = (int) $emp->company_id;
    $employeeId = $emp->system_user_id;

    $now = now();
    $startMonth = $now->copy()->subMonths(9)->startOfMonth();
    $startWeek = $now->copy()->startOfWeek(\Carbon\Carbon::MONDAY);
    $startDaily7 = $now->copy()->subDays(6)->startOfDay(); // last 7 days
    $startDaily30 = $now->copy()->subDays(29)->startOfDay(); // last 30 days

    $windowStart = $startMonth->lt($startDaily30) ? $startMonth : $startDaily30;

    // Use date-only strings (matches existing companyStatsPunctuality pattern in AttendanceController)
    // Note: legacy attendances table uses "in" column for check-in time, not "time".
    // "in" is a reserved word in SQL, so we alias via selectRaw to be safe across MySQL/Postgres.
    $rows = \App\Models\Attendance::where('employee_id', $employeeId)
        ->where('company_id', $companyId)
        ->whereBetween('date', [$windowStart->toDateString(), $now->toDateString()])
        ->selectRaw('date, "in" as time, status, late_coming')
        ->get();

    // Diagnostic: total rows for this employee regardless of date (helps tell whether
    // the issue is "no rows at all" vs "no rows in this window")
    $totalRowsForEmployee = \App\Models\Attendance::where('employee_id', $employeeId)
        ->where('company_id', $companyId)
        ->count();

    // Pre-seed last 7 days so empty days still render
    $dailyMap = [];
    for ($i = 6; $i >= 0; $i--) {
        $d = $now->copy()->subDays($i);
        $dailyMap[$d->format('Y-m-d')] = [
            'date' => $d->format('Y-m-d'),
            'label' => $d->format('D j'),
            'on_time' => 0,
            'late' => 0,
            'on_time_pct' => 0,
            'check_in_seconds' => [],
            'avg_check_in_hours' => null,
        ];
    }
    // Pre-seed last 30 days
    $daily30Map = [];
    for ($i = 29; $i >= 0; $i--) {
        $d = $now->copy()->subDays($i);
        $daily30Map[$d->format('Y-m-d')] = [
            'date' => $d->format('Y-m-d'),
            'label' => $d->format('M j'),
            'on_time' => 0,
            'late' => 0,
            'on_time_pct' => 0,
            'check_in_seconds' => [],
            'avg_check_in_hours' => null,
        ];
    }

    $monthlyMap = [];
    $weeklyMap = [
        'Mon' => ['on_time' => 0, 'late' => 0],
        'Tue' => ['on_time' => 0, 'late' => 0],
        'Wed' => ['on_time' => 0, 'late' => 0],
        'Thu' => ['on_time' => 0, 'late' => 0],
        'Fri' => ['on_time' => 0, 'late' => 0],
        'Sat' => ['on_time' => 0, 'late' => 0],
        'Sun' => ['on_time' => 0, 'late' => 0],
    ];

    $isPlaceholder = fn($v) => $v === null || $v === '' || trim((string) $v) === '---';

    foreach ($rows as $row) {
        try {
            $d = \Carbon\Carbon::parse($row->date);
        } catch (\Exception $e) {
            continue;
        }
        $ym = $d->format('Y-m');

        if (!isset($monthlyMap[$ym])) {
            $monthlyMap[$ym] = [
                'month' => $d->format('M'),
                'year' => (int) $d->year,
                'on_time' => 0,
                'late' => 0,
                'check_in_seconds' => [],
            ];
        }

        $status = strtoupper(trim((string) $row->status));
        $isPresent = $status === 'P';
        $isLate = !$isPlaceholder($row->late_coming);

        if ($isPresent && !$isLate) $monthlyMap[$ym]['on_time']++;
        if ($isLate) $monthlyMap[$ym]['late']++;

        if ($isPresent && !$isPlaceholder($row->time)) {
            try {
                $t = \Carbon\Carbon::parse($row->time);
                $monthlyMap[$ym]['check_in_seconds'][] = $t->hour * 3600 + $t->minute * 60 + $t->second;
            } catch (\Exception $e) {
                // skip unparseable times
            }
        }

        if ($d->gte($startWeek)) {
            $dayName = $d->format('D');
            if (isset($weeklyMap[$dayName])) {
                if ($isPresent && !$isLate) $weeklyMap[$dayName]['on_time']++;
                if ($isLate) $weeklyMap[$dayName]['late']++;
            }
        }

        $dayKey = $d->format('Y-m-d');
        $checkInSec = ($isPresent && !$isPlaceholder($row->time)) ? (function () use ($row) {
            try {
                $t = \Carbon\Carbon::parse($row->time);
                return $t->hour * 3600 + $t->minute * 60 + $t->second;
            } catch (\Exception $e) {
                return null;
            }
        })() : null;

        if (isset($dailyMap[$dayKey])) {
            if ($isPresent && !$isLate) $dailyMap[$dayKey]['on_time']++;
            if ($isLate) $dailyMap[$dayKey]['late']++;
            if ($checkInSec !== null) $dailyMap[$dayKey]['check_in_seconds'][] = $checkInSec;
        }
        if (isset($daily30Map[$dayKey])) {
            if ($isPresent && !$isLate) $daily30Map[$dayKey]['on_time']++;
            if ($isLate) $daily30Map[$dayKey]['late']++;
            if ($checkInSec !== null) $daily30Map[$dayKey]['check_in_seconds'][] = $checkInSec;
        }
    }

    $finalizeDay = function (&$d) {
        $total = $d['on_time'] + $d['late'];
        $d['on_time_pct'] = $total > 0 ? round($d['on_time'] / $total * 100, 1) : ($d['on_time'] > 0 ? 100 : 0);
        $count = count($d['check_in_seconds']);
        $d['avg_check_in_hours'] = $count > 0 ? round(array_sum($d['check_in_seconds']) / $count / 3600, 3) : null;
        unset($d['check_in_seconds']);
    };
    foreach ($dailyMap as &$d) $finalizeDay($d);
    unset($d);
    foreach ($daily30Map as &$d) $finalizeDay($d);
    unset($d);
    $daily = array_values($dailyMap);
    $daily30 = array_values($daily30Map);

    ksort($monthlyMap);
    $monthly = array_map(function ($m) {
        $total = $m['on_time'] + $m['late'];
        $count = count($m['check_in_seconds']);
        $avgSec = $count > 0 ? array_sum($m['check_in_seconds']) / $count : null;
        return [
            'month' => $m['month'],
            'year' => $m['year'],
            'on_time' => $m['on_time'],
            'late' => $m['late'],
            'on_time_pct' => $total > 0 ? round($m['on_time'] / $total * 100, 1) : 0,
            'avg_check_in_hours' => $avgSec !== null ? round($avgSec / 3600, 2) : null,
        ];
    }, array_values($monthlyMap));

    $momChange = null;
    if (count($monthly) >= 2) {
        $current = end($monthly)['on_time_pct'];
        $previous = $monthly[count($monthly) - 2]['on_time_pct'];
        $momChange = round($current - $previous, 1);
    }

    $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    $weekly = array_map(fn($d) => array_merge(['day' => $d], $weeklyMap[$d]), $days);
    $weekDaysWithData = count(array_filter($weekly, fn($w) => ($w['on_time'] + $w['late']) > 0));

    return [
        'monthly' => $monthly,
        'weekly' => $weekly,
        'daily' => $daily,
        'daily_30' => $daily30,
        'mom_change' => $momChange,
        'week_days_with_data' => $weekDaysWithData,
        'debug' => [
            'input_employee_id' => $employeeIdRaw,
            'resolved_pk' => $emp->id,
            'resolved_system_user_id' => $employeeId,
            'resolved_company_id' => $companyId,
            'resolved_branch_id' => $emp->branch_id,
            'resolved_department_id' => $emp->department_id,
            'window_start' => $windowStart->toDateString(),
            'window_end' => $now->toDateString(),
            'rows_in_window' => $rows->count(),
            'total_rows_for_employee_all_time' => $totalRowsForEmployee,
        ],
    ];
    } catch (\Throwable $e) {
        return response()->json([
            'monthly' => [], 'weekly' => [], 'daily' => [], 'daily_30' => [],
            'mom_change' => null, 'week_days_with_data' => 0,
            'debug' => [
                'error' => 'exception',
                'message' => $e->getMessage(),
                'file' => basename($e->getFile()) . ':' . $e->getLine(),
            ],
        ], 200);
    }
});

// Comprehensive Leaves Tab summary
Route::get('employee-leaves-summary', function (Request $request) {
    try {
        $employeeIdRaw = $request->employee_id;
        $requestCompanyId = $request->company_id ? (int) $request->company_id : null;
        $year = $request->year ? (int) $request->year : (int) now()->year;

        if (!$employeeIdRaw) return ['debug' => ['error' => 'missing_employee_id']];

        $empQuery = \App\Models\Employee::where(function ($q) use ($employeeIdRaw) {
            $q->where('id', $employeeIdRaw)->orWhere('system_user_id', $employeeIdRaw);
        });
        $emp = $requestCompanyId
            ? (clone $empQuery)->where('company_id', $requestCompanyId)->first()
            : null;
        if (!$emp) $emp = $empQuery->first();
        if (!$emp) return ['debug' => ['error' => 'employee_not_resolved', 'input' => $employeeIdRaw]];

        $emp->load(['leave_group']);
        $companyId = (int) $emp->company_id;

        // Resolve allowances from leave_group. Try direct columns first, then leave_count rows.
        $allowances = [];
        $group = $emp->leave_group;

        if ($group) {
            $directMap = [
                'annual_leaves' => ['Annual', 'violet'],
                'sick_leaves' => ['Sick', 'emerald'],
                'casual_leaves' => ['Casual', 'cyan'],
                'maternity_leaves' => ['Maternity', 'pink'],
                'paternity_leaves' => ['Paternity', 'blue'],
            ];
            foreach ($directMap as $col => [$label, $color]) {
                if (isset($group->$col) && (int) $group->$col > 0) {
                    $allowances[$label] = ['type' => $label, 'total' => (int) $group->$col, 'used' => 0, 'pending' => 0, 'rejected' => 0, 'color' => $color];
                }
            }

            // Also pull leave_count rows for any extra types
            try {
                $counts = \App\Models\LeaveCount::where('group_id', $group->id)->with('leave_type:id,name')->get();
                $palette = ['violet', 'emerald', 'cyan', 'pink', 'blue', 'amber', 'orange', 'teal'];
                $i = 0;
                foreach ($counts as $c) {
                    $name = $c->leave_type?->name;
                    if (!$name || $name === '---') continue;
                    if (!isset($allowances[$name])) {
                        $allowances[$name] = [
                            'type' => $name,
                            'total' => (int) ($c->count ?? $c->leave_count ?? $c->total ?? 0),
                            'used' => 0,
                            'pending' => 0,
                            'rejected' => 0,
                            'color' => $palette[$i % count($palette)],
                        ];
                    }
                    $i++;
                }
            } catch (\Exception $e) { /* ignore if leave_count table not present */ }
        }

        // Fetch all leaves for this employee in the year
        $yearStart = "$year-01-01";
        $yearEnd = "$year-12-31";
        $leaves = \App\Models\EmployeeLeaves::where('employee_id', $emp->id)
            ->where(function ($q) use ($yearStart, $yearEnd) {
                $q->whereBetween('from_date', [$yearStart, $yearEnd])
                  ->orWhereBetween('to_date', [$yearStart, $yearEnd]);
            })
            ->with(['leave_type:id,name'])
            ->orderBy('from_date', 'desc')
            ->limit(100)
            ->get();

        $stats = ['total_taken' => 0, 'approved_count' => 0, 'pending_count' => 0, 'rejected_count' => 0];
        $monthlyBreakdown = array_fill(0, 12, 0);

        $today = now()->startOfDay();
        $upcoming = null;

        $history = [];
        foreach ($leaves as $l) {
            $typeName = $l->leave_type?->name ?: 'Other';
            $days = (int) ($l->total_days ?? $l->days ?? 0);
            $status = (int) $l->status;

            if (!isset($allowances[$typeName])) {
                $allowances[$typeName] = ['type' => $typeName, 'total' => 0, 'used' => 0, 'pending' => 0, 'rejected' => 0, 'color' => 'slate'];
            }

            if ($status === 1) {
                $allowances[$typeName]['used'] += $days;
                $stats['approved_count']++;
                $stats['total_taken'] += $days;
            } elseif ($status === 0) {
                $allowances[$typeName]['pending'] += $days;
                $stats['pending_count']++;
            } elseif ($status === 2) {
                $allowances[$typeName]['rejected'] += $days;
                $stats['rejected_count']++;
            }

            // Monthly breakdown (approved only)
            if ($status === 1 && $l->from_date) {
                try {
                    $m = \Carbon\Carbon::parse($l->from_date)->month - 1;
                    if ($m >= 0 && $m < 12) $monthlyBreakdown[$m] += $days;
                } catch (\Exception $e) {}
            }

            // Upcoming = next approved leave starting today or later
            if ($status === 1 && !$upcoming && $l->from_date) {
                try {
                    $from = \Carbon\Carbon::parse($l->from_date);
                    if ($from->gte($today)) {
                        $upcoming = [
                            'type' => $typeName,
                            'from' => $from->toDateString(),
                            'to' => $l->to_date,
                            'days' => $days,
                        ];
                    }
                } catch (\Exception $e) {}
            }

            $history[] = [
                'id' => $l->id,
                'type' => $typeName,
                'days' => $days,
                'from_date' => $l->from_date,
                'to_date' => $l->to_date,
                'status' => $status,
                'reason' => $l->reason ?? null,
            ];
        }

        // Compute remaining + finalize allowances list
        $allowancesList = [];
        foreach ($allowances as $a) {
            $a['remaining'] = max(0, $a['total'] - $a['used']);
            $allowancesList[] = $a;
        }

        return [
            'year' => $year,
            'allowances' => $allowancesList,
            'stats' => $stats,
            'upcoming' => $upcoming,
            'history' => $history,
            'monthly_breakdown' => array_map(
                fn($idx) => ['month' => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][$idx], 'days' => $monthlyBreakdown[$idx]],
                array_keys($monthlyBreakdown)
            ),
            'debug' => [
                'resolved_pk' => $emp->id,
                'leave_group_id' => $group?->id,
                'leaves_count' => $leaves->count(),
            ],
        ];
    } catch (\Throwable $e) {
        return response()->json([
            'debug' => ['error' => 'exception', 'message' => $e->getMessage(), 'file' => basename($e->getFile()) . ':' . $e->getLine()],
        ], 200);
    }
});

// Comprehensive Attendance Tab summary: stats, today, log, working hours.
Route::get('employee-attendance-summary', function (Request $request) {
    try {
        $employeeIdRaw = $request->employee_id;
        $requestCompanyId = $request->company_id ? (int) $request->company_id : null;

        if (!$employeeIdRaw) {
            return ['debug' => ['error' => 'missing_employee_id']];
        }

        // Resolve canonical Employee
        $empQuery = \App\Models\Employee::where(function ($q) use ($employeeIdRaw) {
            $q->where('id', $employeeIdRaw)->orWhere('system_user_id', $employeeIdRaw);
        });
        $emp = $requestCompanyId
            ? (clone $empQuery)->where('company_id', $requestCompanyId)->first(['id', 'system_user_id', 'company_id'])
            : null;
        if (!$emp) $emp = $empQuery->first(['id', 'system_user_id', 'company_id']);
        if (!$emp || !$emp->system_user_id || !$emp->company_id) {
            return ['debug' => ['error' => 'employee_not_resolved', 'input' => $employeeIdRaw]];
        }

        $companyId = (int) $emp->company_id;
        $sysId = $emp->system_user_id;

        $now = now();
        // Optional year/month filter (1-12 for month). Defaults to current month.
        $reqYear = $request->year ? (int) $request->year : null;
        $reqMonth = $request->month ? (int) $request->month : null;
        $isCustomMonth = $reqYear && $reqMonth;
        $monthAnchor = $isCustomMonth
            ? \Carbon\Carbon::createFromDate($reqYear, $reqMonth, 1)
            : $now->copy();
        $monthStart = $monthAnchor->copy()->startOfMonth();
        $monthEnd = $monthAnchor->copy()->endOfMonth();
        $today = $now->copy()->startOfDay();
        // Log window. Range param: 1w (default, 7 days), 1m (30 days), 6m (180 days).
        $isCurrentMonth = $monthStart->year === $now->year && $monthStart->month === $now->month;
        $logRange = strtolower((string) ($request->log_range ?? '1w'));
        $logDaysCount = ['1w' => 7, '1m' => 30, '6m' => 180][$logRange] ?? 7;
        $logEnd = $isCurrentMonth ? $today : $monthEnd;
        $logStart = $logEnd->copy()->subDays($logDaysCount - 1)->startOfDay();

        // Helper: parse "HH:MM" or "HH:MM:SS" into minutes
        $toMinutes = function ($v) {
            if (!$v || $v === '---') return null;
            $parts = explode(':', trim((string) $v));
            if (count($parts) < 2) return null;
            return (int) $parts[0] * 60 + (int) $parts[1];
        };
        $isPlaceholder = fn($v) => $v === null || $v === '' || trim((string) $v) === '---';
        $fmtTime = function ($v) {
            if (!$v || $v === '---') return null;
            $parts = explode(':', trim((string) $v));
            if (count($parts) < 2) return null;
            return sprintf('%02d:%02d', (int) $parts[0], (int) $parts[1]);
        };
        $fmtHours = function ($mins) {
            if ($mins === null) return '—';
            $h = intdiv($mins, 60);
            $m = $mins % 60;
            return $m > 0 ? "{$h}h {$m}m" : "{$h}h";
        };

        // === This month rows ===
        $monthRows = \App\Models\Attendance::where('employee_id', $sysId)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->selectRaw('date, "in" as in_time, "out" as out_time, status, late_coming, total_hrs, device_id_in, device_id_out')
            ->orderBy('date', 'asc')
            ->get();

        $present = 0; $absent = 0; $late = 0; $halfDay = 0; $missing = 0;
        $totalMinutes = 0;
        $workingDays = 0; // days with hours
        foreach ($monthRows as $r) {
            $status = strtoupper(trim((string) $r->status));
            if ($status === 'P' || $status === 'LC' || $status === 'EG' || $status === 'ME') $present++;
            elseif ($status === 'A') $absent++;
            elseif ($status === 'M') $missing++;
            elseif ($status === 'HD') $halfDay++;
            if (!$isPlaceholder($r->late_coming)) $late++;

            $mins = $toMinutes($r->total_hrs);
            if ($mins !== null) {
                $totalMinutes += $mins;
                if ($mins > 0) $workingDays++;
            }
        }

        $standardDayMinutes = 480; // 8h
        $overtimeMinutes = max(0, $totalMinutes - ($workingDays * $standardDayMinutes));
        $avgPerDayMinutes = $workingDays > 0 ? intdiv($totalMinutes, $workingDays) : 0;
        $totalDaysInMonth = $monthEnd->day;
        $workingDaysInMonth = 0;
        for ($d = $monthStart->copy(); $d->lte($monthEnd); $d->addDay()) {
            $dow = $d->dayOfWeek;
            if ($dow !== \Carbon\Carbon::FRIDAY && $dow !== \Carbon\Carbon::SATURDAY) $workingDaysInMonth++;
        }
        $targetMinutes = $workingDaysInMonth * $standardDayMinutes;
        $progress = $targetMinutes > 0 ? min(100, round($totalMinutes / $targetMinutes * 100)) : 0;

        // === Today (only when viewing current month — past-month views show no "today") ===
        $todayRow = $isCurrentMonth
            ? \App\Models\Attendance::where('employee_id', $sysId)
                ->where('company_id', $companyId)
                ->where('date', $today->toDateString())
                ->selectRaw('"in" as in_time, "out" as out_time, status, late_coming, total_hrs, device_id_in')
                ->first()
            : null;

        $todayData = null;
        if ($todayRow) {
            $checkIn = $fmtTime($todayRow->in_time);
            $checkOut = $fmtTime($todayRow->out_time);
            $workedMin = $toMinutes($todayRow->total_hrs);
            $clockedIn = $checkIn && !$checkOut;
            $todayData = [
                'status' => $clockedIn ? 'Clocked In' : ($checkIn && $checkOut ? 'Clocked Out' : ($checkIn ? 'In Progress' : 'Not Started')),
                'check_in' => $checkIn ?? '—',
                'check_out' => $checkOut ?? '—',
                'worked' => $fmtHours($workedMin),
                'device' => $todayRow->device_id_in ?: '—',
            ];
        } else {
            $todayData = ['status' => 'Not Started', 'check_in' => '—', 'check_out' => '—', 'worked' => '—', 'device' => '—'];
        }

        // === Log window (last N days of selected period) ===
        // Eager-load device_in + shift_type so we can show readable names.
        $sevenRows = \App\Models\Attendance::where('employee_id', $sysId)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$logStart->toDateString(), $logEnd->toDateString()])
            ->with(['device_in:id,device_id,name,branch_id', 'device_in.branch:id,branch_name', 'shift_type:id,name'])
            ->selectRaw('id, date, "in" as in_time, "out" as out_time, status, late_coming, total_hrs, device_id_in, shift_type_id')
            ->orderBy('date', 'desc')
            ->get();

        // Fallback shift type from the employee's current schedule (handles auto-shift / unset rows)
        $scheduleShift = '—';
        try {
            $sched = \App\Models\ScheduleEmployee::where('employee_id', $sysId)
                ->with('shift_type:id,name')
                ->orderBy('updated_at', 'desc')
                ->first(['id', 'shift_type_id', 'employee_id']);
            if ($sched && $sched->shift_type && $sched->shift_type->name && $sched->shift_type->name !== '---') {
                $scheduleShift = $sched->shift_type->name;
            }
        } catch (\Exception $e) { /* ignore */ }

        // Look up holidays for the log window (single query)
        $holidayDates = [];
        try {
            $holidays = \DB::table('government_holidays')
                ->where('company_id', $companyId)
                ->whereBetween('date', [$logStart->toDateString(), $logEnd->toDateString()])
                ->pluck('date')->toArray();
            foreach ($holidays as $hd) {
                $holidayDates[\Carbon\Carbon::parse($hd)->format('Y-m-d')] = true;
            }
        } catch (\Exception $e) { /* table may not exist */ }

        // Pre-seed log days so empty days still render
        $logDays = $logStart->diffInDays($logEnd) + 1;
        $logMap = [];
        for ($i = 0; $i < $logDays; $i++) {
            $d = $logEnd->copy()->subDays($i);
            $key = $d->format('Y-m-d');
            $dow = $d->dayOfWeek;
            $isWeekend = $dow === \Carbon\Carbon::FRIDAY || $dow === \Carbon\Carbon::SATURDAY;
            $defaultStatus = isset($holidayDates[$key]) ? 'Holiday' : ($isWeekend ? 'Weekoff' : 'Off');
            $logMap[$key] = [
                'date' => $key,
                'date_label' => $d->format('D, d M'),
                'check_in' => '—',
                'check_out' => '—',
                'hours' => '—',
                'device' => '—',
                'shift_type' => $scheduleShift,
                'location' => '—',
                'status' => $defaultStatus,
            ];
        }
        foreach ($sevenRows as $r) {
            try {
                $d = \Carbon\Carbon::parse($r->date);
            } catch (\Exception $e) { continue; }
            $key = $d->format('Y-m-d');
            if (!isset($logMap[$key])) continue;

            $statusRaw = strtoupper(trim((string) $r->status));
            $isLate = !$isPlaceholder($r->late_coming);
            $checkIn = $fmtTime($r->in_time);
            $checkOut = $fmtTime($r->out_time);
            $mins = $toMinutes($r->total_hrs);

            // Map raw status codes to readable labels
            $statusLabel = $logMap[$key]['status']; // keep weekoff/holiday default
            if ($statusRaw === 'A') $statusLabel = 'Absent';
            elseif ($statusRaw === 'M') $statusLabel = 'Missing';
            elseif ($statusRaw === 'O') $statusLabel = 'Weekoff';
            elseif ($statusRaw === 'L') $statusLabel = 'Leave';
            elseif ($statusRaw === 'HD') $statusLabel = 'Half Day';
            elseif ($statusRaw === 'H') $statusLabel = 'Holiday';
            elseif ($statusRaw === 'ME') $statusLabel = 'Manual';
            elseif ($statusRaw === 'LC' || $isLate) $statusLabel = 'Late';
            elseif ($statusRaw === 'EG') $statusLabel = 'Early Going';
            elseif (in_array($statusRaw, ['P'])) {
                $statusLabel = ($checkIn && !$checkOut) ? 'Active' : 'Present';
            }

            $deviceName = $r->device_in?->name && $r->device_in->name !== '---'
                ? $r->device_in->name
                : ($r->device_id_in ?: '—');

            $shiftName = $r->shift_type?->name && $r->shift_type->name !== '---'
                ? $r->shift_type->name
                : $scheduleShift;

            $deviceBranch = $r->device_in?->branch?->branch_name;
            $location = $deviceBranch ?: '—';

            $logMap[$key]['check_in'] = $checkIn ?? '—';
            $logMap[$key]['check_out'] = $checkOut ?? '—';
            $logMap[$key]['hours'] = $fmtHours($mins);
            $logMap[$key]['device'] = $deviceName;
            $logMap[$key]['shift_type'] = $shiftName;
            $logMap[$key]['location'] = $location;
            $logMap[$key]['status'] = $statusLabel;
        }
        $log = array_values($logMap);

        // === Punctuality score (this month: on-time / total worked days) ===
        $workedDaysCount = 0; $onTimeCount = 0;
        foreach ($monthRows as $r) {
            $statusRaw = strtoupper(trim((string) $r->status));
            if (in_array($statusRaw, ['P', 'LC', 'EG', 'ME'])) {
                $workedDaysCount++;
                if ($isPlaceholder($r->late_coming)) $onTimeCount++;
            }
        }
        $onTimePct = $workedDaysCount > 0 ? round($onTimeCount / $workedDaysCount * 100) : 0;
        $latePct = $workedDaysCount > 0 ? round(($workedDaysCount - $onTimeCount) / $workedDaysCount * 100) : 0;

        // Streak: consecutive most-recent on-time worked days
        $streak = 0;
        foreach ($monthRows->reverse() as $r) {
            $statusRaw = strtoupper(trim((string) $r->status));
            if (!in_array($statusRaw, ['P', 'LC', 'EG', 'ME'])) continue;
            if ($isPlaceholder($r->late_coming)) $streak++;
            else break;
        }

        // Previous month on-time % for delta
        $prevStart = $now->copy()->subMonth()->startOfMonth();
        $prevEnd = $now->copy()->subMonth()->endOfMonth();
        $prevRows = \App\Models\Attendance::where('employee_id', $sysId)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->selectRaw('status, late_coming')
            ->get();
        $prevWorked = 0; $prevOnTime = 0;
        foreach ($prevRows as $r) {
            $statusRaw = strtoupper(trim((string) $r->status));
            if (in_array($statusRaw, ['P', 'LC', 'EG', 'ME'])) {
                $prevWorked++;
                if ($isPlaceholder($r->late_coming)) $prevOnTime++;
            }
        }
        $prevPct = $prevWorked > 0 ? round($prevOnTime / $prevWorked * 100) : null;
        $delta = $prevPct !== null ? $onTimePct - $prevPct : null;

        $scoreLabel = $onTimePct >= 95 ? 'Excellent' : ($onTimePct >= 85 ? 'Good' : ($onTimePct >= 70 ? 'Fair' : 'Needs Work'));

        return [
            'punctuality' => [
                'score' => $onTimePct,
                'label' => $scoreLabel,
                'on_time_pct' => $onTimePct,
                'late_pct' => $latePct,
                'streak' => $streak,
                'delta' => $delta,
            ],
            'monthly' => [
                'month' => $monthStart->format('F'),
                'year' => (int) $monthStart->year,
                'days_recorded' => $monthRows->count(),
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'half_day' => $halfDay,
                'missing' => $missing,
            ],
            'hours' => [
                'month' => $monthStart->format('M'),
                'total_minutes' => $totalMinutes,
                'total' => $fmtHours($totalMinutes),
                'overtime' => $fmtHours($overtimeMinutes),
                'average_per_day' => $fmtHours($avgPerDayMinutes),
                'progress' => $progress,
                'target' => $fmtHours($targetMinutes),
            ],
            'today' => $todayData,
            'log' => $log,
            'log_label' => ['1w' => 'Last 7 days', '1m' => 'Last 30 days', '6m' => 'Last 6 months'][$logRange] ?? 'Last 7 days',
            'log_range' => $logRange,
            'is_current_month' => $isCurrentMonth,
            'debug' => [
                'resolved_pk' => $emp->id,
                'resolved_system_user_id' => $sysId,
                'resolved_company_id' => $companyId,
                'month_range' => [$monthStart->toDateString(), $monthEnd->toDateString()],
                'month_rows' => $monthRows->count(),
            ],
        ];
    } catch (\Throwable $e) {
        return response()->json([
            'debug' => [
                'error' => 'exception',
                'message' => $e->getMessage(),
                'file' => basename($e->getFile()) . ':' . $e->getLine(),
            ],
        ], 200);
    }
});