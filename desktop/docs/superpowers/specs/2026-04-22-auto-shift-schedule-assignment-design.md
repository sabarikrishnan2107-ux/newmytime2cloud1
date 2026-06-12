# Auto Shift in Schedule Assignment — Design

**Date:** 2026-04-22
**Status:** Approved (awaiting plan)

## Problem

In the old MyTime2Cloud, users could assign an **Auto Shift** to an employee from the Add Schedule modal. The new software (v2) hides this option — the shift dropdown only shows real shifts (Day Duty, Night Shift, etc.), and the submit payload hardcodes `isAutoShift: false`. A commented-out line in [ShiftSelect.jsx:37](frontend-new/src/components/ui/ShiftSelect.jsx#L37) shows someone deliberately removed it.

Result: users **cannot create auto-shift employees in the new UI**. Existing auto-shift employees (9 in company 13, carried over from the old DB) can't be reproduced for new hires.

## Goals

1. Restore the ability to mark a schedule as "Auto Shift" in the new Add Schedule modal.
2. Make it consistent with how existing data is shaped — a real "home" shift + an `isAutoShift=true` flag.
3. Fix the backend condition that currently only accepts `isAutoShift=true` when `shift_id=0` (legacy virtual entry).
4. Display the Auto label in the Schedule list correctly for both newly-created and legacy records.

## Non-goals

- Fixing the attendance render gaps (missing dates 16/18/20/21 for Mohamed, etc.) — that's a separate ticket.
- Changing the auto-render logic itself (`AutoShiftController`) — it already works for the production data.
- Re-introducing the legacy "shift_id=0 virtual Auto Shift" entry. The plan moves fully to the flag-on-real-shift pattern.

## How existing auto-shift data is shaped

From company 13 (10 auto-shift rows in `schedule_employees`):

| Pattern | Count | Example |
|---|---|---|
| Real `shift_id` + `isAutoShift=true` | 9 | Mohamed: shift_id=187 (Day Time), isAutoShift=true |
| Legacy `shift_id=0` + `isAutoShift=true` | 1 | employee 909090 (orphan) |

The 9-row pattern is what we want going forward. The 1 legacy row continues to work because `AutoShiftController` queries by `isAutoShift` flag alone and doesn't rely on the schedule's `shift_id`.

## How auto-rendering actually uses these rows

`AutoShiftController::render()` ([backend/app/Http/Controllers/Shift/AutoShiftController.php:418](backend/app/Http/Controllers/Shift/AutoShiftController.php#L418)):

1. Finds employees with `schedule.isAutoShift = true` via `getEmployeeIdsForNewLogsToRenderAuto`.
2. Loads **all branch shifts** (not the schedule's own `shift_id`).
3. `findClosest` picks the shift whose IN-time is nearest to the first log of the day.
4. Delegates to the matching shift-type controller (Single / Night / Filo / etc.).

So the schedule's `shift_id` (the "home" shift) is **not directly used** by the auto-render path — it's metadata only. The flag is what matters. This is why employee 909090 with `shift_id=0` still renders correctly alongside Mohamed with `shift_id=187`.

## Architecture

### Frontend — Add Schedule modal ([Schedule/Create.js](frontend-new/src/components/Schedule/Create.js))

Add a new toggle **"Auto Shift"** in the Configuration section, next to the existing "Over Time" toggle:

- User **still picks a home shift** from the Shift Profile dropdown (e.g., Day Time) — that becomes the employee's default for display purposes and any feature that reads `schedule.shift_id`.
- When Auto Shift is **on**, the submit payload sends `isAutoShift: true`.
- When off, payload sends `isAutoShift: false` (current default behavior — unchanged).

Why a toggle instead of a dropdown entry: matches the existing record shape (real shift + flag), doesn't require a virtual row in the dropdown, and the UI matches Over Time's pattern so it's visually consistent.

### Frontend — Edit modal ([Schedule/EditModal.js](frontend-new/src/components/Schedule/EditModal.js))

Same toggle. Initial value comes from the schedule's existing `isAutoShift` field (already returned by the API).

### Backend — [ScheduleEmployeeController::store](backend/app/Http/Controllers/ScheduleEmployeeController.php#L173)

Simplify the three ternaries on lines 202–204 so `isAutoShift` is respected regardless of `shift_id`:

```php
"isAutoShift"   => !empty($shift["isAutoShift"]) ? 1 : 0,
"shift_id"      => $shift["shift_id"] ?? 0,
"shift_type_id" => $shift["shift_type_id"] ?? 2,
```

This also makes the update path (if ever added) naturally symmetric. No new columns or migrations.

### Schedule list display

[app/schedule/columns.js:91](frontend-new/src/app/schedule/columns.js#L91) already shows `"Auto"` when `schedule.isAutoShift=true`. No change needed.

## Data flow

### Creating an auto-shift schedule

```
User opens Add Schedule modal
  → picks a home shift (e.g. Day Time)
  → flips "Auto Shift" toggle ON
  → clicks Submit

Frontend sends:
  POST /api/schedule_employees
  {
    employee_ids: [...],
    schedules: [{
      shift_id: 187,
      shift_type_id: 6,
      from_date, to_date,
      is_over_time: false,
      isAutoShift: true
    }],
    ...
  }

Backend ScheduleEmployeeController::store inserts:
  schedule_employees row {
    shift_id: 187,
    shift_type_id: 6,
    isAutoShift: true,
    ...
  }

Next time AutoShiftController runs for that employee:
  - finds them via isAutoShift=true
  - picks nearest shift per day based on logs
  - renders attendance accordingly
```

### Editing back to non-auto

```
User opens Edit modal for an auto-shift schedule
  → toggle starts ON (from existing record)
  → flips OFF
  → picks a concrete home shift if desired
  → Submit

Row updates to isAutoShift=false; AutoShiftController no longer picks up this employee; regular shift rendering takes over.
```

## Error handling

| Scenario | Behavior |
|---|---|
| User flips Auto Shift on but doesn't pick a home shift | Existing "Shift must be selected" validation already catches this — no change needed. |
| Legacy `shift_id=0, isAutoShift=true` rows in DB | Still render correctly (auto path ignores shift_id). In the Edit modal, the home-shift dropdown will show "Select Shift" empty — user must pick one before saving. |
| Backend receives `isAutoShift: true` with `shift_id: 0` | Allowed and stored as-is (backward compat with legacy data). |
| Old ShiftSelect.jsx commented-out virtual entry | Leave the comment in place for historical context; plan does not reintroduce it. |

## Testing (manual, browser)

1. Open **Schedule → Add**, select an employee, pick **Day Time**, flip **Auto Shift** toggle ON, pick dates, submit. Expect success.
2. Check `schedule_employees` in DB: row should have `shift_id=187`, `isAutoShift=true`.
3. Open the same schedule in Edit: **Auto Shift** toggle should start ON, shift dropdown should show "Day Time".
4. Flip toggle OFF, save. Row updates to `isAutoShift=false`.
5. Confirm Schedule list shows **"Auto"** in the Active Interval column while toggle is on, and shows the shift name when off.
6. Run attendance regenerate for an employee in auto-shift mode; confirm AutoShiftController picks them up (existing behavior, just verifying nothing broke).

## Out of scope / follow-ups

- The missing-attendance-row bug (Apr 16/18/20/21 for Mohamed) — separate ticket.
- Cleaning up the legacy `shift_id=0` row for employee 909090 — data cleanup task, not code.
- Adding Auto Shift to the full-page `/schedule/create` page (`app/schedule/create/page.js`) if that's still in use — out of scope unless needed; the modal in Schedule/Create.js covers the primary flow shown in the screenshot.
