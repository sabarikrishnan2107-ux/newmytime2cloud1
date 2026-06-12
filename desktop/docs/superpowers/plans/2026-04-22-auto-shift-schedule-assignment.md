# Auto Shift in Schedule Assignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the ability to mark a schedule as "Auto Shift" in the new Schedule Assignment UI (Create and Edit modals), and fix the backend so it honors `isAutoShift=true` when combined with a real `shift_id`.

**Architecture:** Add an **Auto Shift** toggle to both the Add Schedule modal and the Edit Schedule modal (matching the visual style of the existing Over Time toggle). The user picks a home shift AND toggles Auto Shift on. Backend `ScheduleEmployeeController::store` is simplified so the `isAutoShift` flag is stored regardless of `shift_id` value.

**Tech Stack:** Next.js / React (JavaScript), Laravel (PHP), PostgreSQL.

**Spec:** [docs/superpowers/specs/2026-04-22-auto-shift-schedule-assignment-design.md](../specs/2026-04-22-auto-shift-schedule-assignment-design.md)

**Note on commits:** The user handles all git commits and pushes. Do NOT run `git commit`, `git add`, or `git push`. Just edit files.

**Note on tests:** No unit-test harness for these surfaces. Verification is manual, performed by the user in the running app.

---

## File Map

**Modified:**
- `backend/app/Http/Controllers/ScheduleEmployeeController.php` — simplify isAutoShift/shift_id condition in `store()`.
- `frontend-new/src/components/Schedule/Create.js` — add Auto Shift toggle + thread flag into submit payload.
- `frontend-new/src/components/Schedule/EditModal.js` — add Auto Shift per-row toggle + thread existing value in/out.

**Unchanged (already correct):**
- `frontend-new/src/app/schedule/columns.js` — already shows "Auto" label when `isAutoShift` true.
- `frontend-new/src/components/ui/ShiftSelect.jsx` — leave the commented-out virtual entry as-is (historical context).

---

## Task 1: Backend — store isAutoShift regardless of shift_id

**Files:**
- Modify: `backend/app/Http/Controllers/ScheduleEmployeeController.php:200-216`

- [ ] **Step 1: Read current code**

In `ScheduleEmployeeController.php`, locate the `foreach ($data["schedules"] as $shift)` block starting around line 200. The current logic (lines 202–204) ignores `isAutoShift` unless `shift_id == 0`:

```php
"isAutoShift"   => array_key_exists("isAutoShift", $shift) && $shift["isAutoShift"] && $shift["shift_id"] == 0 ? 1 : 0,
"shift_id"      => array_key_exists("isAutoShift", $shift) && $shift["isAutoShift"] && $shift["shift_id"] == 0 ? 0 : $shift["shift_id"],
"shift_type_id" => array_key_exists("isAutoShift", $shift) && $shift["isAutoShift"] && $shift["shift_id"] == 0 ? 0 : ($shift["shift_type_id"] ?? 2),
```

- [ ] **Step 2: Replace those three lines**

Replace the three lines above with:

```php
"isAutoShift"   => !empty($shift["isAutoShift"]) ? 1 : 0,
"shift_id"      => $shift["shift_id"] ?? 0,
"shift_type_id" => $shift["shift_type_id"] ?? 2,
```

The rest of the `$value` array (isOverTime, employee_id, from_date, to_date, company_id, branch_id) stays untouched.

- [ ] **Step 3: Verify no other callers depend on old behavior**

Use Grep for any place that posts to `/schedule_employees` expecting the legacy condition:
- Pattern: `isAutoShift`
- Path: `backend/app/Http/Controllers`

Expected result: only `ScheduleEmployeeController.php` and `ScheduleEmployeeController/*` should reference this. No other controller writes `isAutoShift`. If any other controller does, stop and report.

- [ ] **Step 4: Verify PHP syntax by opening the route list**

The user will run this on the server; for local verification, the change is purely a ternary simplification so a syntax error is unlikely. If a linter is available locally (`php -l`), run it:

```bash
php -l backend/app/Http/Controllers/ScheduleEmployeeController.php
```

Expected: `No syntax errors detected`. If PHP is not available locally, skip — the backend will surface errors at runtime.

---

## Task 2: Frontend — Add Schedule modal (Create.js)

**Files:**
- Modify: `frontend-new/src/components/Schedule/Create.js`

- [ ] **Step 1: Add `isAutoShift` state**

Near the other `useState` hooks in `Create.js` (around line 68, next to `const [from, setFrom] = useState(null);`), add:

```js
const [isAutoShift, setIsAutoShift] = useState(false);
```

- [ ] **Step 2: Reset it when modal opens**

In the `useEffect` that fires on modal open (starts around line 106 with `if (open) { ... }`), add a reset line alongside the other resets:

```js
setIsAutoShift(false);
```

Place it after `setTo(null);` and before the closing `}` of the effect.

- [ ] **Step 3: Thread the flag into the submit payload**

In `onSubmit` (around line 167), change the hardcoded payload:

```js
"isAutoShift": false
```

to:

```js
"isAutoShift": isAutoShift
```

- [ ] **Step 4: Add the Auto Shift toggle in the Configuration section**

In the Configuration `<section>` (around lines 397–431), after the **Effective Range** block and before the closing `</div>` of the flex-column wrapper, add:

```jsx
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">Auto Shift</label>
                                                <div className="flex items-center gap-3 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAutoShift(v => !v)}
                                                        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${isAutoShift ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${isAutoShift ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                    </button>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {isAutoShift ? "Enabled — system picks shift per day based on punches" : "Disabled — use the selected shift every day"}
                                                    </span>
                                                </div>
                                            </div>
```

The toggle visually matches the OT toggle style already used in `EditModal.js` row 220–228.

- [ ] **Step 5: Verify in browser — create an auto-shift schedule**

User runs the frontend dev server (`npm run dev` inside `frontend-new/`) and:
1. Open **Schedule → Add**, pick an employee, pick **Day Time** as the shift.
2. Flip the new **Auto Shift** toggle ON. Confirm helper text reads "Enabled — system picks shift per day based on punches".
3. Pick a date range, click **Submit**.
4. Notification should say "Shift has been assign" (existing success toast).
5. In a psql session against the same DB:
   ```sql
   SELECT id, employee_id, shift_id, shift_type_id, "isAutoShift", from_date, to_date
   FROM schedule_employees
   WHERE employee_id = '<TEST_EMP_ID>'
   ORDER BY id DESC LIMIT 1;
   ```
   Expected row: `shift_id = 187` (Day Time), `shift_type_id = 6`, `"isAutoShift" = t`, dates matching what was picked.

- [ ] **Step 6: Verify in browser — create without auto-shift (regression)**

Repeat the above but leave Auto Shift OFF. Check the inserted row — should have `"isAutoShift" = f`, `shift_id = 187`. The existing non-auto flow is unchanged.

- [ ] **Step 7: Verify the Schedule list display**

Navigate to **Schedule** (the list page):
- Rows created with Auto Shift ON should show **"Auto"** in the Active Interval column.
- Rows created with Auto Shift OFF should show the actual shift name ("Day Time").
- This is handled by existing code in [schedule/columns.js:91](frontend-new/src/app/schedule/columns.js#L91); no code change — just verify it still works.

---

## Task 3: Frontend — Edit modal (EditModal.js)

**Files:**
- Modify: `frontend-new/src/components/Schedule/EditModal.js`

The edit modal shows **multiple rows** (one per existing schedule), each with Shift, Date Range, and an OT toggle. We'll add an **Auto** toggle per row in the same group.

- [ ] **Step 1: Extend the row shape to carry `isAutoShift`**

Change the `emptyRow()` factory at line 10:

```js
const emptyRow = () => ({ shiftId: null, from: null, to: null, isOverTime: false, isAutoShift: false });
```

- [ ] **Step 2: Populate `isAutoShift` when loading existing schedules**

In the `getSchedulesByEmployee` `.then(...)` block (around lines 32–38), extend the mapped row:

```js
const mapped = schedules.map(s => ({
  shiftId: s.shift_id || null,
  from: s.from_date || null,
  to: s.to_date || null,
  isOverTime: s.is_over_time || false,
  isAutoShift: !!s.isAutoShift,
}));
```

Also update the fallback `.catch` block (around lines 51–57) identically:

```js
const mapped = allSchedules.map(s => ({
  shiftId: s.shift?.id || s.shift_id || null,
  from: s.from_date || null,
  to: s.to_date || null,
  isOverTime: s.is_over_time || s.isOverTime || false,
  isAutoShift: !!(s.isAutoShift ?? s.is_auto_shift ?? false),
}));
```

- [ ] **Step 3: Thread `isAutoShift` into the submit payload**

In `handleSubmit` (around line 118–128), change:

```js
const schedules = rows.map(row => {
  const selectedShift = shifts.find(s => s.id === row.shiftId);
  return {
    shift_id: row.shiftId,
    shift_type_id: selectedShift?.shift_type_id || 0,
    from_date: row.from,
    to_date: row.to,
    is_over_time: row.isOverTime,
    isAutoShift: false,
  };
});
```

to:

```js
const schedules = rows.map(row => {
  const selectedShift = shifts.find(s => s.id === row.shiftId);
  return {
    shift_id: row.shiftId,
    shift_type_id: selectedShift?.shift_type_id || 0,
    from_date: row.from,
    to_date: row.to,
    is_over_time: row.isOverTime,
    isAutoShift: row.isAutoShift,
  };
});
```

- [ ] **Step 4: Add the Auto toggle alongside the OT toggle in each row**

In the row JSX (around line 220–229 where the OT toggle lives), add a sibling div for Auto. Full replacement for the OT `<div>` block — replace:

```jsx
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-xs text-slate-500">OT</span>
                    <button
                      type="button"
                      onClick={() => !viewOnly && updateRow(index, "isOverTime", !row.isOverTime)}
                      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${row.isOverTime ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${row.isOverTime ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
```

with:

```jsx
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-xs text-slate-500">OT</span>
                    <button
                      type="button"
                      onClick={() => !viewOnly && updateRow(index, "isOverTime", !row.isOverTime)}
                      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${row.isOverTime ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${row.isOverTime ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-xs text-slate-500">Auto</span>
                    <button
                      type="button"
                      onClick={() => !viewOnly && updateRow(index, "isAutoShift", !row.isAutoShift)}
                      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${row.isAutoShift ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${row.isAutoShift ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
```

- [ ] **Step 5: Verify in browser — edit an existing auto-shift schedule**

1. Open **Schedule** page, find Mohamed (system_user_id 3004), click Edit (pencil icon).
2. The modal should open with one row — confirm the **Auto** toggle is ON (because his existing row has `isAutoShift=true`), the shift dropdown shows **Day Time**, and dates match.
3. Click **Submit** without changing anything. The DB row should still have `isAutoShift=true`, `shift_id=187`.

- [ ] **Step 6: Verify in browser — flip a schedule from auto to non-auto**

1. Edit Mohamed again, flip **Auto** OFF, submit.
2. Check DB: row should now have `isAutoShift=false`, `shift_id=187` (unchanged).
3. Flip it back ON for the next step.

- [ ] **Step 7: Verify in browser — add a new row with Auto from Edit modal**

1. Edit Mohamed, click **ADD** to add a second row. Pick a shift + dates, flip Auto ON.
2. Submit.
3. Since the edit-modal submit uses `replace_schedules: true`, expect Mohamed to now have two rows in `schedule_employees`, both with `isAutoShift=true`. Verify via psql.

Clean up afterwards (delete the second row via the edit modal) so Mohamed's DB state is back to a single row.

---

## Task 4: End-to-end smoke check

**Files:** none (manual verification)

- [ ] **Step 1: Walk the spec's test list**

Run through every item in the spec's "Testing (manual, browser)" section:

1. Add Schedule with Auto ON → success ✓ (Task 2, Step 5)
2. DB row has `isAutoShift=true` ✓ (Task 2, Step 5)
3. Edit same schedule → toggle starts ON ✓ (Task 3, Step 5)
4. Flip OFF → row updates ✓ (Task 3, Step 6)
5. List shows "Auto" label ✓ (Task 2, Step 7)
6. AutoShiftController picks the employee up — verify by running a regenerate in the attendance report and observing Mohamed (or the new auto test employee) gets rendered. Existing behavior; just confirm no regression.

- [ ] **Step 2: Hand off to user**

Tell the user: **"Auto Shift implementation complete; all manual checks pass. Ready for you to commit and push. Note: this does NOT fix the missing-attendance-row bug for Apr 16/18/20/21 — that's a separate follow-up."**

---

## Out of scope for this plan

- Fixing the missing-attendance-row bug for auto-shift employees (strict IN/OUT window issue + silent skip in render controllers). That's tracked as a follow-up and requires changes in `SingleShiftController`, `NightShiftController`, and a gap-fill sweep at the end of `renderLogs`.
- Cleaning up the legacy `shift_id=0, isAutoShift=true` row for employee 909090.
- Adding Auto Shift to the full-page `/schedule/create` route (separate UI, different code path).
