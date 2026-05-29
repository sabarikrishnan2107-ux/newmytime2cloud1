# Activity Logs — Filters, Search, and PDF Export

**Date:** 2026-05-29
**Status:** Approved
**Scope:** Frontend (React) + Backend (Laravel) + PDF Blade template

## Problem

The Activity page at `/activity` ([frontend-new/src/components/Activity/Page.js](../../../frontend-new/src/components/Activity/Page.js)) currently shows a paginated table of login events with only a date-range filter. Admins/auditors cannot:

- Filter by Type, Action, User Type, Branch, or Department.
- Search for a specific user or description text.
- Export the filtered log for offline review or archiving.

This spec adds those three capabilities. **Out of scope:** expanding what gets logged. Today the only recorded event is "Login / Authentication"; broadening event coverage is a separate effort. The filters and PDF will still be designed so they remain useful as more event types come online later.

## Goals

1. Page exposes Type, Action, User Type, Branch, Department dropdown filters in addition to the existing date range.
2. Page exposes a debounced search box that matches **user name OR description**.
3. Page exposes a "Print PDF" button that downloads a PDF of **all rows matching the current filter set** (capped at 5,000 rows).
4. No regression to the existing date-range filter or pagination.

## Non-Goals

- Recording new activity types/actions (e.g. employee CRUD, settings edits).
- CSV/Excel export.
- Browser print stylesheet.
- Per-column sort controls.
- Saved filter presets.

## User Experience

### Toolbar — two-row layout

```
[Activity]  [Clear filters]                                                 <h2 + link>
─────────────────────────────────────────────────────────────────────────
Row 1:   [Search user or description...]   [Date range ▾]      [⎙ Print PDF]
Row 2:   [Type ▾]  [Action ▾]  [User Type ▾]  [Branch ▾]  [Department ▾]
─────────────────────────────────────────────────────────────────────────
[ DataTable ...                                                          ]
[ Pagination ...                                                         ]
```

- Row 1 holds search (grows to fill space), the existing `DateRangeSelect`, and the Print PDF button anchored right.
- Row 2 is five single-select dropdowns, equal-width, in the order shown.
- **"Clear filters"** link appears next to the page heading whenever any of: search, type, action, user type, branch, department, date range is set. Clicking it resets all of them.
- All controls are always visible (no collapsible panel). On narrow screens the rows wrap naturally.

### Interaction details

- **Search**: 300ms debounce. Hitting Enter is equivalent to waiting for the debounce.
- **Any filter change** (search, dropdown, date range) resets pagination to page 1.
- **Empty state**: the existing DataTable empty state is fine; no copy changes.
- **Loading**: existing `isLoading` spinner covers filter changes.
- **Errors**: existing `parseApiError` toast/inline error covers list endpoint failures. PDF endpoint errors (including the over-cap 422) are shown inline above the table via the same `error` state.

### Print PDF flow

1. User clicks **⎙ Print PDF**.
2. Button enters a loading state (spinner + disabled).
3. Frontend calls `GET /activity/pdf` with the current filter query params.
4. **Success**: receives a PDF blob, opens it in a new tab via `window.open(URL.createObjectURL(blob))`. Button returns to idle.
5. **Over-cap (422)**: shows the server message inline ("Too many records (N). Narrow the date range or apply more filters.") and the download is not triggered.
6. **Other failure**: shows the parsed error inline.

### HTML prototype gate

Per the project's standing UI workflow, a standalone HTML mockup is produced **before** any React work:

- File: `prototypes/activity-logs-sample.html`
- Shows the two-row toolbar, an example populated table, the loading state, and an example "over-cap" error banner.
- User reviews screenshots and approves before React implementation begins.

## Architecture

### Frontend

**File: [frontend-new/src/components/Activity/Page.js](../../../frontend-new/src/components/Activity/Page.js)**

Adds the following state:

```js
const [search, setSearch] = useState("");           // debounced into searchDebounced
const [searchDebounced, setSearchDebounced] = useState("");
const [type, setType] = useState("");
const [action, setAction] = useState("");
const [userType, setUserType] = useState("");
const [branchId, setBranchId] = useState("");
const [departmentId, setDepartmentId] = useState("");
const [isExporting, setIsExporting] = useState(false);
```

- `useEffect` debounces `search` → `searchDebounced` (300ms).
- The existing list `useEffect` adds all new states to its dependency array and forwards them to `getActivity()` as `q`, `type`, `action`, `user_type`, `branch_id`, `department_id`.
- A second `useEffect` resets `currentPage` to 1 when any filter changes.
- New `handleExport` function calls `getActivityPdf()` (see API section) and handles the blob/error.
- New `handleClearFilters` resets all six new states and the date range.

**File: [frontend-new/src/lib/api.js](../../../frontend-new/src/lib/api.js)**

Add three new functions:

```js
export const getActivityPdf = async (params = {}) => {
  const { data } = await axios.get(`${API_BASE}/activity/pdf`, {
    params: await buildQueryParams(params),
    responseType: "blob",
  });
  return data; // Blob
};

export const getActivityTypes = async () => {
  const { data } = await axios.get(`${API_BASE}/activity/types`);
  return data; // string[]
};

export const getActivityActions = async () => {
  const { data } = await axios.get(`${API_BASE}/activity/actions`);
  return data; // string[]
};
```

`getBranches` and `getDepartments` already exist in `api.js` — reuse them.

**Dropdown option loading** (in `Page.js`):

- `useEffect` on mount loads types, actions, branches, departments in parallel via `Promise.all`.
- User Type options are hardcoded with two entries (label "Company" and "Employee"). The exact `value` strings sent to the API must match whatever `Activity.model_type` actually stores — sampled from the DB during implementation, since `recordActivity()` writes `$user->user_type` into `model_type` and the literal value of that field has not been verified yet.

### Backend

**File: [backend/app/Http/Controllers/ActivityController.php](../../../backend/app/Http/Controllers/ActivityController.php)**

1. **`filters()` — add `q` search clause:**

```php
$model->when($request->filled("q"), function ($query) use ($request) {
    $term = "%" . $request->q . "%";
    $query->where(function ($q) use ($term) {
        $q->whereHas("user", fn($u) => $u->where("name", "like", $term))
          ->orWhere("description", "like", $term);
    });
});
```

   Placed inside the existing `filters()` so it AND-combines with company/type/action/etc.

2. **New action `types()`:**

```php
public function types(Request $request) {
    return Activity::query()
        ->when($request->filled("company_id") && $request->company_id > 0,
            fn($q) => $q->where("company_id", $request->company_id))
        ->whereNotNull("type")
        ->distinct()
        ->orderBy("type")
        ->pluck("type");
}
```

3. **New action `actions()`:** same shape as `types()`, distinct on `action`.

4. **New action `exportPdf()`:**

```php
public function exportPdf(Request $request) {
    $query = $this->filters($request)->orderByDesc("id");
    $count = $query->count();
    if ($count > 5000) {
        return response()->json([
            "message" => "Too many records ({$count}). Narrow the date range or apply more filters.",
        ], 422);
    }
    $rows = $query->get();
    $filterSummary = $this->buildFilterSummary($request);
    // Hand off to the project's existing PDF pipeline (see PDF Generation section).
    return $this->renderActivityPdf($rows, $filterSummary, $request);
}
```

   `buildFilterSummary()` is a private helper returning a small associative array (label → value) for whichever filter params were actually set. Used by the Blade template's header.

**File: [backend/routes/api.php](../../../backend/routes/api.php)** (or wherever the `/activity` route is defined — to be confirmed during implementation)

Add:

```php
Route::get("/activity/types",   [ActivityController::class, "types"]);
Route::get("/activity/actions", [ActivityController::class, "actions"]);
Route::get("/activity/pdf",     [ActivityController::class, "exportPdf"]);
```

Order matters: these must be registered before any `/activity/{id}` parameterized routes if such exist.

### PDF generation

The project's attendance reports are generated server-side via **dompdf** (`Barryvdh\DomPDF\Facade\Pdf::loadView(...)`), as used in [backend/app/Http/Controllers/Reports/MonthlyController.php:372](../../../backend/app/Http/Controllers/Reports/MonthlyController.php#L372). The activity PDF uses the same mechanism:

```php
return Pdf::loadView('pdf.activity_logs.index', [
    'rows'            => $rows,
    'company'         => $company,
    'filterSummary'   => $filterSummary,
    'generatedAt'     => now(),
])->download("activity-logs-" . now()->format('Y-m-d') . ".pdf");
```

(The separate Node `pdf-service` in this repo is used for a different family of Puppeteer-based "summary" reports — it is **not** what attendance reports use, and is **not** what this feature uses.)

**New template: `backend/resources/views/pdf/activity_logs/index.blade.php`**

Sections:

- **Header partial** (reused from attendance templates): company name, company logo, generated-at timestamp.
- **Title row**: "Activity Logs".
- **Filter summary block**: one line per active filter, e.g.
  - `Date Range: 01 May 2026 → 25 May 2026`
  - `Type: Authentication`
  - `Search: "1000000748"`
  Omits any filter that wasn't set so the block stays compact. Always rendered (even if empty, the block disappears).
- **Data table**: columns Action By, Action, Description, Type, Date Time. Same row formatting helpers the existing templates use (alternating row backgrounds, em-dash for nulls).
- **Footer partial**: "Page X of Y" and a small generated-at line.

The template is sized for A4 portrait, matching attendance reports. Long descriptions wrap; no truncation.

## Data flow

```
Page.js                   api.js                  Laravel                    DB
  │                         │                        │                        │
  │ filter change           │                        │                        │
  ├────────► debounce ─────►│                        │                        │
  │ getActivity({...})      │ GET /activity?q=&...   │ ActivityController     │
  │                         ├───────────────────────►│   @index               │
  │                         │                        ├───────────────────────►│ paginated rows
  │ ◄──────────────────────────────────────────────┤                        │
  │                                                                            │
  │ Print clicked                                                              │
  │ getActivityPdf({...})   │ GET /activity/pdf?...  │ ActivityController     │
  │                         ├───────────────────────►│   @exportPdf           │
  │                         │                        │  count > 5000? 422     │
  │                         │                        │  else: Pdf::loadView   │
  │                         │                        │       (dompdf)         │
  │ ◄────────── blob ──────────────────────────────┤                        │
  │ open in new tab                                                            │
```

## Edge cases & error handling

- **Empty search**: treated as no `q` param (controller already guards with `filled()`).
- **Search special chars** (`%`, `_`): not escaped in v1 — LIKE wildcards in user input are a minor convenience leak, not a security issue, and the activity log is read-only by admins. If it becomes a complaint, escape later.
- **No matching rows**: list endpoint returns empty array (existing behavior); PDF endpoint still generates a PDF with zero rows (filter summary + "No records" message in the table area).
- **Over-cap PDF**: 422 with a human-readable message. The frontend surfaces it inline; no download triggered.
- **Concurrent filter changes during a pending list request**: existing behavior — the latest response wins. No request cancellation in v1.
- **PDF generation failure** (pdf-service down, etc.): 500 with the project's standard error shape; frontend shows the parsed error.
- **User Type model class names**: if `Activity.model_type` stores values that don't match `App\Models\Company` / `App\Models\Employee` exactly, the dropdown values are corrected during implementation by sampling the DB.

## Testing

Manual (the project's existing pattern — no automated test suite for this area):

1. Filter combinations: each dropdown alone, search alone, search + dropdown, all together, with and without date range. Verify result counts in the URL match the table.
2. Clear filters: resets every control and reissues the list call.
3. Pagination resets to 1 on each filter change.
4. Search debounce: typing fast triggers one request, not one per keystroke.
5. PDF export with small result set → opens in new tab.
6. PDF export with > 5000 row result set → inline 422 message, no download.
7. PDF export with all filters set → filter summary in PDF header matches what was applied.
8. PDF export with zero matching rows → PDF still opens, shows empty-state message.
9. Type/Action dropdowns are populated from real DB distinct values, scoped to the current company.
10. Existing date-range-only flow still works unchanged.

## Files touched

**New:**
- `prototypes/activity-logs-sample.html`
- `backend/resources/views/pdf/activity_logs/index.blade.php`

**Modified:**
- `frontend-new/src/components/Activity/Page.js`
- `frontend-new/src/components/Activity/columns.js` (only if column tweaks are needed for the PDF — likely not)
- `frontend-new/src/lib/api.js`
- `backend/app/Http/Controllers/ActivityController.php`
- `backend/routes/api.php` (or wherever `/activity` is defined; confirmed during implementation)

## Open questions resolved during brainstorm

- Scope: UI only, do not expand what gets logged. ✅
- Filters surfaced: Type, Action, User Type, Branch, Department. ✅
- Search target: user name + description. ✅
- Export format: PDF only. ✅
- PDF scope: all rows matching filters, capped at 5,000. ✅
- Toolbar layout: two-row, always visible. ✅
