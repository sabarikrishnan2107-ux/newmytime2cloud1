# Access Control Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new dashboard-style Access Control page at `/access_control` that visually mirrors a provided sample (KPI cards, sticky filter bar, log table) using mock data. Add an "ACCESS CONTROL" entry to the global top nav and an Access Control sub-nav. No real API wiring in this phase.

**Architecture:** Port a 5-file React/TanStack/TS sample to Next.js 15 + JavaScript. The page lives at `src/app/access_control/page.js` and is composed of three new components in `src/components/AccessControl/` (`KpiCard`, `FilterBar`, `LogTable`) plus a `mockData.js` module. The sample's design tokens (gradient utilities, shadow utilities, semantic color tokens, `pulse-dot` keyframe) are appended to `globals.css` so existing styles aren't disturbed.

**Tech Stack:** Next.js 15 (App Router, React 19), Tailwind CSS v4, lucide-react, shadcn-style primitives already present (`button`, `input`, `select`, `badge`). No formal frontend test runner in the project — verification is the dev server (`npm run dev`) + browser inspection.

**Spec:** [docs/superpowers/specs/2026-05-02-access-control-dashboard-design.md](../specs/2026-05-02-access-control-dashboard-design.md)

**Note on commits:** Per project memory, the user handles all git commits and pushes. Each task ends with a "Stop here for user to commit" checkpoint instead of running `git commit` from this plan.

**Note on dark mode:** The project uses its own `DarkModeContext` (`src/context/DarkModeContext`), not `next-themes`. The Header already has a working sun/moon toggle (`Header.js:277`). No theme work is part of this plan.

---

## File Structure

```
frontend-new/src/
├── app/
│   ├── access_control/
│   │   └── page.js                           ← CREATE: dashboard page
│   └── globals.css                           ← MODIFY: append tokens, gradients, shadows, pulse-dot
├── components/
│   ├── AccessControl/                        ← CREATE: new directory
│   │   ├── KpiCard.jsx                       ← CREATE
│   │   ├── FilterBar.jsx                     ← CREATE
│   │   ├── LogTable.jsx                      ← CREATE
│   │   └── mockData.js                       ← CREATE
│   └── Header.js                             ← MODIFY: add ACCESS CONTROL nav link
└── lib/
    └── menuData.js                           ← MODIFY: add accessControlMenu + register routes
```

---

## Task 1: Append design tokens, gradient/shadow utilities, and `pulse-dot` keyframe to `globals.css`

These tokens and utility classes are referenced by the sample's components (`bg-success`, `text-warning`, `bg-primary-soft`, `bg-gradient-primary`, `shadow-card`, `pulse-dot`). They do not currently exist in the project's `globals.css` — without them, the components won't render correctly.

**Files:**
- Modify: `frontend-new/src/app/globals.css` (append at end of file, currently 478 lines)

- [ ] **Step 1: Append CSS variables, utility classes, and keyframes to the end of `globals.css`**

Open [frontend-new/src/app/globals.css](../../../frontend-new/src/app/globals.css) and append the following block at the very end of the file (after line 478):

```css

/* ============================================================
 * Access Control Dashboard — design tokens
 * Used by /access_control page and its components
 * (src/components/AccessControl/*)
 * ============================================================ */

/* Tailwind v4 token mappings — exposes utility classes like
   bg-success, text-warning, bg-primary-soft */
@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-primary-soft: var(--primary-soft);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
}

/* Light mode token values */
:root {
  --primary-soft: oklch(0.95 0.04 258);
  --success: oklch(0.62 0.14 155);
  --success-foreground: oklch(0.99 0.005 247);
  --warning: oklch(0.74 0.15 65);
  --warning-foreground: oklch(0.2 0.03 256);
  --destructive: oklch(0.6 0.21 25);
  --destructive-foreground: oklch(0.99 0.005 247);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.21 0.03 256);
  --muted: oklch(0.965 0.006 247);
  --muted-foreground: oklch(0.52 0.025 256);
  --foreground: oklch(0.21 0.03 256);

  --gradient-primary: linear-gradient(135deg, oklch(0.49 0.16 258), oklch(0.58 0.16 280));
  --gradient-success: linear-gradient(135deg, oklch(0.62 0.14 155), oklch(0.7 0.13 170));
  --gradient-danger:  linear-gradient(135deg, oklch(0.6 0.21 25),  oklch(0.65 0.2 15));
  --gradient-warning: linear-gradient(135deg, oklch(0.74 0.15 65), oklch(0.78 0.14 50));
  --gradient-surface: linear-gradient(180deg, oklch(1 0 0),        oklch(0.98 0.005 247));

  --shadow-card:     0 1px 2px oklch(0.21 0.03 256 / 0.04), 0 4px 16px oklch(0.21 0.03 256 / 0.06);
  --shadow-elevated: 0 8px 32px oklch(0.21 0.03 256 / 0.10);
}

/* Dark mode token values */
.dark {
  --primary-soft: oklch(0.3 0.08 258);
  --success: oklch(0.7 0.14 160);
  --success-foreground: oklch(0.16 0.02 258);
  --warning: oklch(0.78 0.15 65);
  --warning-foreground: oklch(0.16 0.02 258);
  --destructive: oklch(0.65 0.2 25);
  --destructive-foreground: oklch(0.99 0.005 247);
  --card: oklch(0.22 0.025 258);
  --card-foreground: oklch(0.96 0.005 247);
  --muted: oklch(0.26 0.025 258);
  --muted-foreground: oklch(0.7 0.025 256);
  --foreground: oklch(0.96 0.005 247);

  --gradient-primary: linear-gradient(135deg, oklch(0.55 0.18 258), oklch(0.5 0.18 290));
  --gradient-success: linear-gradient(135deg, oklch(0.5 0.14 160),  oklch(0.55 0.13 175));
  --gradient-danger:  linear-gradient(135deg, oklch(0.55 0.2 25),   oklch(0.6 0.2 15));
  --gradient-warning: linear-gradient(135deg, oklch(0.6 0.15 65),   oklch(0.65 0.15 50));
  --gradient-surface: linear-gradient(180deg, oklch(0.24 0.025 258),oklch(0.21 0.025 258));

  --shadow-card:     0 1px 2px oklch(0 0 0 / 0.3), 0 4px 16px oklch(0 0 0 / 0.25);
  --shadow-elevated: 0 8px 32px oklch(0 0 0 / 0.4);
}

@layer utilities {
  .bg-gradient-primary { background: var(--gradient-primary); }
  .bg-gradient-success { background: var(--gradient-success); }
  .bg-gradient-danger  { background: var(--gradient-danger); }
  .bg-gradient-warning { background: var(--gradient-warning); }
  .bg-gradient-surface { background: var(--gradient-surface); }
  .shadow-card     { box-shadow: var(--shadow-card); }
  .shadow-elevated { box-shadow: var(--shadow-elevated); }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1;   transform: scale(1); }
  50%      { opacity: 0.6; transform: scale(0.85); }
}
.pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
```

- [ ] **Step 2: Verify dev server still starts without CSS errors**

Run from `frontend-new/`:

```bash
npm run dev
```

Expected: server starts on `http://localhost:3001` without Tailwind/PostCSS errors. If errors appear about duplicate token definitions, check the existing `@theme` block (lines 6–44) for collisions — none should occur with the names above (`--color-success`, `--color-warning`, `--color-primary-soft`, `--color-destructive` were not previously defined).

Stop the dev server (`Ctrl+C`) before continuing.

- [ ] **Step 3: Stop here for user to commit**

Suggested commit message: `chore(styles): add access-control design tokens and utilities`

---

## Task 2: Create `mockData.js` (port of sample's mock data generator)

**Files:**
- Create: `frontend-new/src/components/AccessControl/mockData.js`

- [ ] **Step 1: Create the file with the seeded mock generator**

Create [frontend-new/src/components/AccessControl/mockData.js](../../../frontend-new/src/components/AccessControl/mockData.js):

```js
// Seeded mock data for the Access Control dashboard.
// Phase 1 only — replace with real API calls in the API-wiring phase.

const FIRST = ["Ahmed", "Fatima", "Omar", "Layla", "Yousef", "Mariam", "Khalid", "Aisha", "Hassan", "Noor", "Saeed", "Hind", "Tariq", "Zainab", "Rashid", "Salma", "Faisal", "Reem", "Bilal", "Huda"];
const LAST = ["Al Mansoori", "Al Hashimi", "Al Maktoum", "Al Suwaidi", "Khan", "Sharma", "Patel", "Rahman", "Hussein", "Qureshi", "Iqbal", "Siddiqui"];
const DEPTS = ["Engineering", "Operations", "HR", "Finance", "Security", "Logistics", "IT", "Admin"];
const LOCATIONS = ["Main Gate", "HQ Lobby", "Tower B Entry", "Warehouse 1", "Server Room", "Parking Gate", "Cafeteria", "Tower A Lobby"];

export const DEVICES = LOCATIONS.map((loc, i) => ({
  id: `DV-${1000 + i}`,
  name: `T2C-${String(i + 1).padStart(2, "0")}`,
  ip: `192.168.10.${20 + i}`,
  location: loc,
  status: i === 4 ? "Offline" : i === 6 ? "Warning" : "Online",
  lastSeen: new Date(Date.now() - (i === 4 ? 1000 * 60 * 47 : 1000 * 60 * Math.floor(Math.random() * 5))),
}));

function seedRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateLogs(count = 240) {
  const r = seedRandom(42);
  const logs = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    const dev = DEVICES[Math.floor(r() * DEVICES.length)];
    const minutes = Math.floor(r() * (60 * 14)); // last 14h
    const ts = new Date(today.getTime() + 6 * 3600 * 1000 + minutes * 60 * 1000);
    const logType = r() > 0.42 ? "IN" : "OUT";
    const hour = ts.getHours();
    const status = logType === "IN" ? (hour >= 9 ? "Late" : "On Time") : "Normal";
    const verification = r() > 0.6 ? "Face" : r() > 0.3 ? "RFID" : "PIN";
    const empNum = 1000 + Math.floor(r() * 3500);
    logs.push({
      id: `L-${i}`,
      employeeName: `${first} ${last}`,
      employeeId: `EMP-${empNum}`,
      rfid: `RF-${100000 + empNum}`,
      department: DEPTS[empNum % DEPTS.length],
      deviceName: dev.name,
      deviceId: dev.id,
      location: dev.location,
      logType,
      timestamp: ts,
      status,
      verification,
    });
  }
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export const LOGS = generateLogs();
```

- [ ] **Step 2: Stop here for user to commit**

Suggested commit message: `feat(access-control): add mock data generator`

---

## Task 3: Create `KpiCard` component

**Files:**
- Create: `frontend-new/src/components/AccessControl/KpiCard.jsx`

- [ ] **Step 1: Create the file**

Create [frontend-new/src/components/AccessControl/KpiCard.jsx](../../../frontend-new/src/components/AccessControl/KpiCard.jsx):

```jsx
"use client";

import { cn } from "@/lib/utils";

const toneMap = {
  primary: { bg: "bg-gradient-primary", iconBg: "bg-primary/10",     iconColor: "text-primary",     ring: "ring-primary/30" },
  success: { bg: "bg-gradient-success", iconBg: "bg-success/10",     iconColor: "text-success",     ring: "ring-success/30" },
  danger:  { bg: "bg-gradient-danger",  iconBg: "bg-destructive/10", iconColor: "text-destructive", ring: "ring-destructive/30" },
  warning: { bg: "bg-gradient-warning", iconBg: "bg-warning/15",     iconColor: "text-warning",     ring: "ring-warning/30" },
  neutral: { bg: "bg-gradient-surface", iconBg: "bg-muted",          iconColor: "text-foreground",  ring: "ring-border" },
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "neutral", active, onClick, trend }) {
  const t = toneMap[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-card transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-elevated",
        active ? `ring-2 ${t.ring} border-transparent` : "border-border"
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", t.bg)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", t.iconBg)}>
          <Icon className={cn("h-5 w-5", t.iconColor)} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {trend}
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Stop here for user to commit**

Suggested commit message: `feat(access-control): add KpiCard component`

---

## Task 4: Create `FilterBar` component

**Files:**
- Create: `frontend-new/src/components/AccessControl/FilterBar.jsx`

- [ ] **Step 1: Create the file**

Create [frontend-new/src/components/AccessControl/FilterBar.jsx](../../../frontend-new/src/components/AccessControl/FilterBar.jsx):

```jsx
"use client";

import { Search, Calendar as CalIcon, RotateCcw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEVICES } from "@/components/AccessControl/mockData";

const DEPTS = ["All Departments", "Engineering", "Operations", "HR", "Finance", "Security", "Logistics", "IT", "Admin"];

export function FilterBar({ filters, onChange, onReset, suggestions }) {
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-border bg-background/85 px-6 py-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">From</label>
          <div className="relative">
            <CalIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => onChange({ ...filters, fromDate: e.target.value })}
              className="h-10 w-[160px] pl-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">To</label>
          <div className="relative">
            <CalIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => onChange({ ...filters, toDate: e.target.value })}
              className="h-10 w-[160px] pl-9"
            />
          </div>
        </div>

        <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Search Employee</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              list="emp-suggestions"
              placeholder="Name, Employee ID, RFID…"
              value={filters.query}
              onChange={(e) => onChange({ ...filters, query: e.target.value })}
              className="h-10 pl-9"
            />
            <datalist id="emp-suggestions">
              {suggestions.slice(0, 8).map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Device</label>
          <Select value={filters.device} onValueChange={(v) => onChange({ ...filters, device: v })}>
            <SelectTrigger className="h-10 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              {DEVICES.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name} — {d.location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Department</label>
          <Select value={filters.department} onValueChange={(v) => onChange({ ...filters, department: v })}>
            <SelectTrigger className="h-10 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onReset} className="h-10">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
          <Button className="h-10 bg-gradient-primary text-primary-foreground hover:opacity-95">
            <Filter className="mr-1.5 h-4 w-4" /> Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Stop here for user to commit**

Suggested commit message: `feat(access-control): add FilterBar component`

---

## Task 5: Create `LogTable` component

**Files:**
- Create: `frontend-new/src/components/AccessControl/LogTable.jsx`

- [ ] **Step 1: Create the file**

Create [frontend-new/src/components/AccessControl/LogTable.jsx](../../../frontend-new/src/components/AccessControl/LogTable.jsx):

```jsx
"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, LogIn, LogOut, ScanFace, KeyRound, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

function fmtTime(d) {
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function exportCsv(logs) {
  const headers = ["Employee", "ID", "Department", "Device", "Location", "Type", "Time", "Status", "Verification"];
  const rows = logs.map((l) => [l.employeeName, l.employeeId, l.department, l.deviceName, l.location, l.logType, l.timestamp.toISOString(), l.status, l.verification]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `access-logs-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

const verifIcon = { Face: ScanFace, RFID: Fingerprint, PIN: KeyRound };

export function LogTable({ logs }) {
  const [page, setPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(
    () => [...logs].sort((a, b) => sortDesc ? b.timestamp.getTime() - a.timestamp.getTime() : a.timestamp.getTime() - b.timestamp.getTime()),
    [logs, sortDesc]
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Access Log History</h3>
          <p className="text-xs text-muted-foreground">{sorted.length.toLocaleString()} record{sorted.length !== 1 && "s"} · live feed</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(sorted)}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">Employee</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Device</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">
                <button onClick={() => setSortDesc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">
                  Time <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3">Verification</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">No logs match your filters.</td></tr>
            )}
            {slice.map((l) => {
              const VIcon = verifIcon[l.verification];
              return (
                <tr key={l.id} className="border-t border-border transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {l.employeeName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{l.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{l.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{l.employeeId}</td>
                  <td className="px-3 py-3 text-foreground">{l.deviceName}</td>
                  <td className="px-3 py-3 text-muted-foreground">{l.location}</td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      l.logType === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {l.logType === "IN" ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                      {l.logType}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs tabular-nums text-foreground">{fmtTime(l.timestamp)}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={cn(
                      "border-0 font-medium",
                      l.status === "Late" && "bg-warning/15 text-warning",
                      l.status === "On Time" && "bg-success/10 text-success",
                      l.status === "Normal" && "bg-muted text-muted-foreground"
                    )}>{l.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <VIcon className="h-3.5 w-3.5" /> {l.verification}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>Page {safePage + 1} of {totalPages}</span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Stop here for user to commit**

Suggested commit message: `feat(access-control): add LogTable component with CSV export`

---

## Task 6: Create the `/access_control` page

This wires the three components together with state, derived data, and the click-to-filter KPI behavior.

**Files:**
- Create: `frontend-new/src/app/access_control/page.js`

- [ ] **Step 1: Create the page file**

Create [frontend-new/src/app/access_control/page.js](../../../frontend-new/src/app/access_control/page.js):

```jsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { LogIn, LogOut, Users, Clock, ShieldCheck } from "lucide-react";
import { KpiCard } from "@/components/AccessControl/KpiCard";
import { FilterBar } from "@/components/AccessControl/FilterBar";
import { LogTable } from "@/components/AccessControl/LogTable";
import { LOGS } from "@/components/AccessControl/mockData";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function useAnimatedCount(target, duration = 700) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export default function AccessControlPage() {
  const [filters, setFilters] = useState({
    fromDate: todayStr(),
    toDate: todayStr(),
    query: "",
    device: "all",
    department: "All Departments",
  });
  const [view, setView] = useState("all");

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return LOGS.filter((l) => {
      if (q && !(l.employeeName.toLowerCase().includes(q) || l.employeeId.toLowerCase().includes(q) || l.rfid.toLowerCase().includes(q))) return false;
      if (filters.device !== "all" && l.deviceId !== filters.device) return false;
      if (filters.department !== "All Departments" && l.department !== filters.department) return false;
      return true;
    });
  }, [filters]);

  const stats = useMemo(() => {
    const ins = filtered.filter((l) => l.logType === "IN").length;
    const outs = filtered.filter((l) => l.logType === "OUT").length;
    const inside = Math.max(0, ins - outs);
    const last = filtered[0]?.timestamp ?? null;
    return { ins, outs, inside, last };
  }, [filtered]);

  const ins = useAnimatedCount(stats.ins);
  const outs = useAnimatedCount(stats.outs);
  const inside = useAnimatedCount(stats.inside);

  const tableLogs = useMemo(() => {
    switch (view) {
      case "in":  return filtered.filter((l) => l.logType === "IN");
      case "out": return filtered.filter((l) => l.logType === "OUT");
      case "inside": {
        const lastPer = new Map();
        for (const l of [...filtered].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
          lastPer.set(l.employeeId, l);
        }
        return [...lastPer.values()].filter((l) => l.logType === "IN").sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }
      case "latest": return filtered.slice(0, 20);
      default: return filtered;
    }
  }, [filtered, view]);

  const suggestions = useMemo(() => {
    const set = new Set();
    for (const l of LOGS) { set.add(l.employeeName); set.add(l.employeeId); }
    return [...set];
  }, []);

  const lastLogStr = stats.last
    ? stats.last.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "—";

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto max-w-[1480px] px-6 py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-card">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Access Control</h1>
              <p className="text-xs text-muted-foreground">MyTime2Cloud · Enterprise Attendance Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-card md:flex">
              <span className="h-2 w-2 rounded-full bg-success pulse-dot" />
              <span className="text-xs font-medium text-muted-foreground">Live · synced {lastLogStr}</span>
            </div>
          </div>
        </header>

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => { setFilters({ fromDate: todayStr(), toDate: todayStr(), query: "", device: "all", department: "All Departments" }); setView("all"); }}
          suggestions={suggestions}
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Entries Today" value={ins.toLocaleString()} hint="IN events"
            icon={LogIn} tone="success" active={view === "in"} onClick={() => setView(view === "in" ? "all" : "in")}
            trend="↑ Today"
          />
          <KpiCard
            label="Total Exits Today" value={outs.toLocaleString()} hint="OUT events"
            icon={LogOut} tone="danger" active={view === "out"} onClick={() => setView(view === "out" ? "all" : "out")}
          />
          <KpiCard
            label="People Currently Inside" value={inside.toLocaleString()} hint="IN − OUT"
            icon={Users} tone="primary" active={view === "inside"} onClick={() => setView(view === "inside" ? "all" : "inside")}
          />
          <KpiCard
            label="Last Log Time" value={lastLogStr} hint={stats.last ? stats.last.toLocaleDateString() : "—"}
            icon={Clock} tone="neutral" active={view === "latest"} onClick={() => setView(view === "latest" ? "all" : "latest")}
          />
        </section>

        <section className="mt-6">
          <LogTable logs={tableLogs} />
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          MyTime2Cloud · Access Control Dashboard · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start the dev server and visit the page**

Run from `frontend-new/`:

```bash
npm run dev
```

Open `http://localhost:3001/access_control` in a browser (log in first if required).

Expected:
- Page loads without console errors
- Page header shows the shield icon, "Access Control" title, and "Live · synced HH:MM:SS" pill
- Sticky filter bar shows From/To date pickers, search input, Device dropdown, Department dropdown, Reset/Apply buttons
- 4 KPI cards visible: Total Entries Today (green stripe), Total Exits Today (red stripe), People Currently Inside (purple stripe), Last Log Time (neutral)
- Each KPI value animates from 0 on initial render
- Log table shows ~12 rows with avatar initials, IN/OUT pills, sortable Time column, status badges, verification icons
- Pagination controls show "Page 1 of N"

Stop the dev server.

- [ ] **Step 3: Stop here for user to commit**

Suggested commit message: `feat(access-control): add /access_control dashboard page`

---

## Task 7: Add Access Control sub-nav to `menuData.js`

**Files:**
- Modify: `frontend-new/src/lib/menuData.js`

- [ ] **Step 1: Add `accessControlMenu` and register routes**

Open [frontend-new/src/lib/menuData.js](../../../frontend-new/src/lib/menuData.js).

Locate the `attendanceMenu` constant (around line 37). Immediately **after** the closing `];` of `attendanceMenu` (around line 43), add the new menu:

```js
const accessControlMenu = [
  { href: "/access_control", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/access_control_logs", icon: History, label: "Logs" },
];
```

Both icons (`LayoutDashboard`, `History`) are already imported at the top of the file (lines 28 and 14 respectively) — no new imports needed.

Then locate the `leftNavLinks` export (line 115). Inside the object, add two new entries (place them right after the commented-out `// "/access_control_logs": attendanceMenu,` on line 144):

```js
  "/access_control": accessControlMenu,
  "/access_control_logs": accessControlMenu,
```

- [ ] **Step 2: Verify the sub-nav renders**

Start the dev server (`npm run dev` from `frontend-new/`), open `http://localhost:3001/access_control`.

Expected: the left-side sub-nav shows two entries — "Dashboard" and "Logs" — with the dashboard icon highlighted as active. Clicking "Logs" navigates to `/access_control_logs` and the same sub-nav remains visible there.

Stop the dev server.

- [ ] **Step 3: Stop here for user to commit**

Suggested commit message: `feat(access-control): register sub-nav for access control routes`

---

## Task 8: Add "ACCESS CONTROL" entry to top nav in `Header.js`

**Files:**
- Modify: `frontend-new/src/components/Header.js` (lines 130–138)

- [ ] **Step 1: Insert the new nav link**

Open [frontend-new/src/components/Header.js](../../../frontend-new/src/components/Header.js).

Replace the `navLinks` array (lines 130–138):

```js
  const navLinks = [
    { name: 'DASHBOARD', href: '/' },
    { name: 'EMPLOYEES', href: '/employees' },
    { name: 'ATTENDANCE', href: '/shift' },
    { name: 'PAYROLL', href: '/payslips' },
    { name: 'VISITORS', href: '/visitor' },
    { name: 'REPORTS', href: '/report' },
    { name: 'SETTINGS', href: '/setup' },
  ];
```

With:

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

- [ ] **Step 2: Verify the top nav**

Start the dev server (`npm run dev`), open any page (e.g. `http://localhost:3001/`).

Expected: the top nav shows 8 entries in this order — `DASHBOARD · EMPLOYEES · ATTENDANCE · ACCESS CONTROL · PAYROLL · VISITORS · REPORTS · SETTINGS`. Clicking "ACCESS CONTROL" navigates to `/access_control` and the link is shown in the active (purple) state.

Stop the dev server.

- [ ] **Step 3: Stop here for user to commit**

Suggested commit message: `feat(nav): add ACCESS CONTROL link to global top nav`

---

## Task 9: End-to-end verification

This task has no code edits — it's a final sweep covering the spec's acceptance criteria.

- [ ] **Step 1: Start the dev server**

```bash
cd frontend-new && npm run dev
```

- [ ] **Step 2: Walk through acceptance criteria**

Visit `http://localhost:3001/access_control` and confirm each item:

- [ ] Page header shows the shield icon, "Access Control" title, and Live-synced timestamp pill (with pulsing green dot)
- [ ] FilterBar:
  - [ ] Typing in the search filters the table in real time
  - [ ] Selecting a Device from the dropdown narrows the table
  - [ ] Selecting a Department narrows the table
  - [ ] "Reset" button restores defaults and view to "all"
- [ ] KPI cards:
  - [ ] All 4 cards render with correct gradient stripe colors (green, red, purple, neutral)
  - [ ] Values animate from 0 on first paint
  - [ ] Clicking "Total Entries Today" filters table to IN events; clicking again resets
  - [ ] Same toggle behavior for Exits, Currently Inside, Last Log Time
- [ ] Log table:
  - [ ] Rows show avatar initials, name, department, ID, device, location, IN/OUT pill, time, status badge, verification icon
  - [ ] Clicking the "Time" header column toggles sort direction (visual change in row order)
  - [ ] Pagination prev/next buttons work; "Page X of Y" updates correctly
  - [ ] "Export CSV" downloads a `access-logs-<timestamp>.csv` file with all filtered rows
  - [ ] Empty state ("No logs match your filters.") shows when filters return zero rows (e.g. type a nonsense search query)
- [ ] Top nav: "ACCESS CONTROL" appears between ATTENDANCE and PAYROLL; active state highlights when on `/access_control`
- [ ] Sub-nav: "Dashboard" and "Logs" entries on both `/access_control` and `/access_control_logs`
- [ ] Theme toggle in the global Header (sun/moon button) flips the page between light and dark, and all four KPI gradients + table badges remain readable in both modes
- [ ] No regressions: visiting `/access_control_logs` still loads the existing logs table page

- [ ] **Step 3: Open the browser console and confirm zero errors**

Open DevTools → Console. Expected: no red errors. Warnings about `<datalist>` styling differences are acceptable.

Stop the dev server.

- [ ] **Step 4: Stop here for user to commit any final tweaks**

If any of the acceptance items failed, return to the relevant task, fix, and re-verify.
