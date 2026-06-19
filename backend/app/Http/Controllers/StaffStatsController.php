<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\EmployeeLeaves;
use App\Models\Holidays;
use App\Models\ScheduleEmployee;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class StaffStatsController extends Controller
{
    /**
     * Calculate staff dashboard stats from raw logs + leaves + holidays.
     * Works without needing the attendances table to be regenerated.
     */
    public function stats(Request $request)
    {
        $user = $request->user() ?? User::find($request->user_id);
        $companyId = $request->company_id ?? $user?->company_id ?? 0;
        $sysUserId = $request->system_user_id;

        if (!$sysUserId && $user?->employee_id) {
            $emp = Employee::find($user->employee_id);
            $sysUserId = $emp?->system_user_id;
        }

        if (!$sysUserId) {
            return response()->json(['error' => 'system_user_id required'], 400);
        }

        $now = Carbon::now();
        $period = strtolower((string) $request->input('period', 'month'));
        $selectedYear = (int) $request->input('year', $now->year);
        $isYearly = $period === 'year';

        $rangeStart = $isYearly
            ? Carbon::create($selectedYear, 1, 1)->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();

        if ($isYearly) {
            if ($selectedYear > (int) $now->year) {
                $rangeEnd = Carbon::create($selectedYear, 12, 31)->endOfDay();
            } elseif ($selectedYear === (int) $now->year) {
                $rangeEnd = $now->copy()->endOfDay();
            } else {
                $rangeEnd = Carbon::create($selectedYear, 12, 31)->endOfDay();
            }
        } else {
            $rangeEnd = $now->copy()->endOfDay();
        }

        $rangeStartDate = $rangeStart->toDateString();
        $rangeEndDate = $rangeEnd->toDateString();
        $todayDay = max(1, $rangeStart->copy()->diffInDays($rangeEnd) + 1);

        // Get shift info
        $employee = Employee::where('system_user_id', $sysUserId)
            ->where('company_id', $companyId)
            ->first();

        $shift = null;
        if ($employee) {
            $schedule = ScheduleEmployee::where('employee_id', $employee->system_user_id)
                ->whereHas('shift')
                ->latest('updated_at')
                ->first();
            $shift = $schedule?->shift;
        }

        $onDutyTime = $shift?->on_duty_time;
        $offDutyTime = $shift?->off_duty_time;
        $workingHours = $shift?->working_hours;
        $lateGrace = $shift?->late_time ?? '00:15';

        if ($isYearly) {
            $attendanceRecords = Attendance::where('company_id', $companyId)
                ->where('employee_id', $sysUserId)
                ->whereBetween('date', [$rangeStartDate, $rangeEndDate])
                ->get(['date', 'status', 'late_coming', 'early_going', 'total_hrs']);

            $presentDays = $attendanceRecords->filter(fn($attendance) => in_array($attendance->status, ['P', 'LC', 'EG', 'ME']))->count();
            $absentDays = $attendanceRecords->where('status', 'A')->count();
            $lateDays = $attendanceRecords->filter(fn($attendance) => !empty($attendance->late_coming) && $attendance->late_coming !== '---')->count();
            $earlyOutDays = $attendanceRecords->filter(fn($attendance) => !empty($attendance->early_going) && $attendance->early_going !== '---')->count();
            $holidayDays = $attendanceRecords->where('status', 'H')->count();
            $weekOffDays = $attendanceRecords->where('status', 'O')->count();
            $totalWorkMins = $attendanceRecords->reduce(function ($minutes, $attendance) {
                return $minutes + $this->timeToMinutes($attendance->total_hrs ?? '0:00');
            }, 0);

            $leaveDays = 0;
            if ($employee) {
                $leaves = EmployeeLeaves::where('employee_id', $employee->id)
                    ->where('company_id', $companyId)
                    ->where('status', 1)
                    ->where(function ($q) use ($rangeStartDate, $rangeEndDate) {
                        $q->where('start_date', '<=', $rangeEndDate)
                            ->where('end_date', '>=', $rangeStartDate);
                    })
                    ->get();

                foreach ($leaves as $leave) {
                    $start = Carbon::parse($leave->start_date)->max($rangeStart);
                    $end = Carbon::parse($leave->end_date)->min($rangeEnd);
                    $leaveDays += $start->diffInDays($end) + 1;
                }
            }

            return response()->json([
                'present' => $presentDays,
                'absent' => $absentDays,
                'late' => $lateDays,
                'early_out' => $earlyOutDays,
                'leave' => $leaveDays,
                'holiday' => $holidayDays,
                'week_off' => $weekOffDays,
                'overtime' => '0:00',
                'total_work_hours' => round($totalWorkMins / 60, 1),
                'incomplete' => 0,
                'total_days' => $todayDay,
                'shift_name' => $shift?->name,
                'on_duty_time' => $onDutyTime,
                'off_duty_time' => $offDutyTime,
            ]);
        }

        // Get raw logs this month
        $logs = AttendanceLog::where('UserID', $sysUserId)
            ->where('company_id', $companyId)
            ->where('LogTime', '>=', $rangeStartDate)
            ->where('LogTime', '<=', $rangeEndDate . ' 23:59:59')
            ->orderBy('LogTime')
            ->get();

        // Group by date
        $byDate = [];
        foreach ($logs as $log) {
            $date = Carbon::parse($log->LogTime)->format('Y-m-d');
            $byDate[$date][] = $log;
        }

        $presentDays = count($byDate);
        $absentDays = max(0, $todayDay - $presentDays);
        $lateDays = 0;
        $earlyOutDays = 0;
        $totalOvertimeMins = 0;
        $totalWorkMins = 0;

        foreach ($byDate as $date => $dayLogs) {
            usort($dayLogs, fn($a, $b) => strtotime($a->LogTime) - strtotime($b->LogTime));
            $firstLog = $dayLogs[0];
            $lastLog = end($dayLogs);

            $inTime = Carbon::parse($firstLog->LogTime);
            $outTime = count($dayLogs) > 1 ? Carbon::parse($lastLog->LogTime) : null;

            // Late check
            if ($onDutyTime) {
                $shiftStart = Carbon::parse($date . ' ' . $onDutyTime);
                $graceEnd = $shiftStart->copy()->addMinutes($this->timeToMinutes($lateGrace));
                if ($inTime->gt($graceEnd)) {
                    $lateDays++;
                }
            }

            // Early out check
            if ($outTime && $offDutyTime) {
                $shiftEnd = Carbon::parse($date . ' ' . $offDutyTime);
                if ($offDutyTime < $onDutyTime) {
                    $shiftEnd->addDay(); // night shift
                }
                if ($outTime->lt($shiftEnd)) {
                    $earlyOutDays++;
                }
            }

            // Work duration and overtime
            if ($outTime) {
                $workMins = $inTime->diffInMinutes($outTime);
                $totalWorkMins += $workMins;

                if ($workingHours) {
                    $expectedMins = $this->timeToMinutes($workingHours);
                    if ($workMins > $expectedMins) {
                        $totalOvertimeMins += ($workMins - $expectedMins);
                    }
                }
            }
        }

        // Leaves this month (approved only)
        $leaveDays = 0;
        if ($employee) {
            $leaves = EmployeeLeaves::where('employee_id', $employee->id)
                ->where('company_id', $companyId)
                ->where('status', 1) // approved
                ->where(function ($q) use ($rangeStartDate, $rangeEndDate) {
                    $q->where('start_date', '<=', $rangeEndDate)
                      ->where('end_date', '>=', $rangeStartDate);
                })
                ->get();

            foreach ($leaves as $leave) {
                $start = Carbon::parse($leave->start_date)->max($rangeStart);
                $end = Carbon::parse($leave->end_date)->min($rangeEnd);
                $leaveDays += $start->diffInDays($end) + 1;
            }
        }

        // Holidays this month
        $holidayDays = Holidays::where('company_id', $companyId)
            ->where(function ($q) use ($rangeStartDate, $rangeEndDate) {
                $q->where('start_date', '<=', $rangeEndDate)
                  ->where('end_date', '>=', $rangeStartDate);
            })
            ->get()
            ->sum(function ($h) use ($rangeStart, $rangeEnd) {
                $start = Carbon::parse($h->start_date)->max($rangeStart);
                $end = Carbon::parse($h->end_date)->min($rangeEnd);
                return $start->diffInDays($end) + 1;
            });

        // Week offs (days in month with no shift day)
        $weekOffDays = 0;
        if ($shift && $shift->days) {
            $dayMap = ['Mon' => 1, 'Tue' => 2, 'Wed' => 3, 'Thu' => 4, 'Fri' => 5, 'Sat' => 6, 'Sun' => 0];
            $shiftDayNums = [];
            foreach (($shift->days ?? []) as $d) {
                if (isset($dayMap[$d])) $shiftDayNums[] = $dayMap[$d];
            }
            for ($d = 1; $d <= $todayDay; $d++) {
                $dayOfWeek = $rangeStart->copy()->addDays($d - 1)->dayOfWeek;
                if (!in_array($dayOfWeek, $shiftDayNums)) {
                    $weekOffDays++;
                }
            }
        }

        // Adjust absent: subtract leave + holiday + weekoff
        $absentDays = max(0, $absentDays - $leaveDays - $holidayDays - $weekOffDays);

        $otHours = floor($totalOvertimeMins / 60);
        $otMins = $totalOvertimeMins % 60;

        return response()->json([
            'present' => $presentDays,
            'absent' => $absentDays,
            'late' => $lateDays,
            'early_out' => $earlyOutDays,
            'leave' => $leaveDays,
            'holiday' => $holidayDays,
            'week_off' => $weekOffDays,
            'overtime' => sprintf('%d:%02d', $otHours, $otMins),
            'total_work_hours' => round($totalWorkMins / 60, 1),
            'incomplete' => 0,
            'total_days' => $todayDay,
            'shift_name' => $shift?->name,
            'on_duty_time' => $onDutyTime,
            'off_duty_time' => $offDutyTime,
        ]);
    }

    /**
     * Return monthly present-day counts for the last N months (lightweight).
     */
    public function monthlyTrend(Request $request)
    {
        $companyId = $request->company_id;
        $sysUserId = $request->system_user_id;
        $months = (int) ($request->months ?? 6);

        if (!$sysUserId) {
            return response()->json([]);
        }

        $results = [];
        $now = Carbon::now();

        for ($i = $months - 1; $i >= 0; $i--) {
            $d = $now->copy()->subMonths($i)->startOfMonth();
            $end = $d->copy()->endOfMonth();
            if ($end->gt($now)) $end = $now->copy()->endOfDay();

            $present = Attendance::where('company_id', $companyId)
                ->where('employee_id', $sysUserId)
                ->whereBetween('date', [$d->toDateString(), $end->toDateString()])
                ->whereIn('status', ['P', 'LC', 'EG', 'ME'])
                ->count();

            $results[] = [
                'month' => strtoupper($d->format('M')),
                'present' => $present,
                'total' => $d->daysInMonth,
            ];
        }

        return response()->json($results);
    }

    private function timeToMinutes($time): int
    {
        if (!$time || $time === '---') return 0;
        $parts = explode(':', $time);
        return (int)($parts[0] ?? 0) * 60 + (int)($parts[1] ?? 0);
    }
}
