# Employee Devices Modal — Bulk Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Select column (only on enrolled rows) and a "Delete Selected (N)" header button to the Enrolled Devices modal so the user can unenroll multiple devices in one action.

**Architecture:** Single-file frontend change in `EnrolledDevicesModal.jsx`. Adds two pieces of state (`selectedDeviceIds: Set<string>`, `bulkDeleting: boolean`). Selection is shown via a new first column. Bulk delete fires `Promise.allSettled` over the existing single-device DELETE endpoint — no backend changes.

**Tech Stack:** React, axios, lucide-react icons. No new dependencies.

**Project convention:** User handles all git commits and pushes. Each task ends with "Stop — let user commit"; never run `git add`/`git commit`/`git push` from the implementing agent.

---

## File structure

**Modified (only file):**
- `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`

**Not touched:** backend, routes, tests, page wiring, columns.js, anywhere else.

---

## Task 1: Add bulk-selection state and selection-reset hooks

**Files:**
- Modify: `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`

- [ ] **Step 1: Add two new `useState` calls below the existing `deletingId` state.**

Locate this block (around lines 17–21):

```js
const [loading, setLoading] = useState(false);
const [rows, setRows] = useState([]);
const [errors, setErrors] = useState([]);
const [fetchError, setFetchError] = useState(null);
const [deletingId, setDeletingId] = useState(null);
```

Append immediately after:

```js
const [selectedDeviceIds, setSelectedDeviceIds] = useState(() => new Set());
const [bulkDeleting, setBulkDeleting] = useState(false);
```

- [ ] **Step 2: Reset selection when the fetch runs (modal open / refresh).**

Locate `fetchRows` (around line 23). Inside the function body, after the existing `setFetchError(null);` line, add one more reset:

```js
setSelectedDeviceIds(new Set());
```

Final `fetchRows` body should start with:

```js
const fetchRows = useCallback((signal) => {
  if (!employee?.id) return;
  setLoading(true);
  setRows([]);
  setErrors([]);
  setFetchError(null);
  setSelectedDeviceIds(new Set());
  // ...rest unchanged
```

- [ ] **Step 3: Stop — let user commit.**

Tell the user: "Task 1 done — selection state added, cleared on modal open / refresh."

---

## Task 2: Add the per-row toggle and master-toggle helpers

**Files:**
- Modify: `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`

- [ ] **Step 1: Derive eligible-row info above the `return (` statement.**

Locate the line that says `return (` (around line 87). Immediately above it, add:

```js
const eligibleRows = rows.filter((r) => r.available);
const eligibleCount = eligibleRows.length;
const selectedCount = eligibleRows.reduce(
  (acc, r) => (selectedDeviceIds.has(r.device_id) ? acc + 1 : acc),
  0
);
const allSelected = eligibleCount > 0 && selectedCount === eligibleCount;
const noneSelected = selectedCount === 0;
const indeterminate = !allSelected && !noneSelected;

const toggleOne = (deviceId) => {
  setSelectedDeviceIds((prev) => {
    const next = new Set(prev);
    if (next.has(deviceId)) next.delete(deviceId);
    else next.add(deviceId);
    return next;
  });
};

const toggleAll = () => {
  setSelectedDeviceIds(() => {
    if (allSelected) return new Set();
    return new Set(eligibleRows.map((r) => r.device_id));
  });
};
```

- [ ] **Step 2: Stop — let user commit.**

Tell the user: "Task 2 done — selection helpers added (toggleOne, toggleAll, derived counts)."

---

## Task 3: Add the "Select" column header (with master checkbox)

**Files:**
- Modify: `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`

- [ ] **Step 1: Insert a new `<th>` as the FIRST column in the table header.**

Find the `<thead>` block (the row that starts with `<th ... w-10">#</th>`). Insert this new `<th>` immediately BEFORE the `#` `<th>`:

```jsx
<th className="px-3 py-3 text-center whitespace-nowrap w-12">
  {eligibleCount > 0 && (
    <input
      type="checkbox"
      aria-label="Select all enrolled devices"
      className="h-4 w-4 cursor-pointer accent-indigo-600"
      checked={allSelected}
      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
      onChange={toggleAll}
      disabled={bulkDeleting}
    />
  )}
</th>
```

(The `ref` callback is how React sets the `indeterminate` property — there's no JSX attribute for it.)

- [ ] **Step 2: Stop — let user commit.**

Tell the user: "Task 3 done — Select column header added with tri-state master checkbox."

---

## Task 4: Add the per-row Select cell

**Files:**
- Modify: `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`

- [ ] **Step 1: Insert a new `<td>` as the FIRST cell of each data row.**

Find the row-rendering block inside `rows.map((row, idx) => { ... return (<tr ...>`. The first `<td>` currently is `<td className="px-3 py-3 text-slate-600 ...">{idx + 1}</td>` (the `#` column). Insert this new `<td>` immediately BEFORE it:

```jsx
<td className="px-3 py-3 text-center">
  {isAvailable ? (
    <input
      type="checkbox"
      aria-label={`Select ${row.device_name}`}
      className="h-4 w-4 cursor-pointer accent-indigo-600"
      checked={selectedDeviceIds.has(row.device_id)}
      onChange={() => toggleOne(row.device_id)}
      disabled={bulkDeleting}
    />
  ) : null}
</td>
```

- [ ] **Step 2: Update the `colSpan` on the placeholder rows from `9` to `10` (we added one column).**

Find each `<td colSpan={9}` (three places — loading, fetchError, empty-state). Change each to:

```jsx
<td colSpan={10}
```

- [ ] **Step 3: Stop — let user commit.**

Tell the user: "Task 4 done — per-row Select cell added, colSpan bumped to 10."

---

## Task 5: Implement `handleBulkDelete` and add the "Delete Selected (N)" header button

**Files:**
- Modify: `frontend-new/src/components/Employees/EnrolledDevicesModal.jsx`

- [ ] **Step 1: Import the `Trash2` icon from lucide-react for the bulk-delete button.**

Update the lucide-react import line (currently `import { Check, X, Loader2, RefreshCw } from "lucide-react";`) to:

```js
import { Check, X, Loader2, RefreshCw, Trash2 } from "lucide-react";
```

- [ ] **Step 2: Add the `handleBulkDelete` function below the existing `handleDelete`.**

Locate the closing brace of `handleDelete` (around line 85). Immediately after it, insert:

```js
const pickErrorMessage = (settledResult) => {
  if (settledResult.status === "rejected") {
    const r = settledResult.reason;
    return r?.response?.data?.message || r?.message || "Delete failed";
  }
  if (settledResult.value?.data?.success === false) {
    return settledResult.value?.data?.message || "Delete failed";
  }
  return "Delete failed";
};

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

  if (succeeded.length > 0) {
    setRows((prev) =>
      prev.map((r) =>
        succeeded.includes(r.device_id)
          ? { ...r, available: false, location: null, face: false, rfid: false, pin: false }
          : r
      )
    );
  }

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

- [ ] **Step 3: Add the bulk-delete button to the purple header bar between Refresh and Close.**

Find the header `<div>` that contains the refresh + close buttons (the block starting with `<div className="flex items-center justify-between bg-[#7c3aed]` — the inner right-side `<div className="flex items-center gap-2">` wraps the two existing buttons). Insert this new button BETWEEN the Refresh button (closing `</button>` of refresh) and the Close button (opening `<button onClick={onClose}`):

```jsx
{selectedCount > 0 && (
  <button
    type="button"
    onClick={handleBulkDelete}
    disabled={bulkDeleting}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    title="Delete selected"
  >
    {bulkDeleting
      ? <Loader2 className="w-4 h-4 animate-spin" />
      : <Trash2 className="w-4 h-4" />}
    Delete Selected ({selectedCount})
  </button>
)}
```

- [ ] **Step 4: Disable the per-row red X while bulk delete is running.**

Find the per-row delete `<button>` (inside the row map, the button with `title="Remove from device"`). Update its `disabled` attribute to also disable during bulk delete:

```jsx
disabled={isDeleting || bulkDeleting}
```

While we're there, also show a spinner on the per-row X if this row is in the selection during bulk delete. Change the button's children expression from:

```jsx
{isDeleting
  ? <Loader2 className="w-4 h-4 animate-spin inline-block" />
  : <X className="w-5 h-5 inline-block" strokeWidth={2.5} />}
```

to:

```jsx
{(isDeleting || (bulkDeleting && selectedDeviceIds.has(row.device_id)))
  ? <Loader2 className="w-4 h-4 animate-spin inline-block" />
  : <X className="w-5 h-5 inline-block" strokeWidth={2.5} />}
```

- [ ] **Step 5: Stop — let user commit.**

Tell the user: "Task 5 done — bulk-delete button + handler wired up. Per-row X shows spinner during bulk delete."

---

## Task 6: Verify build and manually test

**Files:**
- None — verification only.

- [ ] **Step 1: Run the frontend production build to confirm no errors.**

Run from `D:\newmytime2cloud\frontend-new`:

```bash
npm run build
```

Expected: `✓ Compiled successfully`. The two pre-existing warnings (`ImageUploader.jsx`, `Employees/Form.js`) are OK — they're not from our changes. If anything else fails, investigate before continuing.

- [ ] **Step 2: With dev server running on http://localhost:3001/employees, manually verify in browser:**

Walk through each:

- [ ] **(a)** Open the modal for an employee with at least 2 enrolled devices. Confirm the Select column appears as the first column with empty cells for "No Response From Device" rows.
- [ ] **(b)** Click the master checkbox in the header → all enrolled rows become selected, "Delete Selected (N)" button appears in the purple bar.
- [ ] **(c)** Uncheck one row → master checkbox shows the indeterminate dash, button count drops by 1.
- [ ] **(d)** Click Delete Selected (N), confirm. Each selected row's red X swaps to a spinner. Once all settle, succeeded rows flip to "No Response From Device". No alert if all succeeded.
- [ ] **(e)** Repeat (d) but with one device offline → alert appears summarizing N succeeded / N failed; failed row stays "Available on Device" and stays checked.
- [ ] **(f)** Refresh the modal (refresh icon) while rows are selected → selection clears.
- [ ] **(g)** Open the modal for an employee with NO enrolled devices → no master checkbox, no Delete Selected button.

- [ ] **Step 3: Stop — let user commit.**

Tell the user: "Task 6 done — build passes, manual checks complete. Ready for final commit."

---

## Notes for the implementing engineer

- **Do not run `git commit`/`git push` from inside Claude / the implementing agent.** This repo's owner handles all git operations.
- **Single file change** — only `EnrolledDevicesModal.jsx` is modified. Don't touch anything else.
- **No backend changes** — the bulk delete uses the existing per-device DELETE endpoint via `Promise.allSettled`. If you find yourself reaching for the backend, stop — that's out of scope per the spec.
- **Selection is a `Set<string>` of `device_id` values.** Always create a new `Set` when updating (`new Set(prev)` then mutate then return) — never mutate in place; React won't re-render.
- **`colSpan` was 9, now 10.** If you see only the loading / empty-state rows spanning 9 columns after your changes, you missed Step 2 of Task 4.
- **The master checkbox uses a `ref` callback to set `indeterminate`** — there's no JSX prop for it. If the indeterminate state never shows in browser, double-check the `ref` callback survived the edit.
