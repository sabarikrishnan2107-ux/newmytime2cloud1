# Tracker History — Shift-Type-Aware Row Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-pair row layout on the Tracker History page with a shift-type-aware grouping so Single/Night/FILO/Flexible employees show one row per day, Split employees show two rows, and Multi/Auto keep current per-pair behavior — with merged Personnel/Branch/Date cells across grouped rows and a "+N punches" badge surfacing intermediate clock events.

**Architecture:** Backend opt-in flag attaches `shift_type_id` from `schedule_employees` to each log in the `/attendance_logs` response. Frontend extracts grouping into a pure helper module, dispatches grouping by shift_type, and renders rows with `rowSpan`-merged identity cells.

**Tech Stack:** Laravel 10 (PHP 8) backend, Next.js 15 (React) frontend, no formal frontend test runner — verification is curl + browser dev server.

**Spec:** [docs/superpowers/specs/2026-04-25-tracker-history-shift-aware-rows-design.md](../specs/2026-04-25-tracker-history-shift-aware-rows-design.md)
**Visual reference:** [docs/samples/tracker-history-mockup.html](../../samples/tracker-history-mockup.html)

**Note on commits:** The user handles all git commits/pushes. Each task ends with a "Stop here for user to commit" checkpoint instead of running `git commit` from this plan.

---

## File Structure

```
backend/
└── app/Http/Controllers/AttendanceLogController.php   ← MODIFY: index() opt-in shift_type_id attachment

frontend-new/src/
├── app/tracker-history/
│   ├── page.js                                        ← MODIFY: API param, integrate grouper, add Shift column, rowSpan, badge
│   └── groupRows.js                                   ← CREATE: pure grouping helper (testable, dispatches by shift type)
```

`groupRows.js` is a new pure-function module. Extracting it from `page.js` keeps the React component focused on rendering and lets the grouping logic be reasoned about (and later unit-tested) independently.

---

## Task 1: Backend — opt-in `shift_type_id` attachment in `AttendanceLogController::index`

**Files:**
- Modify: `backend/app/Http/Controllers/AttendanceLogController.php` (lines 21–24)

- [ ] **Step 1: Add `ScheduleEmployee` import**

Open [backend/app/Http/Controllers/AttendanceLogController.php](../../../backend/app/Http/Controllers/AttendanceLogController.php). After the existing `use App\Models\Employee;` line (line 8), add:

```php
use App\Models\ScheduleEmployee;
```

- [ ] **Step 2: Replace the `index` method body**

Replace the existing 3-line `index` method (lines 21–24):

```php
    public function index(AttendanceLog $model, Request $request)
    {
        return $model->filter($request)->orderBy("LogTime", "desc")->paginate($request->per_page);
    }
```

With:

```php
    public function index(AttendanceLog $model, Request $request)
    {
        $paginator = $model->filter($request)->orderBy("LogTime", "desc")->paginate($request->per_page);

        if ($request->boolean('with_shift_type')) {
            $logs = $paginator->getCollection();

            $employeeIds = $logs->pluck('UserID')->unique()->filter()->values();
            $dates       = $logs->pluck('date')->unique()->filter()->values();

            if ($employeeIds->isNotEmpty() && $dates->isNotEmpty()) {
                $companyId = $request->company_id;

                $schedules = ScheduleEmployee::query()
                    ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                    ->whereIn('employee_id', $employeeIds)
                    ->whereIn('date', $dates)
                    ->get(['employee_id', 'date', 'shift_type_id'])
                    ->keyBy(fn ($s) => $s->employee_id . '|' . $s->date);

                $logs->transform(function ($log) use ($schedules) {
                    $key = $log->UserID . '|' . $log->date;
                    $log->shift_type_id = optional($schedules->get($key))->shift_type_id;
                    return $log;
                });
            }
        }

        return $paginator;
    }
```

Notes for the engineer:
- The `with_shift_type` flag is opt-in — existing callers (e.g. the `/logs` page) get the same response shape as today.
- Batched lookup uses `whereIn(employee_id, ...) AND whereIn(date, ...)` — this is a small over-fetch (cartesian over the page's employees × dates) but executes as a single query and is bounded by the `per_page` size. The tracker-history page uses `per_page: 1000` and a single date, so the over-fetch is fine.
- `$log->shift_type_id` is set as a virtual attribute on the model instance; Eloquent serializes it into the JSON response automatically when the paginator is returned.

- [ ] **Step 3: Verify the existing `/logs` page is unaffected**

Run a quick smoke check against the running backend (assumes `php artisan serve` or your usual dev backend is up; substitute the right base URL and a valid auth token if needed):

```bash
curl -s "http://localhost:8000/api/attendance_logs?per_page=1&page=1" | python -m json.tool | head -30
```

Expected: a normal paginator response. Verify the first log object does **not** contain a `shift_type_id` field (default behavior unchanged).

- [ ] **Step 4: Verify the new opt-in path returns `shift_type_id`**

```bash
curl -s "http://localhost:8000/api/attendance_logs?per_page=1&page=1&with_shift_type=1" | python -m json.tool | head -40
```

Expected: response includes `shift_type_id` on the log object — either an integer (1, 2, 3, 4, 5, or 6) or `null` for unscheduled employees.

- [ ] **Step 5: Stop here for user to commit**

Suggested commit message: `feat(backend): opt-in shift_type_id attachment on attendance_logs index`

---

## Task 2: Frontend — create the pure grouping helper

**Files:**
- Create: `frontend-new/src/app/tracker-history/groupRows.js`

This task creates the helper but does not yet wire it into `page.js`. That happens in Task 4.

- [ ] **Step 1: Create `groupRows.js` with the constants and dispatch shell**

Create file [frontend-new/src/app/tracker-history/groupRows.js](../../../frontend-new/src/app/tracker-history/groupRows.js) with:

```js
// Shift type IDs — must stay in sync with frontend-new/src/lib/dropdowns.js
// and frontend-new/src/app/report/columns.js
export const SHIFT_TYPE = {
  FLEXIBLE: 1, // also FILO in some report contexts
  MULTI: 2,
  AUTO: 3,
  NIGHT: 4,
  SPLIT: 5,
  SINGLE: 6,
};

const SINGLE_PERIOD_TYPES = new Set([
  SHIFT_TYPE.FLEXIBLE,
  SHIFT_TYPE.NIGHT,
  SHIFT_TYPE.SINGLE,
]);

const PER_PAIR_TYPES = new Set([SHIFT_TYPE.MULTI, SHIFT_TYPE.AUTO]);

const SHIFT_NAME = {
  [SHIFT_TYPE.FLEXIBLE]: "Flexible",
  [SHIFT_TYPE.MULTI]: "Multi",
  [SHIFT_TYPE.AUTO]: "Auto",
  [SHIFT_TYPE.NIGHT]: "Night",
  [SHIFT_TYPE.SPLIT]: "Split",
  [SHIFT_TYPE.SINGLE]: "Single",
};

/**
 * Build display rows from raw mobile attendance logs.
 *
 * Each output row has shape:
 *   {
 *     key:           string,        // unique row key
 *     groupKey:      string,        // employee+date — drives rowSpan merging
 *     groupRowCount: number,        // total rows for this group
 *     groupRowIndex: number,        // 0-based row position within the group
 *     shiftTypeId:   number | null,
 *     shiftLabel:    string,        // "Single", "Split · 1/2", "Multi · 2/3", "—"
 *     inLog:         object | null,
 *     outLog:        object | null,
 *     extraPunches:  Array<object>, // intermediate logs collapsed into this row
 *   }
 *
 * @param {Array<object>} logs filtered attendance log objects
 * @returns {Array<object>} display rows
 */
export function groupRows(logs) {
  // Step 1: bucket by employee + date
  const groups = new Map();
  for (const l of logs) {
    const userId = l.UserID || l?.employee?.employee_id || "";
    const date = l.date || "";
    const key = `${userId}|${date}`;
    if (!groups.has(key)) groups.set(key, { key, logs: [] });
    groups.get(key).logs.push(l);
  }

  // Step 2: dispatch each group by shift type, collect rows
  const out = [];
  for (const { key: groupKey, logs: groupLogs } of groups.values()) {
    const sorted = [...groupLogs].sort((a, b) =>
      String(a.time).localeCompare(String(b.time))
    );
    const shiftTypeId = sorted.find((l) => l.shift_type_id != null)?.shift_type_id ?? null;

    let rows;
    if (SINGLE_PERIOD_TYPES.has(shiftTypeId)) {
      rows = collapseToSingleRow(sorted, shiftTypeId, groupKey);
    } else if (shiftTypeId === SHIFT_TYPE.SPLIT) {
      rows = splitIntoTwoRows(sorted, groupKey);
    } else if (PER_PAIR_TYPES.has(shiftTypeId)) {
      rows = pairByPair(sorted, shiftTypeId, groupKey);
    } else {
      rows = pairByPair(sorted, null, groupKey); // unknown / no schedule
    }

    rows.forEach((r, idx) => {
      r.groupKey = groupKey;
      r.groupRowIndex = idx;
      r.groupRowCount = rows.length;
    });
    out.push(...rows);
  }

  // Step 3: sort newest date first, then earliest time first within the date
  return out.sort((a, b) => {
    const aRef = a.inLog || a.outLog;
    const bRef = b.inLog || b.outLog;
    const d = String(bRef?.date || "").localeCompare(String(aRef?.date || ""));
    if (d !== 0) return d;
    return String(aRef?.time || "").localeCompare(String(bRef?.time || ""));
  });
}

// --- shift-type-specific reducers -----------------------------------------

function collapseToSingleRow(sorted, shiftTypeId, groupKey) {
  const ins = sorted.filter((l) => String(l.log_type || "").toLowerCase() === "in");
  const outs = sorted.filter((l) => String(l.log_type || "").toLowerCase() === "out");
  const firstIn = ins[0] || null;
  const lastOut = outs[outs.length - 1] || null;

  // everything else is "extra" — useful for the +N punches badge tooltip
  const extras = sorted.filter((l) => l !== firstIn && l !== lastOut);

  return [
    {
      key: `${groupKey}|collapsed`,
      shiftTypeId,
      shiftLabel: SHIFT_NAME[shiftTypeId] || "—",
      inLog: firstIn,
      outLog: lastOut,
      extraPunches: extras,
    },
  ];
}

function splitIntoTwoRows(sorted, groupKey) {
  // Find the largest gap (in minutes) between consecutive (OUT, next-IN) events.
  // That gap separates pair 1 from pair 2.
  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    if (
      String(cur.log_type || "").toLowerCase() === "out" &&
      String(nxt.log_type || "").toLowerCase() === "in"
    ) {
      gaps.push({ idx: i, gapMin: timeGapMinutes(cur.time, nxt.time) });
    }
  }

  if (gaps.length === 0) {
    // only one pair recorded — render as Split · 1/2 with no second row
    return [makeRowFromSlice(sorted, SHIFT_TYPE.SPLIT, groupKey, 1, 2, "p1")];
  }

  gaps.sort((a, b) => b.gapMin - a.gapMin);
  const splitAt = gaps[0].idx; // index of the OUT that ends pair 1
  const left = sorted.slice(0, splitAt + 1);
  const right = sorted.slice(splitAt + 1);

  return [
    makeRowFromSlice(left, SHIFT_TYPE.SPLIT, groupKey, 1, 2, "p1"),
    makeRowFromSlice(right, SHIFT_TYPE.SPLIT, groupKey, 2, 2, "p2"),
  ];
}

function makeRowFromSlice(slice, shiftTypeId, groupKey, n, total, suffix) {
  const ins = slice.filter((l) => String(l.log_type || "").toLowerCase() === "in");
  const outs = slice.filter((l) => String(l.log_type || "").toLowerCase() === "out");
  const firstIn = ins[0] || null;
  const lastOut = outs[outs.length - 1] || null;
  const extras = slice.filter((l) => l !== firstIn && l !== lastOut);
  return {
    key: `${groupKey}|${suffix}`,
    shiftTypeId,
    shiftLabel: `${SHIFT_NAME[shiftTypeId]} · ${n}/${total}`,
    inLog: firstIn,
    outLog: lastOut,
    extraPunches: extras,
  };
}

function pairByPair(sorted, shiftTypeId, groupKey) {
  const rows = [];
  let pending = null;
  let n = 0;
  const baseLabel = shiftTypeId != null ? SHIFT_NAME[shiftTypeId] : "—";

  for (const l of sorted) {
    const type = String(l.log_type || "").toLowerCase();
    if (type === "in") {
      if (pending) {
        n += 1;
        rows.push({
          key: `${groupKey}|${n}`,
          shiftTypeId,
          shiftLabel: baseLabel,
          inLog: pending,
          outLog: null,
          extraPunches: [],
        });
      }
      pending = l;
    } else if (type === "out") {
      if (pending) {
        n += 1;
        rows.push({
          key: `${groupKey}|${n}`,
          shiftTypeId,
          shiftLabel: baseLabel,
          inLog: pending,
          outLog: l,
          extraPunches: [],
        });
        pending = null;
      } else {
        n += 1;
        rows.push({
          key: `${groupKey}|${n}`,
          shiftTypeId,
          shiftLabel: baseLabel,
          inLog: null,
          outLog: l,
          extraPunches: [],
        });
      }
    }
  }
  if (pending) {
    n += 1;
    rows.push({
      key: `${groupKey}|${n}`,
      shiftTypeId,
      shiftLabel: baseLabel,
      inLog: pending,
      outLog: null,
      extraPunches: [],
    });
  }

  // backfill the N/total suffix on the labels for Multi/Auto so the user sees "Multi · 2/3"
  if (shiftTypeId != null && rows.length > 1) {
    rows.forEach((r, i) => {
      r.shiftLabel = `${baseLabel} · ${i + 1}/${rows.length}`;
    });
  }

  return rows;
}

function timeGapMinutes(t1, t2) {
  // t1, t2 are "HH:MM:SS" or "HH:MM" strings. Compute minutes between them on the same day.
  const toMin = (t) => {
    const [h = 0, m = 0] = String(t).split(":").map(Number);
    return h * 60 + m;
  };
  return Math.max(0, toMin(t2) - toMin(t1));
}
```

- [ ] **Step 2: Smoke-test the helper from a Node REPL**

From the project root:

```bash
cd frontend-new
node --input-type=module -e "
import { groupRows, SHIFT_TYPE } from './src/app/tracker-history/groupRows.js';

// Single shift, 4 punches — should collapse to 1 row with extras
const single = [
  { UserID: '1', date: '2026-04-25', time: '10:12', log_type: 'in',  shift_type_id: SHIFT_TYPE.SINGLE },
  { UserID: '1', date: '2026-04-25', time: '11:09', log_type: 'in',  shift_type_id: SHIFT_TYPE.SINGLE },
  { UserID: '1', date: '2026-04-25', time: '11:14', log_type: 'out', shift_type_id: SHIFT_TYPE.SINGLE },
  { UserID: '1', date: '2026-04-25', time: '18:00', log_type: 'out', shift_type_id: SHIFT_TYPE.SINGLE },
];
console.log('SINGLE rows:', JSON.stringify(groupRows(single).map(r => ({ label: r.shiftLabel, in: r.inLog?.time, out: r.outLog?.time, extras: r.extraPunches.length })), null, 2));

// Split shift, 4 punches with a 4hr30 gap between 12:30 OUT and 17:00 IN
const split = [
  { UserID: '2', date: '2026-04-25', time: '08:00', log_type: 'in',  shift_type_id: SHIFT_TYPE.SPLIT },
  { UserID: '2', date: '2026-04-25', time: '12:30', log_type: 'out', shift_type_id: SHIFT_TYPE.SPLIT },
  { UserID: '2', date: '2026-04-25', time: '17:00', log_type: 'in',  shift_type_id: SHIFT_TYPE.SPLIT },
  { UserID: '2', date: '2026-04-25', time: '22:30', log_type: 'out', shift_type_id: SHIFT_TYPE.SPLIT },
];
console.log('SPLIT rows:', JSON.stringify(groupRows(split).map(r => ({ label: r.shiftLabel, in: r.inLog?.time, out: r.outLog?.time, idx: r.groupRowIndex, count: r.groupRowCount })), null, 2));

// Multi shift, 3 pairs — should produce 3 rows
const multi = [
  { UserID: '3', date: '2026-04-25', time: '09:00', log_type: 'in',  shift_type_id: SHIFT_TYPE.MULTI },
  { UserID: '3', date: '2026-04-25', time: '11:30', log_type: 'out', shift_type_id: SHIFT_TYPE.MULTI },
  { UserID: '3', date: '2026-04-25', time: '12:30', log_type: 'in',  shift_type_id: SHIFT_TYPE.MULTI },
  { UserID: '3', date: '2026-04-25', time: '15:00', log_type: 'out', shift_type_id: SHIFT_TYPE.MULTI },
  { UserID: '3', date: '2026-04-25', time: '16:00', log_type: 'in',  shift_type_id: SHIFT_TYPE.MULTI },
  { UserID: '3', date: '2026-04-25', time: '19:30', log_type: 'out', shift_type_id: SHIFT_TYPE.MULTI },
];
console.log('MULTI rows:', JSON.stringify(groupRows(multi).map(r => ({ label: r.shiftLabel, in: r.inLog?.time, out: r.outLog?.time })), null, 2));
"
```

Expected:
- `SINGLE rows`: 1 row, `label: 'Single'`, `in: '10:12'`, `out: '18:00'`, `extras: 2`
- `SPLIT rows`: 2 rows, `label: 'Split · 1/2'` (08:00→12:30) and `'Split · 2/2'` (17:00→22:30), with `groupRowCount: 2` on both
- `MULTI rows`: 3 rows labelled `'Multi · 1/3'`, `'Multi · 2/3'`, `'Multi · 3/3'`

- [ ] **Step 3: Stop here for user to commit**

Suggested commit message: `feat(tracker-history): add shift-type-aware row grouping helper`

---

## Task 3: Frontend — wire the grouper into `page.js` and pass the API flag

**Files:**
- Modify: `frontend-new/src/app/tracker-history/page.js`

- [ ] **Step 1: Import the grouper**

In [frontend-new/src/app/tracker-history/page.js](../../../frontend-new/src/app/tracker-history/page.js), after the existing import block (line 11):

```js
import DropDown from "@/components/ui/DropDown";
import { groupRows } from "./groupRows";
```

- [ ] **Step 2: Pass `with_shift_type: 1` in the API call**

Find the `getDeviceLogs` call (around lines 69–76) and add the new param:

```js
    getDeviceLogs({
      page: 1,
      per_page: 1000,
      sortDesc: "false",
      device_ids: ["Mobile"],
      from_date: selectedDate,
      to_date: selectedDate,
      with_shift_type: 1,
    })
```

- [ ] **Step 3: Replace the inline grouper inside `filtered` useMemo**

Find the existing `filtered` useMemo (lines 114–172). Replace its body entirely with:

```js
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredLogs = logs.filter((l) => {
      const bId = l?.employee?.branch?.id;
      const dId = l?.employee?.department?.id;
      if (branchFilter && String(bId) !== String(branchFilter)) return false;
      if (deptFilter && String(dId) !== String(deptFilter)) return false;
      if (q) {
        const hay = `${l?.employee?.first_name || ""} ${l?.employee?.last_name || ""} ${l?.UserID || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return groupRows(filteredLogs);
  }, [logs, branchFilter, deptFilter, search]);
```

- [ ] **Step 4: Run the dev server and verify no regression in the table**

```bash
cd frontend-new
npm run dev
```

Open `http://localhost:3001/tracker-history` (the page Next runs on). Pick `25-Apr-26`. Verify:
- Page loads without errors (check browser console).
- Existing employees still appear in the table.
- Rows still have a Personnel column, Login pill, Logout pill, Play button.
- Clicking Play still opens the map view.

The Shift column and rowSpan merging come in the next task — at this point, single-shift employees may show only 1 row (good!) and split-shift may show 2 rows, but the Personnel/Branch/Date will still be repeated. Don't fix that yet.

- [ ] **Step 5: Stop here for user to commit**

Suggested commit message: `feat(tracker-history): use shift-type-aware grouper for row layout`

---

## Task 4: Frontend — add the Shift column header

**Files:**
- Modify: `frontend-new/src/app/tracker-history/page.js`

- [ ] **Step 1: Insert the Shift column header**

In the `<thead>` block (around lines 256–266), add a new `<Th>Shift</Th>` between `<Th>Logout</Th>` and `<Th>Mode</Th>`:

```jsx
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-[1]">
              <tr>
                <Th>Personnel</Th>
                <Th>Branch / Department</Th>
                <Th>Date</Th>
                <Th>Login</Th>
                <Th>Logout</Th>
                <Th>Shift</Th>
                <Th>Mode</Th>
                <Th>Location</Th>
              </tr>
            </thead>
```

- [ ] **Step 2: Bump the `colSpan` on the loading / error / empty rows**

Find the three placeholder rows (around lines 268–276) and change every `colSpan={7}` to `colSpan={8}`:

```jsx
              {loading && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">Loading logs…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={8} className="p-6 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">No mobile clock-ins found for {selectedDate}.</td></tr>
              )}
```

- [ ] **Step 3: Add the Shift cell in the body row**

Find the row body (around lines 277–335). Between the Logout `<Td>` block (the one ending around line 321) and the Mode `<Td>` (around line 322), insert:

```jsx
                    <Td>
                      {row.shiftLabel && row.shiftLabel !== "—" ? (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.shiftLabel}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
                      )}
                    </Td>
```

- [ ] **Step 4: Reload the dev page and verify the column shows up**

Reload `http://localhost:3001/tracker-history`. Verify:
- A new "SHIFT" column header appears between Logout and Mode.
- Each row shows a small slate pill: `Single`, `Multi · 1/3`, `Split · 1/2`, etc.
- Rows for employees with no schedule show `—`.

- [ ] **Step 5: Stop here for user to commit**

Suggested commit message: `feat(tracker-history): add Shift column showing shift type label`

---

## Task 5: Frontend — rowSpan-merge Personnel / Branch / Date across grouped rows

**Files:**
- Modify: `frontend-new/src/app/tracker-history/page.js`

- [ ] **Step 1: Conditionally render the merged cells**

Inside the body row mapping (around lines 277–335), the row currently always renders three identity `<Td>` cells. Wrap them in a conditional so they only render on the first row of a group, with `rowSpan` set to `row.groupRowCount`.

The existing block looks like:

```jsx
                  <tr key={row.key} className="border-t border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 align-top">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <ProfilePicture src={emp.profile_picture} />
                        <div>
                          <div className="text-slate-700 dark:text-slate-200 font-medium">{fullName || "—"}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">ID: {emp.employee_id || anyLog?.UserID}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>{branchName} / {deptName}</Td>
                    <Td>{anyLog?.date || "—"}</Td>
```

Replace it with:

```jsx
                  <tr key={row.key} className={`${row.groupRowIndex === 0 ? "border-t border-gray-100 dark:border-slate-800" : ""} hover:bg-gray-50 dark:hover:bg-slate-800/50 align-top`}>
                    {row.groupRowIndex === 0 && (
                      <>
                        <Td rowSpan={row.groupRowCount}>
                          <div className="flex items-center gap-2.5">
                            <ProfilePicture src={emp.profile_picture} />
                            <div>
                              <div className="text-slate-700 dark:text-slate-200 font-medium">{fullName || "—"}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">ID: {emp.employee_id || anyLog?.UserID}</div>
                            </div>
                          </div>
                        </Td>
                        <Td rowSpan={row.groupRowCount}>{branchName} / {deptName}</Td>
                        <Td rowSpan={row.groupRowCount}>{anyLog?.date || "—"}</Td>
                      </>
                    )}
```

- [ ] **Step 2: Update the `Td` helper to accept `rowSpan`**

The `Td` helper at the bottom (around lines 356–358) currently is:

```jsx
function Td({ children }) {
  return <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 align-middle">{children}</td>;
}
```

Replace with:

```jsx
function Td({ children, rowSpan }) {
  return <td rowSpan={rowSpan} className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 align-middle">{children}</td>;
}
```

- [ ] **Step 3: Reload and verify merged cells**

Reload `http://localhost:3001/tracker-history`. Verify:
- For a Multi-shift employee with 3 pairs: 3 rows, but Personnel / Branch / Department / Date appear **once** (centered vertically across the 3 rows).
- For a Split-shift employee with 2 pairs: 2 rows, identity columns appear once.
- For a Single-shift employee: 1 row (unchanged appearance).
- The top border between groups is visible; rows within the same group have no top border (cleaner look).

- [ ] **Step 4: Stop here for user to commit**

Suggested commit message: `feat(tracker-history): rowSpan-merge identity cells for grouped rows`

---

## Task 6: Frontend — add the "+N punches" badge

**Files:**
- Modify: `frontend-new/src/app/tracker-history/page.js`

- [ ] **Step 1: Add the badge inside the Login `<Td>`**

Find the Login cell (around lines 298–309). The current block:

```jsx
                    <Td>
                      {row.inLog ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {row.inLog.time}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={inLoc || ""}>
                            {inLoc || "—"}
                          </span>
                        </div>
                      ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </Td>
```

Replace with:

```jsx
                    <Td>
                      {row.inLog ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {row.inLog.time}
                          </span>
                          {row.extraPunches && row.extraPunches.length > 0 && (
                            <span
                              className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-help"
                              title={row.extraPunches.map((p) => `${p.time} ${String(p.log_type || "").toUpperCase()}`).join("\n")}
                            >
                              +{row.extraPunches.length} punches
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={inLoc || ""}>
                            {inLoc || "—"}
                          </span>
                        </div>
                      ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </Td>
```

- [ ] **Step 2: Reload and verify the badge**

Reload `http://localhost:3001/tracker-history`. Find a Single-shift employee that had multiple punches in a day (e.g., `Ariff akil` on `25-Apr-26` from the production screenshot — clocked in 10:12, then in 11:09 → out 11:14). Verify:
- The row shows the green `10:12` Login pill, an amber `+1 punches` badge directly below it, and the location below that.
- Hovering the amber badge shows a tooltip listing the intermediate event (e.g., `11:09 IN`).
- Multi-shift rows do **not** show the badge (they have no extras — each pair has its own row).

- [ ] **Step 3: Stop here for user to commit**

Suggested commit message: `feat(tracker-history): show "+N punches" badge for collapsed rows`

---

## Task 7: End-to-end manual verification on dev server

**Files:** none (verification only)

- [ ] **Step 1: Run the dev server and verify Single-shift collapse**

```bash
cd frontend-new && npm run dev
```

Open `http://localhost:3001/tracker-history`, pick `25-Apr-26`. Confirm `Ariff akil` appears as **one row** (not the two rows in the production screenshot). Login pill = `10:12`, amber badge = `+1 punches`, Logout pill = `11:14`, Shift pill = `Single`.

- [ ] **Step 2: Verify Split-shift produces two rows with merged identity**

Pick any date where a Split-shift employee was scheduled. Confirm exactly 2 rows with labels `Split · 1/2` and `Split · 2/2`, and that Personnel / Branch / Date appear once and span vertically across both rows.

- [ ] **Step 3: Verify Multi-shift produces N rows**

Pick a date with a Multi-shift employee with 2+ pairs. Confirm one row per pair, labels `Multi · 1/N` … `Multi · N/N`, identity columns merged.

- [ ] **Step 4: Verify the Play button shows full GPS trail across collapsed punches**

Click Play on the `Ariff akil` collapsed row from Step 1. The map should:
- Show the GPS trail covering the full `10:12 → 11:14` window, including any movement around the intermediate `11:09` IN.
- Render the existing A/B start/end pins.
- Play / pause / reset controls work as before.

- [ ] **Step 5: Verify unscheduled employee fallback**

Pick an employee who has mobile punches but no schedule for the date (Shift column shows `—`). Confirm the page renders rows using the per-pair fallback, no errors.

- [ ] **Step 6: Verify dark mode**

Toggle to dark mode (or open the page on a dark-mode session). Confirm:
- Amber `+N punches` badge is legible (amber-400 text on dark background).
- Slate Shift pill is legible.
- rowSpan-merged cells align cleanly with the row borders.

- [ ] **Step 7: Verify filters still work correctly with grouping**

Apply a Branch filter, then a Department filter, then type a name in Search. Verify:
- Rows filter as expected.
- rowSpan merging still produces correct visuals after filtering (no orphan rows showing identity columns when their group's first row was filtered out).

If a filter removes a non-first row from a group, the `groupRowCount` will be wrong and the layout will look off. If you observe this, the fix is: re-run `groupRows()` *after* filtering (which Task 3 Step 3 already does — the filter is applied before `groupRows`). Verify this is still the case in your code.

- [ ] **Step 8: Stop here for user to commit final verification**

Suggested commit message: `chore(tracker-history): verify shift-aware grouping end-to-end`

---

## Summary

After all 7 tasks:
- Backend: `attendance_logs?with_shift_type=1` returns each log with `shift_type_id` attached. Default response unchanged.
- Frontend: `tracker-history/groupRows.js` is a pure helper that groups logs by shift type into display rows.
- Frontend: `tracker-history/page.js` uses the helper, adds a Shift column, rowSpan-merges identity cells across grouped rows, and shows a "+N punches" badge for rows that collapsed multiple punches.
- The Play button works without changes — `HistoryReplay` already loads the full day's GPS trail and clips to the row's `from_time` / `to_time`.
