# Visitor Hosts CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No-commit rule (project convention):** the user handles all `git commit` / `git push`. Where a step says "Commit", **pause and notify the user** instead of running git.
>
> **DB rule:** any migration must be applied via PuTTY on the live server (Windows local PHP CLI lacks the pgsql extension). Use `php artisan migrate --path=database/migrations/<file>.php` so other pending migrations don't run.

**Goal:** Add a "Hosts" tab to the Visitor Management sidebar with full Add/Edit/Delete CRUD, sourcing host display data live from the existing Employee records.

**Architecture:** Reuse the existing `host_companies` table and `HostCompany` model. Add one nullable `notes` column. Add three new endpoints (POST/PUT/DELETE) under the existing `/visitor-management/hosts` prefix, and extend the existing GET to return branch/zone/notes relations. A new `/visitor/hosts` page renders a list + an Add/Edit modal.

**Tech Stack:** Laravel 10 / PostgreSQL / Next.js / React / Tailwind / lucide-react.

**Spec reference:** [docs/superpowers/specs/2026-05-29-visitor-hosts-design.md](../specs/2026-05-29-visitor-hosts-design.md)

---

## File Structure

**Backend — new files:**
- `backend/database/migrations/2026_05_29_000003_add_notes_to_host_companies_table.php` (skips if column exists)

**Backend — modified files:**
- `backend/app/Http/Controllers/VisitorManagementController.php` — extend `hosts()`, add `storeHost`, `updateHost`, `deleteHost`.
- `backend/routes/visitor_management.php` — register POST/PUT/DELETE routes.

**Frontend — new files:**
- `prototypes/visitor-hosts-sample.html` — UI prototype, screenshot for approval.
- `frontend-new/src/app/visitor/hosts/page.js` — Suspense wrapper.
- `frontend-new/src/components/Visitor/Hosts.jsx` — list page.
- `frontend-new/src/components/Visitor/HostModal.jsx` — Add/Edit modal.

**Frontend — modified files:**
- `frontend-new/src/lib/menuData.js` — add the `/visitor/hosts` entry.
- `frontend-new/src/lib/api.js` — add `getHosts`, `getHostEmployees`, `createHost`, `updateHost`, `deleteHost`, `getVisitorZones`.
- `frontend-new/src/locales/en/common.json` — add `menu.hosts: "Hosts"` translation key (placeholders for ar/fr/hi).

---

## Task 1: HTML prototype (STOP for screenshot approval)

**Files:**
- Create: `prototypes/visitor-hosts-sample.html`

- [ ] **Step 1: Build the prototype**

Mirror the dark-theme palette used by other prototypes in the same folder. Show:
- Page header "Hosts" + subtitle + Add Host button.
- A search input.
- A grid of 3-4 example host cards (avatar/initials, name, employee ID, department, branch, zone tag, Edit/Delete icons).
- An empty-state card variant (for "no hosts yet").
- A modal mockup with Employee dropdown, Branch dropdown, Zone dropdown, Notes textarea, Cancel + Save buttons.

Use Tailwind CDN + `darkMode: 'class'`. Reference `prototypes/employee-status-sample.html` for palette tokens.

- [ ] **Step 2: STOP and notify the user**

Tell the user: *"Prototype at `prototypes/visitor-hosts-sample.html` is ready. Please open it, save a screenshot as `prototypes/visitor-hosts-sample.png`, and approve the layout. I'll proceed to backend after your OK."*

Do not begin Task 2 until the user approves.

---

## Task 2: Backend migration for `notes` column

**Files:**
- Create: `backend/database/migrations/2026_05_29_000003_add_notes_to_host_companies_table.php`

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('host_companies', 'notes')) {
            Schema::table('host_companies', function (Blueprint $table) {
                $table->text('notes')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('host_companies', 'notes')) {
            Schema::table('host_companies', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
    }
};
```

The `hasColumn` guard makes the migration idempotent — safe to run on a DB where the column already exists.

- [ ] **Step 2: Apply via PuTTY**

User runs on the live server:

```bash
cd /var/www/mytime2cloud/backend-v2
php artisan migrate --path=database/migrations/2026_05_29_000003_add_notes_to_host_companies_table.php
```

Expected: `Migrated: 2026_05_29_000003_add_notes_to_host_companies_table`.

- [ ] **Step 3: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): add nullable notes column to host_companies`.

---

## Task 3: Backend controller — extend `hosts()` to include relations and notes

**Files:**
- Modify: `backend/app/Http/Controllers/VisitorManagementController.php` (the `hosts()` method around line 258)

- [ ] **Step 1: Replace the existing `hosts()` body**

Replace the current implementation with:

```php
public function hosts(Request $request)
{
    return HostCompany::where('company_id', $request->company_id)
        ->with([
            'employee:id,first_name,last_name,employee_id,department_id,branch_id',
            'employee.department:id,name',
            'branch:id,name',
            'zone:id,name',
        ])
        ->orderBy('id', 'desc')
        ->get(['id', 'company_id', 'employee_id', 'branch_id', 'zone_id', 'notes']);
}
```

Two additive changes from the original:

1. The `with(...)` clause picks up branch, zone, and the employee's department.
2. The selected columns now include `branch_id`, `zone_id`, `notes`. Old consumers that only read `id, company_id, employee_id` continue to work unchanged.

- [ ] **Step 2: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): extend hosts() to include branch, zone, notes`.

---

## Task 4: Backend controller — add `storeHost`, `updateHost`, `deleteHost`

**Files:**
- Modify: `backend/app/Http/Controllers/VisitorManagementController.php` (append three methods after `hostEmployees()`)

- [ ] **Step 1: Add the three methods**

After the `hostEmployees()` method (currently at the bottom of the file), add:

```php
public function storeHost(Request $request)
{
    $validated = $request->validate([
        'company_id'  => 'required|integer|exists:companies,id',
        'employee_id' => 'required|integer|exists:employees,id',
        'branch_id'   => 'nullable|integer|exists:company_branches,id',
        'zone_id'     => 'nullable|integer|exists:zones,id',
        'notes'       => 'nullable|string|max:1000',
    ]);

    $exists = HostCompany::where('company_id', $validated['company_id'])
        ->where('employee_id', $validated['employee_id'])
        ->exists();

    if ($exists) {
        return response()->json([
            'message' => 'This employee is already a host.',
        ], 422);
    }

    $host = HostCompany::create($validated);

    return $host->load([
        'employee:id,first_name,last_name,employee_id,department_id,branch_id',
        'employee.department:id,name',
        'branch:id,name',
        'zone:id,name',
    ]);
}

public function updateHost(Request $request, $id)
{
    $host = HostCompany::findOrFail($id);

    $validated = $request->validate([
        'employee_id' => 'required|integer|exists:employees,id',
        'branch_id'   => 'nullable|integer|exists:company_branches,id',
        'zone_id'     => 'nullable|integer|exists:zones,id',
        'notes'       => 'nullable|string|max:1000',
    ]);

    // Guard against duplicating the (company_id, employee_id) pair on re-link.
    $dupe = HostCompany::where('company_id', $host->company_id)
        ->where('employee_id', $validated['employee_id'])
        ->where('id', '!=', $host->id)
        ->exists();

    if ($dupe) {
        return response()->json([
            'message' => 'Another host record already exists for this employee.',
        ], 422);
    }

    $host->update($validated);

    return $host->fresh()->load([
        'employee:id,first_name,last_name,employee_id,department_id,branch_id',
        'employee.department:id,name',
        'branch:id,name',
        'zone:id,name',
    ]);
}

public function deleteHost($id)
{
    $host = HostCompany::find($id);
    if (!$host) {
        return response()->json(['message' => 'Host not found.'], 404);
    }

    $host->delete();

    return response()->json(['message' => 'Host removed.']);
}
```

- [ ] **Step 2: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): add store/update/delete host endpoints`.

---

## Task 5: Backend routes

**Files:**
- Modify: `backend/routes/visitor_management.php`

- [ ] **Step 1: Register the three new routes**

Replace the existing single host route block (around line 34-35) with:

```php
// Hosts
Route::get('visitor-management/hosts', [VisitorManagementController::class, 'hosts']);
Route::post('visitor-management/hosts', [VisitorManagementController::class, 'storeHost']);
Route::put('visitor-management/hosts/{id}', [VisitorManagementController::class, 'updateHost']);
Route::delete('visitor-management/hosts/{id}', [VisitorManagementController::class, 'deleteHost']);
```

- [ ] **Step 2: Smoke-test the route table**

User runs on the live server (after upload):

```bash
cd /var/www/mytime2cloud/backend-v2
php artisan route:clear
php artisan route:list --path=visitor-management/hosts
```

Expected: 4 rows (GET / POST / PUT / DELETE).

- [ ] **Step 3: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): register hosts CRUD routes`.

---

## Task 6: Frontend API client wrappers

**Files:**
- Modify: `frontend-new/src/lib/api.js`

- [ ] **Step 1: Add wrapper functions**

Find a section near the other visitor-management calls (search for `visitor-management/hosts`) and add:

```js
export const getHosts = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/hosts`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getHostEmployees = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/host-employees`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getVisitorZones = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/zones`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const createHost = async (payload) => {
    const { data } = await axios.post(`${API_BASE}/visitor-management/hosts`, payload);
    return data;
};

export const updateHost = async (id, payload) => {
    const { data } = await axios.put(`${API_BASE}/visitor-management/hosts/${id}`, payload);
    return data;
};

export const deleteHost = async (id) => {
    const { data } = await axios.delete(`${API_BASE}/visitor-management/hosts/${id}`);
    return data;
};
```

If `getHosts` already exists from a prior task, skip its re-declaration.

- [ ] **Step 2: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): frontend api client wrappers`.

---

## Task 7: Sidebar menu entry

**Files:**
- Modify: `frontend-new/src/lib/menuData.js` (around line 121-130)

- [ ] **Step 1: Import the icon**

At the top of `menuData.js`, ensure `UserCheck` is among the imports from `lucide-react`. Open the file and verify; if not present, add it.

- [ ] **Step 2: Add the menu entry**

Inside `visitorMenu`, insert the new item between Directory (line 125) and Pre-Register (line 126):

```js
{ href: "/visitor/hosts", icon: UserCheck, label: "menu.hosts" },
```

- [ ] **Step 3: Add the route mapping**

In the menu map block (around line 144-152), add:

```js
"/visitor/hosts": visitorMenu,
```

- [ ] **Step 4: Add the English translation key**

In `frontend-new/src/locales/en/common.json`, find the existing `menu` block and add:

```json
"hosts": "Hosts",
```

(Other locale files — ar, fr, hi — can be updated later. The English key works as a fallback in the menu render.)

- [ ] **Step 5: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(visitor): add Hosts entry to visitor sidebar`.

---

## Task 8: HostModal component

**Files:**
- Create: `frontend-new/src/components/Visitor/HostModal.jsx`

- [ ] **Step 1: Build the modal**

Write `frontend-new/src/components/Visitor/HostModal.jsx`:

```jsx
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import DropDown from "@/components/ui/DropDown";
import {
    createHost,
    updateHost,
    getHostEmployees,
    getBranches,
    getVisitorZones,
} from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

const HostModal = ({ open, onClose, onSaved, host = null }) => {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [zones, setZones] = useState([]);
    const [employeeId, setEmployeeId] = useState("");
    const [branchId, setBranchId] = useState("");
    const [zoneId, setZoneId] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const [emps, brs, zns] = await Promise.all([
                    getHostEmployees(),
                    getBranches(),
                    getVisitorZones(),
                ]);
                setEmployees(emps || []);
                setBranches(brs || []);
                setZones(zns || []);
            } catch (e) {
                notify("Error", parseApiError(e), "error");
            }
        })();

        if (host) {
            setEmployeeId(host.employee_id || "");
            setBranchId(host.branch_id || "");
            setZoneId(host.zone_id || "");
            setNotes(host.notes || "");
        } else {
            setEmployeeId("");
            setBranchId("");
            setZoneId("");
            setNotes("");
        }
    }, [open, host]);

    if (!open) return null;

    const empItems = employees.map((e) => ({
        id: e.id,
        name: `${e.first_name || ""} ${e.last_name || ""}`.trim() + (e.employee_id ? ` (${e.employee_id})` : ""),
    }));
    const branchItems = branches.map((b) => ({ id: b.id, name: b.name }));
    const zoneItems = zones.map((z) => ({ id: z.id, name: z.name }));

    const onSave = async () => {
        if (!employeeId) return notify("Validation", "Employee is required.", "error");

        setSaving(true);
        try {
            const payload = {
                employee_id: employeeId,
                branch_id: branchId || null,
                zone_id: zoneId || null,
                notes: notes || null,
            };
            const result = host?.id
                ? await updateHost(host.id, payload)
                : await createHost({ ...payload });
            notify("Saved", host?.id ? "Host updated." : "Host added.", "success");
            onSaved && onSaved(result);
            onClose && onClose();
        } catch (e) {
            notify("Error", parseApiError(e), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold">
                        {host?.id ? "Edit Host" : "Add Host"}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Employee
                        </label>
                        <DropDown
                            width="w-full"
                            items={empItems}
                            value={empItems.find((i) => i.id === employeeId)?.name || ""}
                            onChange={(name) => {
                                const match = empItems.find((i) => i.name === name);
                                setEmployeeId(match?.id || "");
                            }}
                            placeholder="Select an employee"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Branch
                            </label>
                            <DropDown
                                width="w-full"
                                items={branchItems}
                                value={branchItems.find((i) => i.id === branchId)?.name || ""}
                                onChange={(name) => {
                                    const match = branchItems.find((i) => i.name === name);
                                    setBranchId(match?.id || "");
                                }}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Zone
                            </label>
                            <DropDown
                                width="w-full"
                                items={zoneItems}
                                value={zoneItems.find((i) => i.id === zoneId)?.name || ""}
                                onChange={(name) => {
                                    const match = zoneItems.find((i) => i.name === name);
                                    setZoneId(match?.id || "");
                                }}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Notes
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional context"
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                    <button onClick={onClose} disabled={saving}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={onSave} disabled={saving}
                        className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-700 text-white font-bold text-sm disabled:opacity-50">
                        {saving ? "Saving..." : host?.id ? "Update Host" : "Add Host"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HostModal;
```

- [ ] **Step 2: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): HostModal component (Add/Edit)`.

---

## Task 9: Hosts list page component

**Files:**
- Create: `frontend-new/src/components/Visitor/Hosts.jsx`

- [ ] **Step 1: Build the list page**

Write `frontend-new/src/components/Visitor/Hosts.jsx`:

```jsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, UserCheck, Search } from "lucide-react";
import { getHosts, deleteHost } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import HostModal from "./HostModal";

const fullName = (e) =>
    [(e?.first_name || ""), (e?.last_name || "")].filter(Boolean).join(" ").trim() || "Employee removed";

const Hosts = () => {
    const [hosts, setHosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchHosts = async () => {
        setLoading(true);
        try {
            const data = await getHosts();
            setHosts(Array.isArray(data) ? data : []);
        } catch (e) {
            notify("Error", parseApiError(e), "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHosts();
    }, []);

    const onAdd = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const onEdit = (host) => {
        setEditing(host);
        setModalOpen(true);
    };

    const onDelete = async (host) => {
        const name = fullName(host.employee);
        if (!window.confirm(`Remove "${name}" from the host list?`)) return;
        try {
            await deleteHost(host.id);
            notify("Removed", "Host removed.", "success");
            fetchHosts();
        } catch (e) {
            notify("Error", parseApiError(e), "error");
        }
    };

    const filtered = hosts.filter((h) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const name = fullName(h.employee).toLowerCase();
        const eid = String(h.employee?.employee_id || "").toLowerCase();
        return name.includes(q) || eid.includes(q);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hosts</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Designated employees who receive visitors.
                    </p>
                </div>
                <button
                    onClick={onAdd}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                >
                    <Plus size={16} /> Add Host
                </button>
            </div>

            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or employee ID"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                />
            </div>

            {loading ? (
                <p className="text-sm text-slate-500">Loading hosts...</p>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                    <div className="inline-flex w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-primary items-center justify-center mb-3">
                        <UserCheck size={20} />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {search ? "No hosts match your search." : "No hosts yet — add the first one."}
                    </p>
                    {!search && (
                        <button onClick={onAdd}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-700 text-white text-sm font-bold rounded-lg">
                            <Plus size={14} /> Add Host
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((host) => {
                        const name = fullName(host.employee);
                        const initial = (host.employee?.first_name || "?").charAt(0).toUpperCase();
                        return (
                            <div key={host.id}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-primary font-bold flex items-center justify-center shrink-0">
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {host.employee?.employee_id ? `ID ${host.employee.employee_id}` : "—"}
                                            {host.employee?.department?.name ? ` · ${host.employee.department.name}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px]">
                                    {host.branch?.name && (
                                        <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {host.branch.name}
                                        </span>
                                    )}
                                    {host.zone?.name && (
                                        <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                            {host.zone.name}
                                        </span>
                                    )}
                                </div>
                                {host.notes && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{host.notes}</p>
                                )}
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={() => onEdit(host)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                        <Pencil size={13} /> Edit
                                    </button>
                                    <button onClick={() => onDelete(host)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <HostModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchHosts}
                host={editing}
            />
        </div>
    );
};

export default Hosts;
```

- [ ] **Step 2: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): Hosts list page component`.

---

## Task 10: Next.js page route

**Files:**
- Create: `frontend-new/src/app/visitor/hosts/page.js`

- [ ] **Step 1: Create the page**

Write `frontend-new/src/app/visitor/hosts/page.js`:

```jsx
"use client";

import Hosts from "@/components/Visitor/Hosts";

export default function HostsPage() {
    return (
        <div className="p-5 overflow-y-auto max-h-[calc(100vh-64px)]">
            <Hosts />
        </div>
    );
}
```

- [ ] **Step 2: Commit checkpoint**

Pause and notify the user. Suggested commit message: `feat(host): /visitor/hosts page route`.

---

## Task 11: Production build

**Files:**
- Build: `frontend-new/.next/`

- [ ] **Step 1: Build**

Run from the repo root:

```bash
cd frontend-new && npm run build
```

Expected: build completes; the route table includes `/visitor/hosts`.

- [ ] **Step 2: Notify the user**

Tell the user the build is ready. They upload `.next/` via FileZilla plus the new/modified source files for repo consistency, then `pm2 restart mytime2cloud-frontend` on the server.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Covered by |
|------------------|------------|
| Manual curation (one host per employee) | Tasks 3, 4 (duplicate guards) |
| GET list + branch/zone/notes | Task 3 |
| POST / PUT / DELETE endpoints | Task 4 |
| Routes registered | Task 5 |
| API client wrappers | Task 6 |
| Sidebar entry | Task 7 |
| List page + Add/Edit/Delete | Tasks 8, 9 |
| Live sync from employee | Achieved through the employee relation in Tasks 3, 9 |
| `notes` column migration | Task 2 |
| HTML prototype first | Task 1 (STOP point) |

**Placeholder scan:** clean.

**Type consistency:** `getHosts / createHost / updateHost / deleteHost / getHostEmployees / getVisitorZones` used identically across Tasks 6, 8, 9. Payload shape (`employee_id, branch_id, zone_id, notes`) matches across backend (Task 4) and frontend (Task 8).

---

## Execution Handoff

Plan complete and saved to [docs/superpowers/plans/2026-05-29-visitor-hosts.md](docs/superpowers/plans/2026-05-29-visitor-hosts.md).

Per project convention (memory: "Inline plan execution"), this plan executes inline via the `superpowers:executing-plans` skill — not via dispatched subagents.

Ready to start Task 1 (HTML prototype).
