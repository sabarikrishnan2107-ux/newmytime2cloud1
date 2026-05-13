# Leave Dashboard Redesign — Design

**Date:** 2026-05-13
**Scope:** Full visual + structural rebuild of `/leave-dashboard` to match the provided sample mockups.
**Target file:** `frontend-new/src/app/leave-dashboard/page.js` (single-page rewrite).

## Goals

- Bring the Leave Dashboard to full visual parity with the sample mockups (header band, KPI deltas, area trend chart, donut + legend, department bars, upcoming leaves panel, personal leave balance, enriched activity table).
- Source all data client-side from existing endpoints. No new backend routes.
- Keep the page in a single file with inline section components; extract later only if reused.

## Non-goals

- New backend endpoints. Everything derives from `/employee_leaves`, `/leave_groups`, and the cached user in `localStorage`.
- Multi-page navigation, route changes, or menu changes.
- Replacing any other dashboard.

## Page Layout

Top to bottom:

1. **Header band** — gradient panel. Left: `Welcome back, {firstName}` pill, title "Leave Dashboard", subtitle "Real-time view of approvals, attendance and team availability across all branches." Right: Branch multi-dropdown, Department multi-dropdown, **More** filter button (popover containing the Status dropdown), **Export** button.
2. **KPI row** — 4 cards: Total Requests / Pending Approvals / Approved / On Leave Today. Each shows value, subtitle, and a delta chip (`▲ +X.X%` or `▼ −X.X%`) plus "vs last month".
3. **Charts row** — `lg:grid-cols-3`:
   - **Monthly Leave Trends** (`lg:col-span-2`): area chart with two series (Approved, Pending), 12 months, year dropdown (defaults to current year).
   - **Leave Type Distribution**: donut + legend below with colored dots and counts. Subtitle "By volume this quarter".
4. **Mid row** — `lg:grid-cols-3`:
   - **Department-wise Leave Days** (`lg:col-span-2`): bar chart, total days taken in current month grouped by department.
   - **Upcoming Leaves**: avatar list, top 5 future-dated leaves, "View all" link to filtered listing.
5. **Your Leave Balance** — full-width band, 4 cards (Annual, Sick, Casual, Emergency) with remaining number, `/ total days`, colored progress bar, "X used this year".
6. **Recent Leave Activity** — full-width table: avatar + name + role · branch, type chip, duration, days, status pill, applied date, kebab menu.

## Data Strategy

Single source of truth: a `leaves` array fetched from `/employee_leaves` driven by the active filters.

**Fetch parameters:**
- `branch_ids`, `department_ids`, `status_ids` — from the current filter state.
- `start_date = today − 365d`, `end_date = today + 60d` (matches the param names used by `src/app/staff/leave/balance/page.js`) — wide window so trends, dept aggregates, today's count, upcoming, and recent activity all derive from one response.
- `per_page: 500`.

**Additional fetches:**
- `getUser()` (from `@/config/index`) for the greeting + identifying the current user for "Your Leave Balance". The user object is the localStorage blob. Greeting uses `user.first_name || user.name?.split(' ')[0] || 'there'`. Balance uses `user.employee_id` if present; otherwise the balance row renders an empty state.
- `/leave_groups` (existing pattern from `src/app/staff/leave/balance/page.js`) for entitlement totals per leave type when the current user has a `leave_group_id`. Look up the user's group via `/employeev1?employee_id=…&per_page=1` (same pattern).

**Derivations (all pure functions of `leaves`):**
- `computeKpis(leaves, today)` → `{ total, pending, approved, onLeaveToday, deltas: { total, pending, approved, onLeaveToday } }`
  - `total` = `leaves.length`
  - `pending` = count where `status === 0`
  - `approved` = count where `status === 1`
  - `onLeaveToday` = count where `status === 1 && from_date ≤ today ≤ to_date`
  - `deltas`: compare counts for current calendar month vs previous calendar month based on `created_at`. Output `{ value, positive }`.
  - `onLeaveToday` subtitle: `Across N departments` where N = unique `employee.department.name` count among today's approved leaves.
- `computeMonthlySeries(leaves, year)` → array of 12 entries `{ month, approved, pending }` filtered by `new Date(l.from_date || l.start_date).getFullYear() === year`.
- `computeTypeDistribution(leaves)` → `[{ name, value, color }]` summed by `leave_type.name` (fallback `leave_group_type.leave_type.name`).
- `computeDepartmentDays(leaves, today)` → `[{ department, days }]` filtered to `status === 1` and `from_date` in current month, summed `total_days || days || 0`.
- `computeUpcoming(leaves, today, limit = 5)` → leaves where `from_date > today`, sorted ascending by `from_date`.
- `computeBalance(leaves, entitlements, currentUserId)` → for each leave type the user is entitled to: `{ type, used, total, accent }` where `used` = sum of approved days for that user + type this year.

**Year-dropdown behavior:** filters the already-fetched `leaves` client-side. No extra fetch.

## Visual System

**Header gradient:** `from-slate-900 via-indigo-950 to-slate-900` with subtle radial purple glow.

**Card baseline:** `bg-slate-800/50 border border-white/10 rounded-xl p-5`.

**KPI accents:**
- Total Requests — sky `#38bdf8`
- Pending Approvals — orange `#f97316`
- Approved — emerald `#10b981`
- On Leave Today — violet `#8b5cf6`

**Delta chip:** small rounded pill, `bg-{color}-500/15 text-{color}-400`, arrow icon + percentage. Grey "vs last month" beside it.

**Trend chart (recharts `AreaChart`):**
- Two `<Area>` series, `type="monotone"`, gradient fills via `<linearGradient>` defs.
- Approved = cyan/sky, Pending = amber.

**Donut (`PieChart`):** `innerRadius=60 outerRadius=85`. Type colors: Annual `#3b82f6`, Sick `#06b6d4`, Casual `#10b981`, Emergency `#f59e0b`, Maternity `#ec4899`, Unpaid `#64748b`, fallback palette for any extras.

**Department bars:** solid cyan `#2dd4bf`, rounded top.

**Status pills (activity table):** dot + label in `rounded-full bg-{color}/10 text-{color}-400 border border-{color}-500/20`. Approved=emerald, Pending=amber, Rejected=red, WFH=sky.

**Leave-type chip (activity table):** solid-tinted pill `bg-{type-color}/20 text-{type-color}-300` using the same palette as the donut.

**Avatars:** initials circle, deterministic background color from a hash of the name, 36px.

## Component Inventory (inline in `page.js`)

| Component | Props | Responsibility |
|---|---|---|
| `HeaderBand` | `userName`, filter state + setters, `onExport` | Greeting, title, filters, More/Export |
| `MoreFilterPopover` | `status`, `onStatusChange` | Funnel button + popover holding Status dropdown |
| `KpiCard` | `title`, `value`, `subtitle`, `icon`, `accent`, `delta` | Single KPI card |
| `DeltaChip` | `value`, `positive` | "▲ +X.X%" pill |
| `TrendAreaChart` | `data`, `year`, `onYearChange`, `years` | Area chart card |
| `TypeDonut` | `data` | Donut + legend |
| `DepartmentBars` | `data` | Bar chart card |
| `UpcomingLeaves` | `items` | Avatar list, top 5, View all |
| `BalanceCard` | `label`, `used`, `total`, `accent` | One balance card |
| `LeaveBalanceRow` | `cards` | 4-card row |
| `ActivityTable` | `rows`, `loading`, `onAction` | Recent activity table with kebab menu |
| `StatusPill`, `TypeChip`, `Avatar` | small | Shared primitives |

## Interactions

- **Filters** drive a single `useEffect` that re-fetches `/employee_leaves` with the active filter state.
- **More button** opens a popover containing the Status dropdown; selecting a value updates filter state and closes the popover.
- **Year dropdown** on the trend chart filters the fetched leaves client-side.
- **Kebab menu** (activity row): View / Approve / Reject. Approve and Reject hit existing `approveLeave` / `rejectLeave` and refetch on success. Hidden for non-pending rows.
- **Export** generates a CSV `Blob` from the current filtered `leaves` (all rows, not just visible 10) and triggers download. Columns: Employee, Role, Branch, Department, Leave Type, From, To, Days, Status, Applied.

## States

- **Loading:** each card renders a small `animate-pulse` skeleton block in place of its content.
- **Empty (per chart/section):** centered muted text "No data for this period."
- **Empty (activity table):** existing "No leave requests found" row.
- **Error fetching:** existing `console.error` + empty state (same as today). No toast.

## Out of Scope (Explicit)

- Approver assignment / "Awaiting your review" filtering by manager hierarchy. Pending Approvals counts all pending leaves in the filtered scope.
- Real "vs last month" baselines for On Leave Today. Delta is computed from `created_at` month deltas of the matching slice.
- Multi-year backlog handling in the donut beyond the 12-month fetch window.

## Files Touched

- **Modify:** `frontend-new/src/app/leave-dashboard/page.js` (rewrite).
- **Read (unchanged):**
  - `frontend-new/src/lib/endpoint/leaves.js` — `getLeavesRequest`, `approveLeave`, `rejectLeave`.
  - `frontend-new/src/lib/api.js` — `getBranches`, `getDepartments`, `getDepartmentsByBranchIds`.
  - `frontend-new/src/config/index.js` — `getUser`.
  - `frontend-new/src/components/ui/MultiDropDown`, `DropDown`, `ProfilePicture`.

No new files. No backend changes. No menu changes.

## Risks

- **Entitlement data shape:** if the logged-in user has no `leave_group_id`, "Your Leave Balance" will render with `total = 0` for each type. We render a muted "No allocation set" subtitle in that case.
- **Performance:** `per_page: 500` over a 425-day window is large for big orgs. If sluggish, drop the trend chart window to current year only and refetch when the year dropdown changes.
- **Color count:** the donut palette covers 6 named types; additional types cycle through the existing `leaveTypeColors` fallback.
