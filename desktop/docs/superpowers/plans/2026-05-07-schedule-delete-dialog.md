# Schedule Delete Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the row-checkbox + inline-button bulk delete on the Schedule Employees page with a "Delete Schedules" modal that mirrors the Add dialog's employee picker.

**Architecture:** New `Schedule/Delete.jsx` component patterned on `Schedule/Create.js`'s "Select Employees" section. It owns its own trigger button, modal state, filters, and selection. `schedule/page.js` drops the row-selection state and inline button; `schedule/columns.js` drops the checkbox column. The per-row Actions → Delete and the underlying `removeEmployeeSchedule` API are unchanged. Multiple deletes run via `Promise.allSettled` so partial failures don't abort the rest.

**Tech Stack:** Next.js (App Router) + React, Tailwind, lucide-react, existing `Theme` and `ui` component libraries (`Input`, `MultiDropDown`, `Checkbox`, `ProfilePicture`), `@/lib/api` (`getBranches`, `getDepartmentsByBranchIds`, `getScheduledEmployeeList`, `removeEmployeeSchedule`), `@/lib/utils` (`notify`, `parseApiError`), `@/hooks/useDebounce`.

**Note on commits:** This repo's owner handles git commits. Skip the `git add` / `git commit` steps — leave the working tree dirty and let them commit. There are no frontend unit tests in this codebase; verification is manual in the browser.

**Reference component:** [frontend-new/src/components/Schedule/Create.js](frontend-new/src/components/Schedule/Create.js) — copy its modal scaffold, branch/department/search filters, and employee-table styling. Strip out everything below the "Select Employees" section (Configuration, Pattern Preview, Save handler).

---

## Task 1: Create the Delete component

**Files:**
- Create: `frontend-new/src/components/Schedule/Delete.jsx`

- [ ] **Step 1: Create the file with the full component**

Write the file below verbatim. It is self-contained — no other files need to change in this task.

```jsx
// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import {
    getBranches,
    getDepartmentsByBranchIds,
    getScheduledEmployeeList,
    removeEmployeeSchedule,
} from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

import Input from "../Theme/Input";
import MultiDropDown from "../ui/MultiDropDown";
import { Checkbox } from "../ui/checkbox";
import ProfilePicture from "../ProfilePicture";
import { useDebounce } from "@/hooks/useDebounce";

const Delete = ({ onSuccess = () => {} }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);

    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    const toggleModal = () => setOpen((v) => !v);

    useEffect(() => {
        if (!open) return;
        setSelectedBranchIds([]);
        setSelectedDepartmentIds([]);
        setSearchTerm("");
        setSelectedIds([]);
        setEmployees([]);
        setFilteredEmployees([]);
        (async () => {
            try {
                setBranches(await getBranches());
            } catch (error) {
                notify("Error", parseApiError(error), "error");
            }
        })();
    }, [open]);

    useEffect(() => {
        (async () => {
            try {
                setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
            } catch (error) {
                notify("Error", parseApiError(error), "error");
            }
        })();
    }, [selectedBranchIds]);

    useEffect(() => {
        (async () => {
            try {
                const emp = await getScheduledEmployeeList(selectedDepartmentIds);
                const list = (emp || []).map((e) => ({
                    ...e,
                    name: e.full_name || e.name,
                }));
                setEmployees(list);
                setFilteredEmployees(list);
            } catch (error) {
                notify("Error", parseApiError(error), "error");
            }
        })();
    }, [selectedDepartmentIds]);

    const debouncedSearch = useDebounce((value) => {
        if (!value) {
            setFilteredEmployees(employees);
            return;
        }
        const term = value.toLowerCase();
        setFilteredEmployees(
            employees.filter(
                (e) =>
                    (e.name || "").toLowerCase().includes(term) ||
                    String(e.employee_id || "").toLowerCase().includes(term)
            )
        );
    }, 500);

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        debouncedSearch(val);
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === filteredEmployees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEmployees.map((e) => e.id));
        }
    };

    const onConfirm = async () => {
        if (!selectedIds.length) {
            notify("Error", "Select at least one employee", "error");
            return;
        }
        setLoading(true);
        try {
            const idToEmployeeId = new Map(
                employees.map((e) => [e.id, e.employee_id])
            );
            const targets = selectedIds
                .map((id) => idToEmployeeId.get(id))
                .filter(Boolean);

            const results = await Promise.allSettled(
                targets.map((empId) => removeEmployeeSchedule(empId))
            );
            const failures = results.filter((r) => r.status === "rejected");

            if (failures.length === 0) {
                notify("Success", "Schedules deleted", "success");
            } else if (failures.length === targets.length) {
                notify(
                    "Error",
                    parseApiError(failures[0].reason) || "Failed to delete",
                    "error"
                );
            } else {
                notify(
                    "Partial",
                    `${failures.length} of ${targets.length} failed`,
                    "error"
                );
            }
            setOpen(false);
            onSuccess();
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 h-10 px-4 rounded-lg font-semibold text-sm bg-rose-500 text-white hover:bg-rose-600 shadow transition-all"
            >
                <Trash2 size={14} />
                Delete
            </button>

            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 pb-6"
                >
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={toggleModal}
                    ></div>

                    <div className="relative min-w-[1100px] overflow-y-auto max-h-[calc(100vh-140px)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
                                    Delete Schedules
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Remove schedules from selected employees
                                </p>
                            </div>
                            <button
                                onClick={toggleModal}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-surface-variant/30 dark:bg-black/20">
                            <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-bold text-gray-600 dark:text-white flex items-center gap-3">
                                        Select Employees
                                    </h2>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MultiDropDown
                                            placeholder={"Select Branch"}
                                            items={branches}
                                            value={selectedBranchIds}
                                            onChange={setSelectedBranchIds}
                                            badgesCount={1}
                                        />
                                        <MultiDropDown
                                            placeholder={"Select Department"}
                                            items={departments}
                                            value={selectedDepartmentIds}
                                            onChange={setSelectedDepartmentIds}
                                            badgesCount={1}
                                        />
                                        <Input
                                            placeholder="Search by name or ID"
                                            icon="search"
                                            value={searchTerm}
                                            onChange={handleSearch}
                                        />
                                    </div>

                                    <div className="overflow-y-auto max-h-[400px] rounded-3xl border border-stone-200 dark:border-white/10 shadow-elevation-1">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[#efece5] dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-semibold border-b border-stone-200 dark:border-white/5">
                                                    <th className="pl-6 py-4">
                                                        <Checkbox
                                                            checked={
                                                                filteredEmployees.length > 0 &&
                                                                selectedIds.length === filteredEmployees.length
                                                            }
                                                            onCheckedChange={toggleAll}
                                                        />
                                                    </th>
                                                    <th className="pr-6 py-4 font-bold">Employee Name</th>
                                                    <th className="px-6 py-4 font-bold">Employee ID</th>
                                                    <th className="px-6 py-4 font-bold">Department</th>
                                                    <th className="px-6 py-4 font-bold">Designation</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100 dark:divide-white/5 bg-surface-light dark:bg-surface-dark">
                                                {filteredEmployees.map((emp) => (
                                                    <tr
                                                        key={emp.id}
                                                        className={`transition-colors group hover:bg-[#f8f6f1] dark:hover:bg-white/5 ${
                                                            selectedIds.includes(emp.id)
                                                                ? "bg-[#fcfaf6] dark:bg-white/[0.02]"
                                                                : ""
                                                        }`}
                                                    >
                                                        <td className="pl-6 py-4">
                                                            <Checkbox
                                                                checked={selectedIds.includes(emp.id)}
                                                                onCheckedChange={() => toggleSelect(emp.id)}
                                                            />
                                                        </td>
                                                        <td className="pr-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <ProfilePicture src={emp.profile_picture} />
                                                                <div>
                                                                    <div className="font-bold text-slate-800 dark:text-white">
                                                                        {emp.full_name}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500">
                                                                        {emp.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                            {emp.employee_id}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                            {emp.department?.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                            {emp.designation?.name}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredEmployees.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                                                            No employees to show
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={toggleModal}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-white hover:bg-background-dark transition-all text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={loading || selectedIds.length === 0}
                                className={`px-4 py-2 rounded-lg text-white transition-all text-sm font-bold shadow-lg ${
                                    loading || selectedIds.length === 0
                                        ? "bg-rose-500/40 cursor-not-allowed"
                                        : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                                }`}
                            >
                                {loading
                                    ? "Deleting..."
                                    : selectedIds.length > 0
                                    ? `Delete Schedules (${selectedIds.length})`
                                    : "Delete Schedules"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Delete;
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend-new && npx next lint --file src/components/Schedule/Delete.jsx 2>&1 | head -40`
Expected: No errors. Warnings about unused vars are OK.

If `next lint` is not configured for single-file mode, instead run a build of just the page that uses it after Task 2 (covered in Task 3 verification).

---

## Task 2: Wire `Delete` into the Schedule page and remove the old bulk-delete UI

**Files:**
- Modify: `frontend-new/src/app/schedule/page.js`

- [ ] **Step 1: Add the import**

In [frontend-new/src/app/schedule/page.js](frontend-new/src/app/schedule/page.js), find the existing line:

```js
import Create from '@/components/Schedule/Create';
```

Replace it with:

```js
import Create from '@/components/Schedule/Create';
import Delete from '@/components/Schedule/Delete';
```

- [ ] **Step 2: Remove `Trash2` from the lucide import**

It was only used by the inline button being removed. Find:

```js
import { RefreshCw, Trash2 } from 'lucide-react';
```

Replace with:

```js
import { RefreshCw } from 'lucide-react';
```

- [ ] **Step 3: Remove the row-selection state and the bulk-delete handler**

Delete this block (around lines 59–86):

```js
const [selectedIds, setSelectedIds] = useState([]);

const toggleSelect = (employeeId) => {
    setSelectedIds(prev =>
        prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
    );
};

const toggleAll = () => {
    if (selectedIds.length === records.length) {
        setSelectedIds([]);
    } else {
        setSelectedIds(records.map(r => r.employee_id));
    }
};

const bulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Are you sure you want to delete schedules for ${selectedIds.length} employee(s)?`)) return;

    try {
        await Promise.all(selectedIds.map(id => removeEmployeeSchedule(id)));
        setSelectedIds([]);
        await handleRefresh();
    } catch (error) {
        alert("Failed to delete: " + parseApiError(error));
    }
};
```

- [ ] **Step 4: Remove the `setSelectedIds([])` reset inside `fetchRecords`**

Find inside `fetchRecords` (was around line 165):

```js
            if (result && Array.isArray(result.data)) {
                setRecords(result.data);
                setSelectedIds([]);
                setCurrentPage(result.current_page || 1);
                setTotalPages(result.total || 1);
                setIsLoading(false);
                return;
            }
```

Replace with:

```js
            if (result && Array.isArray(result.data)) {
                setRecords(result.data);
                setCurrentPage(result.current_page || 1);
                setTotalPages(result.total || 1);
                setIsLoading(false);
                return;
            }
```

- [ ] **Step 5: Replace the inline Delete button with the new component**

Find this block (was around lines 290–302):

```jsx
<Create onSuccess={handleRefresh} />

<button
    onClick={bulkDelete}
    disabled={selectedIds.length === 0}
    className={`flex items-center gap-1.5 h-10 px-4 rounded-lg font-semibold text-sm transition-all ${
        selectedIds.length === 0
            ? "bg-rose-500/20 text-rose-300/60 cursor-not-allowed"
            : "bg-rose-500 text-white hover:bg-rose-600 shadow"
    }`}
    title={selectedIds.length === 0 ? "Select rows to delete" : `Delete ${selectedIds.length} selected`}
>
    <Trash2 size={14} />
    Delete{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
</button>
```

Replace with:

```jsx
<Create onSuccess={handleRefresh} />

<Delete onSuccess={handleRefresh} />
```

- [ ] **Step 6: Drop the checkbox arg from the `Columns(...)` call**

Find (was around lines 308–313):

```jsx
<DataTable
    columns={Columns(deleteItem, handleEdit, handleView, {
        selectedIds,
        toggleSelect,
        toggleAll,
        allSelected: records.length > 0 && selectedIds.length === records.length,
    })}
```

Replace with:

```jsx
<DataTable
    columns={Columns(deleteItem, handleEdit, handleView)}
```

- [ ] **Step 7: Confirm `removeEmployeeSchedule` is no longer imported in this file**

Open the file and check the import line:

```js
import { getBranches, getDepartmentsByBranchIds, getScheduleEmployees, removeEmployeeSchedule } from '@/lib/api';
```

`removeEmployeeSchedule` is still used by the per-row `deleteItem(id)` (around line 194), so **leave it imported**. No change needed for this step — just verify by searching the file for `removeEmployeeSchedule` and confirming it appears in `deleteItem`.

---

## Task 3: Drop the checkbox column from `columns.js`

**Files:**
- Modify: `frontend-new/src/app/schedule/columns.js`

- [ ] **Step 1: Update the function signature**

In [frontend-new/src/app/schedule/columns.js](frontend-new/src/app/schedule/columns.js), find:

```js
export default (deleteItem, onEdit, onView, { selectedIds, toggleSelect, toggleAll, allSelected }) => {
    return [
        {
            key: "checkbox",
            header: (
                <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-primary cursor-pointer"
                />
            ),
            render: (e) => (
                <input
                    type="checkbox"
                    checked={selectedIds.includes(e.employee_id)}
                    onChange={() => toggleSelect(e.employee_id)}
                    onClick={(ev) => ev.stopPropagation()}
                    className="w-4 h-4 accent-primary cursor-pointer"
                />
            ),
        },
        {
            key: "employee",
```

Replace with:

```js
export default (deleteItem, onEdit, onView) => {
    return [
        {
            key: "employee",
```

(The `checkbox` column entry is removed entirely; the destructured 4th argument is removed from the signature.)

- [ ] **Step 2: Confirm no other unused imports**

Open the file. The `Check`, `AlertCircle`, `Eye`, `MoreVertical`, `Pencil`, `Trash` imports are all still used by other columns. No further changes needed.

---

## Task 4: Manual browser verification

**Files:** none (testing only)

- [ ] **Step 1: Start the dev server**

Run: `cd frontend-new && npm run dev`
Expected: Next.js dev server starts on the configured port (usually 3000) without compile errors. If you see any "Module not found" or syntax errors, fix them before continuing.

- [ ] **Step 2: Navigate to Schedule Employees**

In a browser, go to `/schedule` (login first if needed).

Verify:
- The data-table no longer shows a checkbox column (the first column should be Personnel).
- The header still shows the red "Delete" button alongside the purple "+ Add" button.
- The Delete button is **not** disabled.

- [ ] **Step 3: Open the Delete dialog**

Click the red "Delete" button.

Verify:
- A modal opens titled "Delete Schedules" with subtitle "Remove schedules from selected employees".
- The dialog shows a "Select Employees" section with Branch dropdown, Department dropdown, search box, and an employee table with checkboxes.
- The employee list populates (matches what the Add dialog shows when opened with no filters).
- The footer shows a Cancel button and a disabled red "Delete Schedules" button.

- [ ] **Step 4: Test filters and search**

- Pick a branch → department dropdown narrows to that branch's departments.
- Pick a department → employee table narrows to that department.
- Type part of a name → list filters after ~500ms.
- Type an employee ID → list filters by ID.

- [ ] **Step 5: Test select-all**

Click the header checkbox.

Verify:
- All currently visible (filtered) rows become checked.
- The footer button enables and shows "Delete Schedules (N)" where N is the filtered count.
- Click the header checkbox again → all deselect, footer disables.

- [ ] **Step 6: Test single-row delete**

Pick **one** test employee that has a schedule (look at the row in the table behind the dialog if needed). Check that one row only.

Click "Delete Schedules (1)".

Verify:
- A success notification fires.
- The dialog closes.
- The data table refreshes; that employee's "Active Interval" column flips to "No Schedules" and the Status icon changes accordingly.

- [ ] **Step 7: Test multi-select with mixed scheduled/unscheduled**

Re-open the Delete dialog. Select 2–3 employees, including at least one whose row in the underlying table reads "No Schedules".

Click Delete.

Verify:
- Either a success notification or a "Partial: X of Y failed" notification fires (depending on backend behavior for unscheduled targets).
- Dialog closes, table refreshes, no JS exceptions in the console.

- [ ] **Step 8: Confirm the per-row Delete still works**

Click the three-dot Actions menu on any scheduled row → Delete. Confirm the existing browser confirm prompt.

Verify:
- The schedule is removed for that single row.
- This path is unchanged from before this feature.

- [ ] **Step 9: Check the console**

In DevTools, confirm no React warnings about uncontrolled-to-controlled inputs or missing keys, and no network errors other than expected 4xx/5xx for the unscheduled-delete edge case.

---

## Self-review notes

- All four spec sections (new component, page.js changes, columns.js changes, verification) are covered by Tasks 1–4 respectively.
- No placeholders. Every code change shows the full before/after.
- Method/property names are consistent with the spec: `selectedIds`, `toggleSelect`, `toggleAll`, `removeEmployeeSchedule`, `getScheduledEmployeeList`, `Promise.allSettled`.
- Edge case from spec (mixed scheduled/unscheduled selection) is exercised in Task 4 Step 7.
