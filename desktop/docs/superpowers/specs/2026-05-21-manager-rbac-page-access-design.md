# Manager RBAC — Page-Level Access Control (Design)

**Date:** 2026-05-21
**Status:** Approved (design) — ready for implementation plan
**Scope:** Frontend-only, page/module-level enforcement

## 1. Problem & Goal

An admin defines **Roles** (in the role page) that grant access to specific modules, and creates **Manager Logins** assigned to a role. Today, every logged-in manager sees and can open the entire top nav (10 items) regardless of their role.

**Goal:** After a manager logs in, the app shows and allows only the pages/modules their assigned role permits — not all of them.

## 2. Current State (verified)

- **Role data:** `roles` table stores `modules` (JSON, e.g. `{dashboard:true, employees:true, payroll:false, …}`) and granular `permissions` (JSON: `module → submodule → {access,view,create,edit,delete}`). Source of module/permission config: `frontend-new/src/lib/permissions.js`.
- **Manager login:** `ManagerLoginController` stores `role_id` on the user (`user_type:"manager"`, `is_master:1`). Role assigned in `components/GroupLogin/Create.js`.
- **Login response already includes the role:** `AuthController::login` returns `user` with the `role` relation (modules + permissions JSON). Frontend stores it at `localStorage.user.role`.
- **AuthContext** (`src/context/AuthContext.js`) exposes `user`, `setUser`, `loading`, and an **unused** `hasModuleAccess(moduleName)` reading `user.role.modules[moduleName]`.
- **Nav** (`src/components/Header.js`): static 10-item `navLinks`; filtering is **disabled** (`filteredLinks = navLinks`). Admin layout/nav rendered by `src/components/LayoutShell.js`.
- **No route guards / middleware.** App is a **static export** (`output: 'export'`, served by `serve out`) → **Next.js middleware does not run**; guarding must be client-side.
- **AccessDenied** component exists (`src/components/ui/AccessDenied.jsx`) but is unwired.

## 3. Decisions

| Question | Decision |
|---|---|
| Enforcement depth | **Page/module-level** (nav + routes). View/create/edit/delete toggles saved but **not enforced** yet. |
| Nav ↔ module mismatch (Leave, Live Tracker, Access Control, Visitors had no role toggle) | **Add all 10 modules to the role page** (1:1 with nav). |
| Blocked access (typed URL or blocked landing page) | **Redirect to the manager's first allowed page.** |
| Backend / DB enforcement | **Out of scope (frontend only).** Backend routes are largely *not* behind `auth:sanctum`, so API authorization is a separate, larger project. No DB schema change. |

## 4. Architecture (Approach 1 — centralized client-side guard)

A single config drives both nav filtering and route gating. `AuthContext` derives the manager's allowed modules; `Header` filters the nav; one `<AccessGuard>` in `LayoutShell` redirects on blocked routes.

### 4.1 Single source of truth — `src/lib/moduleAccess.js` (new)

Ordered array, one entry per nav item:

```js
export const NAV_MODULES = [
  { module:'dashboard',      navName:'DASHBOARD',      labelKey:'header.nav.dashboard',     href:'/',                match:['/'] },
  { module:'employees',      navName:'EMPLOYEES',      labelKey:'header.nav.employees',     href:'/employees',       match:['/employees'] },
  { module:'attendance',     navName:'ATTENDANCE',     labelKey:'header.nav.attendance',    href:'/shift',           match:['/shift','/attendance'] },
  { module:'leave',          navName:'LEAVE',          labelKey:'header.nav.leave',         href:'/leave-dashboard', match:['/leave-dashboard','/leave'] },
  { module:'live_tracker',   navName:'LIVE TRACKER',   labelKey:'header.nav.liveTracker',   href:'/live-tracker',    match:['/live-tracker','/tracker-history'] },
  { module:'access_control', navName:'ACCESS CONTROL', labelKey:'header.nav.accessControl', href:'/access_control',  match:['/access_control'] },
  { module:'payroll',        navName:'PAYROLL',        labelKey:'header.nav.payroll',       href:'/payslips',        match:['/payslips','/payroll'] },
  { module:'visitors',       navName:'VISITORS',       labelKey:'header.nav.visitors',      href:'/visitor',         match:['/visitor'] },
  { module:'report',         navName:'REPORTS',        labelKey:'header.nav.reports',       href:'/report',          match:['/report'] },
  { module:'settings',       navName:'SETTINGS',       labelKey:'header.nav.settings',      href:'/setup',           match:['/setup'] },
];
```

Pure helpers in the same file:
- `moduleForPath(pathname)` → the module whose `match` prefix matches (longest-prefix wins; `'/'` matches **only** when `pathname === '/'`). Returns `null` if none.
- (resolver is pure → unit-testable, no React).

**Rule:** a path matching **no** module → **allowed** (neutral/shared pages like profile/account are never accidentally locked). Implementation plan verifies the `match` prefixes against the real `app/` route tree.

### 4.2 `AuthContext` — derive access

- `isManager = user?.user_type === 'manager'`
- `allowedModules`: non-managers (company/admin/anything ≠ manager) → **all true**; managers → `{ [m]: !!user?.role?.modules?.[m] }`.
- `hasModuleAccess(module)` — keep (now backed by `allowedModules`).
- `canAccessPath(pathname)` → `m = moduleForPath(pathname); return m ? hasModuleAccess(m) : true`.
- `firstAllowedHref()` → first `NAV_MODULES` entry whose module is allowed → its `href`; **null** if none allowed.

### 4.3 Nav filtering — `Header.js`

Replace `filteredLinks = navLinks` with: managers keep only items where `hasModuleAccess(entry.module)` (matched by `navName`); non-managers keep all. (Nav order preserved from `NAV_MODULES`.)

### 4.4 Route guard — `<AccessGuard>` in `LayoutShell.js` (new component)

Client component using `usePathname()` + `useRouter()` + `useAuth()`:
- While `loading` → render children (or a spinner) unchanged.
- If `!isManager` → render children (no gating).
- If `isManager`:
  - `dest = firstAllowedHref()`.
  - If `dest === null` → render **"No access — contact your administrator"** message (no redirect; avoids loop).
  - Else if `!canAccessPath(pathname)` and `pathname !== dest` → `router.replace(dest)` and render nothing (no flash of blocked content).
  - Else → render children.

Mounted to wrap the admin content inside `LayoutShell` (same place that renders `Header`).

### 4.5 Post-login landing — `app/login/page.js`

For managers, compute first allowed href from `data.user.role.modules` and redirect there (instead of always `/`). The `AccessGuard` is the backstop if the landing is still blocked.

### 4.6 Role page → 10 modules — `src/lib/permissions.js`

Add `leave`, `live_tracker`, `access_control`, `visitors` to `modules`, `active_module`, and `card_content` (sub_modules so permission tables render). `ModuleAccess.jsx` / `roles/create/page.js` already map over this config, so new cards appear automatically. `RoleController` stores the `modules` JSON unchanged → **no backend/DB change**. Roles created before this change lack the new keys → those modules treated as **not allowed**.

## 5. Data Flow

1. Admin creates a Role (now 10 module toggles) → `POST /role` → `roles.modules` JSON.
2. Admin creates a Manager Login with that `role_id` → stored on the user.
3. Manager logs in → `/login` returns `user.role.modules` → saved to `localStorage.user`.
4. `AuthProvider` loads `user` → derives `allowedModules`.
5. `Header` renders only allowed nav items; `AccessGuard` redirects blocked routes; login lands on first allowed page.

## 6. Edge Cases

- Non-manager users unaffected (full access).
- `/staff/*` employee portal out of scope.
- Manager with **zero** allowed modules → "No access" message, no redirect loop.
- Redirect only when `target !== pathname` and target exists.
- Missing module key → not allowed.
- Manager without a `role` object → no access (defensive).

## 7. Testing

- **Unit:** pure helpers in `moduleAccess.js` (`moduleForPath`, allowed-modules derivation, `firstAllowedHref`) — table-driven tests.
- **Manual / e2e:** run the app; create roles with different module subsets; create manager logins; log in as each; verify (a) nav shows only allowed items, (b) typing a blocked URL redirects to first allowed page, (c) zero-access manager sees the No-access message, (d) admin still sees everything. Confirm with screenshots.

## 8. Non-Goals (deferred)

- Action-level enforcement (view/create/edit/delete buttons).
- Backend API authorization (requires securing ~50 route files behind `auth:sanctum` first).
- Staff/employee portal gating.

## 9. Files Touched

**New:** `src/lib/moduleAccess.js`, `src/components/AccessGuard.jsx` (or colocated in LayoutShell), unit test for `moduleAccess`.
**Edited:** `src/context/AuthContext.js`, `src/components/Header.js`, `src/components/LayoutShell.js`, `src/app/login/page.js`, `src/lib/permissions.js`.
**Unchanged:** all backend, DB, role/manager-login APIs.
