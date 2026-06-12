# Leave Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/leave-dashboard` to full visual parity with the sample mockups — gradient header band, KPI delta chips, area-style trend chart, donut + legend, department bar chart, upcoming leaves panel, personal leave balance row, and an enriched activity table.

**Architecture:** Single-page rewrite of `frontend-new/src/app/leave-dashboard/page.js`. All sections live inline as components in one file. All data derives client-side from the existing `/employee_leaves`, `/employeev1`, and `/leave_groups` endpoints — no backend changes. Filters drive a single fetch; pure helper functions derive each section's data from the shared `leaves` array.

**Tech Stack:** Next.js 15 (App Router), React, Tailwind, recharts, lucide-react, Radix Popover, existing project utilities (`@/lib/api`, `@/lib/endpoint/leaves`, `@/config/index`, `@/components/ui/*`).

**Verification:** No unit-test runner is configured in `frontend-new`. Verify each task by:
1. Running `cd frontend-new && npm run dev` (already running is fine).
2. Opening `http://localhost:3001/leave-dashboard` in a browser.
3. Confirming the section renders, the dev console is free of errors/warnings, and the visual matches the sample mockups.

**Git policy:** Per project preference, the **user handles all git commits**. Each task ends with a "User commit checkpoint" — pause and let the user commit before the next task.

---

## File Structure

**Modified:**
- `frontend-new/src/app/leave-dashboard/page.js` — complete rewrite. ~600 lines. Contains the page component, inline section components (HeaderBand, KpiCard, TrendAreaChart, TypeDonut, DepartmentBars, UpcomingLeaves, BalanceCard, ActivityTable), and pure derivation helpers (computeKpis, computeMonthlySeries, computeTypeDistribution, computeDepartmentDays, computeUpcoming, computeBalance).

**Read (unchanged):**
- `frontend-new/src/lib/endpoint/leaves.js` — `getLeavesRequest`, `approveLeave`, `rejectLeave`.
- `frontend-new/src/lib/api.js` — `getBranches`, `getDepartments`, `getDepartmentsByBranchIds`.
- `frontend-new/src/lib/api-client.js` — `api`, `buildQueryParams`.
- `frontend-new/src/config/index.js` — `getUser`.
- `frontend-new/src/components/ui/MultiDropDown`, `DropDown`, `ProfilePicture`.
- `@radix-ui/react-popover` — already installed.

**Not touched:** any backend file, any other frontend page, the menu config.

---

## Task 1: Scaffold helper functions + page shell

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js` (complete rewrite — first pass adds shell + helpers + placeholder sections)

This task replaces the existing page with the new shell. KPIs/charts/tables are placeholder boxes that we fill in later tasks. After this task the page should render the new layout skeleton with no console errors.

- [ ] **Step 1: Replace `frontend-new/src/app/leave-dashboard/page.js` with this shell**

```jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, Clock, CheckCircle2, Users, Filter, Download, TrendingUp,
  TrendingDown, MoreHorizontal, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import * as Popover from "@radix-ui/react-popover";
import { getLeavesRequest, approveLeave, rejectLeave } from "@/lib/endpoint/leaves";
import { getBranches, getDepartments, getDepartmentsByBranchIds } from "@/lib/api";
import { api, buildQueryParams } from "@/lib/api-client";
import { getUser } from "@/config/index";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DropDown from "@/components/ui/DropDown";

const TYPE_COLORS = {
  annual: "#3b82f6", sick: "#06b6d4", casual: "#10b981",
  emergency: "#f59e0b", maternity: "#ec4899", unpaid: "#64748b",
};
const FALLBACK_COLORS = ["#8b5cf6", "#14b8a6", "#f43f5e", "#a855f7", "#84cc16"];

const colorForType = (name, idx) => {
  const k = (name || "").toLowerCase().split(" ")[0];
  return TYPE_COLORS[k] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
};

const STATUS = { 0: "Pending", 1: "Approved", 2: "Rejected" };

const dayDiff = (a, b) => Math.floor((a - b) / 86400000);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmtDate = (s) => (s ? String(s).split("T")[0] : "—");
const parseDate = (s) => (s ? new Date(s) : null);

// ---------- Pure derivations (filled in detail in later tasks) ----------

function computeKpis(leaves, today) {
  const onLeaveToday = leaves.filter((l) => {
    if (l.status !== 1) return false;
    const from = parseDate(l.from_date || l.start_date);
    const to = parseDate(l.to_date || l.end_date);
    return from && to && from <= today && today <= to;
  });
  const deptCount = new Set(onLeaveToday.map((l) => l.employee?.department?.name).filter(Boolean)).size;

  const curMonth = today.getMonth();
  const prevMonth = (curMonth + 11) % 12;
  const inMonth = (l, m) => {
    const d = parseDate(l.created_at);
    return d && d.getMonth() === m;
  };
  const delta = (cur, prev) => {
    if (prev === 0) return { value: cur > 0 ? 100 : 0, positive: cur >= 0 };
    const pct = ((cur - prev) / prev) * 100;
    return { value: Math.abs(Math.round(pct * 10) / 10), positive: pct >= 0 };
  };
  const sliceMonth = (m) => leaves.filter((l) => inMonth(l, m));

  return {
    total: leaves.length,
    pending: leaves.filter((l) => l.status === 0).length,
    approved: leaves.filter((l) => l.status === 1).length,
    onLeaveToday: onLeaveToday.length,
    onLeaveDeptCount: deptCount,
    deltas: {
      total: delta(sliceMonth(curMonth).length, sliceMonth(prevMonth).length),
      pending: delta(sliceMonth(curMonth).filter((l) => l.status === 0).length, sliceMonth(prevMonth).filter((l) => l.status === 0).length),
      approved: delta(sliceMonth(curMonth).filter((l) => l.status === 1).length, sliceMonth(prevMonth).filter((l) => l.status === 1).length),
      onLeaveToday: delta(onLeaveToday.length, 0),
    },
  };
}

function computeMonthlySeries(leaves, year) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months.map((month, idx) => {
    const monthLeaves = leaves.filter((l) => {
      const d = parseDate(l.from_date || l.start_date);
      return d && d.getFullYear() === year && d.getMonth() === idx;
    });
    return {
      month,
      approved: monthLeaves.filter((l) => l.status === 1).length,
      pending: monthLeaves.filter((l) => l.status === 0).length,
    };
  });
}

function computeTypeDistribution(leaves) {
  const map = {};
  leaves.forEach((l) => {
    const name = l.leave_type?.name || l.leave_group_type?.leave_type?.name || "Other";
    map[name] = (map[name] || 0) + 1;
  });
  return Object.entries(map).map(([name, value], i) => ({
    name, value, color: colorForType(name, i),
  }));
}

function computeDepartmentDays(leaves, today) {
  const month = today.getMonth();
  const year = today.getFullYear();
  const map = {};
  leaves.forEach((l) => {
    if (l.status !== 1) return;
    const d = parseDate(l.from_date || l.start_date);
    if (!d || d.getMonth() !== month || d.getFullYear() !== year) return;
    const dept = l.employee?.department?.name || "Unassigned";
    map[dept] = (map[dept] || 0) + (l.total_days || l.days || 0);
  });
  return Object.entries(map).map(([department, days]) => ({ department, days }));
}

function computeUpcoming(leaves, today, limit = 5) {
  return leaves
    .filter((l) => {
      const from = parseDate(l.from_date || l.start_date);
      return from && from > today;
    })
    .sort((a, b) => parseDate(a.from_date || a.start_date) - parseDate(b.from_date || b.start_date))
    .slice(0, limit);
}

function computeBalance(leaves, entitlements, userEmployeeId) {
  if (!userEmployeeId) return [];
  const year = new Date().getFullYear();
  const userLeaves = leaves.filter(
    (l) => l.employee?.id === userEmployeeId && l.status === 1 && parseDate(l.from_date || l.start_date)?.getFullYear() === year
  );
  return Object.entries(entitlements).map(([typeName, total], i) => {
    const used = userLeaves
      .filter((l) => (l.leave_type?.name || l.leave_group_type?.leave_type?.name) === typeName)
      .reduce((s, l) => s + (l.total_days || l.days || 0), 0);
    return {
      label: typeName,
      used,
      total,
      remaining: Math.max(0, total - used),
      accent: colorForType(typeName, i),
    };
  });
}

// ---------- Page ----------

export default function LeaveDashboard() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [entitlements, setEntitlements] = useState({});

  const user = useMemo(() => getUser(), []);
  const firstName = user?.first_name || user?.name?.split?.(" ")?.[0] || "there";
  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => { getBranches().then(setBranches).catch(console.error); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setDepartments(
          selectedBranchIds.length > 0
            ? await getDepartmentsByBranchIds(selectedBranchIds)
            : await getDepartments()
        );
      } catch (e) { console.error(e); setDepartments([]); }
    };
    load();
  }, [selectedBranchIds]);

  useEffect(() => { fetchLeaves(); }, [selectedBranchIds, selectedDepartmentIds, selectedStatus]);
  useEffect(() => { fetchEntitlements(); }, [user?.employee_id]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const start = new Date(today); start.setDate(start.getDate() - 365);
      const end = new Date(today); end.setDate(end.getDate() + 60);
      const params = {
        per_page: 500,
        start_date: fmtDate(start.toISOString()),
        end_date: fmtDate(end.toISOString()),
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
        status_ids: selectedStatus !== null ? [String(selectedStatus)] : undefined,
      };
      const result = await getLeavesRequest(params);
      setLeaves(Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []);
    } catch (e) { console.error(e); setLeaves([]); }
    finally { setLoading(false); }
  };

  const fetchEntitlements = async () => {
    if (!user?.employee_id) { setEntitlements({}); return; }
    try {
      const baseParams = await buildQueryParams();
      const empRes = await api.get(`/employeev1`, { params: { ...baseParams, per_page: 1, employee_id: user.employee_id } });
      const emp = empRes.data?.data?.[0];
      if (!emp?.leave_group_id) { setEntitlements({}); return; }
      const groupsRes = await api.get(`/leave_groups`, { params: { ...baseParams, per_page: 100 } });
      const groups = Array.isArray(groupsRes.data?.data) ? groupsRes.data.data : [];
      const group = groups.find((g) => g.id === emp.leave_group_id);
      const map = {};
      (group?.leave_count || []).forEach((lc) => {
        const name = lc.leave_type?.name || `Type ${lc.leave_type_id}`;
        map[name] = lc.leave_type_count || 0;
      });
      setEntitlements(map);
    } catch (e) { console.error(e); setEntitlements({}); }
  };

  const kpis = useMemo(() => computeKpis(leaves, today), [leaves, today]);
  const trend = useMemo(() => computeMonthlySeries(leaves, year), [leaves, year]);
  const typeDist = useMemo(() => computeTypeDistribution(leaves), [leaves]);
  const deptDays = useMemo(() => computeDepartmentDays(leaves, today), [leaves, today]);
  const upcoming = useMemo(() => computeUpcoming(leaves, today, 5), [leaves, today]);
  const balance = useMemo(() => computeBalance(leaves, entitlements, user?.employee_id), [leaves, entitlements, user?.employee_id]);

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6">
        <p className="text-xs text-slate-200">Header band placeholder — Welcome back, {firstName}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => (
          <div key={i} className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-28">
            <p className="text-xs text-slate-500">KPI {i + 1} placeholder</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Trend placeholder</div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Type donut placeholder</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Department bars placeholder</div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Upcoming leaves placeholder</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => (
          <div key={i} className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-28">Balance {i + 1}</div>
        ))}
      </div>
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
        Activity table placeholder ({loading ? "loading" : `${leaves.length} rows`}, kpis total {kpis.total}, trend pts {trend.length}, types {typeDist.length}, depts {deptDays.length}, upcoming {upcoming.length}, balance {balance.length})
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the dev server**

Run: `cd frontend-new && npm run dev` (if not already running).

- [ ] **Step 3: Browser-verify**

Open `http://localhost:3001/leave-dashboard`. Expected:
- Page loads. No console errors. No 500/404 from `/employee_leaves` (200 OK in network tab).
- All placeholder boxes visible in the new layout (header band, 4 KPIs, charts row, mid row, balance row, table row).
- The bottom placeholder shows non-zero counts once leaves arrive (e.g., `kpis total 12`).

- [ ] **Step 4: User commit checkpoint**

Pause. Inform the user: "Task 1 done — page shell + helpers in place. Ready for you to commit before I start Task 2."

---

## Task 2: HeaderBand with greeting, filters, More popover, Export

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

Replace the placeholder header band with the real HeaderBand. Moves the Status filter into a Popover behind a `More` button so the top row only shows Branch + Department dropdowns. Adds an Export button that downloads the current filtered `leaves` as CSV.

- [ ] **Step 1: Add `HeaderBand` and `MoreFilterPopover` components above `export default function LeaveDashboard`**

Insert just below `computeBalance`:

```jsx
function MoreFilterPopover({ status, onStatusChange }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
          <Filter className="w-4 h-4" />
          More
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align="end" className="z-50 w-56 rounded-lg border border-white/10 bg-slate-900 p-3 shadow-xl">
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Status</p>
          <DropDown
            placeholder="All Status"
            items={[
              { id: -1, name: "All Status" },
              { id: 0, name: "Pending" },
              { id: 1, name: "Approved" },
              { id: 2, name: "Rejected" },
            ]}
            value={status}
            onChange={(val) => onStatusChange(val === -1 ? null : val)}
            portalled={false}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HeaderBand({
  firstName,
  branches, departments,
  selectedBranchIds, setSelectedBranchIds,
  selectedDepartmentIds, setSelectedDepartmentIds,
  selectedStatus, setSelectedStatus,
  onExport,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 relative">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Welcome back, {firstName}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">Leave Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Real-time view of approvals, attendance and team availability across all branches.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <MultiDropDown placeholder="All Branches" items={branches} value={selectedBranchIds} onChange={setSelectedBranchIds} badgesCount={1} portalled={false} />
          </div>
          <div className="w-48">
            <MultiDropDown placeholder="All Departments" items={departments} value={selectedDepartmentIds} onChange={setSelectedDepartmentIds} badgesCount={1} portalled={false} />
          </div>
          <MoreFilterPopover status={selectedStatus} onStatusChange={setSelectedStatus} />
          <button onClick={onExport} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the `handleExport` function inside `LeaveDashboard`, just above the `return`**

```jsx
const handleExport = () => {
  const rows = [
    ["Employee","Role","Branch","Department","Leave Type","From","To","Days","Status","Applied"],
    ...leaves.map((l) => [
      `${l.employee?.first_name || ""} ${l.employee?.last_name || ""}`.trim() || "—",
      l.employee?.designation?.name || "",
      l.employee?.branch?.name || "",
      l.employee?.department?.name || "",
      l.leave_type?.name || l.leave_group_type?.leave_type?.name || "",
      fmtDate(l.from_date || l.start_date),
      fmtDate(l.to_date || l.end_date),
      l.total_days || l.days || "",
      STATUS[l.status] || "",
      fmtDate(l.created_at),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leave-dashboard-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 3: Replace the placeholder header `<div>` in the `return` with the real HeaderBand**

Find the block:
```jsx
<div className="rounded-xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6">
  <p className="text-xs text-slate-200">Header band placeholder — Welcome back, {firstName}</p>
</div>
```

Replace with:
```jsx
<HeaderBand
  firstName={firstName}
  branches={branches}
  departments={departments}
  selectedBranchIds={selectedBranchIds}
  setSelectedBranchIds={setSelectedBranchIds}
  selectedDepartmentIds={selectedDepartmentIds}
  setSelectedDepartmentIds={setSelectedDepartmentIds}
  selectedStatus={selectedStatus}
  setSelectedStatus={setSelectedStatus}
  onExport={handleExport}
/>
```

- [ ] **Step 4: Browser-verify**

Reload `/leave-dashboard`. Expected:
- Gradient header band with "Welcome back, {your first name}" pill, title, subtitle.
- Right side: Branch + Department dropdowns, `More` button, `Export` button.
- Clicking `More` opens a popover with the Status dropdown.
- Changing Branch/Department/Status re-fetches `/employee_leaves` (Network tab shows the call).
- Clicking `Export` downloads `leave-dashboard-YYYY-MM-DD.csv`. Open the file and confirm the column headers match.

- [ ] **Step 5: User commit checkpoint**

Pause. "Task 2 done — header band live. Ready for commit."

---

## Task 3: KPI row with delta chips

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

- [ ] **Step 1: Add `DeltaChip` and `KpiCard` components below `HeaderBand`**

```jsx
function DeltaChip({ delta }) {
  if (!delta) return null;
  const Icon = delta.positive ? TrendingUp : TrendingDown;
  const color = delta.positive ? "text-emerald-400 bg-emerald-500/15" : "text-rose-400 bg-rose-500/15";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {delta.positive ? "+" : "−"}{delta.value}%
    </span>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, accent, delta }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 flex flex-col gap-3 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="p-2 rounded-lg" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <DeltaChip delta={delta} />
        <span className="text-[11px] text-slate-500">vs last month</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the KPI placeholder grid with real cards**

Find:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {[0,1,2,3].map((i) => (
    <div key={i} className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-28">
      <p className="text-xs text-slate-500">KPI {i + 1} placeholder</p>
    </div>
  ))}
</div>
```

Replace with:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <KpiCard title="Total Requests" value={kpis.total.toLocaleString()} subtitle="This quarter" icon={FileText} accent="#38bdf8" delta={kpis.deltas.total} />
  <KpiCard title="Pending Approvals" value={kpis.pending} subtitle="Awaiting your review" icon={Clock} accent="#f97316" delta={kpis.deltas.pending} />
  <KpiCard title="Approved" value={kpis.approved.toLocaleString()} subtitle="Last 30 days" icon={CheckCircle2} accent="#10b981" delta={kpis.deltas.approved} />
  <KpiCard title="On Leave Today" value={kpis.onLeaveToday} subtitle={`Across ${kpis.onLeaveDeptCount} departments`} icon={Users} accent="#8b5cf6" delta={kpis.deltas.onLeaveToday} />
</div>
```

- [ ] **Step 3: Browser-verify**

Reload. Expected:
- 4 KPI cards rendered with values matching the leaves data.
- Each has an accent-colored icon, value, subtitle, delta chip with arrow + percentage + "vs last month".
- Cards on Pending and (sometimes) Total show red ▼ when current month is below previous; otherwise green ▲.
- "On Leave Today" subtitle reads `Across N departments` with the right number.

- [ ] **Step 4: User commit checkpoint**

"Task 3 done — KPIs live. Ready for commit."

---

## Task 4: TrendAreaChart (Monthly Leave Trends)

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

- [ ] **Step 1: Add `TrendAreaChart` component below `KpiCard`**

```jsx
function TrendAreaChart({ data, year, onYearChange, years }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Monthly Leave Trends</h3>
          <p className="text-xs text-slate-500 mt-0.5">Approved vs pending requests · last 12 months</p>
        </div>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
          <Tooltip contentStyle={{ borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }} />
          <Area type="monotone" dataKey="approved" stroke="#38bdf8" strokeWidth={2} fill="url(#gradApproved)" />
          <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fill="url(#gradPending)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Compute available years and replace the trend placeholder**

Inside `LeaveDashboard`, just above the `return`, add:

```jsx
const years = useMemo(() => {
  const set = new Set();
  leaves.forEach((l) => {
    const d = parseDate(l.from_date || l.start_date);
    if (d) set.add(d.getFullYear());
  });
  set.add(new Date().getFullYear());
  return Array.from(set).sort((a, b) => b - a);
}, [leaves]);
```

Find:
```jsx
<div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Trend placeholder</div>
```

Replace with:
```jsx
<div className="lg:col-span-2">
  <TrendAreaChart data={trend} year={year} onYearChange={setYear} years={years} />
</div>
```

- [ ] **Step 3: Browser-verify**

Reload. Expected:
- Area chart with two colored ribbons (sky for Approved, amber for Pending) spanning Jan–Dec.
- Year dropdown shows the current year and any other years present in the data.
- Changing the year updates the chart without a network fetch (filter is client-side).
- Hovering a month shows a dark tooltip with both values.

- [ ] **Step 4: User commit checkpoint**

"Task 4 done — trend chart live. Ready for commit."

---

## Task 5: TypeDonut (Leave Type Distribution)

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

- [ ] **Step 1: Add `TypeDonut` component below `TrendAreaChart`**

```jsx
function TypeDonut({ data }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-full flex flex-col">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-white">Leave Type Distribution</h3>
        <p className="text-xs text-slate-500 mt-0.5">By volume this quarter</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">No data for this period.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" stroke="none" paddingAngle={2}>
                {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs">
            {data.map((t) => (
              <div key={t.name} className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the donut placeholder**

Find:
```jsx
<div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Type donut placeholder</div>
```

Replace with:
```jsx
<TypeDonut data={typeDist} />
```

- [ ] **Step 3: Browser-verify**

Reload. Expected:
- Donut with segments colored by leave type (Annual blue, Sick cyan, Casual green, Emergency amber, Maternity pink, Unpaid slate; others from the fallback palette).
- Legend chips below show each type with a colored dot.
- Hovering a segment shows `{name}: {value}` tooltip.
- If no leaves, the empty state message is shown.

- [ ] **Step 4: User commit checkpoint**

"Task 5 done — donut live. Ready for commit."

---

## Task 6: DepartmentBars + UpcomingLeaves

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

- [ ] **Step 1: Add `DepartmentBars` and `UpcomingLeaves` components below `TypeDonut`**

```jsx
function DepartmentBars({ data }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Department-wise Leave Days</h3>
        <p className="text-xs text-slate-500 mt-0.5">Total days taken · current month</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">No leaves this month.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="department" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
            <Tooltip contentStyle={{ borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }} />
            <Bar dataKey="days" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Avatar({ name, size = 36 }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["bg-emerald-500","bg-sky-500","bg-amber-500","bg-pink-500","bg-violet-500","bg-rose-500","bg-cyan-500","bg-indigo-500"];
  const hash = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  return (
    <div className={`${bg} text-white font-semibold rounded-full flex items-center justify-center text-xs shrink-0`} style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}

function UpcomingLeaves({ items }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Upcoming Leaves</h3>
        <button className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No upcoming leaves.</p>
      ) : (
        <div className="space-y-3">
          {items.map((l) => {
            const name = `${l.employee?.first_name || ""} ${l.employee?.last_name || ""}`.trim() || "—";
            const from = l.from_date || l.start_date;
            const to = l.to_date || l.end_date;
            const sameDay = from === to;
            const typeName = l.leave_type?.name || l.leave_group_type?.leave_type?.name || "Leave";
            const color = colorForType(typeName, 0);
            const days = l.total_days || l.days || 1;
            return (
              <div key={l.id} className="flex items-center gap-3">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <p className="text-xs text-slate-500">{sameDay ? fmtDate(from) : `${fmtDate(from)} — ${fmtDate(to)}`}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-medium" style={{ color }}>{typeName}</span>
                  <p className="text-xs text-slate-500">{days} {days === 1 ? "day" : "days"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the mid-row placeholders**

Find:
```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Department bars placeholder</div>
  <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-72">Upcoming leaves placeholder</div>
</div>
```

Replace with:
```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="lg:col-span-2">
    <DepartmentBars data={deptDays} />
  </div>
  <UpcomingLeaves items={upcoming} />
</div>
```

- [ ] **Step 3: Browser-verify**

Reload. Expected:
- Left: cyan bar chart with one bar per department that had approved leaves this month.
- Right: list of up to 5 upcoming leaves, each row with avatar, name, date range, type name (in type color), and day count.
- Empty states render when there's no data.

- [ ] **Step 4: User commit checkpoint**

"Task 6 done — dept bars + upcoming list live. Ready for commit."

---

## Task 7: LeaveBalanceRow (Your Leave Balance)

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

- [ ] **Step 1: Add `BalanceCard` and `LeaveBalanceRow` components below `UpcomingLeaves`**

```jsx
function BalanceCard({ label, used, total, remaining, accent }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{remaining}</span>
        <span className="text-xs text-slate-500">/ {total} days</span>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{used} used this year</p>
    </div>
  );
}

function LeaveBalanceRow({ cards }) {
  if (cards.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 text-center text-sm text-slate-500">
        No leave allocation set for your account.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Your Leave Balance</h3>
        <p className="text-xs text-slate-500 mt-0.5">Live snapshot · resets January 1, {new Date().getFullYear() + 1}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.slice(0, 4).map((c) => <BalanceCard key={c.label} {...c} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the balance placeholder grid**

Find:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {[0,1,2,3].map((i) => (
    <div key={i} className="bg-slate-800/50 border border-white/10 rounded-xl p-5 h-28">Balance {i + 1}</div>
  ))}
</div>
```

Replace with:
```jsx
<LeaveBalanceRow cards={balance} />
```

- [ ] **Step 3: Browser-verify**

Reload. Expected:
- If the logged-in user has a `leave_group_id` and the group has `leave_count` entries: a header "Your Leave Balance" + subtitle, followed by up to 4 cards. Each card: label, big remaining number, "/ N days", colored progress bar matching used/total, "X used this year".
- If no allocation: a single muted card saying "No leave allocation set for your account."
- Check the network tab — confirm `/employeev1?employee_id=...` and `/leave_groups` were called.

- [ ] **Step 4: User commit checkpoint**

"Task 7 done — balance row live. Ready for commit."

---

## Task 8: ActivityTable (Recent Leave Activity)

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

- [ ] **Step 1: Add `StatusPill`, `TypeChip`, and `ActivityTable` components below `LeaveBalanceRow`**

```jsx
function StatusPill({ status }) {
  const cfg = {
    0: { label: "Pending", color: "amber" },
    1: { label: "Approved", color: "emerald" },
    2: { label: "Rejected", color: "rose" },
  }[status] || { label: "—", color: "slate" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20 px-2.5 py-0.5 text-[11px] font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-${cfg.color}-400`} />
      {cfg.label}
    </span>
  );
}

function TypeChip({ name }) {
  const color = colorForType(name || "", 0);
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `${color}22`, color }}>
      {name || "—"}
    </span>
  );
}

function RowMenu({ row, onAction }) {
  const [open, setOpen] = useState(false);
  if (row.status !== 0) return <span className="text-slate-600">⋯</span>;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="rounded p-1 text-slate-400 hover:text-white hover:bg-white/5">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="end" className="z-50 w-40 rounded-lg border border-white/10 bg-slate-900 p-1 shadow-xl text-sm">
          <button onClick={() => { onAction("approve", row); setOpen(false); }} className="w-full text-left rounded px-2 py-1.5 text-emerald-400 hover:bg-white/5">Approve</button>
          <button onClick={() => { onAction("reject", row); setOpen(false); }} className="w-full text-left rounded px-2 py-1.5 text-rose-400 hover:bg-white/5">Reject</button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ActivityTable({ rows, loading, onAction }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl">
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent Leave Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest requests across the organization</p>
        </div>
        <button className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {["Employee","Leave Type","Duration","Days","Status","Applied",""].map((h) => (
                <th key={h} className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">No leave requests found.</td></tr>
            ) : rows.slice(0, 8).map((r) => {
              const name = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.trim() || "—";
              const role = r.employee?.designation?.name || "";
              const branch = r.employee?.branch?.name || "";
              const meta = [role, branch].filter(Boolean).join(" · ");
              const typeName = r.leave_type?.name || r.leave_group_type?.leave_type?.name;
              return (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={name} />
                      <div>
                        <p className="font-medium text-white">{name}</p>
                        <p className="text-xs text-slate-500">{meta || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><TypeChip name={typeName} /></td>
                  <td className="px-5 py-3 text-slate-400">{fmtDate(r.from_date || r.start_date)} → {fmtDate(r.to_date || r.end_date)}</td>
                  <td className="px-5 py-3 font-semibold text-white">{r.total_days || r.days || "—"}</td>
                  <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-5 py-3 text-slate-400">{fmtDate(r.created_at)}</td>
                  <td className="px-5 py-3 text-right"><RowMenu row={r} onAction={onAction} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `handleRowAction` inside `LeaveDashboard`, beside `handleExport`**

```jsx
const handleRowAction = async (action, row) => {
  try {
    if (action === "approve") await approveLeave(row.id);
    if (action === "reject") await rejectLeave(row.id);
    await fetchLeaves();
  } catch (e) { console.error(e); }
};
```

- [ ] **Step 3: Replace the activity table placeholder**

Find:
```jsx
<div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
  Activity table placeholder ({loading ? "loading" : `${leaves.length} rows`}, kpis total {kpis.total}, trend pts {trend.length}, types {typeDist.length}, depts {deptDays.length}, upcoming {upcoming.length}, balance {balance.length})
</div>
```

Replace with:
```jsx
<ActivityTable rows={leaves} loading={loading} onAction={handleRowAction} />
```

- [ ] **Step 4: Add safelist note for dynamic Tailwind classes**

The `StatusPill` uses dynamic class names like `bg-${cfg.color}-500/10`. Tailwind's JIT may purge these. Verify by inspecting a pending row: the amber pill should have a colored background. If pills render uncolored, add a safelist entry at the top of `frontend-new/tailwind.config.js`. To pre-empt, add this comment at the top of `page.js` (the JIT scanner sees the literal strings):

```jsx
// Tailwind safelist (do not remove): bg-amber-500/10 text-amber-400 border-amber-500/20 bg-amber-400 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 bg-emerald-400 bg-rose-500/10 text-rose-400 border-rose-500/20 bg-rose-400 bg-slate-500/10 text-slate-400 border-slate-500/20 bg-slate-400
```

Place it as a literal comment immediately under the `"use client";` line.

- [ ] **Step 5: Browser-verify**

Reload. Expected:
- Recent Leave Activity table with header + "View All" button.
- Each row: avatar, name + role · branch, type chip in type color, duration arrow, day count, colored status pill, applied date, kebab on the right (only for pending rows).
- Click kebab on a pending row → Approve / Reject popover.
- Click Approve → row disappears from pending and refetch happens (pending count drops, approved count rises).
- Click Reject → row moves to rejected status on refetch.
- Status pills are colored (amber/emerald/rose) — if they're grey, the Tailwind safelist comment didn't catch them; add to `tailwind.config.js` `safelist`.

- [ ] **Step 6: User commit checkpoint**

"Task 8 done — activity table live and interactive. Ready for commit."

---

## Task 9: Loading skeletons + final polish

**Files:**
- Modify: `frontend-new/src/app/leave-dashboard/page.js`

- [ ] **Step 1: Add a `Skeleton` helper and apply to cards while `loading`**

Just below the `Avatar` component, add:

```jsx
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}
```

In `KpiCard`, wrap the value display so it shows a skeleton when value is `undefined` or `null`:

Update `KpiCard` to accept an optional `loading` prop and render a skeleton inside the value slot:

```jsx
function KpiCard({ title, value, subtitle, icon: Icon, accent, delta, loading }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 flex flex-col gap-3 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="p-2 rounded-lg" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <div>
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold text-white leading-none">{value}</p>}
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {loading ? <Skeleton className="h-4 w-14" /> : <DeltaChip delta={delta} />}
        <span className="text-[11px] text-slate-500">vs last month</span>
      </div>
    </div>
  );
}
```

Pass `loading={loading}` to all four `<KpiCard>` instances in the page body.

- [ ] **Step 2: Verify loading state**

In DevTools, throttle network to "Slow 3G" and reload. Expected: KPI cards show pulsing skeleton blocks for the value and delta until the leaves response arrives.

Reset network throttle.

- [ ] **Step 3: Final visual sweep**

Compare side-by-side with the sample mockups across the page:
- Header band matches: greeting pill, title, subtitle, filters, More, Export.
- KPI row: 4 cards with deltas.
- Charts row: area trend (2/3) + donut (1/3).
- Mid row: dept bars (2/3) + upcoming (1/3).
- Balance row: 4 cards (or empty state).
- Activity table: full width with kebab menu.

Resize the browser to a 1024px viewport — confirm everything still fits, sidebars don't overlap.

- [ ] **Step 4: Console + lint check**

In the browser DevTools console: no errors, no React key warnings, no recharts warnings.

Run: `cd frontend-new && npm run build`
Expected: build succeeds without errors. Warnings about unused imports are OK to clean up but not blocking.

- [ ] **Step 5: User commit checkpoint**

"Task 9 done — polish pass complete. Dashboard matches the sample. Ready for final commit."

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Header band with greeting + filters + More + Export — Task 2
- ✅ 4 KPI cards with delta chips — Task 3
- ✅ Area trend chart with year dropdown — Task 4
- ✅ Donut with legend — Task 5
- ✅ Department bars — Task 6
- ✅ Upcoming leaves list — Task 6
- ✅ Your Leave Balance row with allocation lookup — Task 7
- ✅ Activity table with role · branch + kebab approve/reject — Task 8
- ✅ Loading skeletons + empty states — Task 9
- ✅ Data derives client-side from `/employee_leaves`, `/employeev1`, `/leave_groups` — Tasks 1, 7
- ✅ CSV export — Task 2

**Type consistency check:**
- `computeKpis` returns `{ total, pending, approved, onLeaveToday, onLeaveDeptCount, deltas }` — used consistently in Task 3.
- `computeMonthlySeries` returns `{ month, approved, pending }` — keys match `<Area dataKey>` in Task 4.
- `computeDepartmentDays` returns `{ department, days }` — keys match `<Bar dataKey>` and `<XAxis dataKey>` in Task 6.
- `computeBalance` returns `{ label, used, total, remaining, accent }` — destructured to `BalanceCard` in Task 7.
- `STATUS` and `colorForType` referenced throughout — both defined in Task 1.

No placeholders, no TODOs, no "similar to Task N" references.
