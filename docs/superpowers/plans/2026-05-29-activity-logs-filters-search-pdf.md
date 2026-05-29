# Activity Logs — Filters, Search, PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. This project's standing preference is inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No git commits from the agent.** This project's owner handles all `git add`/`commit`/`push`. Do NOT run those commands — finish each task and stop at the natural commit point so the user can commit. The "Commit point" notes below tell the user what's ready.

**Goal:** Add Type/Action/User Type/Branch/Department filters, name+description search, and a PDF download to the Activity logs page.

**Architecture:** Frontend adds a stateful two-row toolbar above the existing DataTable that forwards filters as query params to the existing `/activity` endpoint. Backend extends `ActivityController` with a `q` (search) clause, two distinct-value endpoints for the Type/Action dropdowns, and a new `/activity/pdf` endpoint that renders a Blade template through dompdf with a 5,000-row cap.

**Tech Stack:** React 18, Next.js (App Router pattern), Tailwind, axios. Laravel 10 + Eloquent, `Barryvdh\DomPDF\Facade\Pdf` for PDF rendering. No automated test suite for this area — verification is manual against the spec's test checklist.

**Spec:** [docs/superpowers/specs/2026-05-29-activity-logs-filters-search-pdf-design.md](../specs/2026-05-29-activity-logs-filters-search-pdf-design.md)

---

## File Structure

**New files:**
- `prototypes/activity-logs-sample.html` — static HTML mockup, the UI gate before React work
- `frontend-new/src/components/Activity/Toolbar.js` — stateless component owning the two-row filter UI
- `backend/resources/views/pdf/activity_logs/index.blade.php` — dompdf template for the activity PDF

**Modified files:**
- `frontend-new/src/components/Activity/Page.js` — adds filter/search/export state, wires up Toolbar, adds error & exporting states
- `frontend-new/src/lib/api.js` — adds `getActivityPdf`, `getActivityTypes`, `getActivityActions`
- `backend/app/Http/Controllers/ActivityController.php` — adds `q` search clause, `types()`, `actions()`, `exportPdf()`, `buildFilterSummary()`
- `backend/routes/company.php` — registers three new routes before the existing `apiResource('activity', ...)` line

**Boundaries / responsibilities:**
- `Toolbar.js` owns layout only — all state lives in `Page.js`.
- `Page.js` owns filter state, debouncing, and orchestration (list call + export call).
- `ActivityController` keeps its single-controller pattern (in line with the existing file). The PDF rendering helper stays inside the controller as `exportPdf()` — no separate service class for this small a surface.

---

## Task 1: HTML prototype gate

**Why first:** Project standing rule — UI changes start as a standalone HTML sample reviewed via screenshot before any React work.

**Files:**
- Create: `prototypes/activity-logs-sample.html`

- [ ] **Step 1: Create `prototypes/activity-logs-sample.html`**

Standalone file: include Tailwind via CDN, dark theme matching the live screenshot (dark slate background, light text). Show:

- A "Activity" heading on the top-left with a "Clear filters" link beside it (visible state).
- Row 1: a search input growing to fill horizontal space, a date-range pill, and a "Print PDF" button anchored right.
- Row 2: five labeled dropdowns — Type, Action, User Type, Branch, Department — equal-width.
- The existing table layout below: columns Action By, Action, Description, Type, OT Value, with 6 realistic sample rows (mix of "Super User" and employees with `1000000748`-style ids, dates like "25 May 2026 17:46:53").
- A pagination strip at the bottom showing "Showing 1-25 of 2303" + page-size dropdown + "1 / 93".

Use approximate Tailwind classes:
```html
<!-- toolbar -->
<div class="space-y-3 mb-4">
  <div class="flex flex-wrap items-center gap-3">
    <input type="text" placeholder="Search user or description..."
      class="flex-1 min-w-[240px] bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    <button class="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-gray-200 flex items-center gap-2">
      📅 Pick a date range
    </button>
    <button class="ml-auto bg-emerald-600 hover:bg-emerald-500 text-white rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2">
      🖨 Print PDF
    </button>
  </div>
  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
    <!-- five identical-shaped <select> elements -->
  </div>
</div>
```

Add a second `<section>` lower in the file (clearly separated by a `<hr>` and a heading) showing **two extra states**:
1. The over-cap error banner: an inline red/amber alert above the table reading
   *"Too many records (12,431). Narrow the date range or apply more filters."*
2. The loading state: the same toolbar with the table area replaced by a centered spinner placeholder.

- [ ] **Step 2: Open the file in a browser, screenshot all three states, share for approval**

Stop here. Do **not** start React work. The user reviews the screenshots and approves before Task 2 begins.

**Commit point:** Prototype file ready. User reviews, then commits or asks for revisions.

---

## Task 2: Confirm `Activity.model_type` values from the DB

**Why:** The `User Type` dropdown options need to send `model_type` strings that actually match what the DB stores. `recordActivity()` writes `$user->user_type` (in [Controller.php:304-315](../../../backend/app/Http/Controllers/Controller.php#L304-L315)) — the literal value of that field has not been verified.

**Files:** none modified — investigation only.

- [ ] **Step 1: Run the query**

Run in the backend directory:

```bash
php artisan tinker
```

Then:
```php
\App\Models\Activity::select('model_type')->distinct()->pluck('model_type');
```

Expected output: a small list, likely something like `["company", "employee"]` or `["App\\Models\\Company", "App\\Models\\Employee"]`.

- [ ] **Step 2: Record the result in a comment block at the top of `ActivityController.php`**

Add directly under the `namespace` line:
```php
// Activity.model_type distinct values as of YYYY-MM-DD: ["<value1>", "<value2>"]
// Used by /api/activity/types and the User Type dropdown in the frontend.
```

Replace `<value1>` and `<value2>` with the actual strings from Step 1. This is the only documentation comment added — no other comments anywhere in this plan.

- [ ] **Step 3: Note the values for Task 9**

Whatever the two values are, those are the `value` strings the frontend's hardcoded User Type options must send. Use the friendly labels "Company" and "Employee" regardless of the underlying strings.

**Commit point:** A one-line comment in the controller. No functional change.

---

## Task 3: Backend — add `q` search clause

**Files:**
- Modify: `backend/app/Http/Controllers/ActivityController.php` (the `filters()` method)

- [ ] **Step 1: Add the `q` clause inside `filters()`**

Open [backend/app/Http/Controllers/ActivityController.php](../../../backend/app/Http/Controllers/ActivityController.php). Locate the `filters()` method (currently lines 25-50). Insert this block immediately before the `$model->with(...)` line at the bottom:

```php
$model->when($request->filled("q"), function ($query) use ($request) {
    $term = "%" . $request->q . "%";
    $query->where(function ($inner) use ($term) {
        $inner->whereHas("user", fn($u) => $u->where("name", "like", $term))
              ->orWhere("description", "like", $term);
    });
});
```

The `where(function ($inner) ...)` wrapper is required so the `whereHas` OR `orWhere` group is parenthesized in SQL — without it, the OR would leak past the other filters.

- [ ] **Step 2: Manually verify with curl/Postman**

Start the backend if not running. From any shell, hit (replace `<token>` and `<company_id>` with real values from a logged-in admin session):

```bash
curl "http://localhost:8000/api/activity?q=Super&company_id=<company_id>" -H "Authorization: Bearer <token>"
```

Expected: response contains only rows where `user.name` matches "Super" OR `description` contains "Super".

Then try a description-only match:
```bash
curl "http://localhost:8000/api/activity?q=1000000748&company_id=<company_id>" -H "Authorization: Bearer <token>"
```

Expected: response contains rows whose description mentions `1000000748`.

Then try combined with an existing filter:
```bash
curl "http://localhost:8000/api/activity?q=Super&type=Authentication&company_id=<company_id>" -H "Authorization: Bearer <token>"
```

Expected: only rows matching BOTH (search AND type=Authentication).

**Commit point:** `q` parameter live on `/activity`. Existing callers unaffected.

---

## Task 4: Backend — `types()` and `actions()` distinct-value endpoints

**Files:**
- Modify: `backend/app/Http/Controllers/ActivityController.php`

- [ ] **Step 1: Add `types()` and `actions()` methods**

Insert these two methods inside the `ActivityController` class, immediately after the existing `filters()` method:

```php
public function types(Request $request)
{
    return Activity::query()
        ->when(
            $request->filled("company_id") && $request->company_id > 0,
            fn($q) => $q->where("company_id", $request->company_id)
        )
        ->whereNotNull("type")
        ->where("type", "!=", "")
        ->distinct()
        ->orderBy("type")
        ->pluck("type");
}

public function actions(Request $request)
{
    return Activity::query()
        ->when(
            $request->filled("company_id") && $request->company_id > 0,
            fn($q) => $q->where("company_id", $request->company_id)
        )
        ->whereNotNull("action")
        ->where("action", "!=", "")
        ->distinct()
        ->orderBy("action")
        ->pluck("action");
}
```

- [ ] **Step 2: (Routes registered in Task 5 — skip ahead and return after Task 5 to verify)**

**Commit point:** Methods exist but unreachable until Task 5 wires the routes.

---

## Task 5: Backend — register the three new routes

**Files:**
- Modify: `backend/routes/company.php` (around line 155 — the existing `apiResource('activity', ...)` line)

**Critical:** the new routes MUST be registered **before** the `apiResource` line. `apiResource` creates `/activity/{activity}` which would otherwise match `/activity/types`, `/activity/actions`, `/activity/pdf` as if they were IDs.

- [ ] **Step 1: Insert routes**

Open [backend/routes/company.php](../../../backend/routes/company.php). Find line 155 — the existing `Route::apiResource('activity', ActivityController::class);`. Insert the following THREE lines immediately **above** that line:

```php
Route::get('activity/types',   [ActivityController::class, 'types']);
Route::get('activity/actions', [ActivityController::class, 'actions']);
Route::get('activity/pdf',     [ActivityController::class, 'exportPdf']);
```

After the edit, the surrounding region should read:
```php
Route::get('activity/types',   [ActivityController::class, 'types']);
Route::get('activity/actions', [ActivityController::class, 'actions']);
Route::get('activity/pdf',     [ActivityController::class, 'exportPdf']);
Route::apiResource('activity', ActivityController::class);
Route::get('activitiesByUser/{user_id}', [ActivityController::class, "activitiesByUser"]);
```

(The `exportPdf` route is registered now even though the method doesn't exist yet — Task 7 adds it. The route registration itself does not boot the method, so this is safe.)

- [ ] **Step 2: Verify the two existing-method routes**

```bash
curl "http://localhost:8000/api/activity/types?company_id=<company_id>" -H "Authorization: Bearer <token>"
```

Expected: a JSON array of strings, e.g. `["Authentication"]`.

```bash
curl "http://localhost:8000/api/activity/actions?company_id=<company_id>" -H "Authorization: Bearer <token>"
```

Expected: a JSON array, e.g. `["Login"]`.

Also confirm the existing `/activity` listing still paginates correctly:
```bash
curl "http://localhost:8000/api/activity?per_page=5&company_id=<company_id>" -H "Authorization: Bearer <token>"
```
Expected: 5 rows in `data`, plus pagination metadata.

**Commit point:** Two of three new routes functional. The PDF route returns a method-not-found error until Task 7 — that's expected.

---

## Task 6: Backend — Blade template for the PDF

**Files:**
- Create: `backend/resources/views/pdf/activity_logs/index.blade.php`

- [ ] **Step 1: Create the Blade template**

Create the new file with this exact content:

```blade
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Activity Logs</title>
    <style>
        @page { margin: 28px 22px 36px 22px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1f2937; }
        .header { display: table; width: 100%; border-bottom: 1px solid #d1d5db; padding-bottom: 8px; margin-bottom: 10px; }
        .header .company { display: table-cell; vertical-align: middle; font-size: 14px; font-weight: bold; }
        .header .generated { display: table-cell; vertical-align: middle; text-align: right; font-size: 9px; color: #6b7280; }
        h1 { font-size: 15px; margin: 4px 0 6px 0; }
        .filter-summary { font-size: 9.5px; color: #374151; margin-bottom: 10px; line-height: 1.5; }
        .filter-summary span { display: inline-block; margin-right: 14px; }
        .filter-summary strong { color: #111827; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: #1f2937; color: #f9fafb; font-size: 9.5px; text-align: left; padding: 6px 6px; }
        tbody td { font-size: 9.5px; padding: 5px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        tbody tr:nth-child(even) td { background: #f9fafb; }
        .empty { padding: 18px; text-align: center; color: #6b7280; font-style: italic; }
        .footer { position: fixed; bottom: -22px; left: 0; right: 0; font-size: 8px; color: #9ca3af; text-align: center; }
        .pagenum:before { content: counter(page); }
    </style>
</head>
<body>
    <div class="header">
        <div class="company">{{ $company->name ?? 'Activity Logs' }}</div>
        <div class="generated">Generated {{ $generatedAt->format('d M Y H:i') }}</div>
    </div>

    <h1>Activity Logs</h1>

    @if(!empty($filterSummary))
        <div class="filter-summary">
            @foreach($filterSummary as $label => $value)
                <span><strong>{{ $label }}:</strong> {{ $value }}</span>
            @endforeach
        </div>
    @endif

    <table>
        <thead>
            <tr>
                <th style="width:18%">Action By</th>
                <th style="width:12%">Action</th>
                <th style="width:38%">Description</th>
                <th style="width:14%">Type</th>
                <th style="width:18%">Date Time</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    <td>{{ optional($row->user)->name ?: '—' }}</td>
                    <td>{{ $row->action ?: '—' }}</td>
                    <td>{{ $row->description ?: '—' }}</td>
                    <td>{{ $row->type ?: '—' }}</td>
                    <td>{{ $row->date_time ?: '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="5" class="empty">No records match the current filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">Page <span class="pagenum"></span></div>
</body>
</html>
```

This is dompdf-compatible (no flexbox, no modern CSS) and matches the dark-header / zebra-row look used by the existing attendance Blade templates.

**Commit point:** Template file exists but is unused until Task 7.

---

## Task 7: Backend — `exportPdf()` action + filter summary helper

**Files:**
- Modify: `backend/app/Http/Controllers/ActivityController.php`

- [ ] **Step 1: Add the dompdf import at the top of the file**

Add to the `use` block at the top of `ActivityController.php` (under the existing `use Illuminate\Http\Request;` line):

```php
use App\Models\Company;
use Barryvdh\DomPDF\Facade\Pdf;
```

(If `App\Models\Company` is already imported, skip that line — keep the imports unique.)

- [ ] **Step 2: Add `buildFilterSummary()` private helper**

Add this method to `ActivityController` (place it near the bottom of the class, just before the existing `store()` method):

```php
private function buildFilterSummary(Request $request): array
{
    $summary = [];

    if ($request->filled('from') && $request->filled('to')) {
        $summary['Date Range'] = date('d M Y', strtotime($request->from))
                              . ' → '
                              . date('d M Y', strtotime($request->to));
    }
    if ($request->filled('type'))      { $summary['Type']      = $request->type; }
    if ($request->filled('action'))    { $summary['Action']    = $request->action; }
    if ($request->filled('user_type')) { $summary['User Type'] = $request->user_type; }
    if ($request->filled('q'))         { $summary['Search']    = '"' . $request->q . '"'; }

    if ($request->filled('branch_id')) {
        $branch = \App\Models\Branch::find($request->branch_id);
        if ($branch) { $summary['Branch'] = $branch->branch_name; }
    }
    if ($request->filled('department_id')) {
        $department = \App\Models\Department::find($request->department_id);
        if ($department) { $summary['Department'] = $department->name; }
    }

    return $summary;
}
```

(`App\Models\Branch` / `App\Models\Department` are referenced with their fully-qualified namespace inline so no additional imports are required even if they don't exist yet — Laravel will throw a clear class-not-found error at runtime if they're wrong, which the implementer can then fix by checking the actual model namespace.)

- [ ] **Step 3: Add `exportPdf()` method**

Add this method to `ActivityController` (immediately after `actions()`):

```php
public function exportPdf(Request $request)
{
    $query = $this->filters($request)->orderByDesc("id");
    $count = $query->count();

    if ($count > 5000) {
        return response()->json([
            "message" => "Too many records ({$count}). Narrow the date range or apply more filters.",
        ], 422);
    }

    $rows = $query->get();
    $company = $request->filled('company_id')
        ? Company::find($request->company_id)
        : null;

    $pdf = Pdf::loadView('pdf.activity_logs.index', [
        'rows'          => $rows,
        'company'       => $company,
        'filterSummary' => $this->buildFilterSummary($request),
        'generatedAt'   => now(),
    ])->setPaper('a4', 'portrait');

    $filename = 'activity-logs-' . now()->format('Y-m-d') . '.pdf';
    return $pdf->download($filename);
}
```

- [ ] **Step 4: Manually verify the PDF endpoint**

```bash
curl -o test.pdf "http://localhost:8000/api/activity/pdf?company_id=<company_id>&from=2026-05-01&to=2026-05-29" -H "Authorization: Bearer <token>"
```

Expected: `test.pdf` opens in any PDF viewer, contains the header, a filter-summary line with `Date Range: 01 May 2026 → 29 May 2026`, and a table of activity rows.

Test the over-cap case by removing the date range (assuming there are >5000 rows total):
```bash
curl -i "http://localhost:8000/api/activity/pdf?company_id=<company_id>" -H "Authorization: Bearer <token>"
```

Expected: `HTTP/1.1 422` with `{"message":"Too many records (NNNN). ..."}`.

Test the empty-result case with a filter that matches nothing:
```bash
curl -o empty.pdf "http://localhost:8000/api/activity/pdf?company_id=<company_id>&q=ZZZZZZNONEXISTENT" -H "Authorization: Bearer <token>"
```

Expected: PDF opens, shows "No records match the current filters." in the table area, filter summary shows `Search: "ZZZZZZNONEXISTENT"`.

**Commit point:** Backend feature-complete. All three new endpoints work.

---

## Task 8: Frontend — `api.js` additions

**Files:**
- Modify: `frontend-new/src/lib/api.js`

- [ ] **Step 1: Add the three new exports**

Append immediately after the existing `getActivity` block (around [line 682](../../../frontend-new/src/lib/api.js#L682)):

```js
export const getActivityTypes = async () => {
    const { data } = await axios.get(`${API_BASE}/activity/types`, {
        params: await buildQueryParams(),
    });
    return data;
};

export const getActivityActions = async () => {
    const { data } = await axios.get(`${API_BASE}/activity/actions`, {
        params: await buildQueryParams(),
    });
    return data;
};

export const getActivityPdf = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/activity/pdf`, {
        params: await buildQueryParams(params),
        responseType: "blob",
    });
    return data;
};
```

- [ ] **Step 2: Smoke-test from the browser console**

With a logged-in admin session in `frontend-new`:

```js
const { getActivityTypes, getActivityActions } = await import('/_next/static/chunks/.../api.js');
// or simply:
await fetch('/api/activity/types').then(r => r.json())
```

Expected: arrays of distinct types/actions returned successfully.

**Commit point:** API client surface complete.

---

## Task 9: Frontend — Toolbar component + Page.js rewrite

**Files:**
- Create: `frontend-new/src/components/Activity/Toolbar.js`
- Modify: `frontend-new/src/components/Activity/Page.js`

- [ ] **Step 1: Create `Toolbar.js`**

Stateless. Lays out the two rows. All values and callbacks come in as props.

Use the model_type values recorded in Task 2 for the `USER_TYPE_OPTIONS` array — replace `<MODEL_TYPE_VALUE_1>` / `<MODEL_TYPE_VALUE_2>` with the strings recorded in the controller comment (e.g. `company` / `employee` or `App\Models\Company` / `App\Models\Employee`).

```js
"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import DateRangeSelect from "../ui/DateRange";

const USER_TYPE_OPTIONS = [
    { value: "<MODEL_TYPE_VALUE_1>", label: "Company" },
    { value: "<MODEL_TYPE_VALUE_2>", label: "Employee" },
];

const selectClass =
    "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 " +
    "rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full";

export default function Toolbar({
    search, onSearchChange,
    from, to, onDateChange,
    type, onTypeChange,
    action, onActionChange,
    userType, onUserTypeChange,
    branchId, onBranchChange,
    departmentId, onDepartmentChange,
    types = [],
    actions = [],
    branches = [],
    departments = [],
    onPrint,
    isExporting = false,
    hasActiveFilters = false,
    onClear,
}) {
    return (
        <div className="space-y-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search user or description..."
                    className={`${selectClass} flex-1 min-w-[240px]`}
                />
                <DateRangeSelect
                    value={{ from, to }}
                    onChange={({ from, to }) => onDateChange({ from, to })}
                />
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 flex items-center gap-1"
                    >
                        <X size={14} /> Clear filters
                    </button>
                )}
                <button
                    type="button"
                    onClick={onPrint}
                    disabled={isExporting}
                    className="ml-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2"
                >
                    <Printer size={16} />
                    {isExporting ? "Generating..." : "Print PDF"}
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <select className={selectClass} value={type} onChange={(e) => onTypeChange(e.target.value)}>
                    <option value="">All Types</option>
                    {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>

                <select className={selectClass} value={action} onChange={(e) => onActionChange(e.target.value)}>
                    <option value="">All Actions</option>
                    {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>

                <select className={selectClass} value={userType} onChange={(e) => onUserTypeChange(e.target.value)}>
                    <option value="">All User Types</option>
                    {USER_TYPE_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>

                <select className={selectClass} value={branchId} onChange={(e) => onBranchChange(e.target.value)}>
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                </select>

                <select className={selectClass} value={departmentId} onChange={(e) => onDepartmentChange(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Rewrite `Page.js`**

Replace the entire current contents of [frontend-new/src/components/Activity/Page.js](../../../frontend-new/src/components/Activity/Page.js) with:

```js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    getActivity,
    getActivityTypes,
    getActivityActions,
    getActivityPdf,
    getBranches,
    getDepartments,
} from "@/lib/api";

import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import Columns from "./columns";
import Toolbar from "./Toolbar";
import { parseApiError } from "@/lib/utils";

export default function Activity() {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("");
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [type, setType] = useState("");
    const [action, setAction] = useState("");
    const [userType, setUserType] = useState("");
    const [branchId, setBranchId] = useState("");
    const [departmentId, setDepartmentId] = useState("");

    const [types, setTypes] = useState([]);
    const [actions, setActions] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [total, setTotal] = useState(0);

    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        (async () => {
            try {
                const [t, a, b, d] = await Promise.all([
                    getActivityTypes().catch(() => []),
                    getActivityActions().catch(() => []),
                    getBranches().catch(() => []),
                    getDepartments().catch(() => []),
                ]);
                setTypes(Array.isArray(t) ? t : []);
                setActions(Array.isArray(a) ? a : []);
                setBranches(Array.isArray(b) ? b : (b?.data ?? []));
                setDepartments(Array.isArray(d) ? d : (d?.data ?? []));
            } catch (_) {
            }
        })();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchDebounced, from, to, type, action, userType, branchId, departmentId]);

    useEffect(() => {
        fetchRecords();
    }, [currentPage, perPage, searchDebounced, from, to, type, action, userType, branchId, departmentId]);

    const fetchRecords = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await getActivity({
                page: currentPage,
                per_page: perPage,
                q: searchDebounced || undefined,
                from: from || undefined,
                to: to || undefined,
                type: type || undefined,
                action: action || undefined,
                user_type: userType || undefined,
                branch_id: branchId || undefined,
                department_id: departmentId || undefined,
            });

            if (result && Array.isArray(result.data)) {
                setRecords(result.data);
                setCurrentPage(result.current_page || 1);
                setTotal(result.total || 0);
            } else {
                throw new Error("Invalid data structure from API.");
            }
        } catch (err) {
            setError(parseApiError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            setError(null);
            const blob = await getActivityPdf({
                q: searchDebounced || undefined,
                from: from || undefined,
                to: to || undefined,
                type: type || undefined,
                action: action || undefined,
                user_type: userType || undefined,
                branch_id: branchId || undefined,
                department_id: departmentId || undefined,
            });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (err) {
            if (err?.response?.status === 422 && err.response.data) {
                const msg = await (async () => {
                    const data = err.response.data;
                    if (data instanceof Blob) {
                        try { return JSON.parse(await data.text())?.message; } catch (_) { return null; }
                    }
                    return data?.message;
                })();
                setError(msg || "PDF export failed.");
            } else {
                setError(parseApiError(err));
            }
        } finally {
            setIsExporting(false);
        }
    };

    const handleClear = () => {
        setSearch("");
        setFrom(null);
        setTo(null);
        setType("");
        setAction("");
        setUserType("");
        setBranchId("");
        setDepartmentId("");
    };

    const hasActiveFilters = useMemo(() => {
        return Boolean(search || from || to || type || action || userType || branchId || departmentId);
    }, [search, from, to, type, action, userType, branchId, departmentId]);

    const columns = Columns({ pageTitle: "Activity" });

    return (
        <>
            <div className="flex flex-wrap items-center justify-between mb-6">
                <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center">
                        Activity
                    </h2>
                </div>
            </div>

            <Toolbar
                search={search} onSearchChange={setSearch}
                from={from} to={to}
                onDateChange={({ from, to }) => { setFrom(from); setTo(to); }}
                type={type} onTypeChange={setType}
                action={action} onActionChange={setAction}
                userType={userType} onUserTypeChange={setUserType}
                branchId={branchId} onBranchChange={setBranchId}
                departmentId={departmentId} onDepartmentChange={setDepartmentId}
                types={types}
                actions={actions}
                branches={branches}
                departments={departments}
                onPrint={handleExport}
                isExporting={isExporting}
                hasActiveFilters={hasActiveFilters}
                onClear={handleClear}
            />

            {error && (
                <div className="mb-3 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-200">
                    {String(error)}
                </div>
            )}

            <DataTable
                className="bg-slate-50 dark:bg-slate-900 overflow-hidden min-h-[700px]"
                columns={columns}
                data={records}
                isLoading={isLoading}
                error={null}
                pagination={
                    <Pagination
                        page={currentPage}
                        perPage={perPage}
                        total={total}
                        onPageChange={setCurrentPage}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                        pageSizeOptions={[10, 25, 50]}
                    />
                }
            />
        </>
    );
}
```

Notes embedded in the rewrite:
- `setError(null)` whenever a fetch starts so the over-cap banner clears on the next filter change.
- The DataTable receives `error={null}` instead of the state because we render the error banner ourselves above the table (lets one banner serve both list and export errors). This is intentional.
- `branches` and `departments` responses might be raw arrays or wrapped in `{ data: [...] }` (different endpoints in this project have used both shapes — visible in the existing controller patterns). The `?.data ?? []` fallback handles both without an extra fetch.

- [ ] **Step 3: Run the frontend dev server and load `/activity`**

```bash
cd frontend-new
npm run dev
```

Open `http://localhost:3000/activity` (or whatever port + path the project uses). Verify the toolbar renders the two rows as in the prototype.

**Commit point:** Frontend feature-complete. Move to end-to-end manual verification.

---

## Task 10: End-to-end manual verification

**Files:** none modified — verification only.

Run through the test plan from the spec. Tick each item off:

- [ ] **Step 1: Each filter alone**
  Set only Type → confirm rows narrow. Reset. Set only Action → confirm. Repeat for User Type, Branch, Department.

- [ ] **Step 2: Search alone**
  Type a substring of a known user name → confirm rows narrow. Type a substring of a description (e.g. `1000000748`) → confirm. Type fast and confirm only one network request fires after ~300ms (Network tab).

- [ ] **Step 3: Combined filters**
  Set Type + User Type + a search term + a date range simultaneously → confirm result count matches expectation.

- [ ] **Step 4: Clear filters**
  With several filters set, click **Clear filters**. Every control resets and the list reloads with no params.

- [ ] **Step 5: Pagination reset**
  Go to page 3 of results. Change any filter. Confirm `currentPage` resets to 1.

- [ ] **Step 6: PDF — small result set**
  Apply filters that yield, say, 20 rows. Click Print PDF. New tab opens, PDF renders correctly with the filter summary at top and the 20 rows.

- [ ] **Step 7: PDF — over-cap**
  Clear all filters (so the result is >5000 rows). Click Print PDF. The red inline banner appears with the "Too many records (N)..." message. No download happens.

- [ ] **Step 8: PDF — empty result**
  Set search to a string matching nothing (e.g. `zzzzznonexistent`). Click Print PDF. PDF opens with the filter summary and "No records match the current filters." in the table area.

- [ ] **Step 9: Type/Action dropdowns**
  Confirm they list real distinct values from the DB (today: probably just `Authentication` and `Login` respectively — that's correct).

- [ ] **Step 10: Date-range-only regression**
  Without touching any new control, pick a date range. Behavior matches before this work (paginated list of activities in that range).

**Commit point:** Feature done. Hand off any defects discovered as fix-up tasks.

---

## Self-Review

**Spec coverage check:**
- Two-row toolbar (search + date + print on row 1, five dropdowns on row 2): Task 1 (prototype) → Task 9 (React).
- Clear filters link: Task 9.
- Debounced search (300ms): Task 9, Step 2.
- Pagination resets on filter change: Task 9, dedicated `useEffect`.
- Backend `q` clause on user name + description: Task 3.
- Type/Action distinct endpoints: Task 4 + Task 5.
- User Type model_type values verified from DB: Task 2.
- PDF endpoint at `/activity/pdf`: Task 5 (route) + Task 7 (action).
- 5000-row cap with 422 + readable message: Task 7, Step 3.
- Filter summary in PDF header: Task 7, Step 2 + Task 6 (template).
- Blade template at `pdf.activity_logs.index`: Task 6.
- Use `Pdf::loadView` (dompdf) per existing pattern: Task 7.
- HTML prototype gate first: Task 1.
- Manual end-to-end test checklist: Task 10.

No unmet spec items found.

**Placeholder scan:** The plan intentionally contains `<MODEL_TYPE_VALUE_1>` / `<MODEL_TYPE_VALUE_2>` placeholders inside Task 9, but Task 2 produces the concrete values and writes them as a comment in `ActivityController.php` for the implementer to copy. These are not "TBD" — they are variables defined by a prior task. `<token>` / `<company_id>` in curl commands are runtime values that vary per session, not plan placeholders.

**Type/name consistency:** Frontend `q` ↔ backend `q`; `user_type` snake_case both sides; `branch_id` / `department_id` snake_case both sides; `Toolbar` callback props use the canonical state setter names; filter summary keys in PDF (`Date Range`, `Type`, `Action`, `User Type`, `Search`, `Branch`, `Department`) match what `buildFilterSummary()` returns. Consistent.
