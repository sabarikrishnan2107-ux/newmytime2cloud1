# Tracker History — Shift-Type-Aware Row Grouping

**Date:** 2026-04-25
**Owner:** akil group
**Affected pages:** [frontend-new/src/app/tracker-history/page.js](../../../frontend-new/src/app/tracker-history/page.js)
**Affected backend:** [backend/app/Http/Controllers/AttendanceLogController.php](../../../backend/app/Http/Controllers/AttendanceLogController.php), [backend/app/Models/AttendanceLog.php](../../../backend/app/Models/AttendanceLog.php)
**Visual reference:** [docs/samples/tracker-history-mockup.html](../../samples/tracker-history-mockup.html)

## Problem

The Tracker History page currently shows one row per IN→OUT punch pair. An employee on a single-day shift who punches in/out multiple times (e.g., for breaks) appears as several rows for the same date — visually noisy and not how the operations team thinks about a workday.

Example from production: `Ariff akil` on `25-Apr-26` shows two rows (10:12 IN with no OUT, and 11:09 IN → 11:14 OUT) when operationally those are one shift.

## Goal

Group rows on the Tracker History page based on the employee's **scheduled shift type** for that date, so that:

- Single-period shifts collapse to **one row** showing the day's first IN and last OUT.
- Split shifts produce **exactly two rows** (the morning + evening pairs).
- Multi/Auto shifts continue showing **one row per IN→OUT pair**.

The "Play" button must show **all GPS locations** between the row's IN and OUT on the map.

## Shift-type → row mapping

Source of truth for shift_type IDs is [frontend-new/src/lib/dropdowns.js](../../../frontend-new/src/lib/dropdowns.js) and [frontend-new/src/app/report/columns.js](../../../frontend-new/src/app/report/columns.js).

| `shift_type_id` | Name              | Rows per `(employee, date)` |
| --------------- | ----------------- | --------------------------- |
| 1               | Flexible / FILO   | 1 — first IN, last OUT      |
| 4               | Night             | 1 — first IN, last OUT      |
| 6               | Single            | 1 — first IN, last OUT      |
| 5               | Split             | 2 — pair 1, pair 2          |
| 2               | Multi             | N — one per IN→OUT pair     |
| 3               | Auto              | N — one per IN→OUT pair     |
| `null` / unknown | (no schedule)     | N — fallback to current per-pair behavior |

## Approach (chosen)

**Backend joins `shift_type_id` into each log; frontend groups based on it.** Single API call, shift_type travels with the data, no extra round-trip.

Alternative considered: a second frontend call to fetch each employee's schedule for the date and join client-side. Rejected — extra request and joining complexity for no functional gain.

## Backend changes

### `AttendanceLogController::index` ([backend/app/Http/Controllers/AttendanceLogController.php:21](../../../backend/app/Http/Controllers/AttendanceLogController.php#L21))

When the request comes from the tracker-history page (identified by an opt-in query param `with_shift_type=1`), eager-load the schedule_employee relationship and project `shift_type_id` onto the response payload.

The `AttendanceLog` model already has the relationship in [AttendanceLog.php:99](../../../backend/app/Models/AttendanceLog.php#L99):

```php
return $this->belongsTo(ScheduleEmployee::class, "UserID", "employee_id")->withOut(["shift_type"]);
```

But this relation joins `UserID → employee_id` only — it does not constrain to the log's date. We need shift_type for the **specific date** of the log, since employees may have different schedules on different days.

**Implementation:** in the controller's `index`, after loading the paginated logs, batch-fetch matching `schedule_employees` rows by `(employee_id, date)` for the page's logs, then attach `shift_type_id` to each log as a virtual attribute. This avoids modifying the existing relation (which other code paths depend on) and keeps the join focused.

Pseudocode:

```php
public function index(AttendanceLog $model, Request $request)
{
    $paginator = $model->filter($request)->orderBy("LogTime", "desc")->paginate($request->per_page);

    if ($request->boolean('with_shift_type')) {
        $pairs = $paginator->getCollection()
            ->map(fn($l) => [$l->UserID, $l->date])
            ->unique(fn($p) => $p[0] . '|' . $p[1]);

        $schedules = ScheduleEmployee::query()
            ->where('company_id', $request->company_id)
            ->whereIn('employee_id', $pairs->pluck(0))
            ->whereIn('date', $pairs->pluck(1))
            ->get(['employee_id', 'date', 'shift_type_id'])
            ->keyBy(fn($s) => $s->employee_id . '|' . $s->date);

        $paginator->getCollection()->transform(function ($log) use ($schedules) {
            $key = $log->UserID . '|' . $log->date;
            $log->shift_type_id = optional($schedules->get($key))->shift_type_id;
            return $log;
        });
    }

    return $paginator;
}
```

The `with_shift_type` flag is opt-in to avoid impacting other consumers of `attendance_logs` and to keep the extra DB query off the default path.

### Frontend API client

[frontend-new/src/lib/api.js:133](../../../frontend-new/src/lib/api.js#L133) — `getDeviceLogs` already passes through arbitrary params via `buildQueryParams`. The tracker-history page passes `with_shift_type: 1`. No changes to `api.js`.

## Frontend changes

### File: [frontend-new/src/app/tracker-history/page.js](../../../frontend-new/src/app/tracker-history/page.js)

#### 1. Pass `with_shift_type: 1` to the logs fetch (around line 69)

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

#### 2. Replace the pair-by-pair grouper (lines 130–165)

New grouper produces rows shaped as:

```js
{
  key: string,                  // unique row key
  groupKey: string,             // employee_id + date — used to merge Personnel/Branch/Date cells
  groupRowCount: number,        // total rows for this employee+date (drives rowspan)
  groupRowIndex: number,        // 0-based position within the group (only index 0 renders the merged cells)
  shiftTypeId: number | null,
  shiftLabel: string,           // "Single", "Split · 1/2", "Multi · 2/3", etc.
  inLog: object | null,
  outLog: object | null,
  extraPunches: Array<object>,  // intermediate IN/OUT logs collapsed into this row (for badge + tooltip)
}
```

Algorithm:

1. Group all filtered logs by `${UserID}|${date}`.
2. For each group, sort by `time` and read `shift_type_id` from the first log (all logs in a group share the same date+employee → same shift_type_id).
3. Dispatch by shift type:
   - **Single (6) / Night (4) / Flexible/FILO (1)** — one row: `inLog` = first IN, `outLog` = last OUT, everything else → `extraPunches`.
   - **Split (5)** — find the largest gap between consecutive (OUT, next-IN) timestamps; everything before the gap is pair 1, everything after is pair 2. If the day has fewer than 2 distinct OUT→IN transitions (e.g., only one pair was logged), produce 1 row labelled `Split · 1/2` and a placeholder is not added.
   - **Multi (2) / Auto (3)** — current pairing logic (one row per IN→OUT cycle).
   - **null / unknown / other** — fall back to current pairing logic.
4. After producing all rows for a group, set `groupRowCount` = number of rows produced for that group, and `groupRowIndex` per row.

Sort the final rows the same way as today (newest date first; within a date, earliest time first). Group cohesion is naturally preserved because rows for the same `(employee, date)` already sort together.

#### 3. Add the **Shift** column

Insert a new column between **Logout** and **Mode** in the table header (line 263 area) and in each row's cells. The cell renders `shiftLabel` as a small slate pill matching the mockup styling:

```jsx
<span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
  {row.shiftLabel}
</span>
```

#### 4. Render Personnel / Branch / Date cells with `rowSpan`

Only render the Personnel, Branch/Department, and Date `<td>` elements when `row.groupRowIndex === 0`, with `rowSpan={row.groupRowCount}`. Other rows in the group simply omit those `<td>`s.

This produces the merged-cell look from the mockup without any extra DOM elements or absolute positioning.

#### 5. Add the "+N punches" badge in the Login column

Below the existing time pill, when `extraPunches.length > 0`:

```jsx
<span
  className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-help"
  title={extraPunches.map(p => `${p.time} ${p.log_type.toUpperCase()}`).join("\n")}
>
  +{extraPunches.length} punches
</span>
```

The native `title` attribute is sufficient for the tooltip — no custom popover library needed.

#### 6. Wire the Play button to the row's IN/OUT bounds

`openHistory` (line 182) already passes `from_time` and `to_time` from `row.inLog.time` / `row.outLog.time`. With the new grouping, those bounds are first-IN / last-OUT for collapsed rows — no code change needed for collapsed-row Play.

For rows with no OUT (employee still clocked in), `to_time` is omitted; HistoryReplay will load the full day's GPS trail and the user sees movement up to "now". No HistoryReplay changes required.

## Data flow

```
[Tracker History page]
    │
    ├─ getDeviceLogs({ ..., with_shift_type: 1 })
    │     │
    │     ▼
    ├─ Backend AttendanceLogController.index
    │     │   • paginate filtered logs
    │     │   • batch-fetch schedule_employees by (employee_id, date)
    │     │   • attach shift_type_id to each log
    │     ▼
    │   logs[] each with .shift_type_id
    │
    ├─ Frontend grouper: shift-type-aware row builder
    │     • Single/Night/FILO/Flexible → 1 row + extraPunches
    │     • Split → 2 rows, split at largest OUT→IN gap
    │     • Multi/Auto → N rows (current behavior)
    │
    └─ Render:
         • rowSpan-merged Personnel/Branch/Date for groups
         • Shift pill column
         • "+N punches" badge in Login when extraPunches > 0
         • Play button → HistoryReplay with from_time/to_time
```

## Edge cases

- **No `shift_type_id` for a date** (no schedule_employees row): use the existing pair-by-pair logic. The Shift column shows `—`. The page still works for unscheduled employees.
- **No OUT for the day**: `outLog` = null, Logout cell shows `—` (existing behavior). For Single/Night/FILO/Flexible this still produces 1 row — the IN time + extraPunches badge if there were intermediate IN/OUTs but no final OUT.
- **Only OUTs, no INs** (rare orphan logs): existing fallback in the current grouper (orphan OUT → its own row) is preserved in the fallback path.
- **Night shift crossing midnight**: the `(employee, date)` grouping uses the log's `date` field, which is set by the device sync to the shift-start date. No special handling needed at this layer; if an issue surfaces it's a backend log-attribution concern, not a tracker-history concern.
- **Split shift with only one pair recorded**: produce 1 row labelled `Split · 1/2`. Don't add a placeholder for the missing pair.
- **Branch / department change between rows in the same group**: not possible — branch/department come from `employee.*`, which is constant for a given `employee_id` regardless of date.

## Out of scope

- Changes to HistoryReplay (it already supports the from_time/to_time bounds and renders all locations).
- Backend changes to other consumers of `attendance_logs` — the `with_shift_type` flag is opt-in.
- Server-side row collapsing — kept on the frontend so changes don't affect other pages that consume `attendance_logs`.
- Any change to the `realtime_location` endpoint or how GPS trails are loaded.

## Test plan

Manual verification on `25-Apr-26` (the screenshot date) using the production-mirrored DB:

1. **Single-shift employee with multiple punches** — `Ariff akil` (the screenshot case): verify exactly one row appears, with `10:12` Login pill, `+1 punches` amber badge (or whatever the extras count is), `11:14` Logout pill. Hover badge → tooltip shows `11:09 IN`.
2. **Split-shift employee** — pick a known split-shift employee for the date; verify exactly two rows with `Split · 1/2` and `Split · 2/2` pills, and Personnel/Branch/Date merged across them.
3. **Multi-shift employee** — verify N rows (one per pair), `Multi · 1/N` … `Multi · N/N` labels, Personnel/Branch/Date merged.
4. **Play button on collapsed row** — open Play on the Single-shift row; verify the map shows GPS points from before 10:12 through after 11:14 (i.e., the whole bracket including the intermediate punches).
5. **Employee with no schedule** — pick an unscheduled employee with mobile punches; verify the page falls back to per-pair rows with `—` in the Shift column.
6. **Filters** — Branch / Department / Search filters continue to work; verify rowspan merging still produces visually correct grouping after filtering removes some logs.
7. **Dark mode** — verify all new pills / badges render correctly in dark mode.
