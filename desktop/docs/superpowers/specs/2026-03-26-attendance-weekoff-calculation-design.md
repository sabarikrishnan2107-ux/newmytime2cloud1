# Attendance WeekOff Calculation — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Problem

The weekoff calculation logic is scattered across 5+ controllers (`FlexibleOffController`, `OffByDayController`, `MonthlyFlexibleHolidaysController`, `AbsentController`, `RenderController::renderOffScript`). The `MonthlyFlexibleHolidaysController` is disabled. The logic has bugs and inconsistencies. This spec consolidates everything into a single service.

## Requirements

### Shift Weekend Settings

Each shift has three weekoff settings:

1. **Weekend1** — Fixed day name (e.g., "Friday") or "Flexi" or "Not Applicable"
2. **Weekend2** — Fixed day name or "Flexi" or "Not Applicable"
3. **Monthly Flexible Weekend** — A number (max WO days per month) or "Not Applicable"

### Status Codes

- `P` = Present
- `O` = WeekOff
- `A` = Absent
- `L` = Leave
- `H` = Holiday

### Priority Chain

Statuses are evaluated in this order. Once a status is determined, later rules do not override it:

1. **Leave** — If approved leave exists, status = "L". Skip all weekoff logic.
2. **Present** — If attendance logs exist, status = "P". Skip all weekoff logic.
3. **Holiday** — If a holiday exists, status = "H". Skip all weekoff logic.
4. **Weekend1** — May convert "A" to "O" (1 per week).
5. **Weekend2** — May convert "A" to "O" (1 more per week).
6. **Monthly Flexible** — May convert "A" to "O" (up to monthly quota).
7. **Remaining** — Stays "A".

### Weekend1 Logic

**If Fixed day (e.g., "Friday"):**
- If today is that day AND employee is absent → mark "O"
- If employee is present on that day → keep "P" (do not override)

**If "Flexi":**
- Week range: Monday to Sunday
- Among all absent days in the week, the **first chronologically** becomes "O"
- Only 1 day per week from Weekend1

**If "Not Applicable":**
- Skip Weekend1 entirely

### Weekend2 Logic

Same rules as Weekend1, but:
- For Flexible: converts the **second** absent day (first remaining after Weekend1) to "O"
- For Fixed day: independent of Weekend1 — can be a different day
- Weekend1 and Weekend2 **stack** — a week can have up to 2 WOs from these

### Monthly Flexible Weekend Logic

- Applied **after** Weekend1 and Weekend2
- Count all "O" statuses already assigned in the current month
- Remaining quota = `monthly_flexi_holidays` value minus existing "O" count
- Convert next absent days to "O" chronologically until quota is exhausted
- If quota is 0 or "Not Applicable", skip

**Example:**
```
monthly_flexi_holidays = 5
Month so far: 3 days marked "O" by Weekend1/Weekend2
Remaining quota: 5 - 3 = 2
Next 2 absent days in the month → converted to "O"
```

### Full Example

```
Shift: weekend1=Flexible, weekend2=Flexible, monthly_flexi_holidays=5

Week 1: Mon=A, Tue=A, Wed=A, Thu=P, Fri=P, Sat=A, Sun=A
After Weekend1:  Mon=O, Tue=A, Wed=A, Thu=P, Fri=P, Sat=A, Sun=A
After Weekend2:  Mon=O, Tue=O, Wed=A, Thu=P, Fri=P, Sat=A, Sun=A
After Monthly Flexi (5-2=3 left):
                 Mon=O, Tue=O, Wed=O, Thu=P, Fri=P, Sat=O, Sun=O
Monthly quota used: 5 total (2 from weekends + 3 from monthly)

Week 2: Mon=A, Tue=A, Wed=P, Thu=P, Fri=P
After Weekend1:  Mon=O, Tue=A
After Weekend2:  Mon=O, Tue=O
After Monthly (5-5=0 left): no more conversions
Result: Mon=O, Tue=O, Wed=P, Thu=P, Fri=P
```

## Architecture

### New Service Class

**File:** `app/Services/AttendanceWeekOffService.php`

**Public Methods:**

```php
class AttendanceWeekOffService
{
    /**
     * Process weekoff for rendering pipeline (writes to DB).
     * Called by RenderController::renderOffScript and related controllers.
     *
     * @param int    $companyId
     * @param string $date       Y-m-d format
     * @param int    $userId     Optional, 0 for all employees
     * @return array             Employee IDs that were updated
     */
    public static function processWeekOff($companyId, $date, $userId = 0): array

    /**
     * Calculate status for a single employee on a single date (no DB write).
     * Called by report/PDF generation for on-the-fly calculation.
     *
     * @param string $currentDayKey  Day key (M, T, W, Th, F, S, Su)
     * @param array  $weekoffRules   JSON weekoff_rules from shift (or null)
     * @param array  $shift          Shift model data (weekend1, weekend2, monthly_flexi_holidays)
     * @param int    $companyId
     * @param string $date           Y-m-d format
     * @param int    $employeeId
     * @param bool   $hasLogs        Whether attendance logs exist for this date
     * @return string|null           "O" if weekoff, null otherwise
     */
    public static function calculateStatus(...): ?string
}
```

**Internal Methods:**

```php
private static function resolveConfig($shift, $weekoffRules): array
// Returns normalized config: { weekend1: {type, day}, weekend2: {type, day}, monthly_flexi: int }
// Checks weekoff_rules JSON first, falls back to legacy string fields

private static function applyWeekend($config, $employeeId, $companyId, $date, $weekendNumber): bool
// Applies Weekend1 or Weekend2 logic for a single date
// Returns true if this date should be "O"

private static function applyMonthlyFlexi($monthlyQuota, $employeeId, $companyId, $date): bool
// Checks monthly quota, returns true if this date should be "O"

private static function getWeekAbsentDays($employeeId, $companyId, $date): Collection
// Returns all absent days in the Mon-Sun week containing $date

private static function getMonthOffCount($employeeId, $companyId, $date): int
// Counts "O" statuses in the month so far
```

### Config Resolution

```php
// Priority: weekoff_rules JSON > legacy string fields
function resolveConfig($shift, $weekoffRules) {
    if ($weekoffRules && isset($weekoffRules['type'])) {
        // Use new JSON system
        return parseJsonRules($weekoffRules);
    }

    // Fall back to legacy
    return [
        'weekend1' => [
            'type'  => $shift->weekend1,  // "Friday", "Flexi", or "Not Applicable"
        ],
        'weekend2' => [
            'type'  => $shift->weekend2,
        ],
        'monthly_flexi' => $shift->monthly_flexi_holidays, // number or "Not Applicable"
    ];
}
```

### Integration Points

#### A) Rendering Pipeline (DB writes)

**Current flow:**
1. `render_logs` → P/M
2. `render_absent` → A
3. `render_off` → A to O (buggy, scattered)
4. `render_flexible_off_week1/week2` → flexible
5. `render_monthly_flexible_holidays` → monthly (disabled)
6. `render_leaves` → L

**New flow:**
1. `render_logs` → P/M (unchanged)
2. `render_absent` → A (unchanged)
3. `render_off` → calls `AttendanceWeekOffService::processWeekOff()` — handles Weekend1, Weekend2, Monthly Flexible in one pass
4. `render_leaves` → L (unchanged)

Old routes (`render_flexible_off_week1/week2`, `render_off_by_day_week1/week2`, `render_monthly_flexible_holidays`) remain functional but internally delegate to the service.

#### B) Report/PDF Generation (on-the-fly)

`Attendance::processWeekOffFunc()` is updated to call `AttendanceWeekOffService::calculateStatus()`.

### Files Changed

| File | Change |
|------|--------|
| **New:** `app/Services/AttendanceWeekOffService.php` | All weekoff logic consolidated |
| `app/Http/Controllers/Shift/RenderController.php` | `renderOffScript()` calls service |
| `app/Http/Controllers/FlexibleOffController.php` | Delegates to service |
| `app/Http/Controllers/OffByDayController.php` | Delegates to service |
| `app/Http/Controllers/MonthlyFlexibleHolidaysController.php` | Re-enabled, delegates to service |
| `app/Models/Attendance.php` | `processWeekOffFunc()` calls service |

### Edge Cases

1. **Employee joins mid-week** — Only count absent days from joining date onward
2. **Shift changes mid-month** — Use the shift active on each specific date
3. **Both weekend1 and weekend2 are the same fixed day** — Only 1 WO (not 2) for that day
4. **Employee has leave on a flexible weekoff day** — Leave takes priority, that day is "L", not counted as absent for weekoff calculation
5. **No schedule assigned** — Skip employee entirely
6. **Weekend1=Fixed Friday, Weekend2=Flexi** — Friday absent = O (from Weekend1), first other absent day = O (from Weekend2)
