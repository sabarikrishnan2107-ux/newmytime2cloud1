# Walk-in Visitor → Device Assignment with Auto-Expiring Temp ID

**Date:** 2026-05-30
**Status:** Awaiting approval

## Goal

On the walk-in visitor form (Reception, Step 2), let the receptionist select **one or more
access-control devices** belonging to their company. On submit (after Step 3), the visitor is:

1. Saved to the database (already working).
2. Assigned a **temporary `system_user_id`** that is unique per company and never collides
   across tenants.
3. Pushed to each selected device with a validity window equal to the **Allowed From → Allowed
   To** times already captured at walk-in.
4. Automatically **expired** (removed from the devices) shortly after the Allowed To time.

The actual SDK push is **gated behind a flag** (DB-first): everything is stored and the push is
built, but the live device call is only made when the flag is on.

## Decisions (confirmed with user)

- **Device multi-select** — upload to exactly the device(s) chosen (not zone-based).
- **Temp ID** — company-prefixed reserved band (recommended below).
- **Expiry** — driven by the From/To time entered at walk-in; device enforces `expiry` + the
  existing 5-minute cron removes the record.
- **DB-first** — store everything; live SDK push behind a flag (`VISITOR_SDK_PUSH`).

## Temp ID scheme (recommended)

Devices use `system_user_id` as the numeric `userCode`. Employees use small numbers (e.g. their
employee_id). To guarantee no collision with employees and no collision across tenants, allocate
visitor temp IDs from a **reserved, company-prefixed band**:

```
temp_id = 1{company_id padded to 5}{daily sequence padded to 4}
        = 1 ·  00082  ·  0001   →  1000820001   (company 82, 1st temp visitor today)
```

- Leading `1` marks the temporary band (well above any real employee id).
- Company segment makes IDs **distinct across tenants** (your explicit requirement).
- Daily sequence is the next free slot for that company today.
- Value stays within a 32-bit unsigned int (max ~4.29e9; this scheme tops out ~1.99e9), so it
  fits device hardware limits.
- Before use, we still collision-check against that company's existing `employees.system_user_id`
  and `visitors.system_user_id` and skip any taken value.

> Open hardware detail: if any device model caps `userCode` below 10 digits, we shorten the
> company/sequence padding. Default assumption: 10-digit integer is accepted (consistent with the
> SDK code, which passes `userCode` as a plain integer with no length handling).

## Data model

New pivot table **`visitor_devices`** (records exactly what was pushed — auditable, drives expiry):

| column                | type            | notes                                         |
|-----------------------|-----------------|-----------------------------------------------|
| id                    | bigint PK       |                                               |
| visitor_id            | bigint FK       | → visitors.id                                 |
| company_id            | bigint          | tenant scope                                  |
| device_id             | string          | device serial (Device.device_id)              |
| device_pk             | bigint          | Device.id (convenience)                       |
| system_user_id        | bigint          | the temp userCode pushed to the device        |
| valid_from            | datetime        | date + Allowed From                           |
| valid_to              | datetime        | date + Allowed To  (expiry)                   |
| pushed_at             | datetime null   | when SDK push succeeded                        |
| removed_at            | datetime null   | when expiry removal succeeded                 |
| status                | string          | pending / pushed / expired / failed           |

Existing `visitors` columns reused: `system_user_id`, `sdk_expiry_datetime`,
`sdk_deleted_visitor_date_time`, `status_id`.

## Flow

### Frontend (Reception.jsx, Step 2)
- Add a **Devices** multi-select fed by `GET /device-list?company_id=…` (returns
  `{id, name, device_id, short_name}`). Render as checkboxes / multi-select chips.
- Selecting ≥1 device is optional (a walk-in can still be registered without device access).
- On submit, include `device_ids: [Device.id, …]` in the existing `/visitor-register` payload.
- Step 3 summary lists the chosen devices. The temp ID is shown after success.

### Backend (VisitorController@register, gated on `device_ids`)
1. Create the visitor as today (unchanged) — status_id 6.
2. If `device_ids` present:
   a. Generate the temp `system_user_id` (scheme above); save it on the visitor.
   b. Compute `valid_from = date + time_in`, `valid_to = date + time_out`; set
      `sdk_expiry_datetime = valid_to`.
   c. Insert one `visitor_devices` row per selected device (status `pending`).
   d. If `config('visitor.sdk_push')` (env `VISITOR_SDK_PUSH`) is **true**: build the SDK payload
      via the existing `prepareJsonForSDK` shape (userCode = temp id, expiry = valid_to, faceImage
      = visitor photo) and push to each device's serial via the existing `PushUserToDevice` /
      `{SDK_URL}/Person/AddRange`. Mark rows `pushed` / `failed` and set `pushed_at`.
      If **false**: leave rows `pending` (DB-first; nothing hits the devices yet).
3. Return the temp ID and per-device push status in the response.

### Expiry (scheduled command)
- New artisan command `visitors:expire-device-access`, scheduled every 5 minutes in
  `Console/Kernel.php` (matches existing cadence).
- Finds `visitor_devices` where `valid_to <= now()`, `removed_at is null`, `status = pushed`.
- When `VISITOR_SDK_PUSH` is on, calls the existing
  `deleteVisitorDetailsfromDevice(system_user_id, device_id)` → `{SDK_URL}/{device}/DeletePerson`.
- Marks `removed_at`, `status = expired`; updates visitor `sdk_deleted_visitor_date_time` and
  `status_id = 5`.
- Device-side `expiry` field already blocks access at `valid_to` even before this removal runs, so
  access stops on time; the cron just cleans up the record.

## What requires deployment
- **Migration** for `visitor_devices` (shared prod DB — you run it).
- Backend controller + command + Kernel schedule entry (you deploy; remember the `--no-dev`
  autoload + OPcache restart steps).
- `VISITOR_SDK_PUSH=false` initially in `.env`; flip to `true` after verifying stored data.
- Frontend rebuild (already your workflow).

## Out of scope (for now)
- Host linkage (separate open item).
- Real-time check-out wiring on the Currently Inside cards (separate open item).
- Per-device timezone/zone nuances beyond what `prepareJsonForSDK` already handles.
