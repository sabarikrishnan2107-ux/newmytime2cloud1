# Employee Enrolled Devices Modal — Design

**Date:** 2026-05-18
**Status:** Approved
**Scope:** Add a "Devices" option to the employee row dropdown that opens a modal listing every device the employee is currently enrolled on, with per-device unenroll.

## Problem

The employees list (`frontend-new/src/app/employees/page.js`) currently shows a per-row dropdown with `Edit / Host QR / Print Card / Delete`. There is no way for a user to see which devices a given employee is enrolled on, or to remove them from a single device without going to the device side. The screenshot supplied alongside this request shows the target table layout (User Id, Device Name, Employee Data, Location, Face, RFID, PIN, Delete) — that view does not exist anywhere in the codebase today.

## Decisions (locked during brainstorming)

- **Entry point:** new "Devices" item in the existing row dropdown. No tab on the edit page.
- **Scope of rows:** only devices the employee is actually enrolled on (filter out non-enrolled).
- **Lookup strategy:** query each company device's SDK on modal open (no local enrollment cache).
- **Delete action:** unenroll the employee from that one device only. Employee record fields are not touched.
- **Face / RFID / PIN column meaning:** per-device enrollment derived from the SDK response, not global employee fields.

## Architecture

```
[Employees list row]
    └── Dropdown "Devices" item (between Print Card and Delete)
            └── opens EnrolledDevicesModal(employee)
                    └── GET /api/employees/{id}/enrolled-devices
                            └── EmployeeDeviceEnrollmentController@index
                                    ├── load Employee (system_user_id, company_id)
                                    ├── load Devices for company_id
                                    ├── for each device:
                                    │     probeDevicePerson(device, system_user_id)
                                    │     → null (skip) | { available, face, rfid, pin }
                                    └── return enrolled-only array
```

### Files added

- `backend/app/Http/Controllers/EmployeeDeviceEnrollmentController.php` — `index($employeeId)`, `destroy($employeeId, $deviceId)`.
- `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx` — modal shell + table.

### Files edited

- `frontend-new/src/app/employees/columns.js` — add "Devices" dropdown item between Print Card and Delete; accept a `showEnrolledDevices` handler prop following the existing pattern.
- `frontend-new/src/app/employees/page.js` — modal state (`devicesEmployee`) and handler wiring.
- `backend/routes/employee.php` — register the two new routes alongside the existing `EmployeeController` routes, under the same middleware group.
- `backend/app/Http/Controllers/DeviceController.php` — extract the SDK probe block from `getDevicePersonDetails` (lines 211–283) into a shared private helper so the new controller can reuse it.

## Backend contract

### `GET /api/employees/{employeeId}/enrolled-devices`

Flow:

1. `Employee::find($employeeId)` — 404 if not found. Pull `system_user_id` and `company_id`.
2. `Device::where('company_id', $companyId)->get()`.
3. For each device call `probeDevicePerson(Device $device, $systemUserId)` (extracted helper). It branches on `device.model_number`:
   - **OX-900** — `DeviceCameraModel2Controller->getPersonDetails($systemUserId)`.
   - **MYTIME1** — `FaceDeviceController::gatewayRequest('GET', "api/device/{serial_number}/person/{system_user_id}", [], ['picture' => 1])`.
   - **other** — `SDKController->getPersonDetails($device_id, $system_user_id)`.
   Helper returns `null` if the SDK indicates the person is not enrolled or the call fails; otherwise returns `[ 'available' => true, 'face' => bool, 'rfid' => bool, 'pin' => bool ]`.
4. Response shape:

   ```json
   {
     "data": [
       {
         "device_id": "AC1234",
         "device_name": "Jovee",
         "location": "Souq Al Bahar",
         "available": true,
         "face": true,
         "rfid": false,
         "pin": false
       }
     ],
     "errors": []
   }
   ```

   `errors` is populated only if a device's SDK call throws — entry shape `{ device_id, device_name, message }`. The device is omitted from `data` in that case.

### Per-flag inference inside `probeDevicePerson`

- `face` — SDK response has a non-empty face image / template field.
- `rfid` — SDK response has a non-empty card-number field.
- `pin` — SDK response has a non-empty password / PIN field.

Fields vary by model branch; handle the three branches that exist today. Where a model SDK doesn't expose a given credential, return `false` and the UI renders an em-dash.

### `DELETE /api/employees/{employeeId}/enrolled-devices/{deviceId}`

Flow:

1. Load employee + device. 404 if either missing or `device.company_id !== employee.company_id`.
2. Call the device SDK's delete-person endpoint, branched by `device.model_number`:
   - **MYTIME1** — `FaceDeviceController::gatewayRequest('DELETE', "api/device/{serial_number}/person/{system_user_id}")`.
   - **OX-900** — `DeviceCameraModel2Controller->deletePerson($system_user_id)` (or the equivalent method already present in the controller).
   - **other** — `SDKController->deletePerson($device_id, $system_user_id)`. If the underlying method does not exist on the SDK branch, return 422 with `"Delete not supported on this device model"`.
3. Return `{ "success": true }` on success. On SDK failure return 422 with `{ "success": false, "message": "<sdk error>" }` — do not throw.

No employee-record fields are mutated.

## Frontend behavior

### Dropdown change — `columns.js`

Insert a new menu item between `Print Card` (line ~169) and `Delete` (line ~171). Style identical to the others. Icon: `MonitorSmartphone` from `lucide-react`. Label: `Devices`. Click handler: `showEnrolledDevices(employee)`, wired through the same prop-injection pattern used for `editEmployee`, `showHostQr`, `printCard`, `deleteEmployee`.

### Modal — `EnrolledDevicesModal.jsx`

Props: `{ open, employee, onClose }`. Use the same Dialog primitive the Host QR modal uses (match its imports for consistency).

Behavior:

1. On `open && employee?.id` change, fire `GET /api/employees/{employee.id}/enrolled-devices` (with `AbortController`).
2. Loading state: skeleton rows in the table body.
3. Success: render table with columns matching the screenshot:

   | # | User Id | Device Name | Employee Data | Location | Face | RFID | PIN | Delete |

   - `User Id` — `employee.system_user_id` (constant across rows).
   - `Device Name` — `row.device_name`.
   - `Employee Data` — green text `"Available on Device"` when `row.available`, else em-dash. (The screenshot's "Avaialbe" is a typo; we'll spell it correctly.)
   - `Location` — `row.location`.
   - `Face / RFID / PIN` — green check icon (reuse `text-[#15803D]` from `columns.js:105`) when true, em-dash when false.
   - `Delete` — red X icon. Click → confirm popover (existing destructive-action pattern) → `DELETE` request. While in flight, replace the X with a spinner and disable the row.
4. Error state: inline message with Retry button.
5. Empty state: "This employee is not enrolled on any device."
6. If response `errors` array is non-empty: show a subtle banner above the table, e.g., "1 device skipped due to error."
7. On unmount or `onClose`, abort the in-flight request.

### Wiring — `page.js`

```js
const [devicesEmployee, setDevicesEmployee] = useState(null);
// pass into columns factory:
//   showEnrolledDevices: setDevicesEmployee
<EnrolledDevicesModal
  open={!!devicesEmployee}
  employee={devicesEmployee}
  onClose={() => setDevicesEmployee(null)}
/>
```

## Error handling & edge cases

| Case | Behavior |
|------|----------|
| Employee has no `system_user_id` | Skip SDK loop; return `{ data: [] }`. Modal shows empty state. |
| Company has no devices | Same — empty state. |
| One device's SDK call fails / times out | Caught per-device, recorded in `errors`, omitted from `data`. Whole request still 200. |
| Device unreachable during DELETE | 422 with SDK message. UI keeps the row, shows error toast. |
| Concurrent deletes on the same row | Row is disabled while DELETE in flight. |
| User closes modal mid-load | `AbortController` aborts the fetch; no stale state update. |
| Permissions | Both routes sit behind the same middleware as existing employee routes. No new permission key. |

## Out of scope (YAGNI)

- Local enrollment cache table or sync job.
- Bulk-delete / multi-select.
- "Add to device" action from this modal.
- In-modal editing of face / RFID / PIN.
- Real-time refresh — user closes and reopens.

## Testing plan

**Manual (depends on real device SDKs):**

1. Employee enrolled on one device → table shows one row, correct flags.
2. Employee enrolled on zero devices → empty-state message.
3. Company has three devices, one offline → two rows shown, banner "1 device skipped due to error".
4. Click Delete → confirm → row disappears, employee no longer appears when modal is reopened.
5. Click Delete with target device offline → error toast, row stays.
6. Close modal while still loading → no console errors, no state update warnings.

**Backend unit tests** (mock the SDK helper):

- Only devices whose probe returns `available` end up in `data`.
- A thrown SDK exception is swallowed, the device appears in `errors`, and the request returns 200.
- `DELETE` returns 404 if `device.company_id !== employee.company_id`.
- `DELETE` returns 422 with a message when the SDK call fails.
