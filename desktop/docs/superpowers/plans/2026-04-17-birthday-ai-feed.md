# Birthday AI Feed + Employees Popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show festive birthday cards in the dashboard AI Feeds tab and a one-time modal popup on the Employees page when an employee's `date_of_birth` matches today. Decorate with animated balloons and cracker bursts.

**Architecture:** A new Laravel scheduled command (`ai:birthday-feed`, daily at 00:05) inserts one row per today's-birthday employee into the existing `ai_feeds` table with `type='birthday'` and a JSON payload. The existing `getAIFeeds` API serves those rows unchanged. The frontend AI Feeds component detects `type==='birthday'` and renders a celebratory card; the Employees page mounts a modal popup (dismissed via sessionStorage, once per day per session).

**Tech Stack:** Laravel 10 (PHP, PostgreSQL), Next.js (React), Tailwind CSS, pure CSS keyframe animations (no extra libraries).

**Reference spec:** `docs/superpowers/specs/2026-04-17-birthday-ai-feed-design.md`

**Git / commits:** The user handles all commits and pushes manually. Do NOT run `git add` / `git commit` / `git push` in any step.

**Database safety:** This project's database is shared with live production. The plan only **inserts** rows into the existing `ai_feeds` table (same pattern as existing AI commands) — no schema changes, no migrations, no destructive queries.

---

## File Structure

**Backend (Laravel)**
- Create: `backend/app/Console/Commands/AI/AIBirthdayFeed.php` — scheduled command
- Modify: `backend/app/Console/Kernel.php` — add schedule entry
- Modify: `backend/app/Http/Controllers/AIFeedsController.php` — extend `type` enum validation

**Frontend (Next.js)**
- Create: `frontend-new/src/components/AIFeeds/BirthdayCard.jsx` — festive card for dashboard
- Modify: `frontend-new/src/components/AIFeeds/All/page.js` — split rows by type, render cards above table
- Create: `frontend-new/src/components/Employees/BirthdayPopup.jsx` — modal popup
- Modify: `frontend-new/src/app/employees/page.js` — mount popup

---

## Task 1: Backend — Create AIBirthdayFeed command

**Files:**
- Create: `backend/app/Console/Commands/AI/AIBirthdayFeed.php`

- [ ] **Step 1: Create the command file**

File: `backend/app/Console/Commands/AI/AIBirthdayFeed.php`

```php
<?php

namespace App\Console\Commands\AI;

use App\Http\Controllers\Controller;
use App\Models\AIFeeds;
use App\Models\Company;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AIBirthdayFeed extends Command
{
    protected $signature = 'ai:birthday-feed';

    protected $description = 'Insert ai_feeds rows for employees whose birthday is today';

    public function handle()
    {
        $logger = new Controller;
        $logFilePath = 'logs/ai/birthday_feed';
        $logger->logOutPut($logFilePath, "***** Cron started: ai:birthday-feed *****");

        $today = Carbon::now()->format('m-d');
        $todayDate = Carbon::now()->toDateString();
        $insertedCount = 0;
        $skippedCount = 0;

        $companyIds = Company::pluck('id');

        foreach ($companyIds as $companyId) {
            // DOB can live on employees.date_of_birth (new form) OR emirates_info.date_of_birth (legacy).
            // Match either.
            $employees = Employee::where('company_id', $companyId)
                ->with(['emirate', 'department', 'branch', 'designation'])
                ->where(function ($q) use ($today) {
                    $q->whereRaw("TO_CHAR(date_of_birth, 'MM-DD') = ?", [$today])
                      ->orWhereHas('emirate', function ($eq) use ($today) {
                          $eq->whereRaw("TO_CHAR(date_of_birth, 'MM-DD') = ?", [$today]);
                      });
                })
                ->get();

            foreach ($employees as $employee) {
                $alreadyExists = AIFeeds::where('company_id', $companyId)
                    ->where('employee_id', $employee->id)
                    ->where('type', 'birthday')
                    ->whereDate('created_at', $todayDate)
                    ->exists();

                if ($alreadyExists) {
                    $skippedCount++;
                    continue;
                }

                $fullName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));
                $dob = $employee->date_of_birth ?? ($employee->emirate->date_of_birth ?? null);
                $age = $dob ? Carbon::parse($dob)->age : null;

                try {
                    AIFeeds::create([
                        'company_id' => $companyId,
                        'employee_id' => $employee->id,
                        'type' => 'birthday',
                        'description' => "🎉 Today is {$fullName}'s Birthday! Wishing a year full of joy, success, and milestones.",
                        'data' => [
                            'employee_id' => $employee->id,
                            'employee_code' => $employee->employee_id ?? null,
                            'first_name' => $employee->first_name,
                            'last_name' => $employee->last_name,
                            'full_name' => $fullName,
                            'profile_picture' => $employee->profile_picture ?? null,
                            'department' => $employee->department->name ?? null,
                            'branch' => $employee->branch->branch_name ?? null,
                            'designation' => $employee->designation->name ?? null,
                            'age' => $age,
                        ],
                    ]);
                    $insertedCount++;
                    $logger->logOutPut($logFilePath, "Inserted birthday feed for {$fullName} (id={$employee->id})");
                } catch (\Throwable $e) {
                    $logger->logOutPut($logFilePath, "FAILED for employee id={$employee->id}: " . $e->getMessage());
                    $this->error("Failed for employee {$employee->id}: " . $e->getMessage());
                }
            }
        }

        $summary = "Birthday feed complete: {$insertedCount} inserted, {$skippedCount} skipped (already existed).";
        $this->info($summary);
        $logger->logOutPut($logFilePath, $summary);
        $logger->logOutPut($logFilePath, "***** Cron ended: ai:birthday-feed *****");

        return 0;
    }
}
```

- [ ] **Step 2: Verify autoload picks up the new command**

Run: `cd d:/newmytime2cloud/backend && php artisan list | grep ai:birthday`

Expected output includes: `ai:birthday-feed                       Insert ai_feeds rows for employees whose birthday is today`

If not listed, run: `php artisan config:clear && php artisan cache:clear`

---

## Task 2: Backend — Register schedule entry

**Files:**
- Modify: `backend/app/Console/Kernel.php` (around line 44, near existing `birthday:wish`)

- [ ] **Step 1: Add the schedule entry**

In `backend/app/Console/Kernel.php`, locate:

```php
$schedule->command('birthday:wish')->dailyAt('00:00');
```

Immediately below it, add:

```php
$schedule->command('ai:birthday-feed')->dailyAt('00:05')->withoutOverlapping();
```

- [ ] **Step 2: Verify registration**

Run: `cd d:/newmytime2cloud/backend && php artisan schedule:list | grep birthday`

Expected: both `birthday:wish` (00:00) and `ai:birthday-feed` (00:05) are listed.

---

## Task 3: Backend — Allow 'birthday' in AIFeedsController validation

**Files:**
- Modify: `backend/app/Http/Controllers/AIFeedsController.php` (lines 14 and 46)

- [ ] **Step 1: Update both validation rules**

In `backend/app/Http/Controllers/AIFeedsController.php`, change both occurrences:

```php
'type' => 'nullable|string|in:late,early,absent',
```

to:

```php
'type' => 'nullable|string|in:late,early,absent,birthday',
```

Both `index()` (line 14) and `aiFeedsByEmployeeId()` (line 46) need the change.

- [ ] **Step 2: Verify**

Run: `grep -n "in:late" d:/newmytime2cloud/backend/app/Http/Controllers/AIFeedsController.php`

Expected: both matches show `in:late,early,absent,birthday`.

---

## Task 4: Backend — Manual test / seed today's data

**Files:** (no file changes — command invocation only)

- [ ] **Step 1: Run the command once to seed today's data**

Run: `cd d:/newmytime2cloud/backend && php artisan ai:birthday-feed`

Expected: output ends with `Birthday feed complete: N inserted, M skipped (already existed).`

- [ ] **Step 2: Verify idempotency**

Run it a second time: `php artisan ai:birthday-feed`

Expected: `inserted=0, skipped=N` (duplicates correctly prevented).

- [ ] **Step 3: Verify rows present (optional — only if you have DB access)**

Connection is PostgreSQL. A quick query:

```sql
SELECT id, employee_id, type, description, created_at
FROM ai_feeds
WHERE type = 'birthday'
  AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 10;
```

Expected: one row per birthday employee today, with JSON `data` containing `full_name`, `profile_picture`, etc.

---

## Task 5: Frontend — Create BirthdayCard component

**Files:**
- Create: `frontend-new/src/components/AIFeeds/BirthdayCard.jsx`

- [ ] **Step 1: Create the component**

File: `frontend-new/src/components/AIFeeds/BirthdayCard.jsx`

```jsx
"use client";

import React, { useEffect, useState } from "react";

const BALLOON_COLORS = ["#ff6ba1", "#ffb347", "#ffd93d", "#6bcb77", "#4d96ff", "#c780ff"];

function parseData(row) {
  if (!row) return null;
  if (row.data && typeof row.data === "object") return row.data;
  if (typeof row.data === "string") {
    try { return JSON.parse(row.data); } catch { return null; }
  }
  return null;
}

export default function BirthdayCard({ row }) {
  const data = parseData(row) || {};
  const fullName = data.full_name || "Our Teammate";
  const department = data.department || "";
  const branch = data.branch || "";
  const designation = data.designation || "";
  const age = data.age;
  const avatar = data.profile_picture || null;

  const [burst, setBurst] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBurst(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl p-4 my-2 shadow-md birthday-card-gradient">
      <style jsx>{`
        .birthday-card-gradient {
          background: linear-gradient(135deg, #ff9bd2 0%, #a06cff 50%, #ffd27a 100%);
        }
        .balloon {
          position: absolute;
          bottom: -30px;
          width: 22px;
          height: 28px;
          border-radius: 50%;
          opacity: 0.85;
          animation: balloon-float linear infinite;
        }
        .balloon::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          width: 1px;
          height: 24px;
          background: rgba(255,255,255,0.6);
          transform: translateX(-50%);
        }
        @keyframes balloon-float {
          0%   { transform: translateY(0)    translateX(0);  opacity: 0; }
          10%  { opacity: 0.9; }
          100% { transform: translateY(-220px) translateX(20px); opacity: 0; }
        }
        .cracker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff3a3;
          box-shadow: 0 0 6px #ffe066;
          animation: cracker-burst 1.2s ease-out forwards;
        }
        @keyframes cracker-burst {
          0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
      `}</style>

      {/* Balloons */}
      {BALLOON_COLORS.map((c, i) => (
        <span
          key={`b-${i}`}
          aria-hidden="true"
          className="balloon"
          style={{
            left: `${8 + i * 15}%`,
            background: c,
            animationDuration: `${8 + (i % 3) * 2}s`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      {/* Cracker burst */}
      {burst && (
        <div className="absolute left-8 top-6" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return (
              <span
                key={i}
                className="cracker-dot"
                style={{
                  ["--tx"]: `${Math.cos(angle) * 48}px`,
                  ["--ty"]: `${Math.sin(angle) * 48}px`,
                  animationDelay: `${i * 0.02}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="shrink-0 size-14 rounded-full overflow-hidden ring-4 ring-white/70 shadow-lg bg-white">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🎂</div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-white">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded-full">
              🎂 Birthday
            </span>
            <span className="text-xs opacity-90">🎆 🎈 🎆</span>
          </div>
          <div className="text-base font-extrabold truncate drop-shadow">
            {fullName}{age ? <span className="opacity-80 font-semibold text-xs ml-2">({age})</span> : null}
          </div>
          <div className="text-[11px] opacity-95 truncate">
            {[designation, department, branch].filter(Boolean).join(" • ")}
          </div>
          <div className="text-[11px] italic opacity-95 mt-1">
            Wishing you joy, success, and a year full of milestones.
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file parses**

Run: `cd d:/newmytime2cloud/frontend-new && npx eslint src/components/AIFeeds/BirthdayCard.jsx --no-eslintrc --parser-options=ecmaVersion:2022,sourceType:module,ecmaFeatures:{jsx:true}` (optional — or simply start dev server in Task 8).

---

## Task 6: Frontend — Render BirthdayCard in AI Feeds tab

**Files:**
- Modify: `frontend-new/src/components/AIFeeds/All/page.js`

- [ ] **Step 1: Replace the component body with the updated version**

Replace the full contents of `frontend-new/src/components/AIFeeds/All/page.js` with:

```jsx
"use client";

import React, { useEffect, useState } from "react";
import { getAIFeeds } from "@/lib/endpoint/dashboard";
import Input from "@/components/Theme/Input";
import BirthdayCard from "../BirthdayCard";

function isToday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  if (isNaN(d)) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function AIFeedAll() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const fetchAllData = async () => {
    try {
      const params = { per_page: 50 };
      const result = await getAIFeeds(params);
      setRows(result.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const todaysBirthdays = rows.filter(
    (r) => r?.type === "birthday" && isToday(r.created_at)
  );
  const otherRows = rows.filter(
    (r) => !(r?.type === "birthday")
  );

  const filteredOtherRows =
    search.trim().length === 0
      ? otherRows
      : otherRows.filter((row) =>
          (row?.description || "").toLowerCase().includes(search.toLowerCase())
        );

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d)) return "";
    return d.toLocaleString();
  };

  return (
    <>
      {todaysBirthdays.length > 0 && (
        <div className="px-2 pt-2">
          {todaysBirthdays.map((row) => (
            <BirthdayCard key={row.id} row={row} />
          ))}
        </div>
      )}

      <div className="my-1 flex justify-end">
        <Input
          icon="search"
          type="text"
          placeholder="Search description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs p-2 text-sm"
        />
      </div>
      <div className="overflow-auto">
        <table className="w-full table-fixed text-left border-collapse min-w-[500px]">
          <colgroup>
            <col style={{ width: "60px" }} />
            <col style={{ width: "50%" }} />
            <col style={{ width: "160px" }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap" style={{ width: "60px" }}>#</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap" style={{ width: "50%" }}>Description</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap" style={{ width: "160px" }}>Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
            {filteredOtherRows.length > 0 ? (
              filteredOtherRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group relative">
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{index + 1}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 overflow-hidden text-ellipsis" style={{ maxWidth: "1px" }}>{row?.description || "N/A"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{formatDate(row?.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">No AI feeds found for selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify the file parses** — see Task 8 for dev-server verification.

---

## Task 7: Frontend — Create BirthdayPopup modal for Employees page

**Files:**
- Create: `frontend-new/src/components/Employees/BirthdayPopup.jsx`

- [ ] **Step 1: Create the component**

File: `frontend-new/src/components/Employees/BirthdayPopup.jsx`

```jsx
"use client";

import React, { useEffect, useState } from "react";
import { getAIFeeds } from "@/lib/endpoint/dashboard";

const BALLOON_COLORS = ["#ff6ba1", "#ffb347", "#ffd93d", "#6bcb77", "#4d96ff", "#c780ff", "#ff80aa", "#80d0ff"];
const CONFETTI_COLORS = ["#ff4d6d", "#ffc857", "#90e0ef", "#b5ead7", "#c9b6ff", "#ffd6a5"];

function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isToday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  if (isNaN(d)) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function parseData(row) {
  if (!row) return null;
  if (row.data && typeof row.data === "object") return row.data;
  if (typeof row.data === "string") {
    try { return JSON.parse(row.data); } catch { return null; }
  }
  return null;
}

export default function BirthdayPopup() {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState([]);

  useEffect(() => {
    const key = `birthdayPopupDismissed-${todayKey()}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(key)) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getAIFeeds({ per_page: 50 });
        const rows = res?.data || [];
        const todays = rows.filter(
          (r) => r?.type === "birthday" && isToday(r.created_at)
        );
        if (!cancelled && todays.length > 0) {
          setPeople(todays);
          setOpen(true);
        }
      } catch (e) {
        console.error("BirthdayPopup fetch failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleClose = () => {
    const key = `birthdayPopupDismissed-${todayKey()}`;
    try { window.sessionStorage.setItem(key, "1"); } catch {}
    setOpen(false);
  };

  if (!open || people.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="birthday-popup-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl birthday-popup-gradient"
        onClick={(e) => e.stopPropagation()}
      >
        <style jsx>{`
          .birthday-popup-gradient {
            background: linear-gradient(135deg, #ffb1d4 0%, #b489ff 50%, #ffd27a 100%);
          }
          .balloon {
            position: absolute;
            bottom: -40px;
            width: 28px;
            height: 34px;
            border-radius: 50%;
            opacity: 0.9;
            animation: balloon-float linear infinite;
            pointer-events: none;
          }
          .balloon::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 100%;
            width: 1px;
            height: 36px;
            background: rgba(255,255,255,0.7);
            transform: translateX(-50%);
          }
          @keyframes balloon-float {
            0%   { transform: translateY(0)    translateX(0);   opacity: 0; }
            10%  { opacity: 0.95; }
            100% { transform: translateY(-700px) translateX(30px); opacity: 0; }
          }
          .confetti {
            position: absolute;
            top: -20px;
            width: 8px;
            height: 14px;
            opacity: 0.95;
            animation: confetti-fall linear forwards;
            pointer-events: none;
          }
          @keyframes confetti-fall {
            0%   { transform: translateY(0) rotate(0);   opacity: 1; }
            100% { transform: translateY(700px) rotate(720deg); opacity: 0; }
          }
          .title-pulse {
            animation: title-pulse 2s ease-in-out infinite;
          }
          @keyframes title-pulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.04); }
          }
        `}</style>

        {/* Balloons */}
        {BALLOON_COLORS.map((c, i) => (
          <span
            key={`bp-${i}`}
            aria-hidden="true"
            className="balloon"
            style={{
              left: `${4 + i * 12}%`,
              background: c,
              animationDuration: `${10 + (i % 4) * 2}s`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}

        {/* Confetti (24 pieces) */}
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={`cf-${i}`}
            aria-hidden="true"
            className="confetti"
            style={{
              left: `${(i * 4.17) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDuration: `${3 + (i % 5) * 0.6}s`,
              animationDelay: `${(i % 8) * 0.15}s`,
            }}
          />
        ))}

        {/* Close X */}
        <button
          aria-label="Close"
          className="absolute top-3 right-3 z-20 text-white/90 hover:text-white bg-black/20 hover:bg-black/30 rounded-full w-8 h-8 flex items-center justify-center"
          onClick={handleClose}
        >
          ✕
        </button>

        {/* Header */}
        <div className="relative z-10 px-6 pt-8 pb-4 text-center text-white">
          <div className="text-2xl mb-1" aria-hidden="true">🎆 🎈 🎂 🎈 🎆</div>
          <h2
            id="birthday-popup-title"
            className="text-3xl font-extrabold drop-shadow title-pulse"
          >
            Happy Birthday!
          </h2>
          <p className="text-sm opacity-95 mt-1 italic">
            Wishing you joy, success, and a year full of milestones.
          </p>
        </div>

        {/* People */}
        <div className="relative z-10 px-6 pb-4 overflow-y-auto max-h-[50vh]">
          <div className="flex flex-col gap-3">
            {people.map((row) => {
              const d = parseData(row) || {};
              const fullName = d.full_name || "Our Teammate";
              const avatar = d.profile_picture || null;
              const line = [d.designation, d.department, d.branch].filter(Boolean).join(" • ");
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-4 bg-white/25 backdrop-blur-md rounded-xl p-3 text-white"
                >
                  <div className="shrink-0 size-14 rounded-full overflow-hidden ring-4 ring-white/70 bg-white">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🎂</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-extrabold truncate">
                      {fullName}
                      {d.age ? <span className="opacity-80 font-semibold text-xs ml-2">({d.age})</span> : null}
                    </div>
                    {line && (
                      <div className="text-[11px] opacity-95 truncate">{line}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-6 pb-6 pt-2 text-center">
          <button
            onClick={handleClose}
            className="inline-flex items-center justify-center bg-white text-purple-700 hover:bg-purple-50 font-bold px-6 py-2 rounded-full shadow-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 8: Frontend — Mount BirthdayPopup on Employees page

**Files:**
- Modify: `frontend-new/src/app/employees/page.js`

- [ ] **Step 1: Import the popup**

At the top of `frontend-new/src/app/employees/page.js` with the other imports, add:

```jsx
import BirthdayPopup from '@/components/Employees/BirthdayPopup';
```

- [ ] **Step 2: Render it inside the page's root JSX**

Inside the top-level `<div className='p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]'>` block (the outermost return container), add `<BirthdayPopup />` as the first child:

```jsx
return (
    <div className='p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]'>
        <BirthdayPopup />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
        ...
```

- [ ] **Step 3: Verify whole thing end-to-end in browser**

Make sure Task 4 has seeded at least one birthday row for today. Then:

1. Start the frontend dev server: `cd d:/newmytime2cloud/frontend-new && npm run dev`
2. Log in as an admin user.
3. Open the dashboard, go to Insights & Events → **AI Feeds** tab.
   - **Expected:** festive birthday card appears above the table with visible balloons drifting up and a cracker burst near the title. Regular late/early/absent rows still show in the table below.
4. Navigate to `/employees`.
   - **Expected:** modal popup auto-opens with "Happy Birthday!" title, balloons rising, confetti falling, and a card per birthday employee.
5. Click **Close** (or press ESC, or click the backdrop).
   - **Expected:** modal disappears.
6. Navigate away and back to `/employees` in the same session.
   - **Expected:** modal does NOT reopen.
7. Open DevTools → Application → Session Storage → remove key `birthdayPopupDismissed-<today>`, then reload.
   - **Expected:** modal reopens.
8. With no birthday rows for today (e.g. query DB and confirm zero rows), reload `/employees`.
   - **Expected:** modal does NOT appear.

---

## Done

When all tasks are checked, the feature is complete. Git commits / pushes are the user's responsibility — do not run them from the implementation session.
