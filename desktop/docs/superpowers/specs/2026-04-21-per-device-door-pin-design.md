# Per-Device Door PIN — Design

**Date:** 2026-04-21
**Status:** Approved (awaiting implementation plan)

## Problem

Today the door-unlock PIN is a single 4-digit code stored on `companies.pin`. It's set in **Settings → Company Profile → Door Pin** and is the same for every device under the company. When a user clicks **Open Door** on a device row in [components/Device/Page.js](frontend-new/src/components/Device/Page.js), the [PinEntryModal](frontend-new/src/components/Device/UnlockDoor.js) calls `/check-pin` which validates against `companies.pin` regardless of which device was clicked.

The customer wants each device to have its own PIN so that opening Device A requires Device A's PIN — not a shared company-wide secret.

## Goals

1. Each device has its own 4-digit PIN, set when the device is created and editable from the device's Edit panel.
2. **Open Door** validates the entered PIN against the *target device's* PIN, not the company's.
3. Existing devices keep working immediately after deploy — no manual reconfiguration required.
4. The Company Profile **Door Pin** tab is removed; per-device PIN is the only way to manage door PINs going forward.

## Non-goals

- Per-user PINs (each device still has one shared PIN, just scoped to that device).
- PIN strength/complexity rules beyond the existing 4-digit numeric format.
- Brute-force throttling, lockout, or audit logging on failed PIN entry (matches current behavior).
- Hashing/encrypting the PIN at rest (current company PIN is stored plaintext; this work doesn't change that posture — out of scope).

## Architecture

### Data model

Add one column to the `devices` table:

| Column     | Type        | Null  | Notes                                              |
|------------|-------------|-------|----------------------------------------------------|
| `door_pin` | `string(4)` | Yes (DB-level) | App-level validation enforces required + 4 digits |

`devices.door_pin` is nullable at the schema level so the migration can run without a default constraint, but the Laravel `StoreRequest` / `UpdateRequest` validators reject any create or update that omits it.

The existing `companies.pin` column is **not dropped**. We stop reading and writing it from this app, but leave it in place so any other systems pointing at the shared production database remain undisturbed.

### Migration & backfill

A single migration (`2026_04_21_*_add_door_pin_to_devices_table.php`) does both:

1. `Schema::table('devices', fn ($t) => $t->string('door_pin', 4)->nullable()->after('camera_password'))`
2. Backfill: for each row in `devices`, set `door_pin = (select pin from companies where companies.id = devices.company_id)`

The backfill must be scoped by `company_id` because the production database is shared across tenants — we cannot blanket-copy one company's PIN to another company's devices.

`down()` drops the column.

### Backend changes

**`app/Http/Requests/Device/StoreRequest.php`** — add rule:

```php
'door_pin' => ['required', 'digits:4'],
```

with message `'Door PIN must be exactly 4 digits'`.

**`app/Http/Requests/Device/UpdateRequest.php`** — same addition.

**`app/Http/Controllers/DeviceController.php`** — `store()` and `update()` already use `$request->validated()` to populate `$data` for `Device::create` / `$Device->update`, so once the validation rule is added the column flows through automatically. No changes to controller method bodies.

**`app/Http/Controllers/CompanyController.php::checkPin`** — rewrite to validate against the device's PIN:

```php
$validated = $request->validate([
    'device_id' => 'required|string',
    'pin'       => 'required|digits:4',
]);

$exists = \App\Models\Device::where('device_id', $validated['device_id'])
    ->where('door_pin', $validated['pin'])
    ->exists();

return response()->json(['status' => $exists]);
```

The route stays at `GET /check-pin` (defined in `routes/company.php`), so the frontend caller signature only changes by adding one query param.

**`CompanyController::setPin` and `POST /set-pin`** — both removed. Nothing else references them after the Door Pin tab is deleted.

### Frontend changes

**`components/Device/Create.js`**
- Add `door_pin: ""` to `defaultPayload`.
- Add a "Door PIN" input on the form. Plain text (`type="text"`), `inputMode="numeric"`, `maxLength={4}`. Placement: in a row with **Status** so the visual layout balances (or its own row if cleaner — implementer decides during build).
- Bind via existing `handleChange("door_pin", ...)` pattern.

**`components/Device/Edit.js`**
- Same field, same constraints, same placement as Create.
- The form initializes from `getDevice(id)` which returns the row including `door_pin`, so the saved value populates automatically — no extra fetch logic needed.

**`components/Device/UnlockDoor.js`**
- Pass `device_id` along with the PIN to `checkPin`:
  ```js
  let { status } = await checkPin({ device_id, pin: pin.join('') });
  ```
- `device_id` is already a prop on the component.

**`lib/api.js`**
- `checkPin(params)` already forwards `params` as query string — no change needed.
- Delete the `setPin()` export (around line 260).

**Company Profile tabs** — in [app/company/page.js](frontend-new/src/app/company/page.js):
- Delete the `import DoorPin from "@/components/Company/DoorPin"` line (line 26).
- Remove `{ id: 'tab-pin', label: 'Door Pin' }` from the `tabs` array (line 148).
- Remove the `{activeTab === 'tab-pin' && <DoorPin .../>}` render line (line 202).
- Delete the file `components/Company/DoorPin.js`.

The `pin` and `setPin` data still loaded in this page for the Door Pin tab can be removed too if no other tab consumes them — implementer should grep before deleting.

## Data flow

### Adding a new device

```
User → Add Device form → POST /devices
    body includes door_pin
        ↓
StoreRequest validates door_pin: required|digits:4
        ↓
DeviceController::store → Device::create($data)
    door_pin persisted
```

### Opening a door

```
User clicks Open Door on Device row → setPinModal(true), setDeviceId(id)
        ↓
PinEntryModal collects 4 digits → GET /check-pin?device_id=X&pin=YYYY
        ↓
CompanyController::checkPin → Device::where(device_id=X, door_pin=YYYY)->exists()
        ↓
status:true  → onSuccess(pin) → openDoor({device_id, otp:pin})
status:false → notify("Invalid Pin")
```

## Error handling

| Scenario | Behavior |
|----------|----------|
| Wrong PIN | Backend returns `status:false`, frontend shows "Invalid Pin", input clears. |
| Device with `door_pin = NULL` (legacy edge case) | `checkPin` returns `status:false`; user sees "Invalid Pin". Admin must Edit the device and set a PIN. |
| Create/Edit submitted without PIN | 422 from Laravel validator with message "Door PIN must be exactly 4 digits"; frontend `notify` already surfaces validation errors. |
| Non-numeric or wrong-length PIN entered in form | Same 422 path. Frontend `maxLength={4}` and `inputMode="numeric"` provide UX guardrails but server validation is authoritative. |

No throttling or lockout — matches current behavior.

## Testing (manual, browser-based)

1. Apply migration on a dev DB; verify `devices.door_pin` is populated for all existing rows with each row's company PIN.
2. Open **Edit** on an existing device — PIN field is pre-filled with the backfilled value. Save without changing → still works.
3. **Add Device** without entering a PIN → validation error appears.
4. **Add Device** with PIN `12ab` → validation error.
5. **Add Device** with PIN `1234` → saves successfully.
6. Click **Open Door** on Device A, enter Device A's PIN → succeeds, door open command fires.
7. Click **Open Door** on Device A, enter Device B's PIN → "Invalid Pin".
8. Navigate to **Settings → Company Profile** — **Door Pin** tab is gone; remaining tabs (General Information, Branch Management, Working Schedule, Documents, Password) still render.

## Out of scope / future work

- Migrating the company PIN out of `companies.pin` and dropping the column once we're confident no other system reads it.
- Hashing PINs at rest.
- Per-user / role-scoped door access policies.
