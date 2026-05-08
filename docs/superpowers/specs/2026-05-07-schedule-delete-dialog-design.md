# Schedule Delete Dialog

**Date:** 2026-05-07
**Status:** Approved (awaiting plan)

## Problem

The Schedule Employees page exposes bulk delete via row checkboxes plus an inline Delete button gated by `selectedIds.length`. Confirmation is a `window.confirm()`. The Add flow, by contrast, opens a polished selection dialog. The Delete flow should match that pattern: click Delete → open a dialog where you pick employees → confirm.

## Solution

Mirror the "Select Employees" section of `components/Schedule/Create.js` in a new `Delete.jsx` component that:

1. Renders the red Delete trigger button (lucide `Trash2`).
2. Opens a modal with a single "Select Employees" card (no shift / date sections).
3. Confirms via a red "Delete Schedules" button in the footer.

Row checkboxes are removed from the data table. The per-row Delete item in the three-dot actions menu is untouched.

## Component layout

`frontend-new/src/components/Schedule/Delete.jsx`

State (mirrors Create.js naming):
- `open`, `loading`
- `selectedBranchIds`, `selectedDepartmentIds`
- `branches`, `departments`, `employees`, `filteredEmployees`
- `selectedIds`
- `searchTerm`

Effects:
- On `open=true`: reset state, `getBranches()`.
- On `selectedBranchIds` change: `getDepartmentsByBranchIds(selectedBranchIds)`.
- On `selectedDepartmentIds` change: `getScheduledEmployeeList(selectedDepartmentIds)` → set `employees` and `filteredEmployees`.
- Debounced `searchTerm` filters `filteredEmployees` by `name` or `employee_id`.

Modal sections:
- **Header:** "Delete Schedules" / "Remove schedules from selected employees"
- **Filters row:** Branch `MultiDropDown`, Department `MultiDropDown`, search `Input`
- **Table:** select-all checkbox + per-row checkboxes; columns: Employee Name, Employee ID, Department, Designation. Same styling/structure as Create.js' table.
- **Footer:** Cancel + red "Delete Schedules" button. Disabled when `selectedIds.length === 0`. Shows count when > 0.

Submit handler:
```
const results = await Promise.allSettled(
    selectedIds.map(id => removeEmployeeSchedule(id))
);
const failures = results.filter(r => r.status === 'rejected');
if (failures.length) notify("Partial", `${failures.length} of ${selectedIds.length} failed`, "error");
else notify("Success", "Schedules deleted", "success");
setOpen(false);
onSuccess();
```

`Promise.allSettled` (not `Promise.all`) so one failure doesn't block the rest.

## `schedule/page.js` changes

Remove:
- `selectedIds`, `toggleSelect`, `toggleAll`, `bulkDelete`
- The inline Delete `<button>` (lines 290–302)
- The 4th argument passed to `Columns(...)` (the checkbox-state object)

Add:
- Import `Delete` from `@/components/Schedule/Delete`
- Render `<Delete onSuccess={handleRefresh} />` where the inline Delete button used to be

Keep:
- `deleteItem(id)` (per-row delete from the actions menu)
- All other state, fetch, refresh logic

## `schedule/columns.js` changes

- Drop the `{ selectedIds, toggleSelect, toggleAll, allSelected }` destructured argument.
- Remove the `checkbox` column entry (the first column).
- Signature becomes `(deleteItem, onEdit, onView) => [...]`.

## Out of scope

- Backend changes — `removeEmployeeSchedule` already supports the deletion.
- Touching the per-row Actions-menu Delete (it stays as is).
- Any change to the Add dialog.

## Verification

- Click Delete on the Schedule page → dialog opens, no employees pre-selected, no rows pre-checked.
- Branch/department filters narrow the employee list. Search box filters by name and ID.
- Select-all toggles all *currently filtered* rows.
- Confirm with selection → schedules removed, table refreshes, notify success.
- Confirm with mixed scheduled/unscheduled selection → no fatal error; success or partial-failure notification.
- The data-table no longer shows a checkbox column.
- The per-row Actions → Delete still works.
