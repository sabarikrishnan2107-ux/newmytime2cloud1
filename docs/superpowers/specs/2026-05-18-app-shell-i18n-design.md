# App Shell i18n — Design

**Date:** 2026-05-18
**Scope:** Frontend (`frontend-new`) — translate the app shell (sidebar + top header) into English / Arabic / French / Hindi, and seed a shared common-buttons catalog for future per-page plans to reuse.

**Builds on:** [2026-05-18-login-language-switcher-design.md](2026-05-18-login-language-switcher-design.md). The i18n library (react-i18next), the four locale files, the `LanguageProvider`, and the `LanguageSwitcher` component are already installed and working. This work only adds keys to the existing locale files and replaces hard-coded strings in the shell components.

## 1. Goal

After this work ships:

- Whichever language the user selects on the login page persists into the authenticated app (this already happens — the language is in `localStorage` and `LanguageProvider` reads it on every page load).
- Every visible string in the **sidebar menu** ([leftMenu.js](../../../frontend-new/src/components/leftMenu.js)) and the **top header** ([Header.js](../../../frontend-new/src/components/Header.js)) is translated.
- A reusable `<LanguageSwitcher />` instance appears in the top header so users can change language after logging in.
- When the user has selected Arabic, the entire shell mirrors to RTL (sidebar on the right edge, icons mirrored, padding flipped).
- A new `common.*` namespace in the locale files holds ~20 universal action strings (Save, Cancel, Delete, etc.) so future per-page plans can reference them without redefining.

Translating any individual feature page (Employees, Attendance, Payroll, etc.), staff portal pages, SweetAlert / Sonner toasts from non-shell code, and backend / API messages is **explicitly out of scope** and will be tackled as separate follow-up plans.

## 2. Architecture

Building on top of the existing i18n infrastructure (`lib/i18n.js`, four `locales/{lang}/common.json` files, `LanguageProvider`, `LanguageSwitcher`):

```
frontend-new/
├── src/
│   ├── locales/
│   │   ├── en/common.json                   (modified — add menu, header, common namespaces)
│   │   ├── ar/common.json                   (modified — same)
│   │   ├── fr/common.json                   (modified — same)
│   │   └── hi/common.json                   (modified — same)
│   ├── lib/
│   │   └── menuData.js                      (modified — labels become i18n keys)
│   └── components/
│       ├── leftMenu.js                      (modified — render via t(), logical CSS, render LanguageSwitcher inline? NO — header gets it)
│       └── Header.js                        (modified — render via t(), logical CSS, render LanguageSwitcher)
```

No new files. No new directories. No new dependencies.

### 2.1 Where translation happens

`menuData.js` is a pure-data config (no React, no hooks). Today each item looks like:

```js
{ href: "/shift", icon: Clock, label: "Shift" }
```

After this work:

```js
{ href: "/shift", icon: Clock, label: "menu.shift" }
```

The `label` field becomes the **i18n key string**, not a display string. The sidebar component (`leftMenu.js`) is the only consumer that turns it into UI, and it will render `{t(link.label)}` instead of `{link.label}`.

Reasoning for keeping the i18n key in the data file (instead of converting `menuData` into a function that takes `t` and returns translated labels):

- Pure-data config is easier to scan, edit, and version-control.
- The existing data structure (including nested `children` arrays and `leftNavLinks` map keyed by route) doesn't change shape — minimal blast radius.
- Internal state (e.g. `openGroups[link.label]` in [leftMenu.js:142](../../../frontend-new/src/components/leftMenu.js#L142)) used `link.label` as a state-map key. The i18n key string works as a state key just as well as the English string did — no logic change needed.
- The `title` attribute on each menu button (used as a tooltip when the sidebar is collapsed) is also a user-visible string, so it goes through `t()` too.

### 2.2 Three new namespaces

All three live inside the existing `common.json` per locale (alongside `login`, `branding`, `footer`, `language`):

- `menu.*` — keys for every sidebar label. Final structure mirrors the menu hierarchy:
  - Top-level items: `menu.shift`, `menu.schedule`, `menu.dashboard`, `menu.employees`, `menu.setup`, `menu.payroll`, `menu.reports`, etc.
  - Nested-group parents: `menu.tracking` (the only nested group today)
  - Section-specific items: `menu.leave.balances`, `menu.leave.requests`, `menu.payroll.salaryStructures`, `menu.reports.attendance`, `menu.reports.accessControl`, etc.
  - Duplicates collapsed: today the same English label "Dashboard" appears five times (one per menu group). We define **one** `menu.dashboard` key and reuse it everywhere, so translators don't have to translate the same word five times.
- `header.*` — keys for the top header:
  - Top nav links: `header.nav.dashboard`, `header.nav.employees`, `header.nav.attendance`, `header.nav.leave`, `header.nav.liveTracker`, `header.nav.accessControl`, `header.nav.payroll`, `header.nav.visitors`, `header.nav.reports`, `header.nav.settings` (10 keys; "PAYROLL", "SETTINGS" etc. — currently uppercased in code via raw uppercase strings — go through `t()` with the same casing kept in the translation values)
  - Action button tooltips: `header.tooltips.notifications`, `header.tooltips.watchTutorial`, `header.tooltips.wizardOn`, `header.tooltips.wizardOff`, `header.tooltips.lightMode`, `header.tooltips.darkMode`
  - Notification dropdown: `header.notifications.title` (= "Notifications"), `header.notifications.clearAll` (= "Clear all"), `header.notifications.empty` (= "No notifications yet")
- `common.*` — universal action strings, listed in §4. Defined but NOT yet wired into any feature page in this work. Future per-page plans (Employees, Attendance, …) will reference them.

### 2.3 Logout button in sidebar

The sidebar has a hard-coded "Logout" string at [leftMenu.js:265](../../../frontend-new/src/components/leftMenu.js#L265) and a hard-coded `title="Click to logout"` at [leftMenu.js:245](../../../frontend-new/src/components/leftMenu.js#L245). Both become `t(...)` calls referencing two new keys:

- `header.logout` (= "Logout") — placed in `header` namespace since logout is a top-level shell action
- `header.logoutHint` (= "Click to logout")

### 2.4 LanguageSwitcher in the header

The same `<LanguageSwitcher />` component shipped on the login page is added to the action-button row in `Header.js`, between the existing buttons (Bell, PlayCircle, Wand2, Moon/Sun). Single line of JSX. No new code needed in the component itself — it already reads/writes localStorage and updates `<html dir>` correctly. With this in place, logged-in users can change language without going back to the login page.

## 3. Complete list of `menu.*` keys

Compiled from [`menuData.js`](../../../frontend-new/src/lib/menuData.js) with duplicates collapsed:

| Key | English source | Source location |
|---|---|---|
| `menu.shift` | Shift | attendanceMenu |
| `menu.schedule` | Schedule | attendanceMenu |
| `menu.changeRequest` | Change Request | attendanceMenu |
| `menu.leaveDashboard` | Leave Dashboard | attendanceMenu |
| `menu.dashboard` | Dashboard | accessControlMenu / leaveMenu / payrollMenu / visitorMenu / dashboardMenu |
| `menu.logs` | Logs | accessControlMenu |
| `menu.requests` | Requests | leaveMenu |
| `menu.balances` | Balances | leaveMenu |
| `menu.settings` | Settings | leaveMenu / companyMenu / payrollMenu / visitorMenu |
| `menu.reports` | Reports | leaveMenu / payrollMenu / visitorMenu / dashboardMenu |
| `menu.reports.attendance` | Attendance | reportMenu |
| `menu.reports.accessControl` | Access Control | reportMenu |
| `menu.reports.payroll` | Payroll Report | reportMenu |
| `menu.reports.visitor` | Visitor Report | reportMenu |
| `menu.reports.manual` | Manual Report | reportMenu |
| `menu.tracking` | Tracking | reportMenu (nested group) |
| `menu.liveTracker` | Live Tracker | reportMenu.children |
| `menu.trackerHistory` | Tracker History | reportMenu.children |
| `menu.setup` | Setup | companyMenu |
| `menu.company` | Company | companyMenu |
| `menu.branch` | Branch | companyMenu |
| `menu.department` | Department | companyMenu |
| `menu.login` | Login | companyMenu |
| `menu.device` | Device | companyMenu |
| `menu.automation` | Automation | companyMenu |
| `menu.roles` | Roles | companyMenu |
| `menu.liveCamera` | Live Camera | companyMenu |
| `menu.geoFencing` | Geo Fencing | companyMenu |
| `menu.holidays` | Holidays | companyMenu |
| `menu.announcements` | Announcements | companyMenu |
| `menu.activity` | Activity | companyMenu |
| `menu.payroll` | Payroll | companyMenu |
| `menu.emirateIdSetup` | Emirate ID Setup | companyMenu |
| `menu.payrollRegister` | Payroll Register | payrollMenu |
| `menu.salaryStructures` | Salary Structures | payrollMenu |
| `menu.adjustments` | Adjustments | payrollMenu |
| `menu.loansAdvances` | Loans & Advances | payrollMenu |
| `menu.employeeList` | Employee List | employeesMenu |
| `menu.employeeUpload` | Employee Upload | employeesMenu |
| `menu.leavesRequests` | Leaves Requests | employeesMenu |
| `menu.documentExpiry` | Document Expiry | employeesMenu |
| `menu.deviceLogs` | Device Logs | employeesMenu |
| `menu.reception` | Reception | visitorMenu |
| `menu.visitorLogs` | Visitor Logs | visitorMenu |
| `menu.directory` | Directory | visitorMenu |
| `menu.preRegister` | Pre-Register | visitorMenu |
| `menu.blacklist` | Blacklist | visitorMenu |
| `menu.zoneAccess` | Zone Access | visitorMenu |
| `menu.employees` | Employees | dashboardMenu |
| `menu.attendance` | Attendance | dashboardMenu |

**49 unique menu keys** (the visible English labels reduced from 60 occurrences after collapsing duplicates).

## 4. Complete list of `common.*` keys (seeded, not yet wired)

Universal action strings that future per-page plans will use. Added to all four locale files in this work, but **not** wired into any feature page yet:

| Key | English |
|---|---|
| `common.save` | Save |
| `common.cancel` | Cancel |
| `common.delete` | Delete |
| `common.add` | Add |
| `common.edit` | Edit |
| `common.update` | Update |
| `common.create` | Create |
| `common.search` | Search |
| `common.filter` | Filter |
| `common.export` | Export |
| `common.import` | Import |
| `common.submit` | Submit |
| `common.close` | Close |
| `common.back` | Back |
| `common.next` | Next |
| `common.yes` | Yes |
| `common.no` | No |
| `common.ok` | OK |
| `common.confirm` | Confirm |
| `common.loading` | Loading... |
| `common.actions` | Actions |
| `common.status` | Status |
| `common.active` | Active |
| `common.inactive` | Inactive |

24 keys.

## 5. Complete list of `header.*` keys

| Key | English |
|---|---|
| `header.nav.dashboard` | DASHBOARD |
| `header.nav.employees` | EMPLOYEES |
| `header.nav.attendance` | ATTENDANCE |
| `header.nav.leave` | LEAVE |
| `header.nav.liveTracker` | LIVE TRACKER |
| `header.nav.accessControl` | ACCESS CONTROL |
| `header.nav.payroll` | PAYROLL |
| `header.nav.visitors` | VISITORS |
| `header.nav.reports` | REPORTS |
| `header.nav.settings` | SETTINGS |
| `header.tooltips.notifications` | Notifications |
| `header.tooltips.watchTutorial` | Watch Tutorial |
| `header.tooltips.wizardOn` | Wizard mode: ON (only Setup is accessible) — click to disable |
| `header.tooltips.wizardOff` | Wizard mode: OFF — click to enable Setup-only mode |
| `header.tooltips.lightMode` | Switch to Light Mode |
| `header.tooltips.darkMode` | Switch to Dark Mode |
| `header.notifications.title` | Notifications |
| `header.notifications.clearAll` | Clear all |
| `header.notifications.empty` | No notifications yet |
| `header.logout` | Logout |
| `header.logoutHint` | Click to logout |

21 keys.

## 6. RTL handling in the shell

Convert direction-sensitive Tailwind utilities to logical equivalents in both `leftMenu.js` and `Header.js`:

- `left-*` → `start-*`
- `right-*` → `end-*`
- `pl-*` → `ps-*`
- `pr-*` → `pe-*`
- `ml-*` → `ms-*`
- `mr-*` → `me-*`
- `text-left` → `text-start`
- `text-right` → `text-end`

Specifically:

In `leftMenu.js`:
- `border-r` on the `<aside>` (line 131) — this is direction-sensitive. Replace with `border-e` so in RTL the sidebar's border appears on its visual *left* edge (i.e. the inline-end of an RTL document is on the visual left). The `<aside>` itself will appear on the visual right side of the page in RTL, with the border on its visual left.
- `absolute left-0 top-1/2` indicators (lines 158, 226) — replace with `start-0 top-1/2`.
- `ml-0 group-hover:ml-2.5` (lines 164, 234) — replace with `ms-0 group-hover:ms-2.5`.
- `text-left` (line 164) — replace with `text-start`.
- `ml-7` (line 179) — replace with `ms-7`.

In `Header.js`:
- `right-0` on the notification dropdown panel (line 273) — replace with `end-0` so in RTL the dropdown opens toward the inline-start.
- `top-0.5 right-0.5` on the notification badge (line 265) — replace with `top-0.5 end-0.5`.
- `top-1.5 right-1.5` on the wizard / dark-mode indicators (lines 344, 360) — replace with `top-1.5 end-1.5`.
- `text-right` on the time/date block (line 364) — replace with `text-end`.
- `space-x-*` utilities — these are direction-agnostic in Tailwind v4 (use logical gap), no change needed. Confirm in the implementation.

After this pass, in Arabic mode:

- The sidebar appears on the **right** edge of the viewport.
- Menu icons remain at the inline-start of each menu row (which is now visually the right side of the row).
- The expand-on-hover behavior still works because `w-20 hover:w-60` is direction-agnostic.
- The notification dropdown opens with its inline-end at `end-0`, so in RTL the dropdown's right edge aligns with the bell's left edge — opening toward the page center.
- The top nav links remain in their flex order, just rendered right-to-left.

## 7. Locked-in translations

The four locale files will be updated with carefully prepared translations. The values for menu/header/common namespaces follow the same approach as the login work: technical/HR domain terms (Shift, Schedule, Attendance, Payroll) are translated by reference to industry-standard usage in each language. The JSON files remain the single point of update — a native-speaker review pass touches only those four files.

The complete English source is in §3, §4, §5. Arabic, French, and Hindi translations of the same keys will be provided directly in the implementation plan.

## 8. Files touched

**Modified files (7):**

1. `frontend-new/src/locales/en/common.json` — add `menu.*` (49 keys), `header.*` (21 keys), `common.*` (24 keys). 94 new keys total.
2. `frontend-new/src/locales/ar/common.json` — same keys translated into Arabic.
3. `frontend-new/src/locales/fr/common.json` — same keys translated into French.
4. `frontend-new/src/locales/hi/common.json` — same keys translated into Hindi.
5. `frontend-new/src/lib/menuData.js` — replace every `label: "..."` literal with `label: "menu.<key>"` per the mapping table in §3.
6. `frontend-new/src/components/leftMenu.js` — add `useTranslation`, wrap `{link.label}` / `{child.label}` / title attributes with `t(...)`, translate hard-coded "Logout" and "Click to logout", swap direction-sensitive classes for logical ones.
7. `frontend-new/src/components/Header.js` — add `useTranslation`, replace nav-link strings, tooltip strings, notification dropdown strings with `t(...)`, render `<LanguageSwitcher />` in the action-button row, swap direction-sensitive classes for logical ones.

**No new files.** **No new dependencies.**

## 9. Verification

No automated tests for the frontend. Manual matrix:

1. **Default English** — clear localStorage, load `/login`, log in. Sidebar in English, header in English, layout LTR, language switcher in header shows 🇬🇧 EN.
2. **French shell** — log out, set language to Français on the login page, log in. Every sidebar menu label is French. Every header nav link is French. Notification dropdown (open the bell) reads in French. Hover over Wizard / dark-mode / tutorial / bell buttons — tooltips are French. Hover the avatar at the bottom-left of sidebar — title "Click to logout" is French. Sidebar bottom shows "Logout" in French.
3. **Hindi shell** — same as French but in Hindi. Layout still LTR.
4. **Arabic shell with RTL** — set language to العربية on login, log in. Verify:
   - Sidebar is on the **right** edge of the viewport.
   - Menu icons appear at the inline-start (visually right side of each row).
   - The expand-on-hover still works.
   - Header nav links are Arabic and render right-to-left.
   - Notification dropdown opens with its right edge aligned to the bell button (correct in RTL).
   - The language switcher in the header is now near the visual left side of the header action bar (since the action bar mirrors in RTL).
5. **Change language while logged in** — click the language switcher in the header, pick a different language. Page strings change immediately (no reload needed). Refresh — language persists.
6. **No regression** — log out → confirm redirect to `/login` still works. Open notifications → confirm SSE-driven notification messages still appear (those come from the backend and remain in their original language — that is correct per scope).

## 10. Out of scope

The following are explicitly **not** part of this work and will be separate follow-up plans:

- Translating any individual feature page (`/employees`, `/attendance`, `/payroll`, `/shift`, `/schedule`, `/leaves`, `/visitor`, `/device`, `/setup`, `/company`, `/reports`, etc.) including their column headers, form labels, validation messages, dialogs, dropdowns, and toasts.
- Translating the staff portal (`/staff/*` routes).
- Translating SweetAlert dialogs (`sweetalert2.fire(...)` calls scattered throughout the app).
- Translating Sonner toast messages (`toast.success(...)`, `toast.error(...)`) originating from non-shell code.
- Translating backend API error responses or notification payloads sent via SSE.
- Locale-aware date / number / currency formatting (the header still renders time/date in `en-US` format).
- Per-user backend persistence of the chosen language.
- Auto-detecting the browser's preferred language and defaulting to it on first visit.

Each item above can become its own brainstorming → spec → plan cycle later. The infrastructure put in place here ensures every one of those follow-up plans is small, mechanical, and reviewable.
