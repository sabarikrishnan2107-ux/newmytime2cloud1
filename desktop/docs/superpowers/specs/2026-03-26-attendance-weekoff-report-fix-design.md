# Attendance WeekOff in Reports & PDF — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Depends on:** `2026-03-26-attendance-weekoff-calculation-design.md`

## Problem

Format A (Template4) downloads and other reports show "A" (Absent) instead of "O" (WeekOff) for days that should be week-off. The root cause: the report APIs read the `status` field directly from the `attendances` table without recalculating week-off. If the rendering cron hasn't processed the records, week-offs appear as absences.

## Requirements

### Three Mutually Exclusive Modes (per shift)

**Mode 1: Fixed Weekend**
- Weekend1 and/or Weekend2 = fixed day name (e.g., "Friday", "Saturday")
- Those days are always "O" if the employee is absent
- Max 2 week-offs per week

**Mode 2: Fixed + Flexible (or both Flexible)**
- Weekend1 = fixed day → always "O" when absent
- Weekend2 = Flexible → first absent day (excluding Weekend1's fixed day) becomes "O"
- Or both Flexible → first two absent days in the week become "O"
- Leave (L) and Holiday (H) days are skipped — only "A" records are candidates

**Mode 3: Monthly Flexible (standalone)**
- When `monthly_flexi_holidays` is set (and Weekend1/Weekend2 are "Not Applicable")
- Weekend1 and Weekend2 are ignored
- Employee gets N week-offs per month
- First N absent days chronologically become "O", rest stay "A"

### Priority Chain

```
Leave (L) > Present (P/LC/EG) > Holiday (H) > Weekend1 > Weekend2 > Monthly Flexible > Absent (A)
```

### Key Rules

1. Week range: Monday to Sunday
2. Leave/Holiday days are never converted to "O"
3. Only "A" status records are candidates for week-off conversion
4. If employee has logs (worked), week-off does not apply

## Architecture

### Dual-Layer Fix

**Layer 1: Render time (cron) — already exists**
`AttendanceWeekOffService::processWeekOff()` writes "O" to DB. Verify it implements the 3 modes correctly.

**Layer 2: Report time — NEW**
Add `AttendanceWeekOffService::recalculateForReport()` that post-processes attendance collections on-the-fly.

### New Method: `recalculateForReport()`

```php
/**
 * Post-process attendance records for reports/PDFs.
 * Recalculates week-off for "A" status records only.
 * Does NOT write to DB — returns corrected collection.
 *
 * @param Collection $attendances  Attendance records (must include employee schedule/shift)
 * @param int $companyId
 * @return Collection              Same collection with corrected statuses
 */
public static function recalculateForReport(Collection $attendances, int $companyId): Collection
```

**Algorithm:**
1. Group attendance records by `employee_id`
2. For each employee:
   a. Load their shift config (weekend1, weekend2, monthly_flexi_holidays)
   b. Determine mode (Fixed, Flexible, or Monthly Flexible)
   c. Group their records by week (Mon-Sun) or month (for Mode 3)
   d. For each week/month:
      - Collect all "A" records (candidates for conversion)
      - Apply Weekend1 logic → convert matching "A" to "O"
      - Apply Weekend2 logic → convert matching "A" to "O"
      - OR apply Monthly Flexible logic (standalone)
   e. Update status in the collection (not DB)
3. Return the modified collection

### Integration Points

| Endpoint | File | Change |
|----------|------|--------|
| `GET /api/attendance-report` | `routes/admin.php:191` | Call `recalculateForReport()` on records before transforming response |
| `GenerateAttendanceReportPDF` job | `app/Jobs/GenerateAttendanceReportPDF.php` | Call `recalculateForReport()` on data before rendering PDF |
| `POST /api/summary-report` | `app/Http/Controllers/Reports/ReportController.php` | Recalculate O_count in summary aggregation |

### Example

```
Shift: weekend1=Friday (Fixed), weekend2=Flexible
Week: Mon=A, Tue=A, Wed=P, Thu=P, Fri=A, Sat=A, Sun=P

Step 1 - Weekend1 (Friday Fixed): Fri=A → Fri=O
Step 2 - Weekend2 (Flexible, first absent excluding Friday): Mon=A → Mon=O

Result: Mon=O, Tue=A, Wed=P, Thu=P, Fri=O, Sat=A, Sun=P
```

```
Shift: monthly_flexi_holidays=5 (standalone)
Month: 8 absent days total

First 5 absent days → "O"
Remaining 3 → stay "A"
```

### Files to Modify

| File | Change |
|------|--------|
| `app/Services/Attendance/AttendanceWeekOffService.php` | Add `recalculateForReport()` method; verify existing modes |
| `routes/admin.php` | Call recalculate on attendance-report API response |
| `app/Jobs/GenerateAttendanceReportPDF.php` | Call recalculate before PDF generation |
| `app/Http/Controllers/Reports/ReportController.php` | Fix summary report O_count |

### Edge Cases

1. **Employee has no schedule/shift** — skip, leave status as-is
2. **All "A" records already correct** — recalculate is idempotent, no harm
3. **Mixed modes in same company** — each employee uses their own shift config
4. **Shift changes mid-month** — use the shift active on each date
5. **Leave on a flexible day** — Leave takes priority, not counted as absent candidate
