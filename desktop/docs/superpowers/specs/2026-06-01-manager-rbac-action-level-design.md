# Manager RBAC — Action-Level (CRUD) Permission Enforcement (Design)

**Date:** 2026-06-01
**Status:** Approved (design) — ready for implementation plan
**Scope:** Frontend-only, action-level (Access / View / Create / Edit / Delete) enforcement for **manager logins only**
**Builds on:** `2026-05-21-manager-rbac-page-access-design.md` (module/page-level gating, already shipped)

## 1. Problem & Goal

An admin creates **Roles** (`/roles/create`) with per-feature checkboxes — **Access, View, Create, Edit, Delete** — and assigns a role to a **Manager Login**. The previous phase enforced only *module/page-level* access (which top-nav modules a manager sees). The granular checkboxes are **saved but ignored**: a manager whose role grants only "Edit" can still see Create and Delete buttons.

**Goal:** After a manager logs in, the customized role permissions actually take effect — the manager sees and can use only the actions their role grants. The **admin / company-owner login is never affected** and continues to see everything.

## 2. Hard Rules (non-negotiable)

1. **Manager-login-only.** Gating applies *only* to a manager login that has an assigned role. The admin/company-owner (`user_type === 'company'`, or any login without a role+modules map) is never gated — full access, unchanged. Reuses the existing `isManagerUser(user)` predicate.
2. **Deny by default (managers).** For a manager, any action whose checkbox is unchecked is **denied**. Only explicitly-checked permissions are allowed.
3. **Frontend-only.** Enforcement is in the UI (hide/disable buttons, block routes/tabs, hide lists). Backend API routes are *not* hardened in this phase — a technical user could still bypass via direct API calls. Backend authorization remains a separate, larger future project (same posture as the 2026-05-21 phase).

## 3. Current State (verified)

- **Role data:** `roles` table stores `modules` (JSON `{module:boolean}`) and `permissions` (JSON `module → submodule → {access,view,create,edit,delete}`). Config source: `frontend-new/src/lib/permissions.js` (`PERMISSION_TYPES`, `modules`, `card_content`). The create/edit page (`app/roles/create/page.js`) already writes both shapes via `storeRole`/`updateRole`.
- **Login response** includes the assigned `role` (modules + permissions). Stored at `localStorage.user.role`.
- **Module-level RBAC (shipped):** `src/lib/moduleAccess.js` (`NAV_MODULES`, `isManagerUser`, `allowedModulesForUser`, `moduleForPath`, `canUserAccessPath`, `firstAllowedHrefForUser`); `src/components/AccessGuard.jsx` (route gate in `LayoutShell`); `Header.js` nav filtering. **These handle modules only** — the `permissions` JSON is currently unused at runtime.
- **App is a static export** (`output: 'export'`) → no Next.js middleware; all gating is client-side.
- **Page patterns:** list pages render a Create button (e.g. `employees/page.js` `Plus`) and pass row-level edit/delete handlers into a `Columns(...)` factory consumed by `DataTable`. Tabbed areas (Settings/Setup, Leave dashboard, Visitor, Payroll) render their own tab/sub-nav bars.

## 4. Architecture

A single permission layer that every page reads from. Three pieces + an extended route guard.

### 4.1 Permission resolver — extend `src/lib/moduleAccess.js` (pure, unit-testable)

```js
// Map a submodule id back to its owning module + the action map for a user.
// Non-managers => always allowed. Managers => deny-by-default from role.permissions.
export function can(user, submoduleId, action) {
  if (!isManagerUser(user)) return true;            // admin/company-owner: full access
  const feature = FEATURES_BY_SUBMODULE[submoduleId];
  if (!feature) return true;                         // unregistered/neutral feature: allow
  const moduleKey = feature.module;
  if (!allowedModulesForUser(user)[moduleKey]) return false;  // module off => deny everything
  const perms = user?.role?.permissions?.[moduleKey]?.[submoduleId];
  return !!perms?.[action];                           // unchecked/missing => false
}
```

- `action` ∈ `{ access, view, create, edit, delete }`.
- Module must also be allowed (existing `allowedModulesForUser`); a feature whose module is off is implicitly denied. `can()` additionally guards on the module being on for managers.
- Defensive: manager with no `role` / no `permissions` → everything denied (deny-by-default).

### 4.2 Feature registry — `src/lib/featureAccess.js` (new)

The single source mapping each submodule id (from `card_content`) to its module, its route prefix(es), and tab metadata. Drives sub-feature route-blocking **and** inner-tab filtering.

```js
export const FEATURES = [
  // { submodule, module, routes:[...], tabOf?: <tabGroupId>, labelKey? }
  { submodule: 'dashboard',                       module: 'dashboard',  routes: ['/'] },
  { submodule: 'employees',                       module: 'employees',  routes: ['/employees'] },
  { submodule: 'employees/employee_photo_upload', module: 'employees',  routes: ['/employees/employee_photo_upload'] },
  { submodule: 'leaves',                          module: 'employees',  routes: ['/leaves'] },
  { submodule: 'document-expiry',                 module: 'employees',  routes: ['/document-expiry'] },
  // … all submodules for attendance, payroll, report, settings, leave,
  //    live_tracker, access_control, visitors
];
```

Two derived lookups:
- `FEATURES_BY_SUBMODULE` — `{ submoduleId: feature }`.
- `featureForPath(pathname)` — longest-prefix match over `routes` → submodule id (or `null` for neutral/shared pages, which stay accessible).

**The implementation plan must enumerate every submodule's real route(s) by reading the `app/` tree.** Known ambiguities to resolve there: the Settings module's many tabs (`setup`, `geo-fencing`, `company`, `branch`, `department-tabs`, `login/manager-login`, `device`, `automation`, `roles`, `holiday`, `announcements`, `activity`, `payslips`), the Leave module split (`leave-dashboard` vs `leave`), and the Payroll single-submodule mapping (§7).

### 4.3 React API — `src/hooks/usePermission.js` (new) + `src/components/Can.jsx` (new)

- **Hook:** `const { can, user } = usePermission();` → `can('employees','create')`. Reads the live user (subscribes to the existing `userUpdated` event, same pattern as `AccessGuard`) and delegates to the §4.1 resolver.
- **Component:** `<Can submodule="employees" action="delete">…</Can>` renders children only if allowed; optional `fallback` prop (default: render nothing). Thin wrapper over the hook.

Pages choose whichever fits: `<Can>` for wrapping a button/JSX block; `can(...)` for conditional logic (e.g. building `Columns` row actions).

### 4.4 Route guard — extend `src/components/AccessGuard.jsx`

Today it blocks at module level via `canUserAccessPath`. Add a second check for managers: resolve `featureForPath(path)`; if it maps to a submodule whose `access` is **not** granted, redirect to `firstAllowedHrefForUser(user)` (same redirect/no-loop logic already present). Module-level check runs first; sub-feature check second.

### 4.5 Inner-tab / sub-nav filtering

Each tabbed area filters its tab list through `can(submodule,'access')` so a manager only sees tabs their role grants. Centralize per area using the registry's `tabOf` metadata where a shared tab bar exists; otherwise filter inline at each tab-bar render site. Tab bars to cover: **Settings/Setup**, **Leave dashboard**, **Visitor**, **Payroll** (Payroll filters by the single `payslips` submodule — all-or-nothing for now).

### 4.6 Page-level application (all 10 modules)

For every list/detail page, wrap:
- **Create button** → `<Can submodule={id} action="create">`.
- **Row Edit / Delete actions** (inside the `Columns(...)` factory) → guard with `can(id,'edit')` / `can(id,'delete')` so the icons don't render.
- **List/table/detail body** → guard with `can(id,'view')`; when off, render a "You don't have permission to view this" placeholder instead of the data.

## 5. Data Flow

1. Admin creates a Role with per-feature checkboxes → `POST /role` → `roles.permissions` JSON.
2. Admin assigns the role to a Manager Login (`role_id` on user).
3. Manager logs in → response includes `role.permissions` → saved to `localStorage.user`.
4. `usePermission`/`<Can>` and the extended `AccessGuard` read it → buttons, tabs, views, and sub-routes are gated.
5. Admin/company-owner login → `isManagerUser` false → every `can()` returns true → no change.

## 6. Edge Cases

- **Admin/company-owner:** never gated (rule §2.1).
- **Manager, module on, action unchecked:** denied (deny-by-default).
- **Manager, module off:** entire feature denied (module check precedes action check).
- **Manager with no role / no permissions:** everything denied; AccessGuard shows the existing "No access" message if zero modules.
- **Neutral/shared pages** (profile, support, account) map to no feature → always allowed.
- **Roles created before a submodule existed:** that submodule absent from `permissions` → denied (consistent).
- **`view` off but `access` on:** route/tab opens but the data body shows the permission placeholder.

## 7. Known Limitation — Payroll single submodule

The role page exposes only one Payroll submodule (`payslips`). All payroll sub-pages (salary structures, adjustments, loans, reports, register, settings) therefore share **one** permission set — they are not individually gated. Deferred: adding per-tab Payroll submodules to `permissions.js` + the role page (would be a follow-up phase).

## 8. Testing

- **Unit (pure):** `can(user, submodule, action)` and `featureForPath(path)` — table-driven: admin→all true; manager deny-by-default; module-off precedence; unregistered path→allow; neutral path→allow.
- **Manual / e2e:** create roles with varied checkbox subsets; assign to manager logins; log in as each and verify (a) only granted Create/Edit/Delete buttons appear, (b) `view`-off pages show the placeholder, (c) `access`-off sub-routes redirect and their tabs are hidden, (d) admin login still sees everything. Confirm with screenshots.

## 9. Files

**New:** `src/lib/featureAccess.js`, `src/hooks/usePermission.js`, `src/components/Can.jsx`, unit tests for resolver + `featureForPath`.
**Edited:** `src/lib/moduleAccess.js` (add `can`), `src/components/AccessGuard.jsx` (sub-feature route block), tab-bar render sites (Settings/Setup, Leave dashboard, Visitor, Payroll), and each module's list/detail pages (Create/Edit/Delete/View gating).
**Unchanged:** all backend, DB, role/manager-login APIs; the company-owner/admin experience.

## 10. Non-Goals (deferred)

- Backend / API authorization (requires securing route files behind auth — separate project).
- Per-tab Payroll permissions (§7).
- Staff/employee portal (`/staff/*`) gating.
