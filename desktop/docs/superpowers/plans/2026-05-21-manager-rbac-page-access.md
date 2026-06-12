# Manager RBAC — Page-Level Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, preferred on this project) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A manager login sees and can open only the top-nav pages/modules their assigned role permits; blocked pages redirect to their first allowed page.

**Architecture:** Frontend-only, page-level. One config module (`moduleAccess.js`) maps each of the 10 nav items → module → route prefixes and provides pure helpers. `Header` filters the nav from it; a new `<AccessGuard>` in `LayoutShell` redirects blocked routes; the login lands managers on their first allowed page. The role page gains the 4 missing module toggles. No backend/DB changes.

**Tech Stack:** Next.js 15 (App Router, **static export** — no middleware), React, Tailwind v4, `lucide-react`, existing `AuthContext`/`getUser()`.

**Spec:** `docs/superpowers/specs/2026-05-21-manager-rbac-page-access-design.md`

**Project conventions:**
- **Commits:** The USER performs all git commits on this project. Do NOT run `git commit`. Where a step says "Commit", stage nothing and instead pause to let the user commit, or just continue.
- **No test framework exists** (no jest/vitest; `package.json type` is commonjs). Verification is **end-to-end in the running app** via the dev server (already running on `http://localhost:3002`) + headless-Chrome screenshots — the method used throughout this project. The one pure module (`moduleAccess.js`) is small and exercised directly by the guard/nav behavior the e2e steps check.
- Dev server: `npm run dev` serves `http://localhost:3002` (Turbopack, hot-reload). Static export served on `:3001` via `serve out` is only refreshed by `npm run build`.
- Screenshot helper (PowerShell-safe bash): `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1475,830 --virtual-time-budget=5000 --screenshot=OUT.png "http://localhost:3002/PATH"`

---

## File Structure

**New files:**
- `frontend-new/src/lib/moduleAccess.js` — nav↔module↔route config + pure access helpers (single source of truth).
- `frontend-new/src/components/AccessGuard.jsx` — client-side page gate for managers.

**Modified files:**
- `frontend-new/src/lib/permissions.js` — add 4 modules (leave, live_tracker, access_control, visitors) to `modules`, `active_module`, `card_content`.
- `frontend-new/src/components/Header.js` — filter nav by allowed modules.
- `frontend-new/src/components/LayoutShell.js` — wrap admin content in `<AccessGuard>`.
- `frontend-new/src/app/login/page.js` — manager post-login landing → first allowed page.

**Unchanged:** all backend, DB, role/manager-login APIs, `AuthContext` (helpers live in `moduleAccess.js` instead, consumed where `user` is already available).

---

## Task 1: Access config + pure helpers (`moduleAccess.js`)

**Files:**
- Create: `frontend-new/src/lib/moduleAccess.js`

- [ ] **Step 1: Create the file with the config and pure helpers**

```js
// src/lib/moduleAccess.js
// Single source of truth: maps each top-nav module to its nav entry and the
// route prefixes that belong to it. Drives nav filtering (Header) and the
// client-side route gate (AccessGuard). Pure functions only — no React.

export const NAV_MODULES = [
  { module: 'dashboard',      navName: 'DASHBOARD',      labelKey: 'header.nav.dashboard',     href: '/',                match: ['/'] },
  { module: 'employees',      navName: 'EMPLOYEES',      labelKey: 'header.nav.employees',     href: '/employees',       match: ['/employees'] },
  { module: 'attendance',     navName: 'ATTENDANCE',     labelKey: 'header.nav.attendance',    href: '/shift',           match: ['/shift', '/attendance'] },
  { module: 'leave',          navName: 'LEAVE',          labelKey: 'header.nav.leave',         href: '/leave-dashboard', match: ['/leave-dashboard', '/leave'] },
  { module: 'live_tracker',   navName: 'LIVE TRACKER',   labelKey: 'header.nav.liveTracker',   href: '/live-tracker',    match: ['/live-tracker', '/tracker-history'] },
  { module: 'access_control', navName: 'ACCESS CONTROL', labelKey: 'header.nav.accessControl', href: '/access_control',  match: ['/access_control'] },
  { module: 'payroll',        navName: 'PAYROLL',        labelKey: 'header.nav.payroll',       href: '/payslips',        match: ['/payslips', '/payroll'] },
  { module: 'visitors',       navName: 'VISITORS',       labelKey: 'header.nav.visitors',      href: '/visitor',         match: ['/visitor'] },
  { module: 'report',         navName: 'REPORTS',        labelKey: 'header.nav.reports',       href: '/report',          match: ['/report'] },
  { module: 'settings',       navName: 'SETTINGS',       labelKey: 'header.nav.settings',      href: '/setup',           match: ['/setup'] },
];

// Strip trailing slashes so checks work whether `trailingSlash` is on or off.
const normalize = (p) => (p || '').replace(/\/+$/, '') || '/';

// Managers are gated; everyone else (company/admin, employee) is not.
export function isManagerUser(user) {
  return user?.user_type === 'manager';
}

// Returns { [moduleKey]: boolean }. Non-managers get every module = true.
export function allowedModulesForUser(user) {
  const manager = isManagerUser(user);
  const roleModules = user?.role?.modules || {};
  const result = {};
  for (const entry of NAV_MODULES) {
    result[entry.module] = manager ? !!roleModules[entry.module] : true;
  }
  return result;
}

// Which module owns a path (longest matching prefix wins). '/' matches the
// dashboard ONLY when the path is exactly '/'. Returns null for paths owned by
// no module (shared/neutral pages stay accessible).
export function moduleForPath(pathname) {
  const path = normalize(pathname);
  let best = null;
  let bestLen = -1;
  for (const entry of NAV_MODULES) {
    for (const prefix of entry.match) {
      if (prefix === '/') {
        if (path === '/' && bestLen < 1) { best = entry.module; bestLen = 1; }
        continue;
      }
      const norm = normalize(prefix);
      if ((path === norm || path.startsWith(norm + '/')) && norm.length > bestLen) {
        best = entry.module;
        bestLen = norm.length;
      }
    }
  }
  return best;
}

// True if the user may view this path. Paths owned by no module are allowed.
export function canUserAccessPath(user, pathname) {
  const mod = moduleForPath(pathname);
  if (!mod) return true;
  return !!allowedModulesForUser(user)[mod];
}

// First nav href the user may open, or null if none are allowed.
export function firstAllowedHrefForUser(user) {
  const allowed = allowedModulesForUser(user);
  const entry = NAV_MODULES.find((e) => allowed[e.module]);
  return entry ? entry.href : null;
}
```

- [ ] **Step 2: Verify it compiles (no syntax/import errors)**

Run: `cd frontend-new && npx next lint --file src/lib/moduleAccess.js 2>&1 | tail -5` (or rely on the dev server hot-reload showing no error). It is exercised end-to-end in Tasks 3–6.
Expected: no errors. (Logic correctness is confirmed by the e2e behavior in Task 6.)

- [ ] **Step 3: Commit** (user performs the commit on this project)

```bash
git add frontend-new/src/lib/moduleAccess.js
# USER commits: e.g. "feat(rbac): add module/route access config + helpers"
```

---

## Task 2: Extend the role page to all 10 modules (`permissions.js`)

**Files:**
- Modify: `frontend-new/src/lib/permissions.js`

Adding the 4 modules surfaces 4 new toggle cards on `/roles/create` (the page maps over `modules`) and renders their permission tables (the page reads `card_content[key].sub_modules` — **missing `card_content` would crash the page**, so all three structures must be updated together).

- [ ] **Step 1: Append 4 entries to the `modules` array**

In `src/lib/permissions.js`, change the closing of the `modules` array (currently ends after the `settings` entry on line 15) to add the new entries before the `];`:

```js
    { id: 'report', title: 'Reports', desc: 'Generate insightful data exports and summaries.', icon: 'assessment', color: 'cyan' },
    { id: 'settings', title: 'Settings', desc: 'Configure system preferences and permissions.', icon: 'admin_panel_settings', color: 'rose' },
    { id: 'leave', title: 'Leave', desc: 'Leave requests, approvals, and balances.', icon: 'event_available', color: 'violet' },
    { id: 'live_tracker', title: 'Live Tracker', desc: 'Real-time location tracking and history.', icon: 'my_location', color: 'teal' },
    { id: 'access_control', title: 'Access Control', desc: 'Doors, devices, and access time slots.', icon: 'meeting_room', color: 'orange' },
    { id: 'visitors', title: 'Visitors', desc: 'Visitor check-in, logs, and management.', icon: 'badge', color: 'pink' },
];
```

- [ ] **Step 2: Add the 4 keys to `active_module`** (default-on for new roles, matching the existing all-true default)

Replace the `active_module` object with:

```js
export const active_module = {
    dashboard: true,
    employees: true,
    attendance: true,
    payroll: true,
    report: true,
    settings: true,
    leave: true,
    live_tracker: true,
    access_control: true,
    visitors: true,
}
```

- [ ] **Step 3: Add `card_content` entries for the 4 new modules**

Inside the `card_content` object, before its closing `};`, add (after the `settings` block):

```js
    leave: {
        title: "Leave",
        desc: "Leave requests, approvals, and balances",
        sub_modules: [
            { id: "leave-dashboard", title: "Leave Dashboard", desc: "Leave overview", icon: "event_available" },
            { id: "leave", title: "Leave Requests", desc: "Requests & approvals", icon: "file_text" },
        ],
    },
    live_tracker: {
        title: "Live Tracker",
        desc: "Real-time tracking and history",
        sub_modules: [
            { id: "live-tracker", title: "Live Tracker", desc: "Live map", icon: "locate_fixed" },
            { id: "tracker-history", title: "Tracker History", desc: "Location history", icon: "history" },
        ],
    },
    access_control: {
        title: "Access Control",
        desc: "Doors, devices, and access slots",
        sub_modules: [
            { id: "access_control", title: "Access Control", desc: "Doors & devices", icon: "meeting_room" },
        ],
    },
    visitors: {
        title: "Visitors",
        desc: "Visitor check-in and management",
        sub_modules: [
            { id: "visitor", title: "Visitors", desc: "Visitor list & check-in", icon: "badge" },
        ],
    },
};
```

- [ ] **Step 4: Verify in the app**

Open `http://localhost:3002/roles/create`. Confirm: (a) Module Access now shows **10** toggle cards and "Access Granted: 10 / 10 Modules"; (b) each of the 4 new modules renders a permission table below (no crash) when its toggle is on.
Screenshot: `--screenshot=role-create.png "http://localhost:3002/roles/create"` and read it.
Expected: 10 cards; no runtime error overlay.

- [ ] **Step 5: Commit** (user performs the commit)

```bash
git add frontend-new/src/lib/permissions.js
# USER commits: "feat(rbac): add leave/live_tracker/access_control/visitors role modules"
```

---

## Task 3: Filter the top nav by allowed modules (`Header.js`)

**Files:**
- Modify: `frontend-new/src/components/Header.js`

`Header` already has a `user` state (loaded via `getUser()` + the `userUpdated` event), so no AuthContext wiring is needed.

- [ ] **Step 1: Add the import** near the top of `Header.js` (with the other `@/` imports)

```js
import { NAV_MODULES, allowedModulesForUser } from "@/lib/moduleAccess";
```

- [ ] **Step 2: Replace the disabled filter block**

Replace these current lines:

```js
  const restrictedNames = ['SETTINGS', 'PAYROLL', 'ACCESS CONTROL'];

  // const filteredLinks =
  //   user && Array.isArray(user.departments) && user.departments.length > 0
  //     ? navLinks.filter(link => !restrictedNames.includes(link.name))
  //     : navLinks;

  const filteredLinks = navLinks;
```

with:

```js
  // Filter nav by the user's allowed modules. Non-managers get everything
  // (allowedModulesForUser returns all-true for them).
  const allowedModules = allowedModulesForUser(user);
  const moduleByNav = Object.fromEntries(NAV_MODULES.map((e) => [e.navName, e.module]));
  const filteredLinks = navLinks.filter((link) => {
    const mod = moduleByNav[link.name];
    return mod ? allowedModules[mod] : true;
  });
```

- [ ] **Step 3: Verify (admin = all items)**

Reload `http://localhost:3002/` as the current admin session. Confirm all 10 nav items still show (admins/company are not gated).
Screenshot: `--screenshot=nav-admin.png "http://localhost:3002/"`.
Expected: all 10 nav items present. (Manager filtering is verified in Task 6.)

- [ ] **Step 4: Commit** (user performs the commit)

```bash
git add frontend-new/src/components/Header.js
# USER commits: "feat(rbac): filter top nav by allowed modules"
```

---

## Task 4: Route guard (`AccessGuard.jsx`) mounted in `LayoutShell`

**Files:**
- Create: `frontend-new/src/components/AccessGuard.jsx`
- Modify: `frontend-new/src/components/LayoutShell.js`

- [ ] **Step 1: Create `AccessGuard.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUser } from "@/config";
import {
  isManagerUser,
  canUserAccessPath,
  firstAllowedHrefForUser,
} from "@/lib/moduleAccess";

// Client-side page-level gate for manager logins. Admins/non-managers pass
// through untouched. Managers are redirected away from modules their role does
// not grant; a manager with zero allowed modules sees a friendly message
// (prevents a redirect loop on a blocked landing page).
export default function AccessGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => { setUser(getUser()); setReady(true); };
    load();
    window.addEventListener("userUpdated", load);
    return () => window.removeEventListener("userUpdated", load);
  }, []);

  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const manager = isManagerUser(user);
  const dest = manager ? firstAllowedHrefForUser(user) : null;
  const destNorm = (dest || "").replace(/\/+$/, "") || "/";
  const blocked = manager && !!dest && !canUserAccessPath(user, path);

  useEffect(() => {
    if (ready && blocked && path !== destNorm) {
      router.replace(dest);
    }
  }, [ready, blocked, path, destNorm, dest, router]);

  if (!ready) return children; // before user is known, render normally
  if (manager && dest === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No access</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Your account has no modules enabled yet. Please contact your administrator.
        </p>
      </div>
    );
  }
  if (blocked) return null; // redirecting — avoid flashing blocked content
  return children;
}
```

- [ ] **Step 2: Mount it in `LayoutShell.js`**

Add the import at the top:

```js
import AccessGuard from "@/components/AccessGuard";
```

Then wrap only the admin content. Replace:

```js
        <MainContentWrapper>{children}</MainContentWrapper>
```

with:

```js
        <MainContentWrapper>
          <AccessGuard>{children}</AccessGuard>
        </MainContentWrapper>
```

(The early `return <>{children}</>` for staff/login/host-checkin routes stays above this, so those pages are never gated.)

- [ ] **Step 3: Verify (admin unaffected)**

Reload `http://localhost:3002/employees` and `http://localhost:3002/payslips` as the admin session. Both render normally (no redirect) since admins aren't gated.
Screenshot one: `--screenshot=guard-admin.png "http://localhost:3002/payslips"`.
Expected: pages load normally. (Manager redirect behavior verified in Task 6.)

- [ ] **Step 4: Commit** (user performs the commit)

```bash
git add frontend-new/src/components/AccessGuard.jsx frontend-new/src/components/LayoutShell.js
# USER commits: "feat(rbac): add client-side AccessGuard route gate"
```

---

## Task 5: Manager post-login landing → first allowed page (`login/page.js`)

**Files:**
- Modify: `frontend-new/src/app/login/page.js`

- [ ] **Step 1: Add the import** (with the other imports at the top)

```js
import { firstAllowedHrefForUser } from '@/lib/moduleAccess';
```

- [ ] **Step 2: Redirect managers to their first allowed page**

In `handleLogin`, replace this block:

```js
                if (isAdminOrManager) {
                    window.location.href = "/";
                } else {
                    window.location.href = "/staff/dashboard";
                }
```

with:

```js
                if (isAdminOrManager) {
                    // Managers land on their first allowed module; AccessGuard is the backstop.
                    const managerDest = serverUser.user_type === 'manager'
                        ? firstAllowedHrefForUser(serverUser)
                        : null;
                    window.location.href = managerDest || "/";
                } else {
                    window.location.href = "/staff/dashboard";
                }
```

- [ ] **Step 3: Verify (compiles; admin still lands on `/`)**

Reload the login page; no error. Admin login still redirects to `/`. (Manager landing verified in Task 6.)

- [ ] **Step 4: Commit** (user performs the commit)

```bash
git add frontend-new/src/app/login/page.js
# USER commits: "feat(rbac): land managers on first allowed page after login"
```

---

## Task 6: End-to-end verification (running app)

**Files:** none (verification only). This is the real proof that it "works perfectly."

Prereq: dev server running on `http://localhost:3002`. You'll create test data through the app.

- [ ] **Step 1: Create a restricted role**

In the app (as admin) go to `/roles/create`. Name it e.g. "Attendance Only". In Module Access, **enable only Attendance** (turn off the other 9). Save.
Expected: redirected to `/roles`, the new role listed.

- [ ] **Step 2: Create a manager login with that role**

Go to `/login/manager-login` → "Add Manager Login". Pick an employee, set email/password, and select the **"Attendance Only"** role. Save.
Expected: manager login created.

- [ ] **Step 3: Log in as that manager**

Log out, then log in (role tab "Manager") with the new manager credentials.
Expected: lands on **`/shift`** (Attendance), NOT `/` — because dashboard isn't allowed.
Screenshot the result and read it.

- [ ] **Step 4: Verify nav is filtered**

Confirm the top nav shows **only ATTENDANCE** (plus any modules you enabled). The other modules are absent.
Screenshot: `--screenshot=mgr-nav.png "http://localhost:3002/shift"`.
Expected: only the allowed nav item(s) visible.

- [ ] **Step 5: Verify direct-URL gating**

While logged in as the manager, navigate the browser to `http://localhost:3002/payslips` (a blocked module).
Expected: redirected to `/shift` (first allowed page); payroll content never shown.

- [ ] **Step 6: Verify zero-access manager**

Create a second role with **all modules off**, assign a manager login to it, log in.
Expected: the **"No access — contact your administrator"** message renders; no redirect loop.

- [ ] **Step 7: Verify admin is unaffected**

Log back in as the admin/company account.
Expected: all 10 nav items show; every page opens normally.

- [ ] **Step 8: (Optional) Refresh the static export**

If the `:3001` static build should reflect this: `cd frontend-new && npm run build`. Then `:3001` serves the gated app too.

---

## Notes / Known follow-ups (out of scope for this plan)

- **Left sidebar (`leftMenu.js`)** is not filtered by this plan; it uses a separate `lib/menuData` structure. The `AccessGuard` still blocks any page opened from it (redirect), so access is correct, but a manager could see sidebar links that bounce. Gating the sidebar is a clean follow-up.
- **Action-level** permissions (view/create/edit/delete) are saved by the role page but not enforced (deferred per spec).
- **Backend API authorization** is deferred — most routes aren't behind `auth:sanctum`, so it's a separate project.
