# Manager RBAC — UI Permission Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the role's VIEW/CREATE/EDIT/DELETE checkboxes actually hide the matching menu items and action buttons — for `user_type=manager` logins only — leaving admins/company/staff unchanged.

**Architecture:** A single pure helper (`lib/permissions-check.js`) reads `user.role.permissions[module][feature][action]` and returns `true` for all non-managers. A thin `<Can>` component wraps action buttons. `AccessGuard` is extended to redirect managers away from feature routes they can't view. Each module's pages are then wired with `<Can>` for Create/Edit/Delete.

**Tech Stack:** Next.js 15 (static export), React 19, Tailwind, lucide-react. No JS test framework in repo — verification is `npm run build` (catches import/JSX/type errors) + manual role-based checks.

**Conventions for this plan:**
- **No auto-commit.** Commit steps are marked `[USER]` — the human runs them. Agents must NOT commit/push.
- **Verification** per task = build passes + the stated manual check. There is no unit-test runner.
- Spec: `docs/superpowers/specs/2026-06-08-manager-rbac-ui-gating-design.md`.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `frontend-new/src/lib/permissions-check.js` | Pure permission helpers (`permEntry`, `can`, `canSeeFeature`), `FEATURE_ROUTES`, `featureForPath` | Create |
| `frontend-new/src/components/Can.jsx` | Render-children-if-allowed wrapper | Create |
| `frontend-new/src/components/AccessGuard.jsx` | Add feature-level route gating for managers | Modify |
| `frontend-new/src/app/employees/page.js` | Gate "+ New" + pass action flags to row actions | Modify |
| `frontend-new/src/components/Employees/Extras.jsx` | Gate Import/Export/Template buttons | Modify |
| `frontend-new/src/app/employees/columns.js` | Gate row Edit/Delete | Modify |
| Remaining module pages (Task 7) | Gate each module's action buttons | Modify |

`featureId` values come from `lib/permissions.js → card_content[moduleKey].sub_modules[].id`.

---

## Task 1: Permission helper

**Files:**
- Create: `frontend-new/src/lib/permissions-check.js`

- [ ] **Step 1: Create the helper**

```js
// src/lib/permissions-check.js
// Per-feature UI permission gating for MANAGER logins. Pure functions — no React.
//
// Every check returns `true` for non-managers (company owner / admin / staff), so
// their experience is provably unchanged. Managers are gated by role.permissions,
// shaped: { [moduleKey]: { [featureId]: { access, view, create, edit, delete } } }.
//
// featureId values come from lib/permissions.js -> card_content[moduleKey].sub_modules[].id

import { isManagerUser, NAV_MODULES } from "@/lib/moduleAccess";

const ALL_TRUE  = { access: true, view: true, create: true, edit: true, delete: true };
// Module is enabled but this feature was never configured by the admin -> view only.
const VIEW_ONLY = { access: true, view: true, create: false, edit: false, delete: false };

// Resolve the permission object for one feature.
export function permEntry(user, moduleKey, featureId) {
  if (!isManagerUser(user)) return ALL_TRUE;
  const entry = user?.role?.permissions?.[moduleKey]?.[featureId];
  if (entry && typeof entry === "object" && !Array.isArray(entry)) return entry;
  return VIEW_ONLY;
}

// Can the user perform `action` on a feature? action in access|view|create|edit|delete.
export function can(user, moduleKey, featureId, action) {
  const e = permEntry(user, moduleKey, featureId);
  if (action === "view" || action === "access") return !!(e.access || e.view);
  return !!e[action];
}

// May the user see / open this feature at all? (access OR view)
export function canSeeFeature(user, moduleKey, featureId) {
  return can(user, moduleKey, featureId, "view");
}

// Explicit, hand-verified map of featureId -> route prefixes it owns. Used ONLY for
// route-level redirects (AccessGuard). Features absent here are gated at the button
// level only — they never trigger a redirect. Populated per module as each is wired.
export const FEATURE_ROUTES = {
  employees: {
    "employees": ["/employees"],
    "employees/employee_photo_upload": ["/employees/employee_photo_upload"],
  },
};

const normalize = (p) => (p || "").replace(/\/+$/, "") || "/";

// Which { moduleKey, featureId } owns a path (longest matching prefix wins), or null.
export function featureForPath(pathname) {
  const path = normalize(pathname);
  let best = null;
  let bestLen = -1;
  for (const moduleKey of Object.keys(FEATURE_ROUTES)) {
    for (const featureId of Object.keys(FEATURE_ROUTES[moduleKey])) {
      for (const prefix of FEATURE_ROUTES[moduleKey][featureId]) {
        const norm = normalize(prefix);
        if ((path === norm || path.startsWith(norm + "/")) && norm.length > bestLen) {
          best = { moduleKey, featureId };
          bestLen = norm.length;
        }
      }
    }
  }
  return best;
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend-new && npm run build`
Expected: build completes, ends with `○ (Static) prerendered as static content`, no errors referencing `permissions-check`.

- [ ] **Step 3 [USER]: Commit**

```bash
git add frontend-new/src/lib/permissions-check.js
git commit -m "feat(rbac): add per-feature permission helper for managers"
```

---

## Task 2: `<Can>` wrapper component

**Files:**
- Create: `frontend-new/src/components/Can.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/Can.jsx
"use client";

import { can } from "@/lib/permissions-check";

// Renders `children` only when the user may perform `action` on the given feature.
// Non-managers always pass. Pass the current user explicitly (callers already have it
// via getUser()/useAuth) to keep this a pure render-gate with no data fetching.
//
// Usage:
//   <Can user={user} module="employees" feature="employees" action="create">
//     <NewButton />
//   </Can>
export default function Can({ user, module, feature, action, fallback = null, children }) {
  return can(user, module, feature, action) ? <>{children}</> : fallback;
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend-new && npm run build`
Expected: build completes with no errors referencing `Can`.

- [ ] **Step 3 [USER]: Commit**

```bash
git add frontend-new/src/components/Can.jsx
git commit -m "feat(rbac): add <Can> permission wrapper component"
```

---

## Task 3: Feature-level route gating in AccessGuard

**Files:**
- Modify: `frontend-new/src/components/AccessGuard.jsx`

Currently AccessGuard blocks managers at the **module** level. Add a second check: if the
path maps to a feature (via `FEATURE_ROUTES`) the manager can't view, redirect too.

- [ ] **Step 1: Update the imports**

Replace the import block (lines 6-10) with:

```jsx
import {
  isManagerUser,
  canUserAccessPath,
  firstAllowedHrefForUser,
} from "@/lib/moduleAccess";
import { featureForPath, canSeeFeature } from "@/lib/permissions-check";
```

- [ ] **Step 2: Extend the `blocked` calculation**

Replace this line (line 33):

```jsx
  const blocked = manager && !!dest && !canUserAccessPath(user, path);
```

with:

```jsx
  // Block when the module is off OR (the path maps to a feature the manager can't view).
  const feat = featureForPath(path);
  const featureBlocked = !!feat && !canSeeFeature(user, feat.moduleKey, feat.featureId);
  const blocked = manager && !!dest && (!canUserAccessPath(user, path) || featureBlocked);
```

- [ ] **Step 3: Verify it builds**

Run: `cd frontend-new && npm run build`
Expected: build completes, no errors referencing `AccessGuard`.

- [ ] **Step 4: Manual check**

Create a manager role (Settings → Roles) with Employees module ON but the **Employee Upload**
row's `access`+`view` both OFF. Assign it to a manager, log in as that manager, and navigate to
`/employees/employee_photo_upload`. Expected: redirected away (to the first allowed module).
Navigating to `/employees` still works. Log in as the company owner: no redirect anywhere.

- [ ] **Step 5 [USER]: Commit**

```bash
git add frontend-new/src/components/AccessGuard.jsx
git commit -m "feat(rbac): gate manager routes at the feature level"
```

---

## Task 4: Wire the Employees module buttons

**Files:**
- Modify: `frontend-new/src/app/employees/page.js`
- Modify: `frontend-new/src/components/Employees/Extras.jsx`
- Modify: `frontend-new/src/app/employees/columns.js`

Feature ids (from `card_content.employees`): `"employees"` (Employee List),
`"employees/employee_photo_upload"` (Upload). The list page's actions belong to `"employees"`.

### 4a. Gate "+ New" on the list page

- [ ] **Step 1: Import the helper and user in `app/employees/page.js`**

The page already imports `getUser` from `@/config` (line 10). Add near the other lib imports:

```jsx
import { can } from "@/lib/permissions-check";
```

Inside the component body (top, with the other hooks/state ~line 27), add:

```jsx
    const user = getUser();
    const canCreateEmp = can(user, "employees", "employees", "create");
    const canEditEmp   = can(user, "employees", "employees", "edit");
    const canDeleteEmp = can(user, "employees", "employees", "delete");
```

- [ ] **Step 2: Conditionally render the "+ New" button**

Replace the New Employee block (lines 409-415):

```jsx
                    {/* New Employee Button */}
                    <Link href="/employees/create">
                        <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            <span>{t('employees.list.newButton')}</span>
                        </button>
                    </Link>
```

with:

```jsx
                    {/* New Employee Button — managers need employees.create */}
                    {canCreateEmp && (
                    <Link href="/employees/create">
                        <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            <span>{t('employees.list.newButton')}</span>
                        </button>
                    </Link>
                    )}
```

- [ ] **Step 3: Pass action flags into the row columns**

Replace the `columns={Columns(...)}` line (line 420):

```jsx
                columns={Columns(t, deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee)}
```

with:

```jsx
                columns={Columns(t, deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee, { canEdit: canEditEmp, canDelete: canDeleteEmp })}
```

### 4b. Gate row Edit/Delete in columns

- [ ] **Step 4: Read the columns file first**

Run: open `frontend-new/src/app/employees/columns.js`. Find the actions cell that renders the
Edit and Delete controls (they use the `editEmployee` / `deleteEmployee` callbacks passed in).
Note the new last argument `perms = {}` added to the `Columns(...)` signature.

- [ ] **Step 5: Add the `perms` parameter and gate the buttons**

Add `perms = {}` as the final parameter of the exported `Columns` function signature, e.g.:

```jsx
export default function Columns(t, deleteEmployee, editEmployee, showHostQr, printCard, setDevicesEmployee, perms = {}) {
```

In the actions cell, wrap the Edit control with `perms.canEdit !== false` and the Delete control
with `perms.canDelete !== false` (the `!== false` keeps every existing non-manager caller — which
passes no `perms` — fully unchanged). Example for each control:

```jsx
{perms.canEdit !== false && (
  /* existing Edit button JSX, unchanged */
)}
{perms.canDelete !== false && (
  /* existing Delete button JSX, unchanged */
)}
```

### 4c. Gate Import/Export/Template in Extras

- [ ] **Step 6: Import the helper and user in `components/Employees/Extras.jsx`**

It already imports `getUser` from `@/config/index` (line 30). Add:

```jsx
import { can } from "@/lib/permissions-check";
```

At the top of the `EmployeeExtras` component body, add:

```jsx
  const user = getUser();
  const canCreate = can(user, "employees", "employees", "create");
  const canView   = can(user, "employees", "employees", "view");
```

- [ ] **Step 7: Gate the three buttons**

In the action button row, wrap:
- **Template** button with `{canView && ( ... )}` (read-only export of a blank template),
- **Import** button with `{canCreate && ( ... )}` (import creates employees),
- **Export** button with `{canView && ( ... )}` (export reads the list).

Wrap each existing `<button …>…</button>` in the corresponding `{canX && ( … )}`.

- [ ] **Step 8: Verify it builds**

Run: `cd frontend-new && npm run build`
Expected: build completes, no errors referencing `employees`, `Extras`, or `columns`.

- [ ] **Step 9: Manual check**

With a manager role granting Employees `view` only (no create/edit/delete): log in as that
manager → the Employees list loads, but "+ New", Import, and row Edit/Delete are hidden; Template
and Export remain. Grant `create` → "+ New" and Import appear. Log in as company owner → every
button present (no `perms` passed → `!== false` keeps them).

- [ ] **Step 10 [USER]: Commit**

```bash
git add frontend-new/src/app/employees/page.js frontend-new/src/components/Employees/Extras.jsx frontend-new/src/app/employees/columns.js
git commit -m "feat(rbac): gate Employees actions by manager permissions"
```

---

## Task 5–11: Roll out remaining modules

Apply the **exact Task 4 pattern** to each module below. For every module:

1. Add `import { can } from "@/lib/permissions-check";` and `const user = getUser();` to the
   module's list page (add the `getUser` import from `@/config` if missing).
2. Compute the needed flags, e.g. `const canCreate = can(user, MODULE, FEATURE, "create");`
   (and `edit`/`delete`/`view` as needed), using the module/feature keys in the table below.
3. Wrap the **Create / "+ New" / Add** button in `{canCreate && ( … )}`.
4. Wrap row **Edit** in `{canEdit && ( … )}` and row **Delete** in `{canDelete && ( … )}` (use the
   `perms = {}` + `!== false` columns pattern from Task 4b where the page uses a columns helper).
5. Wrap bulk **Import/Upload** as `create`, **Export/Download** as `view`.
6. Add the feature's route to `FEATURE_ROUTES` in `permissions-check.js` so route-level gating
   applies (use the module's `href`/sub-routes).
7. Verify: `cd frontend-new && npm run build` passes, then manually check with a manager role that
   grants view-only vs view+create on that module. Company-owner login must show all buttons.
8. `[USER]` commit per module: `git commit -m "feat(rbac): gate <Module> actions by manager permissions"`.

| Task | Module (`MODULE`) | List page file | Primary `FEATURE` id(s) | Route(s) for FEATURE_ROUTES |
|---|---|---|---|---|
| 5 | `attendance` | `app/shift/page.js` (+ schedule, change-request pages) | `shift`, `schedule`, `attendance/change_request` | `/shift`, `/schedule`, `/attendance` |
| 6 | `leave` | `app/leave-dashboard/page.js`, `app/leave/…` | `leave-dashboard`, `leave` | `/leave-dashboard`, `/leave` |
| 7 | `payroll` | `app/payslips/page.js` | `payslips` | `/payslips` |
| 8 | `report` | `app/report/page.js` (+ logs) | `report`, `logs` | `/report`, `/logs` |
| 9 | `visitors` | `app/visitor/page.js` | `visitor` | `/visitor` |
| 10 | `access_control` | `app/access_control/page.js` | `access_control` | `/access_control` |
| 11 | `live_tracker` | `app/live-tracker/page.js` (+ tracker-history) | `live-tracker`, `tracker-history` | `/live-tracker`, `/tracker-history` |
| 12 | `settings` | `app/setup/page.js` and each settings sub-page | `setup`, `company`, `branch`, `department-tabs`, `device`, `roles`, `holiday`, `announcements`, `automation`, `activity`, `geo-fencing`, `login/manager-login`, `payslips` | `/setup`, `/company`, `/branch`, … (per sub-page route) |

> For each module, **read the list page first** to find the exact Create/Edit/Delete controls
> before wrapping them — button markup differs per page (some use a `columns.js` helper, some inline
> buttons, some a row "⋮" menu). The wrapping pattern is identical; only the JSX being wrapped differs.

> Settings (Task 12) is the largest: each sub-page (Company, Branch, Department, Device, Roles, etc.)
> is its own feature row. Wire them one sub-page at a time, each its own build + manual check + commit.

---

## Self-review notes (addressed)

- **Spec coverage:** helper (§Architecture.1) → Task 1; `<Can>` (§.2) → Task 2; FEATURE_ROUTES/
  featureForPath (§.3) + AccessGuard (§.4) → Tasks 1+3; menu/button gating (§.5,.6) → Tasks 4–12;
  view-only default + access-or-view rules → encoded in `permEntry`/`can` (Task 1); non-regression
  (every gate behind `isManagerUser`) → Task 1 short-circuit + `!== false` columns default.
- **Menu (§.5) note:** top-nav module hiding already exists (Header). Sub-feature *menu* hiding is
  covered functionally by route-level redirects (Task 3) + button hiding; if a dedicated submenu/
  sidebar component is found during Task 4–12, filter its items with `canSeeFeature` in that task.
- **No placeholders:** all helper/guard/Employees code is complete. Tasks 5–12 intentionally repeat
  the *pattern* with exact files/keys because each page's button JSX must be read in place — the
  ambiguity is in existing markup, not in this plan's instructions.
- **Type consistency:** `can(user, module, feature, action)`, `canSeeFeature(user, module, feature)`,
  `featureForPath(path) -> {moduleKey, featureId}`, `<Can user module feature action>`, and the
  columns `perms = { canEdit, canDelete }` shape are used identically across all tasks.

---

## Known limitation (from spec)

UI gating is not a security boundary. Until the backend enforces permissions, a manager could reach
restricted actions by calling the API directly. Backend enforcement is a recommended follow-up phase.
