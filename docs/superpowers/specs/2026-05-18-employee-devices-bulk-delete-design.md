# Employee Devices Modal — Bulk Delete Design

**Date:** 2026-05-18
**Status:** Approved
**Scope:** Add per-row Select checkboxes (only on enrolled rows) and a bulk "Delete Selected (N)" action to the Enrolled Devices modal. Uses existing single-device DELETE endpoint in parallel — no backend changes.

## Problem

The Enrolled Devices modal supports single-row unenroll via the red X button. When an employee has been registered on many devices (5+), removing them individually is tedious. The user wants to multi-select enrolled rows and unenroll them in one action.

## Decisions (locked during brainstorming)

- **Checkbox scope:** only on rows where `available === true`. Non-enrolled rows ("No Response From Device") have no checkbox — nothing to unenroll.
- **API strategy:** frontend loops the existing `DELETE /api/employees/{id}/enrolled-devices/{deviceId}` endpoint in parallel via `Promise.allSettled`. No new backend route, no new controller method.

## Architecture

```
[EnrolledDevicesModal]
    ├── new state: selectedDeviceIds (Set<string>)
    ├── new header column: Select (checkbox)
    ├── master checkbox in <thead> (select-all / indeterminate / unselect-all)
    ├── per-row checkbox in <tbody>, only when row.available
    ├── new header button: "Delete Selected (N)" (between Refresh and Close)
    │     ↳ confirm → handleBulkDelete()
    │           ↳ Promise.allSettled of existing DELETE per selected device
    │           ↳ on per-row success: flip row to available:false (matches single-delete)
    │           ↳ on per-row failure: row stays, included in summary alert
    └── selection cleared on: modal open, refresh, successful bulk delete
```

Single file changes: [frontend-new/src/components/Employees/EnrolledDevicesModal.jsx](frontend-new/src/components/Employees/EnrolledDevicesModal.jsx).

## UI

### New "Select" column (first column, before `#`)

- Header `<th>`: master checkbox.
- Body `<td>` per row:
  - If `row.available === true`: render the checkbox, bound to `selectedDeviceIds.has(row.device_id)`.
  - Otherwise: render empty cell.

Master checkbox tri-state derived from selection vs eligible (available) rows:

| Selected count | Eligible count | Master state |
|---|---|---|
| 0 | any | unchecked |
| 0 < n < eligible | n < eligible | indeterminate |
| eligible | eligible | checked |
| eligible | 0 | hidden (no eligible rows) |

Clicking the master checkbox:
- If currently unchecked or indeterminate → select all eligible rows.
- If currently checked → clear selection.

### Bulk-delete button in header

- Only visible when `selectedDeviceIds.size > 0`.
- Placed in the purple header bar, **between** Refresh and Close.
- Label: `Delete Selected (N)` in white text, red background pill.
- Disabled (with spinner) while `bulkDeleting === true`.

### Per-row delete during bulk

- Each row whose `device_id` is in `selectedDeviceIds` shows the existing X delete cell replaced by an inline spinner while `bulkDeleting === true`.
- Row's per-row delete button is disabled while bulk is running.

## State (new)

```js
const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
const [bulkDeleting, setBulkDeleting] = useState(false);
```

Selection is reset to empty `Set` whenever:
- `useEffect` fetch fires (modal open / employee change).
- `handleRefresh` is invoked.
- `handleBulkDelete` completes (regardless of partial failures, only successful device_ids should be deselected — failed ones stay selected so user can retry).

## Bulk delete flow

```js
const handleBulkDelete = async () => {
  const ids = Array.from(selectedDeviceIds);
  if (ids.length === 0) return;
  if (!confirm(`Remove employee from ${ids.length} device(s)?`)) return;

  setBulkDeleting(true);
  const results = await Promise.allSettled(
    ids.map((deviceId) =>
      axios.delete(
        `${API_BASE}/employees/${employee.id}/enrolled-devices/${encodeURIComponent(deviceId)}`,
        { headers: { Accept: "application/json" } }
      )
    )
  );

  const succeeded = [];
  const failed = [];
  results.forEach((r, i) => {
    const deviceId = ids[i];
    const ok = r.status === "fulfilled" && r.value?.data?.success !== false;
    if (ok) succeeded.push(deviceId);
    else failed.push({ deviceId, message: pickErrorMessage(r) });
  });

  // Flip succeeded rows to non-enrolled (matches single-delete behavior)
  if (succeeded.length > 0) {
    setRows((prev) =>
      prev.map((r) =>
        succeeded.includes(r.device_id)
          ? { ...r, available: false, location: null, face: false, rfid: false, pin: false }
          : r
      )
    );
  }

  // Deselect succeeded; keep failed selected for retry
  setSelectedDeviceIds(new Set(failed.map((f) => f.deviceId)));

  if (failed.length > 0) {
    alert(
      `Removed from ${succeeded.length} device(s). ${failed.length} failed:\n` +
        failed.map((f) => `• ${f.deviceId}: ${f.message}`).join("\n")
    );
  }

  setBulkDeleting(false);
};
```

Helper `pickErrorMessage(settledResult)`:
- If rejected: return `settledResult.reason?.response?.data?.message || settledResult.reason?.message || "Delete failed"`.
- If fulfilled but `data.success === false`: return `settledResult.value?.data?.message || "Delete failed"`.

## Edge cases

| Case | Behavior |
|---|---|
| User opens modal with no enrolled rows | Master checkbox hidden, bulk button never shows. |
| User selects rows, then clicks Refresh | Selection cleared (selection is meaningless across refreshed data). |
| User has 1 row selected, that row gets unenrolled via the per-row X | Row flips to not-enrolled; `selectedDeviceIds` still has that id, but since row is no longer eligible, master checkbox treats it as 0/eligible and the "Delete Selected (1)" button still shows until next refresh. Acceptable — clicking it will attempt delete and the backend will return 404 → counted as failure → user sees it in the summary. Edge enough that we don't pre-emptively prune. |
| Network error mid-bulk | `Promise.allSettled` always settles → no exception bubbles → failed entries are collected and shown in alert. |
| User closes modal mid-bulk | The delete requests continue in the background but no UI state update happens (component unmounted). Acceptable — same as the existing single-delete behavior. |

## What we explicitly are NOT doing (YAGNI)

- No new bulk-DELETE backend endpoint.
- No keyboard shortcuts (Shift-click range select, Ctrl-A).
- No "select all across pages" — modal isn't paginated.
- No undo.
- No optimistic UI (we wait for each DELETE to settle before flipping the row).

## Testing plan (manual)

1. **Select all** — open modal with 3 enrolled rows. Click master checkbox → all 3 rows show checked. Bulk button shows `Delete Selected (3)`.
2. **Partial selection** — uncheck 1 of 3. Master checkbox shows indeterminate state. Bulk button shows `Delete Selected (2)`.
3. **Bulk delete happy path** — select 2 rows, click bulk delete, confirm → both rows flip to "No Response From Device", selection cleared, no alert shown.
4. **Bulk delete with 1 device offline** — select 3, one device is offline → alert shows "Removed from 2 device(s). 1 failed: • {device_id}: {error}". The failed row stays "Available" and stays selected. User can retry.
5. **No eligible rows** — open modal where employee is enrolled on 0 devices. No master checkbox, no bulk button. Per-row Select cell empty for non-enrolled rows.
6. **Refresh during selection** — select rows, hit refresh icon → selection clears.
