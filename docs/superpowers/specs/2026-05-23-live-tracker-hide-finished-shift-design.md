# Live Tracker — Hide Finished-Shift Employees

**Date:** 2026-05-23
**Status:** Approved design, ready for implementation plan
**Scope:** `backend` (`RealTimeLocationController::index`) + `frontend-new` (`components/Map/Index.jsx`). Mobile app needs **no change**.

## Problem

The web Live Tracker map (and the mobile manager map, which polls the same endpoint) shows a marker for every employee who has *ever* sent a location ping, with no concept of the shift being over. Two visible symptoms:

1. Employees whose shift has ended for the day still appear on the map.
2. Very stale pings linger — e.g. a marker whose last ping was `2026-04-21` was still showing on `2026-05-23` (over a month old).

The result looks unprofessional: the map should show only people who are currently out there on shift.

## Goal

Show an employee's marker on the Live Tracker only while they are plausibly still on shift today. Hide them once their shift is finished, and keep them hidden for the rest of that day.

## The rule (confirmed)

Show an employee's marker only if **both**:

- **(a) Freshness** — their latest ping `datetime` is newer than **N = 30 minutes** (a pure time delta), **and**
- **(b) Not clocked out** — they have **not** recorded a final clock-out for today.

If either fails, the marker is hidden.

### Temporary vs permanent hide (confirmed: Option A)

- **Stale (rule a) is a temporary hide.** If the phone goes quiet for > N minutes the marker drops off, but it **reappears automatically** once fresh pings resume — provided the employee has not clocked out. This is intentional: a brief signal/app gap should not permanently remove someone who is still on shift.
- **Clock-out (rule b) is a permanent hide for that day.** Once a final `out` is recorded, the employee stays hidden for the rest of the day **even if their phone keeps sending pings**.

### Why this rule (and not "scheduled shift-end time")

Employees run a mix of shift types: **single, multi, split, night, flexible, auto**. Computing "scheduled shift end has passed" per employee would mean duplicating the entire shift engine (night shifts cross midnight, split shifts have two windows, flexible/auto have no fixed end). That logic already lives in the `NightShift` / `SplitShift` / `MultiShift` / `AutoShift` controllers and would drift out of sync if re-derived here.

The chosen rule needs **zero per-shift-type math**:

- Freshness is a time delta, so it is shift-type-agnostic and **night-shift / midnight safe**, and it automatically clears the stale-marker bug.
- "Clocked out" is read from the **already-computed** `attendances.out` for today, which the shift engine fills correctly for every shift type — so we reuse its output instead of recomputing.

## Data facts this relies on

- **Join key:** `real_time_locations.UserID` == `employees.system_user_id` == `attendances.employee_id`. (The location writers store `UserID = system_user_id`; `attendances.employee_id` is the FK to `employees.system_user_id`, per `SyncAttendanceStatuses`.)
- **Clocked-out signal:** `attendances` has one row per employee per `date`, with `out` defaulting to the sentinel `'---'` when not clocked out and set to the day's final out-time once rendered. So "clocked out today" = `attendances.out` for today is **not** null/empty and **not** `'---'`.
- **Ping freshness:** `real_time_locations.datetime` is written in server time (`date('Y-m-d H:i:s')`), so comparing against server `now()` is consistent.
- **Snapshot shape:** `GET /api/realtime_location?company_id=X` (live-tracker mode) returns a **bare JSON array**, one item per employee (their latest ping). The web fetches it **once on mount** and thereafter only *adds*/updates markers via the SSE stream — it has **no removal logic** today.

## Design

### Part A — Backend filter (single source of truth)

File: `backend/app/Http/Controllers/RealTimeLocationController.php`, method `index()`, **live-tracker mode only** (the branch with no `UserID`).

Add two filters to the snapshot:

1. **Freshness:** require the latest ping to be fresh — `where('datetime', '>=', now()->subMinutes(N))` applied to the final rows query (the one that loads the `MAX(id)` per user). If an employee's latest ping is older than N, they are dropped. This also removes the month-old stale markers.
2. **Clocked-out exclusion:** build the set of today's clocked-out users and exclude them —
   ```
   $clockedOut = Attendance::where('company_id', $companyId)
       ->whereDate('date', now()->toDateString())
       ->whereNotNull('out')
       ->whereNotIn('out', ['---', ''])
       ->pluck('employee_id');
   // ... ->whereNotIn('UserID', $clockedOut)
   ```

`N` is configurable: a default constant `FRESH_MINUTES = 30` on the controller, overridable via an optional `?fresh_minutes=` query param, clamped to `[1, 1440]`.

**Not changed:** the single-user trail mode (`index()` with `UserID`), `logLocation`, and `listLocationLogs` — history/trail reads must still return everything regardless of shift state.

**Effect:** fully fixes the **mobile** manager map (it polls this endpoint every 12s) and the **web** initial load, and removes stale markers everywhere.

### Part B — Web map removal (periodic reconcile)

File: `frontend-new/src/components/Map/Index.jsx`.

The web only fetches the snapshot once and never removes markers, so add a **reconcile interval (~60s)**:

- Every ~60s, re-fetch the now-filtered snapshot `GET /api/realtime_location?company_id=X`.
- Build the set of `UserID`s present in the fresh snapshot.
- Update `employeesData` to **drop any marker not in that set** (and refresh positions for those present).
- The SSE stream continues to provide instant add/move between reconciles; the backend filter remains the single source of truth, so the web ends up behaving exactly like the mobile poll.

**Defensive bonus:** in the SSE `handleSseMapMessage` path, ignore an incoming ping whose timestamp is already older than N minutes, so a stale replay can't resurrect a marker between reconciles.

Reconcile cadence and N for the client-side defensive check are read from env with sane defaults (`NEXT_PUBLIC_LIVE_TRACKER_FRESH_MINUTES`, default 30).

### Part C — Freshness window

- **N = 30 minutes** (confirmed). Effect: a clocked-out person disappears within one reconcile/poll cycle (≤60s via rule (b)); a person who simply goes home without punching out ages off within ≤N (≤30 min).

## Edge cases (accepted)

- **Split-shift lunch break:** if the shift engine writes `out` at a mid-day out-punch, the marker briefly hides until the employee punches back in. Minor and arguably correct (they are on break).
- **Attendance row not yet rendered:** no `out` set ⇒ treated as not clocked out ⇒ shown. Correct — they are still active.
- **Night shift across midnight:** freshness is a pure `now() − datetime` delta, so midnight crossing is a non-issue.
- **Timezone:** "today" and `now()` use server time, consistent with how pings and attendance dates are written. If the product later needs per-company-timezone "today", that is a separate enhancement.

## Optional follow-up (out of scope for this change)

- In `logLocation` / `store`, skip the `Notify::push("map", …)` SSE event when the employee is already clocked out for today, to avoid a brief re-add/flicker on the web between reconciles. Adds one lookup per ping write; deferred unless flicker is observed.

## Verification

- **Backend:** with a seeded clocked-out employee and a fresh-pinging employee for the same company, `GET /api/realtime_location?company_id=X` returns only the fresh, not-clocked-out employee; an employee whose latest ping is older than N is absent; the single-user trail mode (`&UserID&date`) still returns all rows.
- **Web:** load the map with a stale/clocked-out marker present, confirm it disappears within ≤60s without a page reload; a fresh on-shift employee remains and continues to move via SSE.
- **Mobile:** no code change; confirm the 12s poll now omits clocked-out / stale employees.
