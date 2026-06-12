# Manager RBAC — UI Permission Gating (VIEW/CREATE/EDIT/DELETE)

**Date:** 2026-06-08
**Status:** Design — approved decisions captured, pending spec review
**Scope:** Frontend only (`frontend-new`). No backend changes.

## Problem

Roles already store granular per-feature permissions
(`role.permissions[moduleKey][featureId][access|view|create|edit|delete]`) and the
"Edit Role" UI lets admins tick these boxes. **Nothing in the app reads them.**

Today, manager logins are gated only at the **module** level (`role.modules` →
`AccessGuard` + Header nav). Once a manager can open a module, they see and can use
every Create / Edit / Delete action in it, regardless of the checkboxes.

**Goal:** make the VIEW / CREATE / EDIT / DELETE checkboxes actually take effect —
**for managers only** — by hiding disallowed menu items and action buttons in the UI.
Admins, company owners, and staff must behave exactly as they do today.

## Decisions (confirmed with user)

1. **Enforcement layer:** UI gating only (hide/disable in the UI). No server-side
   authorization in this phase. (Matches the existing module-gating approach, which
   is also frontend-only.)
2. **Module coverage:** all 10 modules.
3. **Default when a module is ON but a feature's boxes are empty:** manager can
   **view** the feature but gets **no** Create/Edit/Delete buttons ("view only").
4. **ACCESS vs VIEW:** either one checked makes the feature visible (treated as a
   single "can see this" gate).

## Non-goals (explicitly out of scope)

- **Backend authorization.** The API still accepts any authenticated request. A
  determined manager could call endpoints directly. Securing the backend is a
  separate, larger future phase (noted as a known limitation).
- Staff / employee self-service portal gating.
- Changing how roles are created/saved or the Edit Role screen.

## Data shapes (already available, verified)

- `user.role.modules = { [moduleKey]: boolean }` — drives existing module gating.
- `user.role.permissions = { [moduleKey]: { [featureId]: { access, view, create, edit, delete } } }`
  - `featureId` values come from `lib/permissions.js → card_content[moduleKey].sub_modules[].id`
    (e.g. `"employees"`, `"employees/employee_photo_upload"`, `"shift"`, `"payslips"`, `"roles"`).
- Both are returned in the login response (the `role` relation is eager-loaded and the
  Role model casts `modules`/`permissions` to arrays). **No backend change needed.**

## Architecture

All new logic lives behind a single guard: `isManagerUser(user)` (existing, in
`lib/moduleAccess.js`). **Every check returns `true` for non-managers**, so admins/
company/staff are provably unaffected.

### 1. New helper — `lib/permissions-check.js` (pure functions)

```
ALL_TRUE        = { access:true, view:true, create:true, edit:true, delete:true }
VIEW_ONLY       = { access:true, view:true, create:false, edit:false, delete:false }

permEntry(user, moduleKey, featureId):
  if !isManagerUser(user)            -> ALL_TRUE
  entry = user.role?.permissions?.[moduleKey]?.[featureId]
  if entry is an object              -> entry            // missing keys read as false
  else                               -> VIEW_ONLY        // module on, feature unconfigured

can(user, moduleKey, featureId, action):
  e = permEntry(user, moduleKey, featureId)
  if action in {create, edit, delete} -> !!e[action]
  if action in {view, access}         -> !!(e.access || e.view)

canSeeFeature(user, moduleKey, featureId) = can(user, moduleKey, featureId, 'view')
```

### 2. `<Can>` component (thin wrapper)

```jsx
<Can user={user} module="employees" feature="employees" action="create">
  <NewEmployeeButton />
</Can>
```
Renders children only when `can(...)` is true. Optional `fallback` prop. Used to wrap
Create/Edit/Delete buttons, bulk Import/Export, and row "⋮" menu items.

### 3. Feature → route registry — `FEATURE_ROUTES` (in `permissions-check.js`)

Maps each `featureId` to the route prefix(es) it owns, so menu items and pages can be
gated at the feature level (not just the module level). Built explicitly from
`card_content` ids (some need normalization, e.g. `"document-expiry"` →
`/employees/document-expiry`). Features with no distinct route are gated at the button
level only.

```
featureForPath(pathname) -> { moduleKey, featureId } | null   // longest prefix wins
```

### 4. Route gating — extend `AccessGuard`

After the existing module check, add a feature check: if the user is a manager and the
current path maps to a feature whose `view/access` is false, redirect to the first
allowed destination (reuse existing redirect logic). Module-level behavior is unchanged.

### 5. Menu gating — Header / submenu rendering

Where sub-feature menu items are rendered, filter them with `canSeeFeature(...)` for
managers. Top-level nav continues to use `allowedModulesForUser` (unchanged).

### 6. Per-page button wiring (the per-action part)

Each module page declares its `MODULE_KEY` and the relevant `FEATURE_ID`(s), then wraps
its action controls in `<Can>`:
- list **Create / "+ New"** → `action="create"`
- row **Edit** → `action="edit"`
- row **Delete** → `action="delete"`
- bulk **Import / Export / Upload** → treated as `create` (configurable per page)

## Rollout (module by module, each independently verifiable)

1. **Mechanism** — `permissions-check.js`, `<Can>`, `FEATURE_ROUTES`, `AccessGuard` +
   menu extension. (No visible change yet for unconfigured roles.)
2. **Employees** — wire buttons (List, Upload, Leaves, Document Expiry).
3. **Attendance** and **Leave**.
4. **Payroll, Reports, Visitors, Access Control, Live Tracker, Settings.**

## Testing / verification

Manual, role-driven (UI-only feature):
- Create a manager role with mixed permissions (e.g. Employees: view+create only).
- Log in as a manager with that role → confirm: feature visible, "+ New" shown, Edit/
  Delete hidden; unconfigured features view-only; disabled `view/access` hides the
  feature and blocks its route.
- Log in as company owner / admin → confirm **no change**: all menus and buttons present.
- Toggle role boxes and re-verify a representative page per module.

## Risk / no-regression

- Every gate is behind `isManagerUser`; non-managers short-circuit to full access.
- The only behavioral change is for `user_type` manager accounts with an assigned role.
- No data, API, or role-save changes — purely presentational gating.

## Known limitation

UI gating is not a security boundary. Until the backend enforces permissions, a manager
could still reach restricted actions by calling the API directly. Backend enforcement is
a recommended follow-up phase.
