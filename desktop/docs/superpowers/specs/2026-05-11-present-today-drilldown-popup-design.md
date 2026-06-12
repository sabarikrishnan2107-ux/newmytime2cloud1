# Present Today Drill-Down Popup — Design

## Goal

Clicking the **Present Today** card in the Executive Overview opens a modal listing the employees represented by that count. The list mirrors the styling of the existing Live Recognition Feed and honors the dashboard's active Branch / Department filters.

## Definition of "Present"

Identical to `ThemeController::getDashboardCounts`: a unique employee with at least one `AttendanceLog` row dated today (any device). Whatever number the Present Today card shows, the popup row count matches it.

## Backend

**Route** (`backend/routes/theme.php`):

```
Route::get('dashboard_present_employees', [ThemeController::class, "presentEmployees"]);
```

**Method** — new `ThemeController::presentEmployees(Request $request)`:

- Accepts the same params as `getDashboardCounts`: `company_id`, optional `branch_id`, `department_id`, `branch_ids[]`, `department_ids[]`.
- Query: `AttendanceLog` for today, filtered to employees in the company and matching the branch/department filters. Group by `UserID` so each employee appears once. Pull `MIN(LogTime)` as `first_punch_time` and the device for that earliest log.
- Eager-loads employee, branch, department, device.
- Returns an array of objects with these fields:

  ```
  id, employee_id, first_name, last_name, full_name, photo,
  branch: { id, name },
  department: { id, name },
  first_punch_time,            // ISO datetime
  first_punch_device           // device name string
  ```

- Sorted by `first_punch_time` ascending (earliest arrivals first).

## Frontend

### Endpoint helper

In `frontend-new/src/lib/endpoint/dashboard.js`:

```js
export const getPresentEmployees = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/dashboard_present_employees", { params: queryParams });
    return data;
};
```

### `Stats.jsx` changes

- Add an optional `onClick` prop to `StatCard`. When set, render the card with `role="button"`, `cursor-pointer`, and a subtle hover ring; keyboard-activatable via `Enter` / `Space`.
- Add local state `presentOpen` in `Stats`. Wire `onClick={() => setPresentOpen(true)}` on the Present Today card only.
- Render `<PresentEmployeesDialog open={presentOpen} onOpenChange={setPresentOpen} branch_ids={...} department_ids={...} />`.

### `PresentEmployeesDialog.jsx` (new)

Built on `components/ui/dialog.jsx` (Radix).

- Fetches `getPresentEmployees` when `open` flips to true (not before). Each open is a fresh fetch.
- Header:
  - Title: **Present Today** + green pill showing the count
  - Subtitle line: the current date (e.g., `May 11, 2026`) plus active filter context if any (`Branch: TANJORE, KODAI · Dept: Front office`).
- Search input — client-side filter across name, employee ID, branch name, department name.
- Table:

  | # | Employee (photo · name · ID) | Branch | Department | First Punch-In | Device |

  Sticky header, scrollable body capped to roughly `70vh`, zebra rows, matches the dark `#101a30` palette and light-mode counterpart already in use.
- States:
  - Loading: 6 skeleton rows
  - Empty: friendly message with a `UserCheck` icon — "No employees present yet today."
  - Error: inline message with a retry button.

## File touch list

- `backend/app/Http/Controllers/ThemeController.php` — add `presentEmployees()`.
- `backend/routes/theme.php` — register route.
- `frontend-new/src/lib/endpoint/dashboard.js` — add `getPresentEmployees`.
- `frontend-new/src/components/Dashboard/Stats.jsx` — clickable `StatCard`, dialog wiring.
- `frontend-new/src/components/Dashboard/PresentEmployeesDialog.jsx` — new component.

## Out of scope (v1)

- Pagination — list is bounded by company headcount; client-side search/sort is enough.
- Clicking an employee row to navigate to the profile — easy to add later.
- Making other cards (Unplanned Absence, Scheduled Leave, …) clickable — the `StatCard` change leaves the door open but only Present Today is wired this session.
