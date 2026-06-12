# Attendance Gap-Fill (Missing Rows) — Design

**Date:** 2026-04-22
**Status:** Approved (awaiting plan + implementation)

## Problem

For the selected date range, the attendance report only shows days where a row exists in the `attendances` table. Some days are missing rows entirely — employee is absent but cron never ran, OR the employee has punches that didn't fit any shift's strict IN/OUT window so the render controllers silently skipped them.

Example — Mohamed (3004, auto-shift, home shift = Day Time 08:00-10:00 / 17:00-19:00):
- Apr 16: logs 20:04, 20:04 → all evening, no IN-window match → skipped
- Apr 18: logs 10:01, 20:10 → 10:01 is 1 sec past 10:00 cutoff → skipped
- Apr 20: log 09:53 → matches IN, no OUT → row *should* get built as M but doesn't appear
- Apr 21: logs 10:05, 19:52, 19:53 → 10:05 is 5 min past cutoff → skipped

All four days have logs, but no attendance rows. The report shows the days as missing.

## Goals

1. After a regenerate (or daily cron), every (employee × date) in the requested range where the employee is active AND has a schedule covering that date has an `attendances` row.
2. Never overwrite correct rows already produced by SingleShift / NightShift / Filo / AutoShift / Split controllers.
3. Keep behavior unchanged for tenants that are working correctly today.
4. Week-off conversion still runs over the newly-filled rows (existing `RenderWeekOffJob` handles A → O).

## Non-goals

- Softening the IN/OUT window matching inside SingleShiftController or NightShiftController (this is the "real" fix for the partial-punch case but too risky for this pass — tracked as follow-up).
- Changing the `renderAbsent` cron logic.
- Reprocessing rows that already have `P` / `LC` / `EG` / `A` / `O` / `L` / `H` / `M` status.

## Design

### Where the fix goes

New method **`RenderController::gapFillMissingRows(array $employeeIds, int $companyId, string $fromDate, string $toDate): int`** that:

1. Generates every date from `$fromDate` to `$toDate` (inclusive).
2. For each `(employeeId, date)`:
   - Confirm the employee exists in `employees` (skip orphan schedule rows like 65, 3021, 3151, 46 we saw in company 13).
   - Find a `ScheduleEmployee` for this employee where `from_date <= date <= to_date`. Skip if none.
   - Check if an `attendances` row already exists for `(company_id, employee_id, date)`. Skip if yes.
   - Check if the employee has any `attendance_logs` on that date.
   - Insert a single row:
     - `shift_id` / `shift_type_id` from the schedule (or 0 if null)
     - `status` = `'M'` if logs exist, `'A'` if no logs
     - `in`, `out`, `total_hrs`, `ot`, etc. → `"---"` placeholders (same shape as other Attendance rows)

3. Return the number of rows inserted (for logging).

### Where it's called

At the end of `RenderController::renderLogs()` in [backend/app/Http/Controllers/Shift/RenderController.php:39](backend/app/Http/Controllers/Shift/RenderController.php#L39):

- Runs **after** all shift-type-specific controllers (`AutoShiftController`, `SingleShiftController`, etc.).
- Runs **before** `dispatchWeekoffForRange(...)` — so newly-inserted `A` rows can be converted to `O` by the week-off job.

### Inputs

The existing `renderLogs` signature receives:
- `$request->employee_ids` — array of employee system_user_ids
- `$request->dates` — `[$fromDate, $toDate]` (or single date)
- `$request->company_id`

These are exactly what the sweep needs.

### Safety: what gets inserted vs preserved

| Scenario | Existing row | Existing logs | Sweep action |
|---|---|---|---|
| SingleShift built row with `P` | yes | yes | **no-op** (row exists) |
| Renderers skipped because window miss | no | yes | **insert M** (shift from schedule) |
| Employee absent, cron didn't run | no | no | **insert A** (shift from schedule) |
| No schedule covering date | no | n/a | **skip** |
| Orphan schedule (employee row deleted) | no | n/a | **skip** |

Insert path uses Laravel's `Attendance::insert([...])` — if a uniqueness constraint on `(company_id, employee_id, date)` fails (race with another writer), we catch the exception and continue. No transactions that could deadlock other writers.

## Data flow example — Mohamed

After existing renderers finish:
- Rows exist for 13, 14, 15, 17, 19, 22, 23, 24, 25, 26
- No rows for 16, 18, 20, 21

`gapFillMissingRows(['3004'], 13, '2026-04-13', '2026-04-22')` runs:
- 13: row exists → skip
- 14: row exists → skip
- 15: row exists → skip
- 16: no row, logs exist → **insert M** (shift_id=187, shift_type_id=6)
- 17: row exists → skip
- 18: no row, logs exist → **insert M**
- 19: row exists → skip
- 20: no row, logs exist → **insert M**
- 21: no row, logs exist → **insert M**
- 22: row exists → skip

Result: 4 rows inserted. User now sees 10 rows in the report (previously 6 visible).

## Error handling

| Scenario | Behavior |
|---|---|
| Employee in `$employee_ids` doesn't exist | Silently skipped (log debug only). |
| Bulk insert fails (constraint, etc.) | Exception caught per row, continues to next. Not a transaction — partial progress is fine. |
| Schedule table returns multiple schedules for the date | Use the most recent `updated_at` one. |
| Date range is invalid or empty | Return 0 (no-op). |
| Week-off job fails on newly inserted rows | Existing behavior: failure is logged, job re-runs on next schedule. Nothing in this design makes that worse. |

## Testing (manual)

1. Pick Mohamed, regenerate for 2026-04-13 to 2026-04-22. Confirm rows for 16, 18, 20, 21 now appear as `M`.
2. Pick an employee with only absences (no logs) whose current report has gaps. After regenerate, gaps should be `A`. Confirm week-off cron then converts applicable ones to `O`.
3. Pick an employee whose report currently shows `P` / `LC` on every day in the range. After regenerate, nothing should change — no new rows, no overwrites.
4. Deploy and regenerate for full company 13, date range 2026-04-01 → 2026-04-22. Count new rows — should be in the tens (matching the gaps we found in the analysis query).

## Out of scope

- Softening IN/OUT windows in SingleShift/NightShift controllers (so Apr 21's three punches become `LC` instead of `M`). Next ticket.
- Changing `renderAbsent` cron to process more than "yesterday".
- Cleaning up orphan `schedule_employees` rows.
