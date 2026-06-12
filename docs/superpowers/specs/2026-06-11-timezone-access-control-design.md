# Timezone Access Control (per-employee, per-device) — Design

**Date:** 2026-06-11
**Module:** Access Control (frontend-new)
**Status:** Approved design → implementation

## 1. Problem & Goal

The device page already has an **"always open"** schedule. Access Control needs the
opposite: assign each employee a **time window** ("this time to this time only") so the
door **refuses to open even on a valid face match** outside the window — and assign it
**individually** per employee.

This capability exists in the **old/live app** (screens: Timezones List, weekly-grid
Timezone modal, Timezone Employees List, "Update Timezone Mapping(s)" modal,
"Sync Timezones to All Devices"). It is **absent from the new app** (`frontend-new`),
whose Access Control section currently has only Dashboard + Logs.

**Goal:** Rebuild the full timezone access-control suite in the new app's Access Control
section, in the new app's visual style, wired to the **already-existing backend**.

## 2. Key Insight — where enforcement happens

Enforcement is **on the device**, not in the web app:

- Each device firmware stores up to **63 "time groups"** (a time group = one weekly grid /
  timezone definition). `timezone_id = 1` is reserved for **Full Access** (24/7).
- Every enrolled person carries a `timeGroup` number. On a face match the device checks
  the current time against that person's time group; **outside the window → denied.**

Therefore two distinct things must be synced to each device for the feature to work:

1. **Timezone definitions** (the weekly grids) → `WriteTimeGroup` ("Sync timezones to all
   devices"). The device must know what schedule time-group #N represents *before* a person
   is assigned to it.
2. **Per-person time-group assignment** → push `{userCode, timeGroup}` to the device
   (`PersonAddRange` / `processSDKTimeZoneONEJSONData`).

## 3. Scope (decisions)

- **Full suite** — define timezones (weekly grid) + Timezones List + individual employee
  assignment + device↔timezone Mapping List.
- **Placement** — three new sub-pages in the Access Control left-sidebar section.
- **Style** — match `frontend-new` (modern). Build standalone **HTML prototypes** first,
  confirm via screenshots, then implement in React (per project workflow).
- **Granularity** — **per device**: an employee can have a different timezone on each
  device (matches the old app's "Update Timezone Mapping(s)" modal).

Out of scope: changing device firmware/SDK protocol; the existing "always open" device
feature; attendance logic.

## 4. Architecture

This is **frontend-heavy against a mature backend.** Backend controllers, models, routes,
and DB tables already exist and route files are loaded (`routes/api.php` includes
`timezone.php`, `employee_timezone_mapping.php`, `sdk.php`).

### Existing backend (reused as-is)

| Concern | Endpoint(s) | Controller |
|---|---|---|
| Timezone CRUD | `GET/POST /timezone`, `PUT/DELETE /timezone/{id}` | `TimezoneController` |
| Timezone dropdown | `GET /timezone_list` (Full/No Access first) | `TimezoneController@timezonesList` |
| Seed defaults | `POST /create_default_timezones` | `TimezoneController@createDefaultFullNoTimezones` |
| Employees + their mappings | `GET /employees_with_timezone_count` | `TimezoneEmployeesController@employeesWithTimezoneCount` |
| Per-employee per-device save | `POST /timezones_device_employees_update` | `TimezoneEmployeesController` |
| Bulk mapping (1 tz → many emp/dev) | `POST /employee_timezone_mapping` | `EmployeeTimezoneMappingController@store` |
| Mapping list | `GET /gettimezonesinfo` | `EmployeeTimezoneMappingController` |
| Delete a timezone's mappings | `POST /deletetimezone` | `EmployeeTimezoneMappingController` |
| Push definitions to a device | `POST /{deviceId}/WriteTimeGroup` | `SDKController@processTimeGroup` |

### DB tables (existing)
- `timezones` — definitions (`timezone_id` 1–63, `timezone_name`, `interval`, `json`,
  `intervals_raw_data`, `scheduled_days`, `company_id`, `is_default`).
- `timezone_employees` — junction `(employee_table_id, device_table_id, timezone_table_id,
  device_timezone_id, company_id)` — this is the **per-employee-per-device** store.
- `employee_timezone_mappings` — bulk mapping records (for Mapping List).
- `employees.timezone_id` — convenience column for the employee's primary group.

### Frontend (new code)

```
frontend-new/src/app/access_control/
  timezones/page.js            → list + grid modal
  timezone-employees/page.js   → individual assignment
  mapping-list/page.js         → bulk mappings
frontend-new/src/components/AccessControl/Timezone/
  TimezoneGridModal.jsx        → weekly grid (adapted from Device/TimeSelection.jsx)
  TimezoneList.jsx
  TimezoneEmployeesTable.jsx
  AssignTimezoneModal.jsx      → per-device timezone dropdowns for one employee
  MappingList.jsx
frontend-new/src/lib/api.js    → add timezone API functions
frontend-new/src/lib/menuData.js → add 3 items to accessControlMenu + leftNavLinks
```

Conventions to follow: `buildQueryParams` (injects `company_id`/branch scope), the
`@/components/ui/*` primitives (`DataTable`, `dialog`, `select`, `badge`, `button`),
`notify`/`parseApiError` for toasts, `can()` for permission gating, `useTranslation`
(i18n keys under an `accessControl.timezone.*` namespace; EN/AR/FR/HI parity per project
convention).

## 5. The weekly-grid modal

Adapt the existing `frontend-new/src/components/Device/TimeSelection.jsx` (already the new
app's grid: violet header, 48 half-hour slots 00:00–23:30, drag-to-select, per-day orange
gear → hour-range sub-modal). **Only the output serialization changes** to match the
timezone backend contract.

**Create/Update `/timezone` request body:**
- `timezone_name` (required, min 4, max 20, unique per company)
- `description` (nullable)
- `company_id` (injected)
- `interval` — required array (validation only; server **overwrites** it from the slots)
- `intervals_raw_data` — JSON string of selected `"day-slot"` keys, e.g. `["0-0","0-1",…,"6-47"]`
  (day 0=Mon … 6=Sun; slot 0..47 = 30-min index)
- `input_time_slots` — the 48 `"HH:mm"` labels array (server maps slot→begin/end)
- `scheduled_days` — `[{day:"M",isScheduled:bool,dayWeek:0}, …]`

Server computes `interval`, `json`, `scheduled_days`, and assigns the next free
`timezone_id` (2–63). **Editing** loads `intervals_raw_data` back into the grid.

## 6. Screens

### 6.1 Timezones — `/access_control/timezones`
- Table: `# · Name · Description · Timezone #Id on Device · Employees Count · Created · Actions`.
- Header actions: **"Sync timezones to all devices"**, **"+"** (open grid modal).
- Row actions: Edit (grid modal prefilled), Delete (`DELETE /timezone/{id}`).
- On first load, if no timezones exist, call `POST /create_default_timezones` to seed
  Full Access + No Access.
- **Sync** loops the company's access-control devices and calls
  `POST /{deviceId}/WriteTimeGroup` for each (see §8 — add a "sync all" wrapper for one click,
  with per-device success/fail toast summary).

### 6.2 Timezone Employees — `/access_control/timezone-employees`
- Table: photo · name/role · Emp/Device Id · Branch · Department · Mobile · **Timezones
  badge** ("Default Full Access" when unassigned, else the per-device timezone summary) · Actions.
- Search (min 3 chars) + Branch filter + Timezone filter
  (`filter_timezone_id`, `filter_device_id`) via `GET /employees_with_timezone_count`.
- Row action **"Assign / Update Timezone"** → `AssignTimezoneModal`:
  - Lists the relevant devices; each row has a **Timezone dropdown** (`GET /timezone_list`).
  - Prefills from the employee's existing `timezones_mapped`.
  - Save → `POST /timezones_device_employees_update` with
    `{ employee_ids:[id], mappings:[{id:deviceTableId, serial_number, timezone_table_id,
    device_timezone_id}] }`.

### 6.3 Mapping List — `/access_control/mapping-list`
- List existing device↔timezone↔employee mappings (`GET /gettimezonesinfo`).
- Bulk "assign one timezone to many employees on many devices" → `POST
  /employee_timezone_mapping` (already resets+recreates+syncs to devices correctly).

## 7. Data flow (assign an employee a 9–5 window on Main Door)

1. Admin defines "Office Hours" timezone (grid Mon–Fri 09:00–17:00) → `POST /timezone`
   (server stores grid, assigns e.g. `timezone_id=5`).
2. Admin clicks **Sync timezones to all devices** → each device learns time-group #5's schedule.
3. Admin opens employee in Timezone Employees → sets **Main Door → Office Hours** → save →
   `timezones_device_employees_update` writes the `timezone_employees` row **and** pushes
   `{userCode, timeGroup:5}` to Main Door.
4. Employee shows face at 20:00 on Main Door → device sees timeGroup 5 disallows 20:00 →
   **door stays shut.** ✅

## 8. Backend changes (small, required for enforcement)

The two per-employee update endpoints each do **half** the device sync:
- `timezoneEmployeesUpdate` (`/timezones_employees_update`): resets old groups on devices
  but **does not push the new** timeGroup.
- `timezonesDeviceEmployeesUpdate` (`/timezones_device_employees_update`): pushes new groups
  but **does not reset old**, and **returns inside the employee loop** (only first employee
  processed).

**Change:** Use `timezonesDeviceEmployeesUpdate` as the canonical per-employee save and make
it (a) reset the employee's previous device groups to Full Access on the device, (b) write the
new `timezone_employees` rows, (c) push the new `{userCode, timeGroup}` to each affected
device, (d) move the `response()` outside the loop so multiple employees can be saved. Keep
the change minimal and backward-compatible with the existing request shape.

**Add:** a thin "sync timezone definitions to all access devices" path so the Sync button is
one call (loop devices server-side calling the existing `processTimeGroup`, return a
per-device result summary). Alternatively the frontend loops `WriteTimeGroup` per device;
server-side wrapper preferred for a single UX action + consistent error reporting.

## 9. Constraints, risks, non-goals

- **63-timezone firmware limit** — `store()` already errors at the limit; surface it as a
  toast.
- **Full Access = `timezone_id 1`** is special (24/7, `json=[]`); never overwrite/delete it.
- **Device sync depends on `SDK_URL`/device connectivity.** Per project memory, online state
  is judged by `last_live_datetime`/`synced`/`status_id`, **not** `ip`/`port`. Sync results
  must report per-device success/offline so admins know which devices actually received the
  update.
- **Shared production DB** (project memory) — timezone tables are already populated by the
  live app; the new UI must read/write the same shapes. Verify against real rows before wiring.
- **Non-goals:** firmware/SDK protocol changes; the existing device "always open"; attendance.

## 10. Build order

1. HTML prototypes of the 3 screens + grid modal + assign modal → screenshots → confirm.
2. Nav: add 3 items to `accessControlMenu` + `leftNavLinks`.
3. `api.js`: timezone API functions.
4. Screen 1 (Timezones + grid modal) + seed defaults + Sync.
5. Backend: consolidate per-employee save + add sync-all wrapper.
6. Screen 2 (Timezone Employees + assign modal).
7. Screen 3 (Mapping List).
8. i18n (EN/AR/FR/HI) + permission gating + verify against live data.

## 11. Testing / verification

- Grid modal round-trips: create → reopen edit shows same slots; `intervals_raw_data`
  matches selection.
- Assign saves a `timezone_employees` row AND (when a device is online) pushes the timeGroup
  (assert SDK payload in `sdk_timezone_employee_mapping` log).
- Sync reports per-device success/offline.
- Manual device test (if a test device is available): assign a narrow window, confirm
  face match outside the window is denied.
