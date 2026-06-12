# Per-Device Door PIN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the company-wide door-unlock PIN with a per-device PIN that's set on Add/Edit Device and validated against the specific device when Open Door is pressed.

**Architecture:** Add a `door_pin` column to the `devices` table (backfilled from each company's existing `companies.pin`), validate against it in a rewritten `/check-pin` endpoint, surface a 4-digit PIN field on the device Add/Edit forms, and remove the now-obsolete Company Profile **Door Pin** tab and its `setPin` endpoint.

**Tech Stack:** Laravel 8/9 (PHP), Next.js / React (JavaScript), MySQL/MariaDB, Tailwind for styling.

**Spec:** [docs/superpowers/specs/2026-04-21-per-device-door-pin-design.md](../specs/2026-04-21-per-device-door-pin-design.md)

**Note on commits:** The user handles all git commits and pushes. Do NOT run `git commit`, `git push`, or `git add`. After each task, stop and let the user commit if they wish.

**Note on tests:** This codebase does not have a unit test suite for these surfaces. Verification is done manually in the running app (steps in each task spell out exactly what to check).

---

## File Map

**Created:**
- `backend/database/migrations/2026_04_21_000002_add_door_pin_to_devices_table.php` — schema change + backfill

**Modified:**
- `backend/app/Http/Requests/Device/StoreRequest.php` — add `door_pin` validation rule
- `backend/app/Http/Requests/Device/UpdateRequest.php` — add `door_pin` validation rule
- `backend/app/Http/Controllers/CompanyController.php` — rewrite `checkPin()`, delete `setPin()`
- `backend/routes/company.php` — delete `POST /set-pin` route
- `frontend-new/src/components/Device/Create.js` — add Door PIN field
- `frontend-new/src/components/Device/Edit.js` — add Door PIN field
- `frontend-new/src/components/Device/UnlockDoor.js` — pass `device_id` to `checkPin`
- `frontend-new/src/lib/api.js` — delete `setPin()` export
- `frontend-new/src/app/company/page.js` — remove Door Pin tab + import + state

**Deleted:**
- `frontend-new/src/components/Company/DoorPin.js`

---

## Task 1: Database migration to add `door_pin` and backfill

**Files:**
- Create: `backend/database/migrations/2026_04_21_000002_add_door_pin_to_devices_table.php`

- [ ] **Step 1: Create migration file**

Write the following content to `backend/database/migrations/2026_04_21_000002_add_door_pin_to_devices_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->string('door_pin', 4)->nullable()->after('camera_password');
        });

        // Backfill: copy each company's pin to its devices.
        // Scoped by company_id so tenants on the shared DB do not bleed into each other.
        DB::statement('
            UPDATE devices d
            INNER JOIN companies c ON c.id = d.company_id
            SET d.door_pin = c.pin
            WHERE d.door_pin IS NULL
              AND c.pin IS NOT NULL
        ');
    }

    public function down()
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn('door_pin');
        });
    }
};
```

- [ ] **Step 2: Run the migration**

Run from `d:/newmytime2cloud/backend`:

```bash
php artisan migrate
```

Expected output: `Migrating: 2026_04_21_000002_add_door_pin_to_devices_table` then `Migrated:` in green.

- [ ] **Step 3: Verify schema and backfill**

Run from `d:/newmytime2cloud/backend`:

```bash
php artisan tinker --execute="echo \App\Models\Device::select('id','name','company_id','door_pin')->get()->toJson(JSON_PRETTY_PRINT);"
```

Expected: every device row prints with `door_pin` populated (matching its company's `pin`). For the 3 devices visible in the UI screenshot (Head OFFICE / KODAI / TANJORE), all three should have a non-null `door_pin`.

If any row shows `"door_pin": null`, that company's `companies.pin` is itself null — verify with `php artisan tinker --execute="echo \DB::table('companies')->select('id','pin')->get()->toJson();"`. Document which companies have null pins; the admin will set per-device PINs from the UI for those.

---

## Task 2: Add `door_pin` validation to backend Store/Update requests

**Files:**
- Modify: `backend/app/Http/Requests/Device/StoreRequest.php`
- Modify: `backend/app/Http/Requests/Device/UpdateRequest.php`

- [ ] **Step 1: Add rule to StoreRequest**

In `backend/app/Http/Requests/Device/StoreRequest.php`, inside the `rules()` method's returned array, add this line after the `camera_password` rule (around line 61):

```php
'door_pin' => ['required', 'digits:4'],
```

In the `messages()` method, add inside the returned array:

```php
'door_pin.required' => 'Door PIN is required',
'door_pin.digits'   => 'Door PIN must be exactly 4 digits',
```

- [ ] **Step 2: Add rule to UpdateRequest**

In `backend/app/Http/Requests/Device/UpdateRequest.php`, inside the `rules()` method's returned array, add this line after the `camera_password` rule (around line 49):

```php
'door_pin' => ['required', 'digits:4'],
```

In the `messages()` method, add inside the returned array:

```php
'door_pin.required' => 'Door PIN is required',
'door_pin.digits'   => 'Door PIN must be exactly 4 digits',
```

- [ ] **Step 3: Verify rules are syntactically valid**

Run from `d:/newmytime2cloud/backend`:

```bash
php artisan route:list --path=devices > /dev/null
```

Expected: command exits cleanly with no parse errors. (A PHP syntax error in a FormRequest would surface here because Laravel boots the container.)

---

## Task 3: Rewrite `checkPin` to validate against the device

**Files:**
- Modify: `backend/app/Http/Controllers/CompanyController.php`

- [ ] **Step 1: Confirm current `checkPin` body**

Read `backend/app/Http/Controllers/CompanyController.php` lines 612–641. The current method validates `company_id` + `pin` against `companies.pin`. Confirm this matches before editing.

- [ ] **Step 2: Add `Device` model import**

At the top of `backend/app/Http/Controllers/CompanyController.php`, in the `use` statements section, ensure this line exists (add it if not):

```php
use App\Models\Device;
```

- [ ] **Step 3: Replace the `checkPin` method body**

Replace the entire `checkPin(Request $request): JsonResponse` method (lines 612–641) with:

```php
public function checkPin(Request $request): JsonResponse
{
    try {
        $validated = $request->validate([
            'device_id' => 'required|string',
            'pin'       => 'required|digits:4',
        ]);

        $exists = Device::where('device_id', $validated['device_id'])
            ->where('door_pin', $validated['pin'])
            ->exists();

        return response()->json(['status' => $exists]);
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'status' => false,
            'errors' => $e->errors(),
        ], 422);
    } catch (\Exception $e) {
        return response()->json([
            'status'  => false,
            'message' => 'Something went wrong: ' . $e->getMessage(),
        ], 500);
    }
}
```

- [ ] **Step 4: Verify with curl**

Pick one device's `device_id` and `door_pin` from Task 1 Step 3 output. Then with the Laravel dev server running (`php artisan serve` from `backend/`), in another terminal:

```bash
curl "http://localhost:8000/api/check-pin?device_id=<DEVICE_ID>&pin=<RIGHT_PIN>"
```

Expected: `{"status":true}`

```bash
curl "http://localhost:8000/api/check-pin?device_id=<DEVICE_ID>&pin=9999"
```

Expected: `{"status":false}` (assuming `9999` is not the right PIN).

```bash
curl "http://localhost:8000/api/check-pin?pin=1234"
```

Expected: `{"status":false,"errors":{"device_id":["The device id field is required."]}}` (HTTP 422).

---

## Task 4: Remove obsolete `setPin` controller method and route

**Files:**
- Modify: `backend/app/Http/Controllers/CompanyController.php`
- Modify: `backend/routes/company.php`

- [ ] **Step 1: Delete the `setPin` method**

In `backend/app/Http/Controllers/CompanyController.php`, delete the entire `setPin(Request $request): JsonResponse` method (starts at line 643 — the `public function setPin` line and its full method body up to the closing `}`).

- [ ] **Step 2: Delete the `POST /set-pin` route**

In `backend/routes/company.php`, delete line 352:

```php
Route::post('set-pin', [CompanyController::class, 'setPin']);
```

Leave line 353 (`Route::get('check-pin', ...)`) intact — that one is still used.

- [ ] **Step 3: Verify the route is gone**

Run from `d:/newmytime2cloud/backend`:

```bash
php artisan route:list | grep -i "set-pin"
```

Expected: no output (route is removed). If anything prints, something else is registering it; investigate before continuing.

```bash
php artisan route:list | grep -i "check-pin"
```

Expected: one line showing `GET|HEAD api/check-pin`.

---

## Task 5: Add Door PIN field to Add Device form

**Files:**
- Modify: `frontend-new/src/components/Device/Create.js`

- [ ] **Step 1: Add `door_pin` to defaultPayload**

In `frontend-new/src/components/Device/Create.js`, modify the `defaultPayload` object (lines 14–34). Add `door_pin: ""` as a new field — place it right after `status_id: 1,`:

```js
let defaultPayload = {
  branch_id: "",
  name: "test",
  short_name: "test",
  location: "test",
  model_number: "MYTIME1",
  device_id: "",
  utc_time_zone: "Asia/Dubai",
  function: "auto",
  device_type: "all",
  status_id: 1,
  door_pin: "",
  ip: "0.0.0.0",
  camera_rtsp_ip: "",
  camera_rtsp_port: "554",
  camera_rtsp_path: "",
  camera_username: "",
  camera_password: "",
  camera_sdk_url: "",
  admin_username: "admin",
  admin_password: "admin1234",
};
```

- [ ] **Step 2: Add the Door PIN input below the Device Type / Status row**

In `frontend-new/src/components/Device/Create.js`, locate the grid containing **Device Type** and **Status** dropdowns (around lines 371–395). After the closing `</div>` of that grid (right before the closing `</div>` of the form's scroll area at around line 396), insert:

```jsx
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Door PIN <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="4-digit PIN (e.g. 1234)"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.door_pin}
                    onChange={(e) => handleChange("door_pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </div>
              </div>
```

The `replace(/\D/g, "")` strips any non-digit the user types/pastes; `.slice(0, 4)` truncates anything longer than 4 chars.

- [ ] **Step 3: Verify in browser — happy path**

Start the frontend dev server (from `frontend-new/`):

```bash
npm run dev
```

In the browser:
1. Open Devices page → click **Add Device**
2. Confirm a **Door PIN** field with red asterisk appears below Device Type / Status
3. Try typing letters → nothing appears
4. Try typing `123456` → only `1234` remains
5. Fill all required fields including Door PIN `1234`, click **Add Device** → toast shows "Device Saved"

- [ ] **Step 4: Verify in browser — validation**

Repeat Add Device but leave Door PIN empty → submit → expect an error toast referencing "Door PIN" (from backend `door_pin.required` message).

- [ ] **Step 5: Verify the value persisted**

In Tinker:

```bash
php artisan tinker --execute="echo \App\Models\Device::latest('id')->first(['name','door_pin'])->toJson();"
```

Expected: the newly-created device with `door_pin` set to whatever you typed (e.g. `"1234"`).

---

## Task 6: Add Door PIN field to Edit Device form

**Files:**
- Modify: `frontend-new/src/components/Device/Edit.js`

- [ ] **Step 1: Add the Door PIN input below the Device Type / Status row**

In `frontend-new/src/components/Device/Edit.js`, locate the grid containing **Device Type** and **Status** dropdowns (around lines 356–380). After that grid's closing `</div>` (right before the form's scroll-area closing `</div>` at around line 381), insert:

```jsx
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-400">
                                        Door PIN <span className="text-red-400">*</span>
                                    </label>
                                    <Input
                                        placeholder="4-digit PIN (e.g. 1234)"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={form.door_pin || ""}
                                        onChange={(e) => handleChange("door_pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                                    />
                                </div>
                            </div>
```

(Indentation in this file is 4-space per existing style — keep it consistent with the surrounding grids.)

`form.door_pin || ""` guards against `null` from the DB (legacy rows where backfill couldn't find a company pin).

- [ ] **Step 2: Verify in browser — pre-fill**

In browser:
1. Open Devices page → click the **Edit** (pencil) icon on **Head OFFICE / test1111**
2. Scroll the side panel to the bottom — confirm **Door PIN** field appears and is pre-filled with the backfilled PIN (the value formerly in Company PIN, e.g. `0000`)
3. Click **Save Device** without changing anything → "Device Saved" toast

- [ ] **Step 3: Verify in browser — change**

1. Edit the same device, change Door PIN to `5678`, save
2. Re-open Edit on the same device → field shows `5678`
3. In Tinker: `php artisan tinker --execute="echo \App\Models\Device::find(<ID>)->door_pin;"` → prints `5678`

- [ ] **Step 4: Verify in browser — validation on edit**

1. Edit a device, clear the Door PIN field, save → expect error toast "Door PIN is required" (or similar).

---

## Task 7: Pass `device_id` through the unlock flow

**Files:**
- Modify: `frontend-new/src/components/Device/UnlockDoor.js`

- [ ] **Step 1: Update `handleSubmit` in `PinEntryModal`**

In `frontend-new/src/components/Device/UnlockDoor.js`, find the `handleSubmit` function (around lines 26–46). The `device_id` prop is already destructured at line 8. Change the `checkPin` call from:

```js
let { status } = await checkPin({ pin: pin.join('') });
```

to:

```js
let { status } = await checkPin({ device_id, pin: pin.join('') });
```

No other lines in this file change.

- [ ] **Step 2: Verify Device A with Device A's PIN succeeds**

In browser:
1. Devices page → click **Open Door** icon on a device whose PIN you know (e.g. **Head OFFICE / test1111** with PIN `5678` from Task 6)
2. Enter `5678` on the keypad → click **UNLOCK DOOR**
3. Expected: PIN modal closes, success toast appears with the door open response message

- [ ] **Step 3: Verify Device A with another device's PIN fails**

1. Set device **KODAI**'s door_pin to `9999` via Edit (so we know two devices have different PINs)
2. Click **Open Door** on **Head OFFICE** (PIN `5678`)
3. Enter `9999` → click **UNLOCK DOOR**
4. Expected: error toast "Invalid Pin", PIN field clears, modal stays open

- [ ] **Step 4: Verify the inverse**

1. Click **Open Door** on **KODAI**, enter `9999` → succeeds
2. Click **Open Door** on **KODAI**, enter `5678` → "Invalid Pin"

---

## Task 8: Remove Door Pin tab from Company Profile

**Files:**
- Modify: `frontend-new/src/app/company/page.js`
- Modify: `frontend-new/src/lib/api.js`
- Delete: `frontend-new/src/components/Company/DoorPin.js`

- [ ] **Step 1: Remove the import in `company/page.js`**

In `frontend-new/src/app/company/page.js`, delete line 26:

```js
import DoorPin from "@/components/Company/DoorPin";
```

- [ ] **Step 2: Remove the `pin` state and the `setPin(result.pin)` setter**

In the same file:
- Delete line 40: `const [pin, setPin] = useState(null);`
- Delete the line `setPin(result.pin);` inside `fetchData` (around line 88).

(The fetched `result.pin` is now ignored — the company-wide PIN no longer drives any UI.)

- [ ] **Step 3: Remove the Door Pin tab entry**

In the same file's `tabs` array (around line 142–149), delete this line:

```js
{ id: 'tab-pin', label: 'Door Pin' },
```

- [ ] **Step 4: Remove the tab content render**

In the same file (around line 202), delete this line:

```jsx
{activeTab === 'tab-pin' && <DoorPin pin={pin} isLoading={isLoading} />}
```

- [ ] **Step 5: Delete `setPin` from the API client**

In `frontend-new/src/lib/api.js`, delete the `setPin` export (around lines 260–263):

```js
export const setPin = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/set-pin`, { ...payload, company_id: user?.company_id || 0 });
};
```

Then verify nothing else imports it:

Use Grep to search for `from "@/lib/api"` import lines that include `setPin` across `frontend-new/src/`:
- Pattern: `setPin.*from .@/lib/api|@/lib/api.*setPin`
- Path: `frontend-new/src`

Expected: the only match is inside `frontend-new/src/components/Company/DoorPin.js`, which is being deleted in Step 6. Any *other* file matching means there's a second consumer the spec did not anticipate — stop and report it.

(Note: `setPin` will still appear as a React `useState` setter name in the code; that's a different identifier and unrelated to the api export. The grep above is scoped to imports specifically.)

- [ ] **Step 6: Delete the DoorPin component file**

Delete the file `frontend-new/src/components/Company/DoorPin.js` (use the OS file delete or `rm` from a normal terminal — do NOT git-delete it; the user manages git).

- [ ] **Step 7: Verify in browser**

1. Reload the running frontend (`npm run dev` should hot-reload, but a hard refresh helps if state is sticky)
2. Navigate to **Settings → Company Profile**
3. Confirm the tab strip shows: **General Information | Branch Management | Working Schedule | Documents | Password** — no **Door Pin**
4. Click each remaining tab → all render without console errors
5. Open browser DevTools → Console tab → confirm no "Module not found" or "Cannot read pin of null" errors

---

## Task 9: End-to-end smoke test

**Files:** none (manual verification only)

- [ ] **Step 1: Walk the spec's 8-step manual checklist**

Run through every item in the spec's "Testing (manual, browser-based)" section:

1. Migration — done in Task 1 Step 3.
2. Edit existing device pre-fills with backfilled PIN — done in Task 6 Step 2.
3. Add device without PIN → validation error — done in Task 5 Step 4.
4. Add device with `12ab` → only `12` remains in the field (frontend strips non-digits before submit), and submit fails validation because `digits:4` requires 4 — verify by trying it now.
5. Add device with `1234` → succeeds — done in Task 5 Step 3.
6. Open Door A with A's PIN succeeds — done in Task 7 Step 2.
7. Open Door A with B's PIN fails — done in Task 7 Step 3.
8. Door Pin tab gone from Company Profile — done in Task 8 Step 7.

If any item fails, fix it before signing off.

- [ ] **Step 2: Verify rollback path works**

From `d:/newmytime2cloud/backend`:

```bash
php artisan migrate:rollback --step=1
```

Expected: migration `2026_04_21_000002_add_door_pin_to_devices_table` rolls back; `door_pin` column is dropped from `devices`. After confirming, re-apply:

```bash
php artisan migrate
```

Then re-run Task 1 Step 3 to confirm the column is back and backfill ran again. (The backfill query uses `WHERE d.door_pin IS NULL`, so it's safe to re-run.)

- [ ] **Step 3: Hand off to user for git commit**

Per the project memory, do not commit. Tell the user: **"Implementation complete; all manual checks pass. Ready for you to commit and push."**

---

## Out of scope (do NOT do as part of this plan)

- Dropping the `companies.pin` column. Other systems on the shared DB may still read it.
- Hashing PINs at rest.
- Throttling/lockout on failed PIN entry.
- Adding any unit/integration tests — this codebase doesn't have a test harness for these surfaces.
