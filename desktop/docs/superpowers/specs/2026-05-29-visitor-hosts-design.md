# Visitor Management — Host List — Design

**Status:** Approved (brainstorming)
**Date:** 2026-05-29
**Author:** mail@akilgroup.com

## Goal

Add a **Host List** tab to the Visitor Management sidebar. Admins can add, edit, and delete designated hosts (the employees that visitors come to see). Host display data (name, employee ID, department) reads live from the linked employee record, so the two lists never drift out of sync.

## Non-Goals

- No host availability / working-hours schedule.
- No bulk add. Admin selects one employee at a time.
- No automatic enrolment of every new employee. The list is manually curated.
- No public-facing host directory.
- The existing `/visitor-management/hosts` consumer (Visitor Reports filter) keeps working unchanged — the response shape stays additive.

## Data Model

The `host_companies` table already exists with the columns we need: `id`, `company_id`, `employee_id`, `branch_id`, `zone_id` (and likely a `logo` column based on the `HostCompany::getLogoAttribute` accessor). No migration is required for the MVP.

We will add **one optional column** — `notes` (text, nullable) — to allow admins to record arbitrary context about why an employee is on the host list. If the table doesn't already have this column, a small migration is included; if it does, the migration is a no-op.

The model uses `protected $guarded = []`, so the new column will be mass-assignable automatically.

## Backend API

All four CRUD endpoints live under the existing `visitor-management` route prefix and call methods on `VisitorManagementController`.

| Method | Path                                  | Action  | Notes |
| ------ | ------------------------------------- | ------- | ----- |
| GET    | `/visitor-management/hosts`           | List    | Already exists. Extend the response to include `branch:id,name`, `zone:id,name`, and `notes`. |
| POST   | `/visitor-management/hosts`           | Create  | Payload: `{ company_id, employee_id, branch_id?, zone_id?, notes? }`. Validates that `employee_id` is unique within the company (one host record per employee). Returns the new row with relations. |
| PUT    | `/visitor-management/hosts/{id}`      | Update  | Same payload shape. `employee_id` is editable so admin can re-link if needed. |
| DELETE | `/visitor-management/hosts/{id}`      | Delete  | Removes the `host_companies` row. The linked Employee record is **never** touched. |

**Validation rules (Create + Update):**

- `employee_id` — required, must exist in `employees` for this `company_id`.
- `branch_id` — optional, must exist in `company_branches` if provided.
- `zone_id` — optional, must exist in `zones` if provided.
- `notes` — optional, max 1000 chars.
- Unique compound: `(company_id, employee_id)` — no duplicate host rows for the same employee.

## Frontend

### Menu

Add a new entry in `frontend-new/src/lib/menuData.js` inside `visitorMenu` immediately after Directory and before Pre-Register:

```js
{ href: "/visitor/hosts", icon: UserCheck, label: "menu.hosts" },
```

Also add the corresponding key to the route → menu map so the sidebar highlights correctly on `/visitor/hosts`. Translation strings: English `"Hosts"`, with placeholder keys for the other locale files (ar, fr, hi) that the user can fill in later.

### Page

`frontend-new/src/app/visitor/hosts/page.js` mounts the Suspense wrapper that imports `HostsClient`, following the existing `/visitor/directory` pattern.

`frontend-new/src/components/Visitor/Hosts.jsx` contains the page itself:

- Page header: title "Hosts" + subtitle "Designated employees who receive visitors", plus an "Add Host" button.
- Search input filtering by employee name / ID.
- A responsive grid (or table) of host cards, each showing: avatar, employee name (read live from `host.employee.full_name`), employee ID, department, branch, zone, and an actions kebab/icon row with Edit and Delete.
- Empty state: a friendly card with a CTA button to add the first host.

### Modal

`frontend-new/src/components/Visitor/HostModal.jsx` is reused for Add and Edit:

- **Employee** — searchable dropdown of all employees (sourced from the existing `/visitor-management/host-employees` endpoint). Required.
- **Branch** — dropdown (sourced from existing `/branch-list`). Optional. Defaults to the picked employee's branch.
- **Zone** — dropdown (sourced from existing zones endpoint). Optional.
- **Notes** — textarea, optional.
- Footer buttons: Cancel / Save. Save calls `POST` or `PUT` depending on whether `host.id` is set.

### Sync Behavior

Because each `host_companies` row links to an employee by `employee_id`, the host's display data (name, employee ID, department, branch) is read **live** from the Employee model. Renaming an employee on the Employees page automatically updates the Host List on next refresh. No double-entry. No background sync job needed.

If an employee is deleted from the system, the host row will show a placeholder ("Employee removed") until an admin re-links or deletes it. We do **not** auto-delete host rows when their employee is deleted (to preserve audit trail and avoid surprising data loss).

## Build Sequence

1. HTML prototype `prototypes/visitor-hosts-sample.html` + screenshot for user approval.
2. Backend migration (if `notes` column missing) + four controller methods + route registration.
3. Frontend menu entry + page + modal.
4. Production build (`.next/`) for FileZilla upload.

Backend ships first (the endpoints), then frontend. Both are non-breaking — they add to existing endpoints without changing legacy contracts.

## Risks

- **Mid-rollout state:** during the time when the backend is deployed but the new frontend hasn't been pushed yet, existing consumers of `/visitor-management/hosts` (Visitor Reports filter) will see the extra `branch`, `zone`, `notes` fields in the response. They ignore unknown fields, so this is safe.
- **Stale employee link:** if an admin deletes an employee, the host row becomes orphaned. We render a placeholder rather than crashing.
- **No bulk operations:** could become tedious for very large host lists. Out of scope for v1; can add CSV import later if needed.
