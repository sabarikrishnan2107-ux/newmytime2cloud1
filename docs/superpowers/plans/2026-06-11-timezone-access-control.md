# Timezone Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the per-employee, per-device timezone access-control suite (define timezones, assign individually, mapping list) into the new app's Access Control section, wired to the existing backend so the device denies entry outside the assigned window.

**Architecture:** Frontend-heavy build against a mature, already-routed Laravel backend. Three new Next.js pages under `/access_control/*` + a weekly-grid modal + a per-employee assign modal, reusing `@/components/ui/*` primitives and `buildQueryParams`. One small backend consolidation so a per-employee assignment both resets the old time-group and pushes the new one to devices, plus a one-click "sync definitions to all devices" path.

**Tech Stack:** Next.js (App Router, JS), TailwindCSS, axios, react-i18next; Laravel 9 + PHPUnit (Http::fake for SDK). No frontend test runner — frontend tasks are verified by running the app (`npm run dev` on port 3001) and screenshots, per project workflow.

**Project rules baked in:**
- **Claude never commits/pushes.** Every "Checkpoint" step = stop, show a diff summary, let the user review and commit.
- **HTML prototype first** for each screen → confirm via screenshots → then React.
- Shared production DB: existing live `timezones` / `timezone_employees` rows will appear; read/write the same shapes.
- Device online state is judged by `last_live_datetime`/`synced`/`status_id`, never `ip`/`port`.

---

## File Structure

**Create (frontend):**
- `frontend-new/public/proto/timezones.html` — prototype: list + grid modal
- `frontend-new/public/proto/timezone-employees.html` — prototype: list + assign modal
- `frontend-new/public/proto/mapping-list.html` — prototype: mapping list
- `frontend-new/src/app/access_control/timezones/page.js`
- `frontend-new/src/app/access_control/timezone-employees/page.js`
- `frontend-new/src/app/access_control/mapping-list/page.js`
- `frontend-new/src/components/AccessControl/Timezone/TimezoneGridModal.jsx`
- `frontend-new/src/components/AccessControl/Timezone/TimezoneList.jsx`
- `frontend-new/src/components/AccessControl/Timezone/TimezoneEmployeesTable.jsx`
- `frontend-new/src/components/AccessControl/Timezone/AssignTimezoneModal.jsx`
- `frontend-new/src/components/AccessControl/Timezone/MappingList.jsx`
- `frontend-new/src/lib/timezoneSlots.js` — pure serialization helpers (grid ⇄ backend)

**Modify (frontend):**
- `frontend-new/src/lib/api.js` — add timezone API functions
- `frontend-new/src/lib/menuData.js` — extend `accessControlMenu` + `leftNavLinks`
- `frontend-new/src/i18n/*` (locale files) — `accessControl.timezone.*` keys EN/AR/FR/HI

**Modify (backend):**
- `backend/app/Http/Controllers/TimezoneEmployeesController.php` — consolidate `timezonesDeviceEmployeesUpdate`
- `backend/app/Http/Controllers/SDKController.php` — add `syncTimeGroupAllDevices`
- `backend/routes/sdk.php` (or `timezone.php`) — route for sync-all
- `backend/tests/Feature/TimezoneAssignmentSyncTest.php` — new
- `backend/tests/Feature/TimezoneSyncAllDevicesTest.php` — new

---

## Phase 0 — HTML Prototypes (screenshot-verified)

> These are throwaway static mockups in `public/proto/` so the user can confirm layout before React. They are served at `http://localhost:3001/proto/<name>.html`. No data wiring — hard-coded sample rows that mirror the screenshots.

### Task 1: Prototype — Timezones list + weekly grid modal

**Files:**
- Create: `frontend-new/public/proto/timezones.html`

- [ ] **Step 1: Build the prototype HTML**

Create `frontend-new/public/proto/timezones.html` with TailwindCDN. It must contain:
- A header row: title "Timezones List", a reload icon, a "Sync timezones to all devices" pill button, and a round "+" button.
- A table with columns `# · TimeZone Name · Description · Timezone #Id on Device · Employees Count · Created · Actions` and 4 sample rows (Full Access / No Access / Office Hours / Night Shift).
- A hidden modal (toggled by "+") reproducing the weekly grid: violet header "Timezone", `Timezone Name` + `Timezone Description` inputs, a SUBMIT button, then a table with a left day column (Mon→Sun), 48 half-hour column headers (00:00…23:30), clickable cells, and a per-day orange gear button on the right.

Use this as the file body:

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Timezones · proto</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-100 p-8 text-slate-700">
  <div class="bg-white rounded-xl shadow p-6">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-xl font-bold">Timezones List</h1>
      <div class="flex items-center gap-3">
        <button class="px-4 py-2 rounded-full bg-violet-600 text-white text-xs font-bold uppercase tracking-wider">Sync timezones to all devices</button>
        <button onclick="document.getElementById('m').classList.remove('hidden')" class="size-9 rounded-full bg-slate-900 text-white text-lg leading-none">+</button>
      </div>
    </div>
    <table class="w-full text-sm">
      <thead><tr class="text-left text-xs uppercase tracking-wider text-slate-500 border-b">
        <th class="py-3">#</th><th>TimeZone Name</th><th>Description</th><th>Timezone #Id on Device</th><th>Employees Count</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody class="divide-y">
        <tr><td class="py-3">1</td><td class="font-semibold text-violet-700">Full Access</td><td>24/7 Access to Device</td><td>1</td><td>5</td><td>29-Jan-25</td><td>⋮</td></tr>
        <tr><td class="py-3">2</td><td class="font-semibold text-violet-700">No Access</td><td>No access to Device</td><td>2</td><td>1</td><td>29-Jan-25</td><td>⋮</td></tr>
        <tr><td class="py-3">3</td><td class="font-semibold text-violet-700">Office Hours</td><td>Mon-Fri 9 to 5</td><td>3</td><td>4</td><td>29-Jan-25</td><td>⋮</td></tr>
        <tr><td class="py-3">4</td><td class="font-semibold text-violet-700">Night Shift</td><td>10pm-6am</td><td>4</td><td>8</td><td>29-Jan-25</td><td>⋮</td></tr>
      </tbody>
    </table>
  </div>

  <div id="m" class="hidden fixed inset-0 bg-black/60 flex items-start justify-center p-6 overflow-auto">
    <div class="bg-white rounded-xl w-full max-w-[1400px] shadow-2xl">
      <div class="bg-violet-600 text-white px-6 py-3 rounded-t-xl flex justify-between items-center">
        <h2 class="font-bold">Timezone</h2>
        <button onclick="document.getElementById('m').classList.add('hidden')" class="size-7 rounded-full bg-white/20">✕</button>
      </div>
      <div class="p-6">
        <div class="flex gap-4 items-center mb-6">
          <input placeholder="Timezone Name" class="flex-1 border rounded px-3 py-2"/>
          <input placeholder="Timezone Description" class="flex-1 border rounded px-3 py-2"/>
          <button class="px-5 py-2 rounded bg-violet-600 text-white text-xs font-bold uppercase">Submit</button>
        </div>
        <div class="overflow-x-auto border rounded">
          <table class="w-full text-[9px]"><thead><tr class="bg-slate-50">
            <th class="p-2 min-w-[110px]"></th><script>for(let i=0;i<48;i++){const h=String(Math.floor(i/2)).padStart(2,'0');const m=i%2?'30':'00';document.write('<th class="p-1">'+h+':'+m+'</th>')}</script><th class="min-w-[40px]"></th></tr></thead>
            <tbody id="grid"></tbody></table>
        </div>
      </div>
    </div>
  </div>
  <script>
    const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const g=document.getElementById('grid');
    days.forEach(d=>{let row='<tr class="border-t"><td class="p-2 text-xs font-bold">'+d+'</td>';
      for(let i=0;i<48;i++){row+='<td class="h-6 bg-slate-100 hover:bg-violet-300 cursor-pointer border-l" onclick="this.classList.toggle(\'bg-violet-500\');this.classList.toggle(\'bg-slate-100\')"></td>'}
      row+='<td class="p-1 text-center"><span class="inline-block size-6 rounded-full bg-orange-500/20 text-orange-600 leading-6">⚙</span></td></tr>';
      g.insertAdjacentHTML('beforeend',row)});
  </script>
</body></html>
```

- [ ] **Step 2: Serve and screenshot**

Run: `cd frontend-new && npm run dev` (if not already running). Open `http://localhost:3001/proto/timezones.html`, click "+", screenshot the list and the grid modal.
Expected: list matches the "Timezones List" screenshot; modal matches the "Timezone" grid screenshot (violet header, Mon→Sun rows, 48 columns, orange gear per day).

- [ ] **Step 3: Checkpoint** — Share screenshots with the user. Get a thumbs-up or revise. (No commit; prototypes are throwaway.)

### Task 2: Prototype — Timezone Employees list + Assign modal

**Files:**
- Create: `frontend-new/public/proto/timezone-employees.html`

- [ ] **Step 1: Build the prototype HTML**

Create `frontend-new/public/proto/timezone-employees.html` with:
- Header "Timezone Employees List", a search box "Search (min 3)", a "Timezone" filter dropdown, and a "+" button.
- Table columns `Name · Emp Id/Device Id · Branch · Department · Mobile Number · Timezones · Actions` with ~6 sample employee rows; the Timezones cell shows a badge "Default Full Access" for most and "Office Hours" for one.
- A hidden modal "Update Timezone Mapping(s)" with a numbered list of device rows; each row has a disabled `Device Name` input and a `Timezone Name` dropdown (Full Access / No Access / Office Hours), plus a small clock icon.

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Timezone Employees · proto</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-100 p-8 text-slate-700">
  <div class="bg-white rounded-xl shadow p-6">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-xl font-bold">Timezone Employees List</h1>
      <div class="flex items-center gap-3">
        <input placeholder="Search (min 3)" class="border rounded-full px-4 py-2 text-sm"/>
        <select class="border rounded px-3 py-2 text-sm"><option>All Timezones</option><option>Office Hours</option></select>
        <button onclick="document.getElementById('m').classList.remove('hidden')" class="size-9 rounded-full bg-slate-900 text-white text-lg">+</button>
      </div>
    </div>
    <table class="w-full text-sm"><thead><tr class="text-left text-xs uppercase tracking-wider text-slate-500 border-b">
      <th class="py-3">Name</th><th>Emp Id/Device Id</th><th>Branch</th><th>Department</th><th>Mobile Number</th><th>Timezones</th><th>Actions</th></tr></thead>
      <tbody class="divide-y" id="rows"></tbody></table>
  </div>
  <div id="m" class="hidden fixed inset-0 bg-black/60 flex items-start justify-center p-6 overflow-auto">
    <div class="bg-white rounded-xl w-full max-w-[640px] shadow-2xl">
      <div class="bg-violet-600 text-white px-6 py-3 rounded-t-xl flex justify-between items-center">
        <h2 class="font-bold">Update Timezone Mapping(s)</h2>
        <button onclick="document.getElementById('m').classList.add('hidden')" class="size-7 rounded-full bg-white/20">✕</button>
      </div>
      <div class="p-6 space-y-3 max-h-[70vh] overflow-auto" id="devrows"></div>
      <div class="px-6 py-3 border-t flex justify-end gap-2">
        <button onclick="document.getElementById('m').classList.add('hidden')" class="px-4 py-2 rounded border text-violet-600 text-xs font-bold uppercase">Cancel</button>
        <button class="px-4 py-2 rounded bg-violet-600 text-white text-xs font-bold uppercase">Save</button>
      </div>
    </div>
  </div>
  <script>
    const emps=[['Kumar saravanan','114 / 114','Bur Dubai','Accounts','971521141001','Default Full Access'],
      ['Raghu ravichandran','2301 / 9566','Bur Dubai','Sales','9566972301','Office Hours'],
      ['Shahana Shihab','123 / 456','Bur Dubai','It Dep','0588989998','Default Full Access'],
      ['Mohan Nagarathinam','1122 / 1122','Bur Dubai','It Dep','971528850984','Default Full Access']];
    document.getElementById('rows').innerHTML=emps.map(e=>`<tr><td class="py-3 font-semibold">${e[0]}</td><td>${e[1]}</td><td>${e[2]}</td><td>${e[3]}</td><td>${e[4]}</td><td><span class="px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs">${e[5]}</span></td><td>⋮</td></tr>`).join('');
    const devs=['Main Door','OX-900 Ground Floor','First Floor N','Office1'];
    document.getElementById('devrows').innerHTML=devs.map((d,i)=>`<div class="flex items-center gap-3"><span class="w-5 text-slate-400">${i+1}</span><input disabled value="${d}" class="flex-1 border rounded px-3 py-2 bg-slate-50 text-sm"/><select class="flex-1 border rounded px-3 py-2 text-sm"><option>Full Access</option><option>No Access</option><option>Office Hours</option></select><span class="text-green-600">🕐</span></div>`).join('');
  </script>
</body></html>
```

- [ ] **Step 2: Serve and screenshot** — Open `http://localhost:3001/proto/timezone-employees.html`, click "+", screenshot list + assign modal.
Expected: matches the "Timezone Employees List" + "Update Timezone Mapping(s)" screenshots.

- [ ] **Step 3: Checkpoint** — Share with user, revise if needed.

### Task 3: Prototype — Mapping List

**Files:**
- Create: `frontend-new/public/proto/mapping-list.html`

- [ ] **Step 1: Build the prototype HTML**

Create `frontend-new/public/proto/mapping-list.html` with a header "Mapping List" + "+" button, and a table `# · Timezone · Devices · Employees · Branch · Created · Actions` with 3 sample rows. Reuse the same TailwindCDN shell as Task 1 (list only, no grid). Keep it short — a single static table is enough for layout sign-off.

- [ ] **Step 2: Serve and screenshot** — Open `http://localhost:3001/proto/mapping-list.html`, screenshot.

- [ ] **Step 3: Checkpoint** — Share with user; once all three prototypes are approved, proceed to backend.

---

## Phase 1 — Backend consolidation (TDD with Http::fake)

> Run backend tests with: `cd backend && php artisan test --filter <ClassName>`. Tests use `RefreshDatabase` against the configured test DB; `Http::fake()` intercepts SDK calls so no real device is needed. `QUEUE_CONNECTION=sync` (phpunit.xml) means `TimezonePhotoUploadJob::dispatch` runs inline, so faked HTTP is hit even through the job path.

### Task 4: Failing test — per-employee assign resets old + pushes new + processes all employees

**Files:**
- Create: `backend/tests/Feature/TimezoneAssignmentSyncTest.php`
- Modify (next task): `backend/app/Http/Controllers/TimezoneEmployeesController.php:153-241`

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\Employee;
use App\Models\Timezone;
use App\Models\TimezoneEmployees;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TimezoneAssignmentSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_assign_resets_old_group_and_pushes_new_for_each_employee(): void
    {
        Http::fake(['*' => Http::response(['status' => 200, 'data' => []], 200)]);

        $companyId = 1;
        $device = Device::factory()->create(['company_id' => $companyId, 'device_id' => 'DEV-A']);
        $tzOffice = Timezone::factory()->create(['company_id' => $companyId, 'timezone_id' => 5, 'timezone_name' => 'Office Hours']);
        $emp1 = Employee::factory()->create(['company_id' => $companyId, 'system_user_id' => 'U1', 'display_name' => 'One']);
        $emp2 = Employee::factory()->create(['company_id' => $companyId, 'system_user_id' => 'U2', 'display_name' => 'Two']);

        // Pre-existing mapping (Full Access on the device) that must be reset.
        TimezoneEmployees::create([
            'company_id' => $companyId, 'device_table_id' => $device->id,
            'timezone_table_id' => 1, 'employee_table_id' => $emp1->id, 'device_timezone_id' => 1,
        ]);

        $payload = [
            'company_id' => $companyId,
            'employee_ids' => [$emp1->id, $emp2->id],
            'mappings' => [[
                'id' => $device->id,
                'serial_number' => 'DEV-A',
                'timezone_table_id' => $tzOffice->id,
                'device_timezone_id' => 5,
            ]],
        ];

        $res = $this->postJson('/api/timezones_device_employees_update', $payload);
        $res->assertOk();

        // Both employees got a row for the device with the new group.
        $this->assertDatabaseHas('timezone_employees', [
            'employee_table_id' => $emp1->id, 'device_table_id' => $device->id, 'device_timezone_id' => 5,
        ]);
        $this->assertDatabaseHas('timezone_employees', [
            'employee_table_id' => $emp2->id, 'device_table_id' => $device->id, 'device_timezone_id' => 5,
        ]);

        // The new timeGroup=5 was pushed for both users, and a reset (timeGroup=1) happened for emp1.
        $pushedFive = 0; $resetOne = 0;
        foreach (Http::recorded() as [$request]) {
            $body = json_decode($request->body(), true);
            foreach ($body['personList'] ?? [] as $p) {
                if (($p['timeGroup'] ?? null) === 5) $pushedFive++;
                if (($p['timeGroup'] ?? null) === 1) $resetOne++;
            }
        }
        $this->assertGreaterThanOrEqual(2, $pushedFive, 'new timeGroup must be pushed for both employees');
        $this->assertGreaterThanOrEqual(1, $resetOne, 'old group must be reset to Full Access');
    }
}
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd backend && php artisan test --filter TimezoneAssignmentSyncTest`
Expected: FAIL — current `timezonesDeviceEmployeesUpdate` returns inside the loop (only emp1 processed) and never pushes timeGroup=1 reset; emp2 assertions fail.

> If `Device::factory()` / `Employee::factory()` / `Timezone::factory()` don't exist, create minimal factories first (see Step 2a). Check with: `ls backend/database/factories | grep -iE "Device|Employee|Timezone"`.

- [ ] **Step 2a (only if factories missing): add minimal factories**

Create `backend/database/factories/TimezoneFactory.php`:

```php
<?php
namespace Database\Factories;
use App\Models\Timezone;
use Illuminate\Database\Eloquent\Factories\Factory;
class TimezoneFactory extends Factory
{
    protected $model = Timezone::class;
    public function definition(): array
    {
        return [
            'company_id' => 1,
            'timezone_id' => $this->faker->unique()->numberBetween(2, 63),
            'timezone_name' => $this->faker->unique()->word(),
            'interval' => [], 'scheduled_days' => [], 'json' => [],
            'intervals_raw_data' => '[]', 'description' => 'test', 'is_default' => false,
        ];
    }
}
```

Add `use HasFactory;` to `App\Models\Timezone` if absent. Repeat the analogous minimal factory for `Device` (`company_id`, `device_id`, `name`) and reuse the existing `Employee` factory if present; otherwise add one with `company_id`, `system_user_id`, `display_name`, `first_name`, `last_name`, `status`. Re-run Step 2 until it fails for the *right* reason (assertions, not missing factory).

### Task 5: Make it pass — consolidate `timezonesDeviceEmployeesUpdate`

**Files:**
- Modify: `backend/app/Http/Controllers/TimezoneEmployeesController.php:153-241`

- [ ] **Step 1: Replace the method body**

Replace the entire `timezonesDeviceEmployeesUpdate` method (currently lines 153-241) with:

```php
    public function timezonesDeviceEmployeesUpdate(Request $request)
    {
        $data = $request->all();
        $sdk = new SDKController();
        $results = [];

        foreach ($data["employee_ids"] as $item) {

            $employee = Employee::where("company_id", $request->company_id)
                ->where("id", $item)->first();
            if (!$employee) {
                continue;
            }

            // (a) Reset this employee's existing device groups back to Full Access on-device.
            $previous = TimezoneEmployees::with(["device"])
                ->where("company_id", $request->company_id)
                ->where("employee_table_id", $item)
                ->get();

            foreach ($previous as $old) {
                if (!$old->device) {
                    continue;
                }
                $sdk->processSDKTimeZoneONEJSONData(null, [
                    'personList' => [[
                        'name' => $employee["display_name"],
                        'userCode' => $employee["system_user_id"],
                        'timeGroup' => 1, // Full Access
                    ]],
                    'snList' => [$old->device["device_id"]],
                ]);
            }

            // (b) Clear DB rows, then (c) write new rows and (d) push the new groups.
            TimezoneEmployees::where("company_id", $request->company_id)
                ->where("employee_table_id", $item)
                ->delete();

            foreach ($data["mappings"] as $timezone) {
                $deviceTableId = $timezone["id"] ?? '';
                $timezoneTableId = $timezone["timezone_table_id"] ?? '';
                if ($deviceTableId === '' || $timezoneTableId === '') {
                    continue;
                }
                $deviceTimezoneId = $timezone["device_timezone_id"] ?? 1;

                $results[] = TimezoneEmployees::create([
                    "device_table_id" => $deviceTableId,
                    "company_id" => $request->company_id,
                    "timezone_table_id" => $timezoneTableId,
                    "employee_table_id" => $item,
                    "device_timezone_id" => $deviceTimezoneId,
                ]);

                if (!empty($timezone["serial_number"])) {
                    $sdk->processSDKTimeZoneONEJSONData(null, [
                        'personList' => [[
                            'name' => $employee["display_name"],
                            'userCode' => $employee["system_user_id"],
                            'timeGroup' => $deviceTimezoneId,
                        ]],
                        'snList' => [$timezone["serial_number"]],
                    ]);
                }
            }

            // Keep the convenience column on the employee in sync (first mapping's group).
            $firstGroup = $data["mappings"][0]["device_timezone_id"] ?? 1;
            $employee->update(['timezone_id' => $firstGroup]);
        }

        return $this->response("Successfully Updated", $results, true); // outside the loop
    }
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `cd backend && php artisan test --filter TimezoneAssignmentSyncTest`
Expected: PASS.

- [ ] **Step 3: Checkpoint** — Show the diff; user reviews & commits.

### Task 6: Sync-all-devices endpoint (push timezone *definitions*)

**Files:**
- Modify: `backend/app/Http/Controllers/SDKController.php` (add method near `processTimeGroup`, line 63)
- Modify: `backend/routes/timezone.php`
- Create: `backend/tests/Feature/TimezoneSyncAllDevicesTest.php`

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Device;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TimezoneSyncAllDevicesTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_all_pushes_definitions_to_each_access_device(): void
    {
        Http::fake(['*WriteTimeGroup' => Http::response(['status' => 200], 200)]);
        $companyId = 1;
        Device::factory()->create(['company_id' => $companyId, 'device_id' => 'DEV-A']);
        Device::factory()->create(['company_id' => $companyId, 'device_id' => 'DEV-B']);

        $res = $this->postJson('/api/sync_timezones_all_devices', ['company_id' => $companyId]);
        $res->assertOk();

        $hits = collect(Http::recorded())->filter(
            fn ($pair) => str_contains($pair[0]->url(), 'WriteTimeGroup')
        );
        $this->assertCount(2, $hits, 'one WriteTimeGroup call per device');
        $res->assertJsonStructure(['data' => [['device_id', 'ok']]]);
    }
}
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd backend && php artisan test --filter TimezoneSyncAllDevicesTest`
Expected: FAIL — route `sync_timezones_all_devices` does not exist (404).

- [ ] **Step 3: Add the controller method**

In `backend/app/Http/Controllers/SDKController.php`, add after `processTimeGroup` (after line 113):

```php
    public function syncTimeGroupAllDevices(Request $request)
    {
        $devices = Device::where('company_id', $request->company_id)
            ->excludeMobile()
            ->get(['device_id']);

        $results = [];
        foreach ($devices as $device) {
            $req = new Request(['company_id' => $request->company_id]);
            try {
                $this->processTimeGroup($req, $device->device_id);
                $results[] = ['device_id' => $device->device_id, 'ok' => true];
            } catch (\Throwable $e) {
                $results[] = ['device_id' => $device->device_id, 'ok' => false, 'error' => $e->getMessage()];
            }
        }

        return $this->response('Timezone definitions synced', $results, true);
    }
```

> `excludeMobile()` is an existing scope on `App\Models\Device` (confirmed at `Device.php:44`). If a stricter "access devices only" filter is wanted later, swap in `excludeOtherDevices()` too.

- [ ] **Step 4: Add the route**

In `backend/routes/timezone.php`, add:

```php
Route::post('sync_timezones_all_devices', [\App\Http\Controllers\SDKController::class, 'syncTimeGroupAllDevices']);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && php artisan test --filter TimezoneSyncAllDevicesTest`
Expected: PASS.

- [ ] **Step 6: Checkpoint** — Show diff; user reviews & commits.

---

## Phase 2 — Frontend implementation

### Task 7: Serialization helpers (grid ⇄ backend)

**Files:**
- Create: `frontend-new/src/lib/timezoneSlots.js`

> The backend `TimezoneController` expects `intervals_raw_data` (JSON string of `"day-slot"` keys, day 0=Mon…6=Sun, slot 0..47), `input_time_slots` (48 `"HH:mm"` labels), `scheduled_days`, and a placeholder `interval` array (server overwrites it). On edit, it returns `intervals_raw_data` to repopulate the grid.

- [ ] **Step 1: Write the helper module**

```js
// Pure helpers converting the weekly grid (Set per day of 30-min slot indices)
// to/from the backend timezone contract. Day order: 0=Mon … 6=Sun.

export const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_CODES = ["M", "T", "W", "TH", "F", "SA", "SU"];

// 48 half-hour labels: "00:00","00:30",…,"23:30"
export const SLOT_LABELS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

// selected: Array(7) of Set<slotIndex> → ["0-12","0-13",...]
export function slotsToRawData(selected) {
  const out = [];
  selected.forEach((set, day) => {
    [...set].sort((a, b) => a - b).forEach((slot) => out.push(`${day}-${slot}`));
  });
  return out;
}

// scheduled_days payload the backend stores.
export function buildScheduledDays(selected) {
  return DAY_CODES.map((day, dayWeek) => ({
    day,
    isScheduled: selected[dayWeek].size > 0,
    dayWeek,
  }));
}

// Build the full create/update payload (minus name/description/company_id).
export function buildTimezonePayload(selected) {
  const raw = slotsToRawData(selected);
  return {
    interval: Array.from({ length: 7 }, () => []), // required array; server overwrites
    intervals_raw_data: JSON.stringify(raw),
    input_time_slots: SLOT_LABELS,
    scheduled_days: buildScheduledDays(selected),
  };
}

// Edit: parse a stored intervals_raw_data (string or array) back to Array(7) of Set.
export function rawDataToSlots(rawData) {
  const selected = Array.from({ length: 7 }, () => new Set());
  let arr = rawData;
  if (typeof arr === "string") {
    try { arr = JSON.parse(arr); } catch { arr = []; }
  }
  (arr || []).forEach((key) => {
    const [day, slot] = String(key).split("-").map(Number);
    if (day >= 0 && day <= 6 && slot >= 0 && slot <= 47) selected[day].add(slot);
  });
  return selected;
}
```

- [ ] **Step 2: Sanity-check in the browser console (no test runner)**

In the running app's devtools console (or a scratch node REPL), verify:
`slotsToRawData([new Set([0,1]), new Set(),new Set(),new Set(),new Set(),new Set(),new Set()])` → `["0-0","0-1"]`, and `rawDataToSlots('["0-0","0-1"]')[0]` is a Set containing 0 and 1.
Expected: round-trips correctly.

- [ ] **Step 3: Checkpoint** — user reviews & commits.

### Task 8: API functions

**Files:**
- Modify: `frontend-new/src/lib/api.js` (append near the other device/timezone calls)

- [ ] **Step 1: Append the timezone API functions**

```js
// ---- Timezone Access Control ----
export const getTimezones = async (params = {}) => {
  const { data } = await axios.get(`${API_BASE}/timezone`, { params: await buildQueryParams(params) });
  return data; // paginated: {data, current_page, total, ...}
};

export const getTimezoneDropdown = async (params = {}) => {
  const { data } = await axios.get(`${API_BASE}/timezone_list`, { params: await buildQueryParams(params) });
  return data; // [{id, timezone_name, timezone_id}] Full/No Access first
};

export const createTimezone = async (payload = {}) => {
  const { data } = await axios.post(`${API_BASE}/timezone`, { ...(await buildQueryParams(payload)) });
  return data;
};

export const updateTimezone = async (id, payload = {}) => {
  const { data } = await axios.put(`${API_BASE}/timezone/${id}`, { ...(await buildQueryParams(payload)) });
  return data;
};

export const deleteTimezone = async (id) => {
  const { data } = await axios.delete(`${API_BASE}/timezone/${id}`, { params: await buildQueryParams() });
  return data;
};

export const seedDefaultTimezones = async () => {
  const { data } = await axios.post(`${API_BASE}/create_default_timezones`, { ...(await buildQueryParams()) });
  return data;
};

export const syncTimezonesAllDevices = async () => {
  const { data } = await axios.post(`${API_BASE}/sync_timezones_all_devices`, { ...(await buildQueryParams()) });
  return data; // {data:[{device_id, ok}], ...}
};

export const getTimezoneEmployees = async (params = {}) => {
  const { data } = await axios.get(`${API_BASE}/employees_with_timezone_count`, { params: await buildQueryParams(params) });
  return data; // paginated employees with timezones_mapped[].{device,timezone}
};

export const saveEmployeeDeviceTimezones = async (payload = {}) => {
  // payload: { employee_ids:[id], mappings:[{id, serial_number, timezone_table_id, device_timezone_id}] }
  const { data } = await axios.post(`${API_BASE}/timezones_device_employees_update`, { ...(await buildQueryParams(payload)) });
  return data;
};

export const getTimezoneMappings = async (params = {}) => {
  const { data } = await axios.get(`${API_BASE}/gettimezonesinfo`, { params: await buildQueryParams(params) });
  return data;
};

export const bulkAssignTimezone = async (payload = {}) => {
  // payload: { timezone_id, timezone_table_id, employee_id:[{id,display_name,system_user_id,...}], device_id:[{id,device_id,name}] }
  const { data } = await axios.post(`${API_BASE}/employee_timezone_mapping`, { ...(await buildQueryParams(payload)) });
  return data;
};
```

> Note: `createTimezone`/`updateTimezone` pass the payload through `buildQueryParams` so `company_id` and branch scope are injected (same pattern as other writes that need company scoping — e.g. `getDevices`). The POST body therefore carries `company_id`. Verify in the network tab that `company_id` is present on the request.

- [ ] **Step 2: Verify wiring** — temporarily call `getTimezoneDropdown()` from a page and confirm it returns Full Access / No Access in devtools network tab.

- [ ] **Step 3: Checkpoint** — user reviews & commits.

### Task 9: Navigation

**Files:**
- Modify: `frontend-new/src/lib/menuData.js:54-57` and `:176-177`

- [ ] **Step 1: Extend `accessControlMenu`**

Replace lines 54-57:

```js
const accessControlMenu = [
  { href: "/access_control", icon: LayoutDashboard, label: "menu.dashboard" },
  { href: "/access_control_logs", icon: History, label: "menu.logs" },
  { href: "/access_control/timezones", icon: Clock, label: "menu.timezones" },
  { href: "/access_control/timezone-employees", icon: UserCheck, label: "menu.timezoneEmployees" },
  { href: "/access_control/mapping-list", icon: Layers, label: "menu.mappingList" },
];
```

(`Clock`, `UserCheck`, `Layers` are already imported at the top of the file.)

- [ ] **Step 2: Map the new routes to the menu**

After line 177 (`"/access_control_logs": accessControlMenu,`) add:

```js
  "/access_control/timezones": accessControlMenu,
  "/access_control/timezone-employees": accessControlMenu,
  "/access_control/mapping-list": accessControlMenu,
```

- [ ] **Step 3: Verify** — once a page exists (Task 10), the left sidebar shows the three new items and highlights the active one.

- [ ] **Step 4: Checkpoint** — user reviews & commits.

### Task 10: Weekly grid modal component

**Files:**
- Create: `frontend-new/src/components/AccessControl/Timezone/TimezoneGridModal.jsx`

> Adapt `frontend-new/src/components/Device/TimeSelection.jsx` (the existing grid). Differences: Mon-first day order, a name + description field with validation, and serialization via `timezoneSlots.js`. It calls `onSubmit(payload)` where payload already includes `timezone_name`, `description`, and the slot fields.

- [ ] **Step 1: Write the component**

```jsx
"use client";
import React, { useState, useMemo, useEffect } from "react";
import { X, Settings } from "lucide-react";
import { notify } from "@/lib/utils";
import { DAY_LABELS, SLOT_LABELS, buildTimezonePayload, rawDataToSlots } from "@/lib/timezoneSlots";

export default function TimezoneGridModal({ open, onClose, initial = null, onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(() => DAY_LABELS.map(() => new Set()));
  const [dragMode, setDragMode] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.timezone_name || "");
    setDescription(initial?.description || "");
    setSelected(initial?.intervals_raw_data ? rawDataToSlots(initial.intervals_raw_data) : DAY_LABELS.map(() => new Set()));
  }, [open, initial]);

  const total = useMemo(() => selected.reduce((s, x) => s + x.size, 0), [selected]);
  if (!open) return null;

  const toggle = (d, s, mode) => setSelected((prev) => {
    const next = prev.map((x) => new Set(x));
    const set = next[d];
    if (mode === "add") set.add(s); else if (mode === "remove") set.delete(s); else set.has(s) ? set.delete(s) : set.add(s);
    return next;
  });
  const setDayRange = (d, fromH, toH) => setSelected((prev) => {
    const next = prev.map((x) => new Set(x));
    for (let i = 0; i < 48; i++) { const h = Math.floor(i / 2); if (h >= fromH && h <= toH) next[d].add(i); }
    return next;
  });

  const submit = async () => {
    if (name.trim().length < 4) { notify("Validation", "Timezone name must be at least 4 characters.", "error"); return; }
    if (total === 0) { notify("Validation", "Select at least one time slot.", "error"); return; }
    setSaving(true);
    try {
      await onSubmit({ timezone_name: name.trim(), description: description.trim(), ...buildTimezonePayload(selected) });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 p-4 overflow-auto"
         onMouseUp={() => setDragMode(null)} onMouseLeave={() => setDragMode(null)}>
      <div className="relative w-full max-w-[1400px] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-3 bg-violet-600 text-white flex items-center justify-between rounded-t-xl">
          <h2 className="text-base font-bold">Timezone</h2>
          <button onClick={onClose} className="size-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25"><X size={16} /></button>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Timezone Name"
                   className="flex-1 min-w-[200px] border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Timezone Description"
                   className="flex-1 min-w-[200px] border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700" />
            <button onClick={submit} disabled={saving}
                    className="px-5 py-2 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50">
              {saving ? "Saving…" : "Submit"}
            </button>
          </div>
          <div className="text-xs text-slate-500 mb-2">{total} slot{total === 1 ? "" : "s"} selected</div>
          <div className="overflow-x-auto select-none border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full">
              <thead><tr className="bg-slate-50 dark:bg-slate-800/60">
                <th className="sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10 p-2 border-r min-w-[110px]"></th>
                {SLOT_LABELS.map((s, i) => (
                  <th key={s} className={`text-[9px] font-semibold p-1 ${i % 2 === 0 ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}`}>{s}</th>
                ))}
                <th className="sticky right-0 bg-slate-50 dark:bg-slate-800/60 z-10 p-2 border-l min-w-[40px]"></th>
              </tr></thead>
              <tbody>
                {DAY_LABELS.map((day, d) => (
                  <tr key={day} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 p-2 border-r text-xs font-bold">{day}</td>
                    {SLOT_LABELS.map((_, s) => {
                      const sel = selected[d].has(s);
                      return (
                        <td key={s}
                            onMouseDown={() => { const m = sel ? "remove" : "add"; setDragMode(m); toggle(d, s, m); }}
                            onMouseEnter={() => { if (dragMode) toggle(d, s, dragMode); }}
                            className={`p-0 h-6 cursor-pointer border-l border-slate-100 dark:border-slate-800 ${sel ? "bg-violet-500 hover:bg-violet-600" : "bg-slate-100 dark:bg-slate-800/40 hover:bg-violet-200"}`}
                            title={`${day} ${SLOT_LABELS[s]}`} />
                      );
                    })}
                    <td className="sticky right-0 bg-white dark:bg-slate-900 z-10 p-2 border-l">
                      <button onClick={() => { const f = Number(prompt("From hour (0-23)", "9")); const t = Number(prompt("To hour (0-23)", "17")); if (!Number.isNaN(f) && !Number.isNaN(t)) setDayRange(d, Math.min(f, t), Math.max(f, t)); }}
                              title="Set hour range"
                              className="size-7 rounded-full bg-orange-500/15 hover:bg-orange-500/30 text-orange-600 flex items-center justify-center"><Settings size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

> The `prompt()` hour-range picker is a placeholder to keep this task self-contained; the polished version reuses the violet sub-modal from `Device/TimeSelection.jsx:248-321`. Port that sub-modal in a follow-up step once the screen is approved.

- [ ] **Step 2: Checkpoint** — user reviews & commits.

### Task 11: Timezones page (list + create/edit/delete + seed + sync)

**Files:**
- Create: `frontend-new/src/app/access_control/timezones/page.js`
- Create: `frontend-new/src/components/AccessControl/Timezone/TimezoneList.jsx`

- [ ] **Step 1: Page wrapper**

`frontend-new/src/app/access_control/timezones/page.js`:

```jsx
"use client";
import TimezoneList from "@/components/AccessControl/Timezone/TimezoneList";
export default function TimezonesPage() {
  return <div className="p-10"><TimezoneList /></div>;
}
```

- [ ] **Step 2: List component**

`frontend-new/src/components/AccessControl/Timezone/TimezoneList.jsx`:

```jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, RadioTower, Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import TimezoneGridModal from "./TimezoneGridModal";
import { getTimezones, createTimezone, updateTimezone, deleteTimezone, seedDefaultTimezones, syncTimezonesAllDevices } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

export default function TimezoneList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimezones({ per_page: 100 });
      let list = Array.isArray(res?.data) ? res.data : [];
      if (list.length === 0) { await seedDefaultTimezones(); const res2 = await getTimezones({ per_page: 100 }); list = res2?.data || []; }
      setRows(list);
    } catch (e) { notify("Error", parseApiError(e), "error"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onSubmit = async (payload) => {
    try {
      if (editing) await updateTimezone(editing.id, { ...payload, timezone_id: editing.timezone_id });
      else await createTimezone(payload);
      notify("Saved", `Timezone ${editing ? "updated" : "created"}.`, "success");
      setEditing(null); load();
    } catch (e) { notify("Error", parseApiError(e), "error"); throw e; }
  };

  const onDelete = async (row) => {
    if (row.is_default) { notify("Not allowed", "Default timezones cannot be deleted.", "error"); return; }
    if (!confirm(`Delete timezone "${row.timezone_name}"?`)) return;
    try { await deleteTimezone(row.id); notify("Deleted", "Timezone deleted.", "success"); load(); }
    catch (e) { notify("Error", parseApiError(e), "error"); }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await syncTimezonesAllDevices();
      const r = res?.data || [];
      const ok = r.filter((d) => d.ok).length;
      notify("Sync complete", `${ok}/${r.length} devices updated.`, ok === r.length ? "success" : "error");
    } catch (e) { notify("Error", parseApiError(e), "error"); } finally { setSyncing(false); }
  };

  const columns = [
    { key: "_n", header: "#", render: (_, ) => null },
    { key: "timezone_name", header: "TimeZone Name", render: (r) => <span className="font-semibold text-violet-700">{r.timezone_name}</span> },
    { key: "description", header: "Description" },
    { key: "timezone_id", header: "Timezone #Id on Device" },
    { key: "employees_count", header: "Employees Count", render: (r) => (r.employees?.length ?? r.employees_count ?? 0) },
    { key: "created_at", header: "Created", render: (r) => (r.created_at ? String(r.created_at).slice(0, 10) : "—") },
    { key: "actions", header: "Actions", render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => { setEditing(r); setModalOpen(true); }} className="text-slate-500 hover:text-violet-600"><Pencil size={16} /></button>
          {!r.is_default && <button onClick={() => onDelete(r)} className="text-slate-500 hover:text-red-600"><Trash2 size={16} /></button>}
        </div>
      ) },
  ];
  // index column needs row position; map it after fetch:
  const dataWithIndex = rows.map((r, i) => ({ ...r, _n: i + 1 }));
  columns[0].render = (r) => r._n;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">Timezones List</h1>
        <div className="flex items-center gap-3">
          <button onClick={load} title="Reload" className="p-2 rounded-lg border"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={onSync} disabled={syncing} className="px-4 py-2 rounded-full bg-violet-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50">
            <RadioTower className="w-4 h-4" />{syncing ? "Syncing…" : "Sync timezones to all devices"}
          </button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="size-9 rounded-full bg-slate-900 text-white flex items-center justify-center"><Plus className="w-5 h-5" /></button>
        </div>
      </div>
      <DataTable columns={columns} data={dataWithIndex} isLoading={loading} emptyMessage="No timezones yet." />
      <TimezoneGridModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSubmit={onSubmit} />
    </div>
  );
}
```

- [ ] **Step 3: Run and screenshot**

Run: app on `http://localhost:3001/access_control/timezones`.
Expected: list loads (seeds Full/No Access if empty); "+" opens the grid; submit creates a timezone and it appears; edit reopens with slots prefilled; "Sync" shows an "X/Y devices updated" toast.

- [ ] **Step 4: Checkpoint** — user reviews & commits.

### Task 12: Timezone Employees page + Assign modal

**Files:**
- Create: `frontend-new/src/app/access_control/timezone-employees/page.js`
- Create: `frontend-new/src/components/AccessControl/Timezone/TimezoneEmployeesTable.jsx`
- Create: `frontend-new/src/components/AccessControl/Timezone/AssignTimezoneModal.jsx`

- [ ] **Step 1: Page wrapper**

`frontend-new/src/app/access_control/timezone-employees/page.js`:

```jsx
"use client";
import TimezoneEmployeesTable from "@/components/AccessControl/Timezone/TimezoneEmployeesTable";
export default function TimezoneEmployeesPage() {
  return <div className="p-10"><TimezoneEmployeesTable /></div>;
}
```

- [ ] **Step 2: Assign modal**

`frontend-new/src/components/AccessControl/Timezone/AssignTimezoneModal.jsx`:

```jsx
"use client";
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getDeviceListNew, getTimezoneDropdown, saveEmployeeDeviceTimezones } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

export default function AssignTimezoneModal({ open, employee, onClose, onSaved }) {
  const [devices, setDevices] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [picks, setPicks] = useState({}); // deviceTableId -> timezone option {id, timezone_id}
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [devs, tzs] = await Promise.all([getDeviceListNew({}), getTimezoneDropdown()]);
        const devList = Array.isArray(devs?.data) ? devs.data : (Array.isArray(devs) ? devs : []);
        setDevices(devList);
        setTimezones(tzs || []);
        // Prefill from employee.timezones_mapped: device_table_id -> device_timezone_id
        const pre = {};
        (employee?.timezones_mapped || []).forEach((m) => {
          const tz = (tzs || []).find((t) => t.timezone_id === m.device_timezone_id);
          if (tz) pre[m.device_table_id] = tz;
        });
        setPicks(pre);
      } catch (e) { notify("Error", parseApiError(e), "error"); }
    })();
  }, [open, employee]);

  if (!open) return null;

  const save = async () => {
    const mappings = devices
      .filter((d) => picks[d.id])
      .map((d) => ({
        id: d.id,
        serial_number: d.device_id,
        timezone_table_id: picks[d.id].id,
        device_timezone_id: picks[d.id].timezone_id,
      }));
    if (mappings.length === 0) { notify("Nothing to save", "Pick a timezone for at least one device.", "error"); return; }
    setSaving(true);
    try {
      await saveEmployeeDeviceTimezones({ employee_ids: [employee.id], mappings });
      notify("Saved", "Timezone mapping updated.", "success");
      onSaved?.(); onClose();
    } catch (e) { notify("Error", parseApiError(e), "error"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 p-6 overflow-auto">
      <div className="w-full max-w-[640px] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-3 bg-violet-600 text-white flex items-center justify-between rounded-t-xl">
          <h2 className="font-bold">Update Timezone Mapping(s){employee?.display_name ? ` · ${employee.display_name}` : ""}</h2>
          <button onClick={onClose} className="size-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-3 max-h-[70vh] overflow-auto">
          {devices.map((d, i) => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="w-5 text-slate-400">{i + 1}</span>
              <input disabled value={d.name || d.device_id} className="flex-1 border rounded px-3 py-2 bg-slate-50 dark:bg-slate-800 text-sm" />
              <select value={picks[d.id]?.id ?? ""} onChange={(e) => {
                  const tz = timezones.find((t) => String(t.id) === e.target.value);
                  setPicks((p) => ({ ...p, [d.id]: tz || undefined }));
                }} className="flex-1 border rounded px-3 py-2 text-sm dark:bg-slate-800">
                <option value="">— No change —</option>
                {timezones.map((t) => <option key={t.id} value={t.id}>{t.timezone_name}</option>)}
              </select>
            </div>
          ))}
          {devices.length === 0 && <div className="text-sm text-slate-500">No devices found.</div>}
        </div>
        <div className="px-6 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border text-violet-600 text-xs font-bold uppercase">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-violet-600 text-white text-xs font-bold uppercase disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
```

> Verify `getDeviceListNew` returns objects with `id`, `device_id`, and `name`. If the `/device-list` shape differs, switch to `getDevices({per_page:200})` (paginated full device records, confirmed to carry `id`/`device_id`/`name`) and read `.data`.

- [ ] **Step 3: Employees table**

`frontend-new/src/components/AccessControl/Timezone/TimezoneEmployeesTable.jsx`:

```jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/lib/Pagination";
import AssignTimezoneModal from "./AssignTimezoneModal";
import { getTimezoneEmployees, getTimezoneDropdown } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

export default function TimezoneEmployeesTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [tzFilter, setTzFilter] = useState("");
  const [timezones, setTimezones] = useState([]);
  const [assignEmp, setAssignEmp] = useState(null);

  useEffect(() => { getTimezoneDropdown().then((d) => setTimezones(d || [])).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimezoneEmployees({
        page, per_page: perPage,
        common_search: search.length >= 3 ? search : null,
        filter_timezone_id: tzFilter || null,
      });
      setRows(res?.data || []); setTotal(res?.total || 0); setPage(res?.current_page || 1);
    } catch (e) { notify("Error", parseApiError(e), "error"); } finally { setLoading(false); }
  }, [page, perPage, search, tzFilter]);
  useEffect(() => { load(); }, [load]);

  const tzBadge = (emp) => {
    const mapped = emp.timezones_mapped || [];
    if (mapped.length === 0) return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">Default Full Access</span>;
    const names = [...new Set(mapped.map((m) => m.timezone?.timezone_name).filter(Boolean))];
    return <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs">{names.join(", ") || "Assigned"}</span>;
  };

  const columns = [
    { key: "display_name", header: "Name", render: (e) => (
        <div><div className="font-semibold">{e.display_name || `${e.first_name || ""} ${e.last_name || ""}`}</div>
        <div className="text-xs text-slate-400">{e.designation?.name || ""}</div></div>) },
    { key: "ids", header: "Emp Id/Device Id", render: (e) => <div><div className="font-semibold">{e.employee_id}</div><div className="text-xs text-slate-400">{e.system_user_id}</div></div> },
    { key: "branch", header: "Branch", render: (e) => e.branch?.branch_name || "—" },
    { key: "department", header: "Department", render: (e) => e.department?.name || "—" },
    { key: "phone_number", header: "Mobile Number" },
    { key: "timezones", header: "Timezones", render: tzBadge },
    { key: "actions", header: "Actions", render: (e) => (
        <button onClick={() => setAssignEmp(e)} className="px-3 py-1.5 rounded-lg border text-violet-600 text-xs font-bold uppercase">Assign</button>) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">Timezone Employees List</h1>
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search (min 3)" className="border rounded-full px-4 py-2 text-sm dark:bg-slate-800" />
          <select value={tzFilter} onChange={(e) => { setTzFilter(e.target.value); setPage(1); }} className="border rounded px-3 py-2 text-sm dark:bg-slate-800">
            <option value="">All Timezones</option>
            {timezones.map((t) => <option key={t.id} value={t.id}>{t.timezone_name}</option>)}
          </select>
          <button onClick={load} className="p-2 rounded-lg border"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>
      <DataTable columns={columns} data={rows} isLoading={loading}
        pagination={<Pagination page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} pageSizeOptions={[10, 25, 50]} />} />
      {assignEmp && <AssignTimezoneModal open={!!assignEmp} employee={assignEmp} onClose={() => setAssignEmp(null)} onSaved={load} />}
    </div>
  );
}
```

> `filter_timezone_id` in `employeesWithTimezoneCount` matches on `timezone_employees.timezone_table_id`, which is the `timezones.id` — so passing the dropdown's `t.id` is correct.

- [ ] **Step 4: Run and screenshot**

Open `http://localhost:3001/access_control/timezone-employees`. Verify the list, "Default Full Access" badges, the timezone filter, and that "Assign" opens the modal with devices + timezone dropdowns and saves (network tab shows `timezones_device_employees_update` with the right `mappings`).

- [ ] **Step 5: Checkpoint** — user reviews & commits.

### Task 13: Mapping List page

**Files:**
- Create: `frontend-new/src/app/access_control/mapping-list/page.js`
- Create: `frontend-new/src/components/AccessControl/Timezone/MappingList.jsx`

- [ ] **Step 1: Page wrapper**

```jsx
"use client";
import MappingList from "@/components/AccessControl/Timezone/MappingList";
export default function MappingListPage() {
  return <div className="p-10"><MappingList /></div>;
}
```

- [ ] **Step 2: Mapping list component**

`frontend-new/src/components/AccessControl/Timezone/MappingList.jsx`:

```jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/lib/Pagination";
import { getTimezoneMappings } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

export default function MappingList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimezoneMappings({ page, per_page: perPage });
      setRows(res?.data || []); setTotal(res?.total || 0); setPage(res?.current_page || 1);
    } catch (e) { notify("Error", parseApiError(e), "error"); } finally { setLoading(false); }
  }, [page, perPage]);
  useEffect(() => { load(); }, [load]);

  const fmtArr = (val, key) => {
    let arr = val; if (typeof arr === "string") { try { arr = JSON.parse(arr); } catch { arr = []; } }
    return (arr || []).map((x) => x[key] || x.name || x.display_name).filter(Boolean).join(", ") || "—";
  };

  const columns = [
    { key: "_n", header: "#", render: (r) => r._n },
    { key: "timezone", header: "Timezone", render: (r) => r.timezone?.timezone_name || "—" },
    { key: "devices", header: "Devices", render: (r) => fmtArr(r.device_id, "name") },
    { key: "employees", header: "Employees", render: (r) => fmtArr(r.employee_id, "display_name") },
    { key: "branch", header: "Branch", render: (r) => r.branch?.branch_name || "—" },
    { key: "created_at", header: "Created", render: (r) => (r.created_at ? String(r.created_at).slice(0, 10) : "—") },
  ];
  const data = rows.map((r, i) => ({ ...r, _n: (page - 1) * perPage + i + 1 }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">Mapping List</h1>
        <button onClick={load} className="p-2 rounded-lg border"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <DataTable columns={columns} data={data} isLoading={loading}
        pagination={<Pagination page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} pageSizeOptions={[10, 25, 50]} />} />
    </div>
  );
}
```

- [ ] **Step 3: Run and screenshot** — open `http://localhost:3001/access_control/mapping-list`, verify existing mappings render (device/employee arrays parsed).

- [ ] **Step 4: Checkpoint** — user reviews & commits.

### Task 14: i18n + permission gating

**Files:**
- Modify: locale files under `frontend-new/src/i18n/` (find with `ls frontend-new/src/i18n` or `grep -rl "menu.dashboard" frontend-new/src`)

- [ ] **Step 1: Locate the locale files and the `menu.*` namespace**

Run: `grep -rln "\"logs\"\|menu" frontend-new/src/i18n 2>/dev/null || grep -rln "menu" frontend-new/src/locales 2>/dev/null`
Identify the EN/AR/FR/HI JSON (or JS) files used by `react-i18next`.

- [ ] **Step 2: Add menu keys** to each locale's `menu` object:

EN:
```json
"timezones": "Timezones",
"timezoneEmployees": "Timezone Employees",
"mappingList": "Mapping List"
```
AR: `"المناطق الزمنية"`, `"موظفو المناطق الزمنية"`, `"قائمة الربط"`
FR: `"Fuseaux horaires"`, `"Employés par fuseau"`, `"Liste des associations"`
HI: `"टाइमज़ोन"`, `"टाइमज़ोन कर्मचारी"`, `"मैपिंग सूची"`

- [ ] **Step 3: Gate the pages by permission**

In each of `TimezoneList.jsx`, `TimezoneEmployeesTable.jsx`, `MappingList.jsx`, mirror the device page's pattern (`Device/Page.js:28-32`): import `getUser` from `@/config` and `can` from `@/lib/permissions-check`, compute `can(user, "access_control", "timezone", "view"|"edit")`, and hide the create/assign/sync buttons when the manager lacks the right (show `<AccessDenied />` from `@/components/ui/AccessDenied` if `view` is false). Confirm the exact module/feature keys against an existing access-control permission usage with `grep -rn "access_control" frontend-new/src/lib frontend-new/src/components`.

- [ ] **Step 4: Run** — switch language, verify the three sidebar labels translate; verify a restricted manager doesn't see create/assign.

- [ ] **Step 5: Checkpoint** — user reviews & commits.

---

## Phase 3 — End-to-end verification

### Task 15: Full-flow verification

- [ ] **Step 1: Define → sync → assign → confirm DB + payloads**

1. Create "Office Hours" (Mon-Fri 09:00–17:00) on `/access_control/timezones`. Confirm it appears with a device `timezone_id` 2-63.
2. Click "Sync timezones to all devices" → toast shows X/Y. Check `backend/storage/logs` / `sdk_timezone_employee_mapping` log for `WriteTimeGroup` payloads.
3. On `/access_control/timezone-employees`, Assign an employee → Main Door → Office Hours → Save. In the network tab confirm `timezones_device_employees_update` body has `mappings:[{id, serial_number, timezone_table_id, device_timezone_id}]`.
4. Confirm a `timezone_employees` row exists (query the DB) and the badge updates to "Office Hours".
5. `/access_control/mapping-list` (if a bulk mapping was made) shows the mapping.

- [ ] **Step 2: Device enforcement (only if a test device is reachable)**

Assign a narrow window (e.g. current time +1h to +2h), show a face now (outside window). Expected: device denies. Widen to include now, retry. Expected: device opens. If no device is reachable, document that DB + SDK-payload verification stands in (the payload is what the device consumes).

- [ ] **Step 3: Remove prototype files**

Run: `rm frontend-new/public/proto/timezones.html frontend-new/public/proto/timezone-employees.html frontend-new/public/proto/mapping-list.html`
(Prototypes were throwaway sign-off artifacts.)

- [ ] **Step 4: Final checkpoint** — Summarize what was built, what was verified (and what couldn't be, e.g. live device), and hand off to the user for the final commit.

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Nav sub-pages → Task 9. ✅
- Screen 1 Timezones + grid + seed + sync → Tasks 10, 11. ✅
- Screen 2 per-employee per-device assign → Task 12. ✅
- Screen 3 Mapping List → Task 13. ✅
- §8 backend consolidation (reset old + push new + loop fix) → Tasks 4, 5. ✅
- §8 sync-all definitions wrapper → Task 6. ✅
- Grid serialization contract (`intervals_raw_data`/`input_time_slots`/`interval` placeholder) → Task 7, used in Task 10. ✅
- HTML-prototype-first workflow → Tasks 1-3. ✅
- i18n EN/AR/FR/HI + permission gating → Task 14. ✅
- Device-offline reporting in sync → Task 6 returns per-device `ok`; surfaced in Task 11 toast. ✅
- Enforcement verification → Task 15. ✅

**Placeholder scan:** The grid hour-range picker uses `prompt()` as a deliberately-marked stopgap with a port-the-sub-modal follow-up note; all other steps contain real code. The i18n file path is discovered in Task 14 Step 1 (the repo's locale location isn't fixed by the spec) rather than guessed.

**Type/name consistency:** API fn names (`getTimezones`, `saveEmployeeDeviceTimezones`, `syncTimezonesAllDevices`, etc.) defined in Task 8 are used verbatim in Tasks 10-13. The assign payload `mappings:[{id, serial_number, timezone_table_id, device_timezone_id}]` matches the backend reads in Task 5. `timezoneSlots.js` exports (`buildTimezonePayload`, `rawDataToSlots`, `SLOT_LABELS`, `DAY_LABELS`) match their imports in Task 10.

**Known risks to watch during execution:**
- `getDeviceListNew` field shape (Task 12 has a fallback to `getDevices`).
- Factory existence for backend tests (Task 4 Step 2a covers it).
- Exact permission module/feature keys (Task 14 Step 3 verifies against existing usage).
- `createTimezone` passing through `buildQueryParams` must keep `interval`/`intervals_raw_data` intact (they're top-level payload keys, not stripped) — verify in network tab (Task 8 Step 2).
