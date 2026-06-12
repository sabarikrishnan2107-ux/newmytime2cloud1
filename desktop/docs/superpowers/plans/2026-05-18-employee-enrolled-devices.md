# Employee Enrolled Devices Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Devices" item to the employee row dropdown that opens a modal listing every device the employee is currently enrolled on, with per-device unenroll.

**Architecture:** New Laravel controller exposes `GET /employees/{id}/enrolled-devices` (loops all company devices, probes each device's SDK for the employee, returns enrolled-only rows) and `DELETE /employees/{id}/enrolled-devices/{deviceId}` (calls per-model delete-person SDK). New React modal opens from the existing employees-list dropdown, renders the screenshot-style table, and supports per-row delete.

**Tech Stack:** Laravel 9 + PHPUnit (backend), Next.js + React + lucide-react + shadcn/ui Dialog (frontend). No frontend test framework — frontend tasks rely on manual verification.

**Project convention:** User handles all git commits and pushes. The plan uses "**Stop — let user commit**" checkpoints in place of `git commit` steps; never run `git add`/`git commit`/`git push` from the implementing agent.

---

## File structure

**Created**
- `backend/app/Http/Controllers/EmployeeDeviceEnrollmentController.php`
- `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`
- `backend/tests/Feature/EmployeeEnrolledDevicesTest.php`

**Modified**
- `backend/app/Http/Controllers/DeviceController.php` — extract the SDK probe block (currently inlined in `getDevicePersonDetails`, lines 211–283) into a public helper `probeDevicePerson(Device $device, $systemUserId)` that returns `null | array`.
- `backend/routes/employee.php` — register the two new routes.
- `frontend-new/src/app/employees/columns.js` — add new dropdown item, extend the factory signature with `showEnrolledDevices`.
- `frontend-new/src/app/employees/page.js` — modal state + handler wiring, render `<EnrolledDevicesModal />`.

---

## Task 1: Extract the SDK probe helper from `DeviceController`

**Why first:** The new controller reuses this logic. Extracting it keeps the existing `getDevicePersonDetails` working and gives us a single function to call from the new controller.

**Files:**
- Modify: `backend/app/Http/Controllers/DeviceController.php` (lines 211–283 and add new helper above it)

- [ ] **Step 1: Read the existing `getDevicePersonDetails` block (DeviceController.php:211–283) to confirm the three model branches (`OX-900`, `MYTIME1`, default → `SDKController`).**

- [ ] **Step 2: Add the new public helper just above `getDevicePersonDetails`.**

Replace the section starting at line 211 (the existing `getDevicePersonDetails` method) by inserting the new helper *before* it. Do not delete `getDevicePersonDetails` — leave it in place for backward compatibility with any existing callers.

```php
/**
 * Probe a single device's SDK for a given employee's enrollment.
 *
 * @return array{available: bool, face: bool, rfid: bool, pin: bool}|null
 *         null = not enrolled or call failed (caller decides how to log)
 */
public function probeDevicePerson(\App\Models\Device $device, $systemUserId): ?array
{
    if (!$systemUserId || $systemUserId <= 0) {
        return null;
    }

    try {
        $sdkResponse = null;

        if ($device->model_number === 'OX-900') {
            $sdkResponse = (new DeviceCameraModel2Controller(
                $device->camera_sdk_url,
                $device->serial_number
            ))->getPersonDetails($systemUserId);
        } elseif ($device->model_number === 'MYTIME1') {
            $resp = (new \App\Http\Controllers\Mqtt\FaceDeviceController())
                ->gatewayRequest(
                    'GET',
                    "api/device/{$device->serial_number}/person/{$systemUserId}",
                    [],
                    ['picture' => 1]
                );
            $resp = $resp instanceof \Illuminate\Http\JsonResponse
                ? $resp->getData(true)
                : $resp;
            if (!empty($resp['info'])) {
                $sdkResponse = $resp;
            }
        } else {
            $generic = (new SDKController())->getPersonDetails($device->device_id, $systemUserId);
            // Treat any non-empty SDK payload as enrolled
            if (is_array($generic) && !empty($generic) && empty($generic['message'])) {
                $sdkResponse = $generic;
            }
        }

        if (!$sdkResponse) {
            return null;
        }

        return [
            'available' => true,
            'face'      => $this->probeHasFace($sdkResponse, $device->model_number),
            'rfid'      => $this->probeHasRfid($sdkResponse, $device->model_number),
            'pin'       => $this->probeHasPin($sdkResponse, $device->model_number),
        ];
    } catch (\Throwable $e) {
        \Log::warning('probeDevicePerson failed', [
            'device_id'      => $device->device_id,
            'system_user_id' => $systemUserId,
            'error'          => $e->getMessage(),
        ]);
        return null;
    }
}

private function probeHasFace(array $resp, ?string $model): bool
{
    if ($model === 'MYTIME1') {
        return !empty($resp['pic']) || !empty($resp['info']['faceTemplate'] ?? null);
    }
    if ($model === 'OX-900') {
        return !empty($resp['faceImage'] ?? null) || !empty($resp['data']['faceImage'] ?? null);
    }
    return !empty($resp['faceImage'] ?? null);
}

private function probeHasRfid(array $resp, ?string $model): bool
{
    if ($model === 'MYTIME1') {
        $card = $resp['info']['cardNo'] ?? null;
        return !empty($card) && $card !== 'FFFFFFFF';
    }
    $card = $resp['cardNumber'] ?? $resp['data']['cardNumber'] ?? null;
    return !empty($card) && $card !== 'FFFFFFFF';
}

private function probeHasPin(array $resp, ?string $model): bool
{
    if ($model === 'MYTIME1') {
        return !empty($resp['info']['password'] ?? null);
    }
    $pwd = $resp['password'] ?? $resp['data']['password'] ?? null;
    return !empty($pwd);
}
```

- [ ] **Step 3: Confirm the file still parses.**

Run from the `backend/` directory:

```bash
php -l app/Http/Controllers/DeviceController.php
```

Expected output: `No syntax errors detected in app/Http/Controllers/DeviceController.php`

- [ ] **Step 4: Stop — let user commit.**

Tell the user: "Task 1 done — `probeDevicePerson` helper extracted in DeviceController. Please review and commit before I continue."

---

## Task 2: Create the `EmployeeDeviceEnrollmentController` with `index` action

**Files:**
- Create: `backend/app/Http/Controllers/EmployeeDeviceEnrollmentController.php`

- [ ] **Step 1: Create the controller file with the `index` method.**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeDeviceEnrollmentController extends Controller
{
    public function index(Request $request, $employeeId): JsonResponse
    {
        $employee = Employee::find($employeeId);
        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        if (empty($employee->system_user_id)) {
            return response()->json(['data' => [], 'errors' => []]);
        }

        $devices = Device::where('company_id', $employee->company_id)->get();

        $deviceController = new DeviceController();
        $data   = [];
        $errors = [];

        foreach ($devices as $device) {
            try {
                $probe = $deviceController->probeDevicePerson($device, $employee->system_user_id);
            } catch (\Throwable $e) {
                $errors[] = [
                    'device_id'   => $device->device_id,
                    'device_name' => $device->name,
                    'message'     => $e->getMessage(),
                ];
                continue;
            }

            if ($probe === null) {
                continue;
            }

            $data[] = [
                'device_id'   => $device->device_id,
                'device_name' => $device->name,
                'location'    => $device->location,
                'available'   => (bool) $probe['available'],
                'face'        => (bool) $probe['face'],
                'rfid'        => (bool) $probe['rfid'],
                'pin'         => (bool) $probe['pin'],
            ];
        }

        return response()->json(['data' => $data, 'errors' => $errors]);
    }
}
```

- [ ] **Step 2: Confirm the file parses.**

```bash
php -l backend/app/Http/Controllers/EmployeeDeviceEnrollmentController.php
```

Expected: `No syntax errors detected ...`

- [ ] **Step 3: Stop — let user commit.**

Tell the user: "Task 2 done — `EmployeeDeviceEnrollmentController` created with `index` method. Please review and commit."

---

## Task 3: Add the `destroy` action for per-device unenroll

**Files:**
- Modify: `backend/app/Http/Controllers/EmployeeDeviceEnrollmentController.php`

- [ ] **Step 1: Append the `destroy` method to the controller class (just before the closing `}`).**

```php
public function destroy(Request $request, $employeeId, $deviceId): JsonResponse
{
    $employee = Employee::find($employeeId);
    if (!$employee) {
        return response()->json(['success' => false, 'message' => 'Employee not found'], 404);
    }
    if (empty($employee->system_user_id)) {
        return response()->json(['success' => false, 'message' => 'Employee has no system_user_id'], 422);
    }

    $device = Device::where('device_id', $deviceId)->first();
    if (!$device || $device->company_id !== $employee->company_id) {
        return response()->json(['success' => false, 'message' => 'Device not found for this employee'], 404);
    }

    try {
        if ($device->model_number === 'MYTIME1') {
            $resp = (new \App\Http\Controllers\Mqtt\FaceDeviceController())
                ->gatewayRequest(
                    'DELETE',
                    "api/device/{$device->serial_number}/person/{$employee->system_user_id}",
                    [],
                    []
                );
            $resp = $resp instanceof \Illuminate\Http\JsonResponse
                ? $resp->getData(true)
                : $resp;
            if (isset($resp['error']) || isset($resp['message'])) {
                return response()->json([
                    'success' => false,
                    'message' => $resp['message'] ?? $resp['error'],
                ], 422);
            }
        } elseif ($device->model_number === 'OX-900') {
            $sdk = new DeviceCameraModel2Controller(
                $device->camera_sdk_url,
                $device->serial_number
            );
            if (!method_exists($sdk, 'deletePerson')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Delete not supported on this device model',
                ], 422);
            }
            $sdk->deletePerson($employee->system_user_id);
        } else {
            $sdk = new SDKController();
            if (!method_exists($sdk, 'deletePerson')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Delete not supported on this device model',
                ], 422);
            }
            $sdk->deletePerson($device->device_id, $employee->system_user_id);
        }
    } catch (\Throwable $e) {
        \Log::warning('EmployeeDeviceEnrollment destroy failed', [
            'employee_id'    => $employeeId,
            'device_id'      => $deviceId,
            'system_user_id' => $employee->system_user_id,
            'error'          => $e->getMessage(),
        ]);
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], 422);
    }

    return response()->json(['success' => true]);
}
```

- [ ] **Step 2: Confirm the file parses.**

```bash
php -l backend/app/Http/Controllers/EmployeeDeviceEnrollmentController.php
```

Expected: `No syntax errors detected ...`

- [ ] **Step 3: Stop — let user commit.**

Tell the user: "Task 3 done — `destroy` added. Please review and commit."

---

## Task 4: Register the routes

**Files:**
- Modify: `backend/routes/employee.php`

- [ ] **Step 1: Add the controller import near the top of the file, alongside the existing imports.**

Open `backend/routes/employee.php`. Below the existing `use App\Http\Controllers\EmployeeControllerNew;` line, add:

```php
use App\Http\Controllers\EmployeeDeviceEnrollmentController;
```

- [ ] **Step 2: Append the two routes at the end of the file (or grouped next to the other employee routes — match the surrounding style).**

```php
Route::get('employees/{employeeId}/enrolled-devices', [EmployeeDeviceEnrollmentController::class, 'index']);
Route::delete('employees/{employeeId}/enrolled-devices/{deviceId}', [EmployeeDeviceEnrollmentController::class, 'destroy']);
```

- [ ] **Step 3: Verify the routes resolve.**

```bash
php artisan route:list --path=employees/
```

Expected: the two new routes appear in the output with method `GET` and `DELETE`, controller `EmployeeDeviceEnrollmentController@index` / `@destroy`.

- [ ] **Step 4: Stop — let user commit.**

Tell the user: "Task 4 done — routes registered. Please review and commit before I move to the feature test."

---

## Task 5: Backend feature test for the route layer

**Files:**
- Create: `backend/tests/Feature/EmployeeEnrolledDevicesTest.php`

This test does not mock device SDKs (the existing `new`-instantiated SDK controllers are not injectable). It exercises the parts that *don't* require a real device: 404 paths, empty-state paths, and route resolution.

- [ ] **Step 1: Create the test file.**

```php
<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeEnrolledDevicesTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_404_for_missing_employee(): void
    {
        $response = $this->getJson('/api/employees/999999/enrolled-devices');
        $response->assertStatus(404)
            ->assertJson(['message' => 'Employee not found']);
    }

    public function test_index_returns_empty_when_employee_has_no_system_user_id(): void
    {
        $company  = Company::factory()->create();
        $employee = Employee::factory()->create([
            'company_id'     => $company->id,
            'system_user_id' => null,
        ]);

        $response = $this->getJson("/api/employees/{$employee->id}/enrolled-devices");
        $response->assertStatus(200)
            ->assertJson(['data' => [], 'errors' => []]);
    }

    public function test_destroy_returns_404_when_employee_missing(): void
    {
        $response = $this->deleteJson('/api/employees/999999/enrolled-devices/AC1234');
        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_destroy_returns_404_when_device_not_in_employee_company(): void
    {
        $company  = Company::factory()->create();
        $employee = Employee::factory()->create([
            'company_id'     => $company->id,
            'system_user_id' => 1234,
        ]);

        // No matching device exists in this company.
        $response = $this->deleteJson("/api/employees/{$employee->id}/enrolled-devices/UNKNOWN_DEVICE");
        $response->assertStatus(404)
            ->assertJson(['success' => false, 'message' => 'Device not found for this employee']);
    }
}
```

- [ ] **Step 2: Run the test from `backend/`.**

```bash
php artisan test --filter=EmployeeEnrolledDevicesTest
```

Expected: all four tests pass. If a test fails because of an `/api` prefix mismatch, check what URL prefix the existing employee routes use (they may be unprefixed in this codebase — adjust the URLs in the test to match `php artisan route:list --path=employees/` output from Task 4).

- [ ] **Step 3: Stop — let user commit.**

Tell the user: "Task 5 done — backend feature tests pass. Please review and commit."

---

## Task 6: Add "Devices" item to the employees row dropdown

**Files:**
- Modify: `frontend-new/src/app/employees/columns.js`

- [ ] **Step 1: Add the `MonitorSmartphone` icon to the lucide-react import block at the top of the file.**

Change the existing import block (lines 2–12) so it includes `MonitorSmartphone`:

```js
import {
  ScanFace,
  QrCode,
  Fingerprint,
  Hand,
  Lock,
  MoreVertical,
  Pencil,
  Printer,
  Trash,
  MonitorSmartphone,
} from "lucide-react";
```

- [ ] **Step 2: Extend the factory signature.**

Change line 21:

```js
export default (deleteEmployee, editEmployee, showHostQr, printCard) => [
```

to:

```js
export default (deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices) => [
```

- [ ] **Step 3: Insert the new dropdown item between Print Card and Delete.**

Locate the existing `Print Card` `<DropdownMenuItem>` (ending around line 169). Immediately after its closing `</DropdownMenuItem>` and before the `Delete` item (around line 171), insert:

```jsx
<DropdownMenuItem
  onClick={(e) => {
    e.stopPropagation();
    if (typeof showEnrolledDevices === "function") showEnrolledDevices(employee);
  }}
  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
>
  <MonitorSmartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  <span className="text-slate-700 dark:text-slate-200 font-medium">Devices</span>
</DropdownMenuItem>
```

- [ ] **Step 4: Stop — let user commit.**

Tell the user: "Task 6 done — dropdown item added. Page won't fully work until Tasks 7 and 8 land (the handler is undefined). Please review and commit."

---

## Task 7: Create the `EnrolledDevicesModal` component

**Files:**
- Create: `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`

This component matches the screenshot layout exactly. It uses the same `Dialog` primitive that the rest of the project uses (`@/components/ui/dialog`). It uses `fetch` (with `AbortController`) — match the existing fetch pattern in `page.js` for consistency (look at how `fetchEmployees` is implemented and reuse the same `api` client / base URL helper if one exists; otherwise plain `fetch` against `/api/employees/{id}/enrolled-devices` is fine).

- [ ] **Step 1: Inspect the existing dialog primitive and fetch helper.**

Run quickly:

```bash
grep -rn "@/components/ui/dialog" frontend-new/src/components/Employees/ | head -5
grep -rn "from \"@/lib/api" frontend-new/src/app/employees/page.js | head -5
```

Note the import paths so the new component uses the same conventions.

- [ ] **Step 2: Create the component file.**

```jsx
"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, MonitorSmartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EM_DASH = "—";

export default function EnrolledDevicesModal({ open, employee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!open || !employee?.id) return;

    const ctrl = new AbortController();
    setLoading(true);
    setRows([]);
    setErrors([]);
    setFetchError(null);

    fetch(`/api/employees/${employee.id}/enrolled-devices`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body) => {
        setRows(body?.data ?? []);
        setErrors(body?.errors ?? []);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setFetchError(err.message || "Failed to load enrolled devices");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [open, employee?.id]);

  const handleDelete = async (row) => {
    if (!confirm(`Remove ${employee?.first_name || "employee"} from ${row.device_name}?`)) {
      return;
    }
    setDeletingId(row.device_id);
    try {
      const res = await fetch(
        `/api/employees/${employee.id}/enrolled-devices/${encodeURIComponent(row.device_id)}`,
        { method: "DELETE", headers: { Accept: "application/json" } }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        alert(body?.message || `Failed (HTTP ${res.status})`);
        return;
      }
      setRows((prev) => prev.filter((r) => r.device_id !== row.device_id));
    } catch (err) {
      alert(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="w-5 h-5 text-indigo-600" />
            Enrolled Devices
            {employee?.first_name && (
              <span className="text-sm font-normal text-slate-500">
                {employee.first_name} {employee.last_name || ""}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
            {errors.length} device{errors.length === 1 ? "" : "s"} skipped due to error.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/40">
              <tr className="text-slate-600 dark:text-slate-200">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">User Id</th>
                <th className="px-3 py-2 text-left">Device Name</th>
                <th className="px-3 py-2 text-left">Employee Data</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-center">Face</th>
                <th className="px-3 py-2 text-center">RFID</th>
                <th className="px-3 py-2 text-center">PIN</th>
                <th className="px-3 py-2 text-center">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    Loading enrolled devices...
                  </td>
                </tr>
              )}
              {!loading && fetchError && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-red-600">
                    {fetchError}
                  </td>
                </tr>
              )}
              {!loading && !fetchError && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    This employee is not enrolled on any device.
                  </td>
                </tr>
              )}
              {!loading && !fetchError && rows.map((row, idx) => {
                const isDeleting = deletingId === row.device_id;
                return (
                  <tr key={row.device_id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{employee?.system_user_id ?? EM_DASH}</td>
                    <td className="px-3 py-2">{row.device_name}</td>
                    <td className="px-3 py-2">
                      {row.available
                        ? <span className="text-[#15803D] font-medium">Available on Device</span>
                        : EM_DASH}
                    </td>
                    <td className="px-3 py-2">{row.location ?? EM_DASH}</td>
                    <td className="px-3 py-2 text-center">
                      {row.face
                        ? <Check className="w-4 h-4 inline-block text-[#15803D]" />
                        : EM_DASH}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.rfid
                        ? <Check className="w-4 h-4 inline-block text-[#15803D]" />
                        : EM_DASH}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.pin
                        ? <Check className="w-4 h-4 inline-block text-[#15803D]" />
                        : EM_DASH}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(row)}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        title="Remove from device"
                      >
                        {isDeleting
                          ? <Loader2 className="w-4 h-4 animate-spin inline-block" />
                          : <X className="w-4 h-4 inline-block" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Adjust the Dialog import path if the grep in Step 1 showed a different convention (e.g. `@/components/ui/Dialog`).**

If the codebase uses a different fetch wrapper (e.g. `@/lib/api`), swap the two `fetch(...)` calls to use it — same URLs, same method.

- [ ] **Step 4: Stop — let user commit.**

Tell the user: "Task 7 done — modal component created. It's not visible yet until Task 8 wires it up. Please review and commit."

---

## Task 8: Wire the modal into the employees page

**Files:**
- Modify: `frontend-new/src/app/employees/page.js`

- [ ] **Step 1: Add the import at the top of the file with the other component imports.**

Find the existing imports for employees-related components (around lines 1–40). Add:

```js
import EnrolledDevicesModal from "@/components/Employees/EnrolledDevicesModal";
```

- [ ] **Step 2: Add the modal state next to `hostQrEmployee`.**

Find the `const [hostQrEmployee, setHostQrEmployee] = useState(null);` line (around line 125) and add directly below it:

```js
const [devicesEmployee, setDevicesEmployee] = useState(null);
```

- [ ] **Step 3: Update the `columns` factory call to pass the handler.**

Find the line that currently reads (around line 416):

```js
columns={Columns(deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp))}
```

Change it to:

```js
columns={Columns(deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee)}
```

- [ ] **Step 4: Render the modal.**

Find where the host-QR modal is rendered (search for `hostQrEmployee` in JSX). Immediately after that JSX block (or anywhere inside the top-level fragment near the other modals), add:

```jsx
<EnrolledDevicesModal
  open={!!devicesEmployee}
  employee={devicesEmployee}
  onClose={() => setDevicesEmployee(null)}
/>
```

- [ ] **Step 5: Start the dev server and verify in the browser.**

Run:

```bash
cd frontend-new
npm run dev
```

Expected: dev server starts on its usual port. Open the employees page in a browser. Confirm:
1. The row dropdown now shows `Edit / Host QR / Print Card / Devices / Delete`.
2. Clicking `Devices` opens the modal with a spinner.
3. The modal renders the expected table layout (or empty-state if the employee has no enrollments).

- [ ] **Step 6: Stop — let user commit.**

Tell the user: "Task 8 done — modal wired up. Please run through the manual verification list in Task 9, then commit when satisfied."

---

## Task 9: Manual verification

No code changes — just a checklist the implementer walks through with a real running stack.

- [ ] **Verify (a):** Open the modal for an employee enrolled on one device. Table shows one row with correct flags (Face / RFID / PIN match what's actually enrolled on that device).

- [ ] **Verify (b):** Open the modal for an employee enrolled on zero devices. Empty-state message shows.

- [ ] **Verify (c):** With a company that has multiple devices and one offline, open the modal. The reachable devices are listed; the amber banner says "1 device skipped due to error".

- [ ] **Verify (d):** Click the red X for a row, confirm the prompt. The row disappears. Close and reopen the modal — the employee no longer appears on that device.

- [ ] **Verify (e):** Click the red X for a device that is offline. An error alert shows the SDK error. The row stays visible.

- [ ] **Verify (f):** Open the modal and close it within ~1 second (before the SDK loop completes). Check the browser console — no "state update on unmounted component" warnings.

- [ ] **Verify (g):** Run the backend test suite once more from `backend/`:

```bash
php artisan test --filter=EmployeeEnrolledDevicesTest
```

Expected: still passes.

- [ ] **Step 1: Stop — report.**

Tell the user: "All tasks complete. Backend tests pass; manual verification list walked through. Ready for final review and commit."

---

## Notes for the implementing engineer

- **Do not run `git commit`/`git push` from inside Claude / the implementing agent.** This repo's owner handles all git operations.
- **Do not refactor `getDevicePersonDetails` in DeviceController.** The probe helper is *new code added alongside it*. Leaving the original method intact prevents breaking any current callers.
- **Field names for face/rfid/pin** in the probe helper are inferred from how the existing controller handles SDK responses (`info.cardNo`, `info.password`, `pic`, `faceImage`). If a real-world SDK response uses different field names, fix them in `probeHasFace` / `probeHasRfid` / `probeHasPin` — these three small functions are the only place model-specific shape lives.
- **If `SDKController` or `DeviceCameraModel2Controller` doesn't have a `deletePerson` method**, the `destroy` action returns 422 with `"Delete not supported on this device model"`. That's intentional — adding new SDK methods is outside the scope of this plan.
