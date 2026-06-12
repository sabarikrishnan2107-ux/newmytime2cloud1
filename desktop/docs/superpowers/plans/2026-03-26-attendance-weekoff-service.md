# Attendance WeekOff Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all weekoff calculation logic into a single `AttendanceWeekOffService` used by both the rendering pipeline (DB writes) and report/PDF generation (on-the-fly).

**Architecture:** A new service class `AttendanceWeekOffService` in `app/Services/Attendance/` handles Weekend1, Weekend2, and Monthly Flexible logic with a clear priority chain. Existing controllers delegate to this service. Config resolution checks the new `weekoff_rules` JSON first, falls back to legacy string fields.

**Tech Stack:** Laravel 9+, PHP 8.1, PostgreSQL

---

## File Structure

| File | Role |
|------|------|
| **Create:** `app/Services/Attendance/AttendanceWeekOffService.php` | All weekoff calculation logic |
| **Modify:** `app/Http/Controllers/Shift/RenderController.php` (lines 700-844) | `renderOffScript()` delegates to service |
| **Modify:** `app/Http/Controllers/FlexibleOffController.php` (lines 39-111) | `renderFlexibleOffScript()` delegates to service |
| **Modify:** `app/Http/Controllers/OffByDayController.php` (lines 41-120) | `renderOffByDayScript()` delegates to service |
| **Modify:** `app/Http/Controllers/MonthlyFlexibleHolidaysController.php` (lines 26-97) | Re-enable and delegate to service |
| **Modify:** `app/Models/Attendance.php` (lines 511-558) | `processWeekOffFunc()` delegates to service |

---

### Task 1: Create AttendanceWeekOffService — Config Resolution

**Files:**
- Create: `app/Services/Attendance/AttendanceWeekOffService.php`

- [ ] **Step 1: Create the service file with config resolution**

Create `app/Services/Attendance/AttendanceWeekOffService.php`:

```php
<?php

namespace App\Services\Attendance;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\ScheduleEmployee;
use DateTime;

class AttendanceWeekOffService
{
    /**
     * Resolve weekoff configuration from shift.
     * Priority: weekoff_rules JSON > legacy string fields.
     *
     * @param  object|array $shift
     * @return array  ['weekend1' => ['type' => 'Fixed'|'Flexi'|'Not Applicable', 'day' => 'Friday'|null],
     *                 'weekend2' => ['type' => ..., 'day' => ...],
     *                 'monthly_flexi' => int|0]
     */
    public static function resolveConfig($shift): array
    {
        $shift = (object) $shift;
        $weekoffRules = $shift->weekoff_rules ?? null;

        // New JSON system takes priority
        if ($weekoffRules && is_array($weekoffRules) && isset($weekoffRules['type'])) {
            return self::parseJsonRules($weekoffRules);
        }

        // Fall back to legacy string fields
        return self::parseLegacyFields($shift);
    }

    private static function parseJsonRules(array $rules): array
    {
        $type = $rules['type'] ?? 'Fixed';

        if ($type === 'Fixed') {
            // Fixed days from JSON: weekoff_rules = {type: 'Fixed', days: ['S', 'Su']}
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

            // Weekly flexible
            return [
                'weekend1' => ['type' => $count >= 1 ? 'Flexi' : 'Not Applicable', 'day' => null],
                'weekend2' => ['type' => $count >= 2 ? 'Flexi' : 'Not Applicable', 'day' => null],
                'monthly_flexi' => 0,
            ];
        }

        if ($type === 'Alternating') {
            // Alternating handled separately — pass through as-is
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

    /**
     * Convert short day key to full day name.
     * Keys: M=Monday, T=Tuesday, W=Wednesday, Th=Thursday, F=Friday, S=Saturday, Su=Sunday
     */
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

    /**
     * Convert full day name to short key.
     */
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
}
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Services/Attendance/AttendanceWeekOffService.php
```
Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add app/Services/Attendance/AttendanceWeekOffService.php
git commit -m "feat: add AttendanceWeekOffService with config resolution"
```

---

### Task 2: Add Core WeekOff Calculation Methods

**Files:**
- Modify: `app/Services/Attendance/AttendanceWeekOffService.php`

- [ ] **Step 1: Add the helper methods for week/month queries**

Append these methods inside the `AttendanceWeekOffService` class, before the closing `}`:

```php
    /**
     * Get the Monday-Sunday week range for a given date.
     *
     * @param  string $date  Y-m-d
     * @return array  ['start' => 'Y-m-d', 'end' => 'Y-m-d']
     */
    public static function getWeekRange(string $date): array
    {
        $timestamp = strtotime($date);
        $dayOfWeek = date('N', $timestamp); // 1=Monday, 7=Sunday
        $monday = date('Y-m-d', strtotime("-" . ($dayOfWeek - 1) . " days", $timestamp));
        $sunday = date('Y-m-d', strtotime("+" . (7 - $dayOfWeek) . " days", $timestamp));
        return ['start' => $monday, 'end' => $sunday];
    }

    /**
     * Get the month range for a given date.
     *
     * @param  string $date  Y-m-d
     * @return array  ['start' => 'Y-m-d', 'end' => 'Y-m-d']
     */
    public static function getMonthRange(string $date): array
    {
        $dt = new DateTime($date);
        return [
            'start' => $dt->modify('first day of this month')->format('Y-m-d'),
            'end'   => (new DateTime($date))->modify('last day of this month')->format('Y-m-d'),
        ];
    }

    /**
     * Count "O" statuses for an employee in a date range.
     */
    public static function countOffInRange(int $employeeId, int $companyId, string $startDate, string $endDate): int
    {
        return Attendance::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$startDate, $endDate])
            ->where('status', 'O')
            ->count();
    }

    /**
     * Count "A" (absent) statuses for an employee in a date range, before a given date.
     * Returns absent dates sorted chronologically.
     */
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
```

- [ ] **Step 2: Add the Weekend1/Weekend2 apply methods**

Append these methods inside the class:

```php
    /**
     * Check if a specific date qualifies for WeekOff based on a weekend config (Weekend1 or Weekend2).
     *
     * For Fixed: date must be the configured day AND employee must be absent.
     * For Flexi: the Nth absent day in the week (1st for Weekend1, 2nd for Weekend2) becomes WO.
     *
     * @param  array  $weekendConfig  ['type' => 'Fixed'|'Flexi'|'Not Applicable', 'day' => string|null]
     * @param  int    $nthAbsent      Which absent day to convert (1 for Weekend1, 2 for Weekend2)
     * @param  string $date           Y-m-d — the date being evaluated
     * @param  int    $employeeId
     * @param  int    $companyId
     * @return bool   True if this date should be marked "O"
     */
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

            // Also include dates already marked "O" in this week (they were absent before conversion)
            $offDates = Attendance::where('employee_id', $employeeId)
                ->where('company_id', $companyId)
                ->whereBetween('date', [$week['start'], $week['end']])
                ->where('status', 'O')
                ->orderBy('date', 'asc')
                ->pluck('date')
                ->map(fn($d) => date('Y-m-d', strtotime($d)))
                ->toArray();

            // Merge and sort: all days that were/are absent or already converted to O
            $allNonPresentDates = array_unique(array_merge($absentDates, $offDates));
            sort($allNonPresentDates);

            // The Nth non-present day (chronologically) gets converted
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

    /**
     * Check if a date qualifies for Monthly Flexible WeekOff.
     *
     * @param  int    $monthlyQuota   Total allowed WO days per month
     * @param  string $date           Y-m-d
     * @param  int    $employeeId
     * @param  int    $companyId
     * @return bool   True if this date should be marked "O"
     */
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

        // Among remaining absent days in the month, convert first chronologically
        $absentDates = self::getAbsentDatesInRange($employeeId, $companyId, $month['start'], $month['end']);

        // This date must be the first absent date to get the monthly flexi slot
        return !empty($absentDates) && $absentDates[0] === $date;
    }
```

- [ ] **Step 3: Verify syntax**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Services/Attendance/AttendanceWeekOffService.php
```
Expected: `No syntax errors detected`

- [ ] **Step 4: Commit**

```bash
git add app/Services/Attendance/AttendanceWeekOffService.php
git commit -m "feat: add weekend and monthly flexible calculation methods"
```

---

### Task 3: Add Public Entry Points (processWeekOff & calculateStatus)

**Files:**
- Modify: `app/Services/Attendance/AttendanceWeekOffService.php`

- [ ] **Step 1: Add the processWeekOff method (rendering pipeline — writes to DB)**

Add this method at the top of the class (after the opening `{`), before `resolveConfig`:

```php
    /**
     * Process weekoff for all absent employees on a given date.
     * Called by the rendering pipeline (cron/render endpoints).
     * Writes "O" status to the attendances table.
     *
     * Priority: Weekend1 → Weekend2 → Monthly Flexible → remains Absent
     *
     * @param  int    $companyId
     * @param  string $date       Y-m-d format
     * @param  int    $userId     Optional — 0 means process all employees
     * @return array              Employee IDs that were updated to "O"
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
     *
     * @param  string      $currentDayKey   Day key (M, T, W, Th, F, S, Su)
     * @param  array|null  $weekoffRules    JSON weekoff_rules from shift
     * @param  object      $shift           Shift model (with weekend1, weekend2, monthly_flexi_holidays)
     * @param  int         $companyId
     * @param  string      $date            Y-m-d format
     * @param  int         $employeeId
     * @param  mixed       $firstLog        First attendance log (falsy if no logs)
     * @return string|null                  "O" if weekoff, null otherwise
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
```

- [ ] **Step 2: Verify syntax**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Services/Attendance/AttendanceWeekOffService.php
```
Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add app/Services/Attendance/AttendanceWeekOffService.php
git commit -m "feat: add processWeekOff and calculateStatus public methods"
```

---

### Task 4: Update RenderController to Use Service

**Files:**
- Modify: `app/Http/Controllers/Shift/RenderController.php` (lines 700-844)

- [ ] **Step 1: Replace renderOffScript method**

Replace the entire `renderOffScript` method (lines 700-844) in `app/Http/Controllers/Shift/RenderController.php` with:

```php
    public function renderOffScript($company_id, $date, $user_id = 0)
    {
        try {
            $userIds = \App\Services\Attendance\AttendanceWeekOffService::processWeekOff(
                (int) $company_id,
                $date,
                (int) $user_id
            );
            return $userIds;
        } catch (\Exception $e) {
            return false;
        }
    }
```

- [ ] **Step 2: Verify syntax**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Http/Controllers/Shift/RenderController.php
```
Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/Shift/RenderController.php
git commit -m "refactor: RenderController renderOffScript delegates to AttendanceWeekOffService"
```

---

### Task 5: Update FlexibleOffController to Use Service

**Files:**
- Modify: `app/Http/Controllers/FlexibleOffController.php` (lines 39-111)

- [ ] **Step 1: Replace renderFlexibleOffScript method**

Replace the entire `renderFlexibleOffScript` method (lines 39-111) with:

```php
    public function renderFlexibleOffScript($company_id, $date, $backDays = 6, $user_id = 0)
    {
        try {
            return \App\Services\Attendance\AttendanceWeekOffService::processWeekOff(
                (int) $company_id,
                $date,
                (int) $user_id
            );
        } catch (\Exception $e) {
            return [];
        }
    }
```

- [ ] **Step 2: Verify syntax**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Http/Controllers/FlexibleOffController.php
```
Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/FlexibleOffController.php
git commit -m "refactor: FlexibleOffController delegates to AttendanceWeekOffService"
```

---

### Task 6: Update OffByDayController to Use Service

**Files:**
- Modify: `app/Http/Controllers/OffByDayController.php` (lines 41-120)

- [ ] **Step 1: Replace renderOffByDayScript method**

Replace the entire `renderOffByDayScript` method (lines 41-120) with:

```php
    public function renderOffByDayScript($company_id, $date, $weekNumber, $user_id = 0)
    {
        try {
            return \App\Services\Attendance\AttendanceWeekOffService::processWeekOff(
                (int) $company_id,
                $date,
                (int) $user_id
            );
        } catch (\Exception $e) {
            return [];
        }
    }
```

- [ ] **Step 2: Verify syntax**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Http/Controllers/OffByDayController.php
```
Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/OffByDayController.php
git commit -m "refactor: OffByDayController delegates to AttendanceWeekOffService"
```

---

### Task 7: Update MonthlyFlexibleHolidaysController — Re-enable and Delegate

**Files:**
- Modify: `app/Http/Controllers/MonthlyFlexibleHolidaysController.php` (lines 26-97)

- [ ] **Step 1: Replace renderMonthlyFlexibleHolidaysScipt method**

Replace the entire `renderMonthlyFlexibleHolidaysScipt` method (lines 26-97) with:

```php
    public function renderMonthlyFlexibleHolidaysScipt($company_id, $date, $user_id = 0)
    {
        try {
            return \App\Services\Attendance\AttendanceWeekOffService::processWeekOff(
                (int) $company_id,
                $date,
                (int) $user_id
            );
        } catch (\Exception $e) {
            return [];
        }
    }
```

Note: This removes the `return '';` on line 29 that previously disabled this controller.

- [ ] **Step 2: Verify syntax**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Http/Controllers/MonthlyFlexibleHolidaysController.php
```
Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/MonthlyFlexibleHolidaysController.php
git commit -m "refactor: re-enable MonthlyFlexibleHolidaysController, delegate to service"
```

---

### Task 8: Update Attendance Model processWeekOffFunc

**Files:**
- Modify: `app/Models/Attendance.php` (lines 511-558)

- [ ] **Step 1: Add use statement at top of Attendance.php**

Add this import after the existing `use` statements (after line 9):

```php
use App\Services\Attendance\AttendanceWeekOffService;
```

- [ ] **Step 2: Replace processWeekOffFunc method**

Replace the entire `processWeekOffFunc` method (lines 511-558) with:

```php
    public static function processWeekOffFunc($currentDayKey, $weekoff_rules, $company_id, $date, $employeeId, $firstLog)
    {
        // Delegate to the consolidated service.
        // Build a minimal shift object from the weekoff_rules for config resolution.
        $shift = (object) ['weekoff_rules' => $weekoff_rules];

        return AttendanceWeekOffService::calculateStatus(
            $currentDayKey,
            $weekoff_rules,
            $shift,
            (int) $company_id,
            $date,
            (int) $employeeId,
            $firstLog
        );
    }
```

- [ ] **Step 3: Verify syntax**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe -l app/Models/Attendance.php
```
Expected: `No syntax errors detected`

- [ ] **Step 4: Commit**

```bash
git add app/Models/Attendance.php
git commit -m "refactor: Attendance processWeekOffFunc delegates to AttendanceWeekOffService"
```

---

### Task 9: Verify All Files Pass Syntax Check

**Files:**
- All modified files

- [ ] **Step 1: Run syntax check on all modified files**

Run:
```bash
cd d:/newmytime2cloud/backend && \
php/php.exe -l app/Services/Attendance/AttendanceWeekOffService.php && \
php/php.exe -l app/Http/Controllers/Shift/RenderController.php && \
php/php.exe -l app/Http/Controllers/FlexibleOffController.php && \
php/php.exe -l app/Http/Controllers/OffByDayController.php && \
php/php.exe -l app/Http/Controllers/MonthlyFlexibleHolidaysController.php && \
php/php.exe -l app/Models/Attendance.php
```
Expected: All files show `No syntax errors detected`

- [ ] **Step 2: Verify Laravel can discover the service (autoload)**

Run:
```bash
cd d:/newmytime2cloud/backend && php/php.exe composer.phar dump-autoload
```
Expected: `Generating optimized autoload files` with no errors

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: verify all files pass syntax and autoload checks"
```
