# Attendance Gap-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After `/render_logs` finishes, insert an `attendances` row for every `(employee, date)` in the requested range that has an active schedule but no existing row — so the report no longer has gaps (e.g. Mohamed's Apr 16/18/20/21).

**Architecture:** A single new method `gapFillMissingRows()` on `RenderController`, called at the end of `renderLogs()` before `dispatchWeekoffForRange()`. Pure addition — never modifies existing rows. Rows are inserted as `M` (if logs exist on that date) or `A` (if none).

**Tech Stack:** Laravel (PHP), PostgreSQL.

**Spec:** [docs/superpowers/specs/2026-04-22-attendance-gap-fill-design.md](../specs/2026-04-22-attendance-gap-fill-design.md)

**Note on commits:** The user handles all git commits. Do NOT commit.

---

## File Map

**Modified:**
- `backend/app/Http/Controllers/Shift/RenderController.php` — add `gapFillMissingRows()` method; call it from `renderLogs()` before `dispatchWeekoffForRange()`.

**Unchanged:**
- All shift-type-specific controllers (SingleShift / NightShift / AutoShift / FiloShift / SplitShift / MultiShift).
- `AbsentController` — left alone.
- Frontend — no changes.

---

## Task 1: Add `gapFillMissingRows` method and wire into `renderLogs`

**Files:**
- Modify: `backend/app/Http/Controllers/Shift/RenderController.php`

- [ ] **Step 1: Confirm `use` statements at the top of `RenderController.php`**

Read the top of `backend/app/Http/Controllers/Shift/RenderController.php`. Confirm these are already imported (most should be):

- `App\Models\Attendance`
- `App\Models\AttendanceLog`
- `App\Models\Employee`
- `App\Models\ScheduleEmployee`
- `Illuminate\Support\Facades\DB`
- `Carbon\Carbon`

Add any that are missing to the `use` block at the top.

- [ ] **Step 2: Add the `gapFillMissingRows()` method**

In `RenderController`, after the existing `dispatchWeekoffForRange()` method (around line 152), paste this new method:

```php
    /**
     * Insert Attendance rows for (employee, date) pairs in the requested range
     * that have an active schedule but no existing attendance row.
     *
     * Runs AFTER the shift-type controllers, so it only fills genuine gaps.
     * Never overwrites existing rows.
     *
     * @return int  number of rows inserted
     */
    protected function gapFillMissingRows(Request $request): int
    {
        $companyId   = (int) ($request->company_id ?? 0);
        $employeeIds = (array) ($request->employee_ids ?? []);
        $dates       = (array) ($request->dates ?? []);

        if (!$companyId || !$employeeIds || !$dates) {
            return 0;
        }

        try {
            $fromDate = Carbon::parse($dates[0])->startOfDay();
            $toDate   = Carbon::parse($dates[1] ?? $dates[0])->startOfDay();
        } catch (\Throwable $e) {
            return 0;
        }

        // Safety: don't run silly-large ranges.
        if ($fromDate->diffInDays($toDate) > 366) {
            return 0;
        }

        // Only real employees (skip orphan schedule rows).
        $validEmployeeIds = Employee::where('company_id', $companyId)
            ->whereIn('system_user_id', $employeeIds)
            ->pluck('system_user_id')
            ->map(fn($v) => (string) $v)
            ->all();

        if (empty($validEmployeeIds)) {
            return 0;
        }

        $inserted = 0;

        $cursor = $fromDate->copy();
        while ($cursor->lessThanOrEqualTo($toDate)) {
            $dateStr = $cursor->format('Y-m-d');

            // Existing attendance rows for this date.
            $existing = Attendance::where('company_id', $companyId)
                ->where('date', $dateStr)
                ->whereIn('employee_id', $validEmployeeIds)
                ->pluck('employee_id')
                ->map(fn($v) => (string) $v)
                ->all();
            $existingSet = array_flip($existing);

            // Employees missing a row on this date.
            $missingIds = array_values(array_filter(
                $validEmployeeIds,
                fn($eid) => !isset($existingSet[(string) $eid])
            ));
            if (empty($missingIds)) {
                $cursor->addDay();
                continue;
            }

            // Schedule that covers this date for each missing employee.
            $schedulesByEmp = ScheduleEmployee::where('company_id', $companyId)
                ->whereIn('employee_id', $missingIds)
                ->where('from_date', '<=', $dateStr)
                ->where('to_date',   '>=', $dateStr)
                ->orderByDesc('updated_at')
                ->get(['employee_id', 'shift_id', 'shift_type_id'])
                ->groupBy(fn($s) => (string) $s->employee_id);

            // Employees with at least one log on this date.
            $logEmployees = AttendanceLog::where('company_id', $companyId)
                ->whereIn('UserID', $missingIds)
                ->whereDate('LogTime', $dateStr)
                ->distinct('UserID')
                ->pluck('UserID')
                ->map(fn($v) => (string) $v)
                ->all();
            $logsSet = array_flip($logEmployees);

            $toInsert = [];
            foreach ($missingIds as $empId) {
                $empKey = (string) $empId;
                $sched  = $schedulesByEmp->get($empKey)?->first();
                if (!$sched) {
                    continue; // no schedule covering this date — skip
                }

                $hasLogs = isset($logsSet[$empKey]);

                $toInsert[] = [
                    'company_id'    => $companyId,
                    'employee_id'   => $empKey,
                    'date'          => $dateStr,
                    'shift_id'      => $sched->shift_id ?? 0,
                    'shift_type_id' => $sched->shift_type_id ?? 0,
                    'status'        => $hasLogs ? 'M' : 'A',
                    'in'            => '---',
                    'out'           => '---',
                    'total_hrs'     => '---',
                    'ot'            => '---',
                    'late_coming'   => '---',
                    'early_going'   => '---',
                    'device_id_in'  => '---',
                    'device_id_out' => '---',
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ];
            }

            if (!empty($toInsert)) {
                try {
                    Attendance::insert($toInsert);
                    $inserted += count($toInsert);
                } catch (\Throwable $e) {
                    // Swallow per-date errors; keep going.
                }
            }

            $cursor->addDay();
        }

        return $inserted;
    }
```

Notes on the method body:
- Uses `Employee::whereIn('system_user_id', ...)` to drop orphan IDs that don't have an `employees` row (protects against the 65/3021/3151/46 case).
- Uses `ScheduleEmployee::where('from_date', '<=', $date)->where('to_date', '>=', $date)` to find a schedule covering the date. `orderByDesc('updated_at')` + `->first()` per employee → picks the most recent if multiple.
- Uses `AttendanceLog::where('UserID', ...)->whereDate('LogTime', ...)` — matches existing code patterns in `AbsentController` and `AttendanceLog` model.
- `status = 'M' if logs else 'A'` as specified in the spec.
- All placeholder fields match the shape of rows produced by `SingleShiftController` (see [SingleShiftController.php:159-175](../../../backend/app/Http/Controllers/Shift/SingleShiftController.php#L159-L175)).

- [ ] **Step 3: Call `gapFillMissingRows()` at the end of `renderLogs()`**

In `RenderController::renderLogs()` (lines 39–126), there are multiple return points at the ends of each branch (`if ($request->shift_type_id == 2) { ... return $r; }`, etc.). To keep the fix centralized and guaranteed to run, we'll call the gap-fill **just before the first return statement in each branch**, right next to the existing `dispatchWeekoffForRange($request)` calls.

For each of the 7 places `$this->dispatchWeekoffForRange($request);` is called in `renderLogs()`, insert the gap-fill call **immediately above** it:

```php
$this->gapFillMissingRows($request);
$this->dispatchWeekoffForRange($request);
```

Specifically edit these 7 locations:

1. Line ~79 (inside `shift_type_id == 2` branch — MultiShift)
2. Line ~85 (inside `shift_type_id == 5` branch — SplitShift)
3. Line ~91 (inside `shift_type_id == 4` branch — NightShift)
4. Line ~100 (inside `shift_type_id == 3` branch — AutoShift)
5. Line ~107 (inside `shift_type_id == 1` branch — FILO)
6. Line ~114 (inside `shift_type_id == 6` branch — SingleShift)
7. Line ~124 (inside the default "try all" branch at the bottom)

After this change, every code path through `renderLogs` runs gap-fill before dispatching the week-off job. That matters because week-off needs to see the newly inserted `A` rows to convert them to `O`.

- [ ] **Step 4: Verify no PHP syntax errors**

If PHP is available locally, run:

```bash
php -l backend/app/Http/Controllers/Shift/RenderController.php
```

Expected: `No syntax errors detected`. If PHP is not available locally, upload the file to the server and let Laravel tell us on the next request.

---

## Task 2: Verify on server with real data (user runs)

**Files:** none (server-side test after deploy)

- [ ] **Step 1: Deploy the modified `RenderController.php` to `/var/www/mytime2cloud/backend-v2/`**

Upload the file via your usual deploy process (SCP / rsync / git pull).

- [ ] **Step 2: Run regenerate for Mohamed, 2026-04-13 → 2026-04-22**

In the app UI:
1. Attendance → Report page
2. Click **Regenerate**
3. Pick Mohamed (Front Office, 3004)
4. Date range 2026-04-13 → 2026-04-22
5. Click **Regenerate**
6. Wait for "Completed" dialog

- [ ] **Step 3: Verify the report now shows rows for 16, 18, 20, 21**

From the Attendance Report page with Mohamed's name selected, confirm the table now shows 10 rows (was 6 earlier): 13, 14, 15, **16**, 17, **18**, 19, **20**, **21**, 22. Rows for 16/18/20/21 should show status `Missing`.

- [ ] **Step 4: Verify directly in DB**

Run this SQL via psql:

```sql
SELECT date, status, shift_id, shift_type_id
FROM attendances
WHERE employee_id = '3004' AND company_id = 13
  AND date BETWEEN '2026-04-13' AND '2026-04-22'
ORDER BY date;
```

Expected: 10 rows. Dates 16/18/20/21 should be `status='M'`, `shift_id=187`, `shift_type_id=6`.

- [ ] **Step 5: Regression test — regenerate for a "clean" employee**

Pick any employee whose report was already complete (e.g., an employee who clocked in and out every day cleanly). Regenerate. Confirm the report looks identical before/after — no new rows, no changed status, no duplicates.

- [ ] **Step 6: Week-off check**

Pick an employee where Sat/Sun should be week-offs and some weeks previously showed `A` (absent) on those days. After regenerate + a minute wait for `RenderWeekOffJob` to process, confirm they are now `O` (week-off). This verifies the gap-fill rows feed correctly into the existing week-off pipeline.

- [ ] **Step 7: Hand off**

Tell the user: **"Gap-fill deployed, Mohamed's Apr 16/18/20/21 rows now visible. Week-off recalculation still works. No regressions on clean employees. Ready to commit."**

---

## Out of scope

- Softening IN/OUT windows in SingleShift / NightShift controllers so Apr 21's 3 punches become `P`/`LC` instead of `M`. Tracked as follow-up.
- Changing `renderAbsentCron` to process more than yesterday.
- UI badge/color changes for `M` rows.
