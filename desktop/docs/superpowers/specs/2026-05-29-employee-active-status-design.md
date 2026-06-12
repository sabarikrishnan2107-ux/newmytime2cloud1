# Employee Active / Non-Active Status — Design

**Status:** Approved (brainstorming)
**Date:** 2026-05-29
**Author:** mail@akilgroup.com

## Goal

Add a binary **Active / Non-Active** status to every employee. When an employee is non-active they must be unable to record attendance from any device, and the daily report must show them as "Non-Active" with the reason for inactivity.

Use cases covered: suspension, termination, resignation, extended sabbatical / long leave, training in another location, transfer-out. Short-term absences (sick / casual leave) continue to be managed by the existing **Leave** system and are out of scope.

## Non-Goals

- No bulk Active / Non-Active toggle from the employee list (single-record edit only).
- No "schedule a future deactivation" notification or email to the employee.
- No audit trail / history of past status changes — only the current state is tracked. A future `employee_status_history` table can be added if needed.
- No change to the Leave system. Approved leaves do not auto-flip an employee to Non-Active.

## Data Model

Add five columns to the `employees` table via a new migration.

| Column                  | Type                                  | Notes                                                                                                                                                          |
| ----------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_active`             | `boolean`, default `true`, not null   | The toggle the UI shows. Drives device gating and report rendering.                                                                                            |
| `inactive_reason_type`  | `string(40)`, nullable                | One of `suspended`, `terminated`, `resigned`, `long_leave`, `training`, `transfer_out`, `other`. Required when `is_active = false`.                            |
| `inactive_reason_note`  | `text`, nullable                      | Free text. **Required** when `inactive_reason_type = 'other'`. Optional otherwise — used to add context to a predefined reason.                                |
| `inactive_from`         | `date`, nullable                      | First day of inactivity. Required when `is_active = false`.                                                                                                    |
| `inactive_to`           | `date`, nullable                      | Last day of inactivity. `NULL` = indefinite (e.g. terminated). If set, must be `>= inactive_from`.                                                              |

**Validation rules (backend):**

- When `is_active` flips from `true` → `false`, `inactive_reason_type` and `inactive_from` are required.
- When `inactive_reason_type = 'other'`, `inactive_reason_note` is required and non-empty.
- When `inactive_to` is set, it must be `>= inactive_from`.
- When `is_active` flips back to `true`, all four inactivity fields are cleared to `NULL`.

**Auto-reactivation:** A Laravel scheduled command (`employees:auto-reactivate`) runs once per day. For every employee where `is_active = false` AND `inactive_to IS NOT NULL` AND `inactive_to < today`, it flips them back to active and clears the inactivity fields. This is what fires for a "30-day suspension" case so the admin doesn't have to remember to re-enable manually.

## Device Access Blocking

Two layers of defense — the backend gate is the source of truth; the device-side push is best-effort.

### Backend gate (always on)

The existing `AttendanceLogController::store` (`backend/app/Http/Controllers/AttendanceLogController.php`) ingests every device punch into `attendance_logs`. We extend its ingestion path:

1. Look up the employee by `system_user_id`.
2. If the employee is currently non-active (i.e. `is_active = false` AND today is within `[inactive_from, inactive_to or +∞]`):
   - Still insert the raw row into `attendance_logs` (for audit).
   - Tag the row as **rejected** with `rejected_reason = 'employee_inactive'`. This requires a new nullable column on `attendance_logs`: `rejected_reason` (`string(40)`).
   - Do **not** promote the log into a presence record in the `attendances` table.
3. If the employee is active, behavior is unchanged.

This ensures the audit trail captures attempted access by inactive employees, but those attempts don't count toward attendance.

### Device-side push (best effort)

Where a device push API exists (the SDK path used in `SDKController` / `EmployeeAccessController`), we send a **disable user** command to all devices an employee is enrolled in when they flip to non-active, and a **re-enable** when they flip back. Devices that don't support remote disable continue to function — the backend gate still rejects their logs.

This push is fire-and-forget (queued, with retry) — it is *not* a hard requirement for the feature to work. The backend gate alone is correctness-complete.

## Daily Report Behavior

Rendering-time override, not a data-layer change. We do **not** add a new attendance status code to the `attendances` table (which would pollute historical data and require backfilling).

In `DailyController::processPDF` and the `pdf.attendance_reports.daily` view:

1. Eager-load `employee.is_active`, `inactive_reason_type`, `inactive_reason_note`, `inactive_from`, `inactive_to` for every employee in the report.
2. For each row, before rendering the status cell, check: was this employee non-active on the report date?
   - If yes: replace the status cell with **`Non-Active`** and set the remarks column to the human-readable reason label (e.g. "Suspended") plus the optional note in parentheses.
   - If no: render as today.
3. Add a **`Non-Active`** count tile to the summary band.
4. Exclude non-active employees from the **Total Employees** denominator so attendance percentages reflect the active workforce.

The same override applies to the **Monthly** and **Weekly** reports (`MonthlyController`, `WeeklyController`) since they share the rendering pipeline. The override is evaluated **per report date**, so a 30-day suspension shows as `Non-Active` only for the dates inside its window and as normal on dates outside.

## UI

A new **Employment Status** card on the **Settings** tab of the Edit Employee page (`frontend-new/src/components/Employees/Edit/`). The Settings tab is correct because this is an admin-facing operational control, not personal info.

### Card structure

- A segmented toggle: `Active` / `Non-Active`.
- When `Non-Active` is selected, four fields appear inline (animate in):
  - **Reason** — dropdown of: Suspended, Terminated, Resigned, Long Leave, Training, Transfer Out, Other.
  - **Note** — textarea. Label changes to "Note (required)" when reason = Other.
  - **From Date** — datepicker, defaults to today.
  - **To Date** — datepicker, optional, with helper text "Leave blank for indefinite".
- A warning footer: *"Non-active employees cannot punch on devices and appear as Non-Active on daily/monthly reports."*
- When the user flips back to `Active`, the four fields collapse and their values are discarded on save.

### Build sequence

Per the project's HTML-prototype-first convention:

1. Build `prototypes/employee-status-sample.html` as a standalone mockup with both Active and Non-Active states visible.
2. Save a screenshot to `prototypes/employee-status-sample.png` and post it for visual confirmation.
3. After approval, implement the card into the React tree on the Settings tab.

## API Surface

No new endpoints. The existing employee update endpoint (`PUT /api/employeev1/{id}` or whichever the Edit screen already uses) accepts the five new fields as part of the same payload.

- Frontend submits `{ is_active, inactive_reason_type, inactive_reason_note, inactive_from, inactive_to }` alongside other employee fields.
- Backend validation enforces the rules listed under **Data Model → Validation rules**.
- A transition from `true → false` or `false → true` also triggers the device-side push job (queued).

## Implementation Order

1. **Migration** — add 5 columns to `employees`, plus 1 nullable `rejected_reason` column to `attendance_logs`.
2. **Backend model + validation** — extend `Employee` (fillable, casts) and the employee update controller's validation rules.
3. **Backend gate** — modify `AttendanceLogController::store` to check and tag inactive employees.
4. **Auto-reactivation command** — `employees:auto-reactivate` registered in the Laravel scheduler.
5. **Report override** — extend `DailyController` (and Monthly/Weekly) + the PDF views to render `Non-Active` rows and the new summary tile.
6. **Device push job (best effort)** — queue-driven, called from the update controller on status transitions.
7. **HTML prototype** — `prototypes/employee-status-sample.html` + screenshot.
8. **React implementation** — Employment Status card on Settings tab.

Steps 1–6 are backend-only and can ship in one PR. Steps 7–8 are the UI and ship in a second PR.

## Risks and Open Questions

- **Past attendance records:** the rendering-time override looks at the current `inactive_from / inactive_to` window. If an admin retroactively edits these dates, past reports re-rendered after the edit will reflect the new window. This is intentional (single source of truth) but worth flagging to the owner.
- **Device push coverage:** not every device model in the fleet may support remote disable. The backend gate is the contract; the push is a UX nicety.
- **Race condition on the day of reactivation:** if the scheduler runs at 02:00 and a punch comes in at 01:59 on the reactivation day, the gate still rejects it. Acceptable — the window is the user's stated intent.
