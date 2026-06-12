<?php

namespace App\Services\Attendance;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\ScheduleEmployee;
use DateTime;

class AttendanceWeekOffService
{
    /**
     * Process weekoff for all absent employees on a given date.
     * Called by the rendering pipeline (cron/render endpoints).
     * Writes "O" status to the attendances table.
     *
     * Priority: Weekend1 → Weekend2 → Monthly Flexible → remains Absent
     */
    public static function processWeekOff(int $companyId, string $date, int $userId = 0): array
    {
        $query = Attendance::where('company_id', $companyId)
            ->where('date', $date)
            ->where('status', 'A')
            ->with(['schedule' => function ($q) use ($companyId, $date) {
                $q->where('company_id', $companyId);
                $q->where('from_date', '<=', $date);
                $q->where('to_date', '>=', $date);
                $q->withOut('shift_type');
                $q->whereHas('shift', fn($sq) => $sq->where('from_date', '<=', $date));
                $q->whereHas('shift', fn($sq) => $sq->where('to_date', '>=', $date));
                $q->orderBy('to_date', 'asc');
            }]);

        if ($userId) {
            $query->where('employee_id', $userId);
        }

        $absentEmployees = $query->get();
        $records = [];

        foreach ($absentEmployees as $attendance) {
            if (!$attendance->schedule || !$attendance->schedule->shift) {
                continue;
            }

            $shift = $attendance->schedule->shift;
            $config = self::resolveConfig($shift);
            $employeeId = $attendance->employee_id;

            $shouldBeOff = false;

            // Priority 1: Weekend1
            if (!$shouldBeOff && $config['weekend1']['type'] !== 'Not Applicable') {
                $shouldBeOff = self::applyWeekend($config['weekend1'], 1, $date, $employeeId, $companyId);
            }

            // Priority 2: Weekend2
            if (!$shouldBeOff && $config['weekend2']['type'] !== 'Not Applicable') {
                $shouldBeOff = self::applyWeekend($config['weekend2'], 2, $date, $employeeId, $companyId);
            }

            // Priority 3: Monthly Flexible
            if (!$shouldBeOff && $config['monthly_flexi'] > 0) {
                $shouldBeOff = self::applyMonthlyFlexi($config['monthly_flexi'], $date, $employeeId, $companyId);
            }

            if ($shouldBeOff) {
                $records[] = [
                    'company_id'    => $companyId,
                    'date'          => $date,
                    'status'        => 'O',
                    'employee_id'   => $employeeId,
                    'shift_id'      => $attendance->shift_id,
                    'shift_type_id' => $attendance->shift_type_id,
                    'created_at'    => date('Y-m-d H:i:s'),
                    'updated_at'    => date('Y-m-d H:i:s'),
                    'updated_func'  => 'AttendanceWeekOffService::processWeekOff',
                ];
            }
        }

        // Write to DB
        $userIds = array_column($records, 'employee_id');

        if (count($records) > 0) {
            Attendance::where('company_id', $companyId)
                ->where('date', $date)
                ->whereIn('employee_id', $userIds)
                ->delete();

            Attendance::insert($records);
        }

        return $userIds;
    }

    /**
     * Calculate weekoff status for a single employee on a single date.
     * Called by report/PDF generation — does NOT write to DB.
     */
    public static function calculateStatus(string $currentDayKey, ?array $weekoffRules, $shift, int $companyId, string $date, int $employeeId, $firstLog): ?string
    {
        // If employee has logs (worked today), not a weekoff
        if ($firstLog) {
            return null;
        }

        $config = self::resolveConfig($shift);

        // Priority 1: Weekend1
        if ($config['weekend1']['type'] !== 'Not Applicable') {
            if (self::applyWeekend($config['weekend1'], 1, $date, $employeeId, $companyId)) {
                return 'O';
            }
        }

        // Priority 2: Weekend2
        if ($config['weekend2']['type'] !== 'Not Applicable') {
            if (self::applyWeekend($config['weekend2'], 2, $date, $employeeId, $companyId)) {
                return 'O';
            }
        }

        // Priority 3: Monthly Flexible
        if ($config['monthly_flexi'] > 0) {
            if (self::applyMonthlyFlexi($config['monthly_flexi'], $date, $employeeId, $companyId)) {
                return 'O';
            }
        }

        return null;
    }

    /**
     * Resolve weekoff configuration from shift.
     * Priority: weekoff_rules JSON > legacy string fields.
     */
    public static function resolveConfig($shift): array
    {
        $shift = (object) $shift;
        $weekoffRules = $shift->weekoff_rules ?? null;

        if ($weekoffRules && is_array($weekoffRules) && isset($weekoffRules['type'])) {
            return self::parseJsonRules($weekoffRules);
        }

        return self::parseLegacyFields($shift);
    }

    private static function parseJsonRules(array $rules): array
    {
        $type = $rules['type'] ?? 'Fixed';

        if ($type === 'Fixed') {
            $days = $rules['days'] ?? [];
            $dayNames = array_map([self::class, 'dayKeyToFullName'], $days);

            return [
                'weekend1' => [
                    'type' => isset($dayNames[0]) ? 'Fixed' : 'Not Applicable',
                    'day'  => $dayNames[0] ?? null,
                ],
                'weekend2' => [
                    'type' => isset($dayNames[1]) ? 'Fixed' : 'Not Applicable',
                    'day'  => $dayNames[1] ?? null,
                ],
                'monthly_flexi' => 0,
            ];
        }

        if ($type === 'Flexible') {
            $cycle = $rules['cycle'] ?? 'Weekly';
            $count = (int) ($rules['count'] ?? 0);

            if ($cycle === 'Monthly') {
                return [
                    'weekend1' => ['type' => 'Not Applicable', 'day' => null],
                    'weekend2' => ['type' => 'Not Applicable', 'day' => null],
                    'monthly_flexi' => $count,
                ];
            }

            return [
                'weekend1' => ['type' => $count >= 1 ? 'Flexi' : 'Not Applicable', 'day' => null],
                'weekend2' => ['type' => $count >= 2 ? 'Flexi' : 'Not Applicable', 'day' => null],
                'monthly_flexi' => 0,
            ];
        }

        if ($type === 'Alternating') {
            return [
                'weekend1' => ['type' => 'Alternating', 'day' => null, 'odd' => $rules['odd'] ?? [], 'even' => $rules['even'] ?? []],
                'weekend2' => ['type' => 'Not Applicable', 'day' => null],
                'monthly_flexi' => 0,
            ];
        }

        return [
            'weekend1' => ['type' => 'Not Applicable', 'day' => null],
            'weekend2' => ['type' => 'Not Applicable', 'day' => null],
            'monthly_flexi' => 0,
        ];
    }

    private static function parseLegacyFields(object $shift): array
    {
        $weekend1 = $shift->weekend1 ?? 'Not Applicable';
        $weekend2 = $shift->weekend2 ?? 'Not Applicable';
        $monthlyFlexi = $shift->monthly_flexi_holidays ?? 'Not Applicable';

        return [
            'weekend1' => [
                'type' => ($weekend1 === 'Flexi') ? 'Flexi' : (($weekend1 !== 'Not Applicable' && $weekend1 !== '') ? 'Fixed' : 'Not Applicable'),
                'day'  => ($weekend1 !== 'Flexi' && $weekend1 !== 'Not Applicable' && $weekend1 !== '') ? $weekend1 : null,
            ],
            'weekend2' => [
                'type' => ($weekend2 === 'Flexi') ? 'Flexi' : (($weekend2 !== 'Not Applicable' && $weekend2 !== '') ? 'Fixed' : 'Not Applicable'),
                'day'  => ($weekend2 !== 'Flexi' && $weekend2 !== 'Not Applicable' && $weekend2 !== '') ? $weekend2 : null,
            ],
            'monthly_flexi' => ($monthlyFlexi !== 'Not Applicable' && $monthlyFlexi !== '' && $monthlyFlexi !== null) ? (int) $monthlyFlexi : 0,
        ];
    }

    public static function dayKeyToFullName(string $key): ?string
    {
        $map = [
            'M'  => 'Monday',
            'T'  => 'Tuesday',
            'W'  => 'Wednesday',
            'Th' => 'Thursday',
            'F'  => 'Friday',
            'S'  => 'Saturday',
            'Su' => 'Sunday',
        ];
        return $map[$key] ?? null;
    }

    public static function fullNameToDayKey(string $name): ?string
    {
        $map = [
            'Monday'    => 'M',
            'Tuesday'   => 'T',
            'Wednesday' => 'W',
            'Thursday'  => 'Th',
            'Friday'    => 'F',
            'Saturday'  => 'S',
            'Sunday'    => 'Su',
        ];
        return $map[$name] ?? null;
    }

    public static function getWeekRange(string $date): array
    {
        $timestamp = strtotime($date);
        $dayOfWeek = date('N', $timestamp); // 1=Monday, 7=Sunday
        $monday = date('Y-m-d', strtotime("-" . ($dayOfWeek - 1) . " days", $timestamp));
        $sunday = date('Y-m-d', strtotime("+" . (7 - $dayOfWeek) . " days", $timestamp));
        return ['start' => $monday, 'end' => $sunday];
    }

    public static function getMonthRange(string $date): array
    {
        $dt = new DateTime($date);
        return [
            'start' => $dt->modify('first day of this month')->format('Y-m-d'),
            'end'   => (new DateTime($date))->modify('last day of this month')->format('Y-m-d'),
        ];
    }

    public static function countOffInRange(int $employeeId, int $companyId, string $startDate, string $endDate): int
    {
        return Attendance::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$startDate, $endDate])
            ->where('status', 'O')
            ->count();
    }

    public static function getAbsentDatesInRange(int $employeeId, int $companyId, string $startDate, string $endDate): array
    {
        return Attendance::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$startDate, $endDate])
            ->where('status', 'A')
            ->orderBy('date', 'asc')
            ->pluck('date')
            ->map(fn($d) => date('Y-m-d', strtotime($d)))
            ->toArray();
    }

    public static function applyWeekend(array $weekendConfig, int $nthAbsent, string $date, int $employeeId, int $companyId): bool
    {
        $type = $weekendConfig['type'] ?? 'Not Applicable';

        if ($type === 'Not Applicable') {
            return false;
        }

        if ($type === 'Fixed') {
            $dayName = date('l', strtotime($date));
            return $dayName === $weekendConfig['day'];
        }

        if ($type === 'Flexi') {
            $week = self::getWeekRange($date);
            $absentDates = self::getAbsentDatesInRange($employeeId, $companyId, $week['start'], $week['end']);

            $offDates = Attendance::where('employee_id', $employeeId)
                ->where('company_id', $companyId)
                ->whereBetween('date', [$week['start'], $week['end']])
                ->where('status', 'O')
                ->orderBy('date', 'asc')
                ->pluck('date')
                ->map(fn($d) => date('Y-m-d', strtotime($d)))
                ->toArray();

            $allNonPresentDates = array_unique(array_merge($absentDates, $offDates));
            sort($allNonPresentDates);

            $targetIndex = $nthAbsent - 1;
            return isset($allNonPresentDates[$targetIndex]) && $allNonPresentDates[$targetIndex] === $date;
        }

        if ($type === 'Alternating') {
            $weekNumber = (int) date('W', strtotime($date));
            $isEvenWeek = ($weekNumber % 2 === 0);
            $targetDays = $isEvenWeek ? ($weekendConfig['even'] ?? []) : ($weekendConfig['odd'] ?? []);
            $currentDayKey = self::fullNameToDayKey(date('l', strtotime($date)));
            return in_array($currentDayKey, $targetDays);
        }

        return false;
    }

    public static function applyMonthlyFlexi(int $monthlyQuota, string $date, int $employeeId, int $companyId): bool
    {
        if ($monthlyQuota <= 0) {
            return false;
        }

        $month = self::getMonthRange($date);
        $existingOffCount = self::countOffInRange($employeeId, $companyId, $month['start'], $month['end']);

        if ($existingOffCount >= $monthlyQuota) {
            return false;
        }

        $absentDates = self::getAbsentDatesInRange($employeeId, $companyId, $month['start'], $month['end']);

        return !empty($absentDates) && $absentDates[0] === $date;
    }

    /**
     * Recalculate weekoff statuses for a collection of attendance records.
     * Works in-memory — does NOT write to DB.
     * Only processes records with status "A" — leaves P, L, H, O, etc. untouched.
     *
     * @param \Illuminate\Support\Collection $attendances  Attendance records with employee.schedule.shift loaded
     * @param int $companyId
     * @return \Illuminate\Support\Collection  Same collection with corrected statuses
     */
    public static function recalculateForReport($attendances, int $companyId)
    {
        // Group by employee
        $byEmployee = $attendances->groupBy('employee_id');

        foreach ($byEmployee as $employeeId => $records) {
            // Get shift config from the first record that has schedule.shift
            $shift = null;
            foreach ($records as $record) {
                $emp = $record->employee ?? null;
                if ($emp) {
                    $schedule = $emp->schedule ?? ($emp->schedule_all ?? null);
                    if ($schedule) {
                        // schedule could be a single model or a collection
                        $scheduleModel = is_iterable($schedule) ? collect($schedule)->first() : $schedule;
                        if ($scheduleModel && isset($scheduleModel['shift'])) {
                            $shift = $scheduleModel['shift'];
                            break;
                        }
                    }
                }
                // Also check direct shift relationship
                if (!$shift && isset($record->shift) && $record->shift) {
                    $shift = $record->shift;
                    break;
                }
            }

            if (!$shift) {
                continue;
            }

            $config = self::resolveConfig($shift);

            // Check if monthly flexi is standalone mode
            $isMonthlyFlexiStandalone = $config['monthly_flexi'] > 0
                && $config['weekend1']['type'] === 'Not Applicable'
                && $config['weekend2']['type'] === 'Not Applicable';

            // Collect only "A" status records sorted by date
            $absentRecords = $records->filter(fn($r) => $r->status === 'A')->sortBy('date');

            if ($absentRecords->isEmpty()) {
                continue;
            }

            if ($isMonthlyFlexiStandalone) {
                // Mode 3: Monthly Flexible (standalone)
                self::applyMonthlyFlexiForReport($absentRecords, $config['monthly_flexi'], $records);
            } else {
                // Mode 1 & 2: Fixed and/or Flexible weekends
                self::applyWeekendForReport($absentRecords, $config, $records);
            }
        }

        return $attendances;
    }

    /**
     * Apply weekend1/weekend2 logic in-memory for report.
     */
    private static function applyWeekendForReport($absentRecords, array $config, $allRecords): void
    {
        // Group absent records by week (Mon-Sun)
        $byWeek = $absentRecords->groupBy(function ($record) {
            $week = self::getWeekRange(date('Y-m-d', strtotime($record->date)));
            return $week['start']; // group key = Monday of that week
        });

        foreach ($byWeek as $weekStart => $weekAbsents) {
            $weekAbsents = $weekAbsents->sortBy('date')->values();
            $convertedCount = 0;

            // Also count already-O records in this week from allRecords
            $weekRange = self::getWeekRange($weekStart);
            $existingOff = $allRecords->filter(function ($r) use ($weekRange) {
                $d = date('Y-m-d', strtotime($r->date));
                return $r->status === 'O' && $d >= $weekRange['start'] && $d <= $weekRange['end'];
            })->count();

            foreach ($weekAbsents as $record) {
                $date = date('Y-m-d', strtotime($record->date));
                $shouldConvert = false;

                // Weekend1 check
                if (!$shouldConvert && $config['weekend1']['type'] !== 'Not Applicable') {
                    if ($config['weekend1']['type'] === 'Fixed') {
                        $dayName = date('l', strtotime($date));
                        $shouldConvert = ($dayName === $config['weekend1']['day']);
                    } elseif ($config['weekend1']['type'] === 'Flexi') {
                        // First absent in the week (considering existing O records)
                        $shouldConvert = ($convertedCount + $existingOff) < 1;
                    }
                }

                // Weekend2 check (only if Weekend1 didn't match)
                if (!$shouldConvert && $config['weekend2']['type'] !== 'Not Applicable') {
                    if ($config['weekend2']['type'] === 'Fixed') {
                        $dayName = date('l', strtotime($date));
                        $shouldConvert = ($dayName === $config['weekend2']['day']);
                    } elseif ($config['weekend2']['type'] === 'Flexi') {
                        // Second absent in the week (considering existing O records)
                        $shouldConvert = ($convertedCount + $existingOff) < 2;
                    }
                }

                if ($shouldConvert) {
                    $record->status = 'O';
                    $convertedCount++;
                }
            }
        }
    }

    /**
     * Apply monthly flexible logic in-memory for report.
     */
    private static function applyMonthlyFlexiForReport($absentRecords, int $monthlyQuota, $allRecords): void
    {
        // Group absent records by month
        $byMonth = $absentRecords->groupBy(function ($record) {
            return date('Y-m', strtotime($record->date));
        });

        foreach ($byMonth as $monthKey => $monthAbsents) {
            $monthAbsents = $monthAbsents->sortBy('date')->values();

            // Count existing "O" records in this month from allRecords
            $existingOff = $allRecords->filter(function ($r) use ($monthKey) {
                return $r->status === 'O' && date('Y-m', strtotime($r->date)) === $monthKey;
            })->count();

            $remaining = $monthlyQuota - $existingOff;

            foreach ($monthAbsents as $record) {
                if ($remaining <= 0) {
                    break;
                }
                $record->status = 'O';
                $remaining--;
            }
        }
    }
}
