# Access Control Dashboard — Design

**Date:** 2026-05-02
**Status:** Draft (Phase 1: frontend with mock data)
**Owner:** sabarikrishnan2107-ux

## 1. Goal

Add a new dashboard-style **Access Control** page at `/access_control` that mirrors the visual design of a provided sample (KPI cards, sticky filter bar, log table). The page sits **alongside** the existing `/access_control_logs` table page (both remain accessible). A new "ACCESS CONTROL" entry is added to the global top nav.

This is **Phase 1: frontend only with mock data**. Real API wiring is deferred to a follow-up spec.

## 2. Non-goals

- Real API integration (`getAccessControlReport`, `getDeviceList`, etc.) — Phase 2
- Device-health KPIs and the side `DeviceHealthPanel` from the sample (dropped because the existing device-list endpoint does not surface online/offline status)
- Page-level dark-mode toggle (replaced by a global Header toggle as a bundled sub-task)
- Replacing or removing the existing `/access_control_logs` page

## 3. Sample reference

The design ports a 5-file sample shared inline in conversation:
- `Dashboard` page (TanStack Router + TS)
- `KpiCard`, `FilterBar`, `LogTable`, `DeviceHealthPanel` components
- `mock-data.ts` with seeded log/device generators
- A Tailwind v4 token sheet (OKLCH colors, gradient utilities, `pulse-dot` keyframe)

The sample uses TypeScript and TanStack Router; this project uses Next.js 15 + JavaScript. The port adapts accordingly.

## 4. Scope (Phase 1)

### 4.1 New files

| File | Purpose |
|---|---|
| `src/app/access_control/page.js` | Dashboard page (port of sample's `Dashboard` component) |
| `src/components/AccessControl/KpiCard.jsx` | Stat card (label + value + icon + tone, click-to-filter) |
| `src/components/AccessControl/FilterBar.jsx` | Sticky filter bar (date range, employee search, device, department) |
| `src/components/AccessControl/LogTable.jsx` | Sortable + paginated log table with CSV export |
| `src/components/AccessControl/mockData.js` | Port of sample's `mock-data.ts` (seeded `LOGS`, `DEVICES`) |

### 4.2 Edits to existing files

| File | Change |
|---|---|
| `src/components/Header.js` | Add `{ name: 'ACCESS CONTROL', href: '/access_control' }` between ATTENDANCE (`/shift`) and PAYROLL (`/payslips`). **Note:** The global theme toggle (sun/moon button) already exists in this Header using the project's own `useDarkMode()` hook from `src/context/DarkModeContext` — no theme work is needed. |
| `src/lib/menuData.js` | Add `accessControlMenu` with `Dashboard` and `Logs` entries; register `/access_control` and `/access_control_logs` against it. |
| `src/app/globals.css` | Append missing tokens used by the sample's components: gradient utilities (`.bg-gradient-primary`, `success`, `danger`, `warning`, `surface`), shadow utilities (`.shadow-card`, `.shadow-elevated`), `@keyframes pulse-dot` + `.pulse-dot`, and color tokens (`--primary-soft`, `--success`, `--success-foreground`, `--warning`, `--warning-foreground`) for both light and dark variants. |
| `src/app/layout.js` | No changes. The existing `<DarkModeProvider>` already wraps children. |

## 5. Page architecture

### 5.1 Route

`/access_control` → `src/app/access_control/page.js` (client component, `"use client"`).

### 5.2 Layout (top to bottom)

1. **Page header** — `ShieldCheck` icon, title "Access Control", subtitle "MyTime2Cloud · Enterprise Attendance Suite", "Live · synced HH:MM:SS" pill on the right. (No dark-toggle button here — moved to global Header.)
2. **FilterBar** — sticky, blurred background. From / To dates, employee search input with `<datalist>` suggestions, Device select, Department select, Reset / Apply buttons.
3. **KPI grid** — 4 cards in a single row at `xl` breakpoint:
   - Total Entries Today (IN)
   - Total Exits Today (OUT)
   - People Currently Inside (IN − OUT, last-event-per-employee)
   - Last Log Time
   Each card click toggles the table `view` state.
4. **Log table** — sortable by time (toggle asc/desc), paginated (12 rows/page), CSV export button.

### 5.3 State (in `page.js`)

- `filters: { fromDate, toDate, query, device, department }`
- `view: "all" | "in" | "out" | "inside" | "latest"`

### 5.4 Derived (memoized)

- `filtered` — apply filters to `LOGS`
- `stats` — counts (`ins`, `outs`, `inside`, `last`)
- `tableLogs` — apply `view` to `filtered`
- Animated counts via `useAnimatedCount(target)` hook — defined as a local function inside `page.js` (ported verbatim from sample, not extracted to a separate hooks file)

### 5.5 Adaptations from the sample

- Remove `createFileRoute` (Next.js routing is file-based)
- Add `"use client"` directive
- Remove the page-level `head()`/meta export (page metadata not in scope for Phase 1)
- Remove page-level dark state and toggle button (moved to global Header)
- Remove the 2 device-health KPI cards (Active Devices, Device Health)
- Remove the `<DeviceHealthPanel />` from the lower grid; lower grid becomes a single column containing only `<LogTable />`
- KPI grid changes from `xl:grid-cols-6` to `xl:grid-cols-4`

## 6. Component specs

### 6.1 `KpiCard.jsx`

JS port. Props: `label`, `value`, `hint`, `icon` (Lucide component), `tone` (`primary | success | danger | warning | neutral`), `active`, `onClick`, `trend`. Renders a button with a gradient top stripe (per tone), label, large value, optional hint and trend pill. Active state shows a colored ring.

### 6.2 `FilterBar.jsx`

JS port. Sticky positioning + `backdrop-blur-xl`. Children:
- From / To `<input type="date">` with calendar icon decoration
- Search `<input>` with magnifying-glass icon and `<datalist>` for suggestions (employee names + IDs from mock data)
- Two shadcn `Select`s: Device (populated from `DEVICES`), Department (static list of 9 entries from sample)
- Reset and Apply buttons

`Apply` is cosmetic in Phase 1 (filtering is live via `onChange`). Kept for visual fidelity.

### 6.3 `LogTable.jsx`

JS port. Header with title + total count + "Export CSV" button. Columns: Employee (avatar initials + name + department), ID, Device, Location, Type (IN/OUT pill), Time (sortable), Status (badge), Verification (icon + label).

- Sort: clicking the Time header toggles asc/desc
- Pagination: client-side, 12 rows/page, prev/next buttons
- Empty state: "No logs match your filters."
- CSV export: builds a Blob and triggers download via temporary `<a>`

### 6.4 `mockData.js`

Direct port of `mock-data.ts`:
- `DEVICES` array (8 devices, hard-coded online/offline/warning status — though Phase 1 doesn't surface device health, the data is retained for `FilterBar`'s device dropdown)
- `seedRandom(42)` → deterministic
- `generateLogs(240)` → 240 seeded logs
- `LOGS` export

Field shape (no TS types, plain object):
```
{ id, employeeName, employeeId, rfid, department, deviceName, deviceId, location, logType, timestamp (Date), status, verification }
```

## 7. Header changes (`Header.js`)

**Nav link addition** — insert at index 3 (after ATTENDANCE):

```js
const navLinks = [
  { name: 'DASHBOARD', href: '/' },
  { name: 'EMPLOYEES', href: '/employees' },
  { name: 'ATTENDANCE', href: '/shift' },
  { name: 'ACCESS CONTROL', href: '/access_control' },
  { name: 'PAYROLL', href: '/payslips' },
  { name: 'VISITORS', href: '/visitor' },
  { name: 'REPORTS', href: '/report' },
  { name: 'SETTINGS', href: '/setup' },
];
```

**Theme toggle** — already present in the Header (`Header.js:277`) using `useDarkMode()` from `src/context/DarkModeContext`. No change needed.

## 8. Sub-nav changes (`menuData.js`)

```js
const accessControlMenu = [
  { href: "/access_control", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/access_control_logs", icon: History, label: "Logs" },
];

// In leftNavLinks:
"/access_control": accessControlMenu,
"/access_control_logs": accessControlMenu,
```

## 9. Globals.css additions

Append to `src/app/globals.css`:

- **Color tokens** (light `:root` and `.dark`): `--primary-soft`, `--success`, `--success-foreground`, `--warning`, `--warning-foreground` — sourced from sample's OKLCH values
- **Gradient utilities** (in `@layer utilities`): `.bg-gradient-primary`, `.bg-gradient-success`, `.bg-gradient-danger`, `.bg-gradient-warning`, `.bg-gradient-surface` — referencing `--gradient-*` CSS vars
- **Shadow utilities**: `.shadow-card`, `.shadow-elevated`
- **Animation**: `@keyframes pulse-dot` + `.pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }`
- **`@theme inline`** mappings: extend the existing `@theme` block (or add an `@theme inline` block) with `--color-primary-soft`, `--color-success`, `--color-success-foreground`, `--color-warning`, `--color-warning-foreground` so the new tokens are exposed as Tailwind v4 utility classes (`bg-success`, `text-warning`, `bg-primary-soft`, etc.)

Existing tokens (`--background`, `--foreground`, `--card`, `--primary`, `--destructive`, `--muted`, `--border`, etc.) are preserved as-is.

## 10. Acceptance criteria

- [ ] Visiting `/access_control` renders the dashboard layout matching the sample's visual design
- [ ] Page header shows the live-synced timestamp pill
- [ ] FilterBar filters the table in real time on `onChange`
- [ ] Clicking any KPI card toggles the table's `view`; clicking the same card again resets to `all`
- [ ] Table supports sorting (Time column), pagination (12/page), and CSV export
- [ ] CSV download contains all filtered rows (not just the visible page)
- [ ] "ACCESS CONTROL" appears in the global top nav between ATTENDANCE and PAYROLL
- [ ] Sub-nav on `/access_control` shows Dashboard + Logs entries
- [ ] Sub-nav on `/access_control_logs` shows the same Dashboard + Logs entries (so users can hop between the two)
- [ ] Global Header sun/moon button toggles the whole app between light and dark
- [ ] All data on `/access_control` comes from `mockData.js` — zero API calls
- [ ] No regressions to the existing `/access_control_logs` page

## 11. Risks and notes

- **Token additions in `globals.css` may conflict with existing styles.** The project's `globals.css` already defines `--background`, `--foreground`, etc. We add only what's missing (`--primary-soft`, `--success`, `--warning` and friends). If any name collides with an existing token, prefer keeping the project's existing value and aliasing in the component.
- **Project uses its own `DarkModeContext`, not `next-themes`.** Although `next-themes` is in `package.json`, the active provider is `DarkModeProvider` from `src/context/DarkModeContext`. Any new theme-aware code should use `useDarkMode()` from that context.
- **Datalist suggestions are basic.** `<datalist>` UX varies across browsers; works in Chrome/Edge/Firefox/Safari but styling is browser-controlled. Acceptable for Phase 1.
- **CSV export uses Blob + object URL.** Works in modern browsers; no shim needed.
- **Tailwind v4 `@theme` arbitrary tokens.** Tokens used as `bg-success`, `text-warning`, `bg-primary-soft` need to exist as `@theme` mappings or the classes won't compile. We add these mappings to `globals.css`.

## 12. Phase 2 preview (out of scope for this design)

When wiring real APIs:
- Replace `LOGS` with `getAccessControlReport({ from_date, to_date, branch_id, DeviceID, UserID, user_type, ... })`
- Replace `DEVICES` with `getDeviceList(branch_id)`
- Department list — replace static array with API-driven (or derive from `getBranches` / department endpoint)
- Employee suggestions — replace mock list with `getScheduledEmployeeList(branch_id)`
- "People Currently Inside" — decide between (E) auto-fetch full day in background or (G) skip the KPI
- Field mapping documented separately (sample's `AttendanceLog` ↔ project's `{ employee.full_name, employee.employee_id, device.function, mode, time, date, ... }`)
