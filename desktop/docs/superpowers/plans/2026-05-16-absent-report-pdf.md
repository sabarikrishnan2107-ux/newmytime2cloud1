# Absent Report PDF Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the Report page's Absent Report tab is active, **Download → PDF** produces a styled PDF (Daily layout for single-date, Monthly layout for date-range) matching the sample format.

**Architecture:** Reuses the existing Puppeteer pipeline (`pdf-service` loads an HTML template from `summary-report/`, the template fetches JSON from a Laravel endpoint, Puppeteer prints the rendered DOM to PDF). Adds one Laravel endpoint + service, one pdf-service static mount, two HTML templates, and ~30 lines of conditional logic in `Report.js`.

**Tech Stack:** Laravel 10 (backend), Express + Puppeteer (pdf-service), vanilla HTML/CSS/JS (templates), Next.js + React (frontend).

**Spec reference:** [docs/superpowers/specs/2026-05-16-absent-report-pdf-design.md](../specs/2026-05-16-absent-report-pdf-design.md)

---

## Resolved data-model decisions (from spec open questions)

After inspecting the schema:

| # | Question | Decision |
|---|---|---|
| 1 | Absent type categorization | If an `employee_leaves` row covers that date with `status = 1` (Approved), the type is `leave_types.name` (uppercased — e.g. "CASUAL LEAVE"). Otherwise the type is `"NO-SHOW"`. LOP is just whatever the company named that leave_type. |
| 2 | Approved vs Unapproved | An absent day is "approved" iff an approved `employee_leaves` row covers it. Pending and rejected count as unapproved. |
| 3 | Streak / last_present | Walk back day-by-day from the report date. `attendances.status='A'` (or missing row) adds 1; `status='P'` stops; week-off (`'O'`/`'WO'`) and holiday (`'H'`) are **skipped** — they neither count nor break the streak. `last_present` = most recent date with `status='P'` before the report date. |
| 4 | Shift name + time | Read from `attendances.shift_id → shifts.name, on_duty_time, off_duty_time`. If `shift_id` is null, fall back to the employee's current schedule (`employees.schedule.shift`). If both missing, show `—`. |

**Cross-model join note:** `attendances.employee_id = employees.system_user_id` (NOT `employees.id`), while `employee_leaves.employee_id = employees.id`. Both lookups happen via the `Employee` model.

---

## File Structure

**Create:**
- `backend/app/Http/Controllers/Reports/AbsentReportController.php` — thin HTTP layer
- `backend/app/Services/AbsentReportService.php` — query, aggregation, streak logic
- `summary-report/absent-report/daily.html` — daily PDF template
- `summary-report/absent-report/monthly.html` — monthly PDF template

**Modify:**
- `backend/routes/attendance.php` — register the new endpoint
- `pdf-service/index.js:22` — add static mount for `/absent-report`
- `frontend-new/src/components/Report/Report.js` — read `?type`, conditional UI, branch download action

---

## Task 1: Backend skeleton — controller, service, route, stub response

**Files:**
- Create: `backend/app/Http/Controllers/Reports/AbsentReportController.php`
- Create: `backend/app/Services/AbsentReportService.php`
- Modify: `backend/routes/attendance.php`

- [ ] **Step 1: Create the service skeleton**

Create `backend/app/Services/AbsentReportService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Http\Request;

class AbsentReportService
{
    public function buildPayload(Request $request): array
    {
        $mode = $request->input('mode') === 'daily' ? 'daily' : 'monthly';

        if ($mode === 'daily') {
            return $this->buildDailyPayload($request);
        }
        return $this->buildMonthlyPayload($request);
    }

    public function buildDailyPayload(Request $request): array
    {
        return [
            'mode' => 'daily',
            'company' => [],
            'period' => [],
            'summary' => [],
            'rows' => [],
        ];
    }

    public function buildMonthlyPayload(Request $request): array
    {
        return [
            'mode' => 'monthly',
            'company' => [],
            'period' => [],
            'summary' => [],
            'rows' => [],
        ];
    }
}
```

- [ ] **Step 2: Create the controller**

Create `backend/app/Http/Controllers/Reports/AbsentReportController.php`:

```php
<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Services\AbsentReportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AbsentReportController extends Controller
{
    public function __construct(private AbsentReportService $service) {}

    public function data(Request $request): JsonResponse
    {
        $request->validate([
            'mode' => 'required|in:daily,monthly',
            'from_date' => 'required|date',
            'to_date' => 'required|date',
            'company_id' => 'required|integer',
        ]);

        return response()->json($this->service->buildPayload($request));
    }
}
```

- [ ] **Step 3: Register the route**

Append to `backend/routes/attendance.php`:

```php
use App\Http\Controllers\Reports\AbsentReportController;

Route::post('absent-report-data', [AbsentReportController::class, 'data']);
```

- [ ] **Step 4: Verify the route loads**

Run from `backend/`:

```bash
php artisan route:list --path=absent-report
```

Expected: one row showing `POST api/absent-report-data` mapped to `AbsentReportController@data`.

- [ ] **Step 5: Smoke-test with curl**

Run:

```bash
curl -X POST http://127.0.0.1:8000/api/absent-report-data \
  -H "Content-Type: application/json" \
  -d '{"mode":"daily","from_date":"2026-05-09","to_date":"2026-05-09","company_id":1}'
```

Expected: HTTP 200 returning `{"mode":"daily","company":[],"period":[],"summary":[],"rows":[]}`.

- [ ] **Step 6: Stop and let the user commit**

The user handles all git commits. Pause here for them to commit, then continue.

---

## Task 2: Shared filter resolution — get in-scope employees

**Files:**
- Modify: `backend/app/Services/AbsentReportService.php`

The same filter set (branch, department, employee type, explicit employees) feeds both daily and monthly. Build it once.

- [ ] **Step 1: Add the resolver method**

Add to `AbsentReportService` (after `buildPayload`):

```php
use App\Models\Employee;
use Illuminate\Database\Eloquent\Collection;

/**
 * Resolve the in-scope employees for an absent report.
 * Returns an Eloquent Collection keyed by system_user_id, eager-loaded with
 * department, branch, designation, and current schedule.shift.
 */
public function resolveEmployees(Request $request): Collection
{
    $companyId = (int) $request->input('company_id');

    $branchIds = $this->parseIds($request->input('branch_ids'));
    $departmentIds = $this->parseIds($request->input('department_ids'));
    $employeeIds = $this->parseIds($request->input('employee_ids'));
    $employeeTypes = (array) $request->input('employee_types', []);

    $query = Employee::query()
        ->where('company_id', $companyId)
        ->where('status', 1)
        ->select([
            'id', 'system_user_id', 'employee_id',
            'first_name', 'last_name', 'full_name', 'display_name',
            'department_id', 'branch_id', 'designation_id',
            'profile_picture', 'local_email', 'whatsapp_number',
            'employee_type',
        ])
        ->with([
            'department:id,name',
            'branch:id,branch_name',
            'designation:id,name',
            'schedule:id,employee_id,shift_id',
            'schedule.shift:id,name,on_duty_time,off_duty_time',
        ])
        ->when($branchIds, fn($q) => $q->whereIn('branch_id', $branchIds))
        ->when($departmentIds, fn($q) => $q->whereIn('department_id', $departmentIds))
        ->when($employeeIds, fn($q) => $q->whereIn('system_user_id', $employeeIds))
        ->when($employeeTypes, fn($q) => $q->whereIn('employee_type', $employeeTypes));

    return $query->get()->keyBy('system_user_id');
}

private function parseIds($input): array
{
    if (is_array($input)) {
        return array_values(array_filter($input, fn($v) => $v !== '' && $v !== null));
    }
    if (is_string($input) && $input !== '') {
        return array_values(array_filter(explode(',', $input)));
    }
    return [];
}
```

- [ ] **Step 2: Use it in a probe — temporarily wire the daily stub to call it**

Replace the body of `buildDailyPayload` with:

```php
public function buildDailyPayload(Request $request): array
{
    $employees = $this->resolveEmployees($request);
    return [
        'mode' => 'daily',
        'company' => [],
        'period' => [],
        'summary' => ['total_employees' => $employees->count()],
        'rows' => [],
    ];
}
```

- [ ] **Step 3: Verify with curl**

Run:

```bash
curl -X POST http://127.0.0.1:8000/api/absent-report-data \
  -H "Content-Type: application/json" \
  -d '{"mode":"daily","from_date":"2026-05-09","to_date":"2026-05-09","company_id":1}'
```

Expected: `summary.total_employees` shows a realistic count (>0) for company 1. If it shows 0, check `Employee::where('status', 1)->where('company_id', 1)->count()` directly.

- [ ] **Step 4: Stop for commit**

---

## Task 3: Daily mode — query absentees, types, streaks, summary

**Files:**
- Modify: `backend/app/Services/AbsentReportService.php`

- [ ] **Step 1: Add the daily implementation**

Replace `buildDailyPayload` with the full implementation:

```php
use App\Models\Attendance;
use App\Models\EmployeeLeaves;
use App\Models\Company;
use Carbon\Carbon;

public function buildDailyPayload(Request $request): array
{
    $companyId = (int) $request->input('company_id');
    $date = $request->input('from_date'); // YYYY-MM-DD
    $employees = $this->resolveEmployees($request);
    $employeeSystemIds = $employees->pluck('system_user_id')->all();
    $employeeIds = $employees->pluck('id')->all();

    // 1. Attendances for the date, status = 'A'
    $absentRows = Attendance::query()
        ->where('company_id', $companyId)
        ->whereDate('date', $date)
        ->where('status', 'A')
        ->whereIn('employee_id', $employeeSystemIds)
        ->with(['shift:id,name,on_duty_time,off_duty_time'])
        ->get();

    // 2. Approved leaves covering this date for these employees
    $approvedLeaves = EmployeeLeaves::query()
        ->where('company_id', $companyId)
        ->where('status', EmployeeLeaves::APPROVED)
        ->whereIn('employee_id', $employeeIds)
        ->whereDate('start_date', '<=', $date)
        ->whereDate('end_date', '>=', $date)
        ->with('leave_type:id,name,short_name')
        ->get()
        ->keyBy('employee_id'); // one approved leave per employee per day is the norm

    // 3. Build rows
    $rows = [];
    foreach ($absentRows as $att) {
        $emp = $employees->get($att->employee_id);
        if (!$emp) continue;

        $leave = $approvedLeaves->get($emp->id);
        $absentType = $leave
            ? strtoupper($leave->leave_type->name ?? 'APPROVED')
            : 'NO-SHOW';

        $shift = $att->shift ?? optional($emp->schedule)->shift;
        $shiftName = $shift->name ?? '—';
        $shiftTime = $shift
            ? $this->formatTime($shift->on_duty_time) . '–' . $this->formatTime($shift->off_duty_time)
            : '—';

        $rows[] = [
            'id' => $emp->system_user_id,
            'initials' => $this->initialsOf($emp),
            'name' => $this->displayName($emp),
            'emp_id' => $emp->employee_id ?? ('EMP-' . $emp->system_user_id),
            'designation' => optional($emp->designation)->name ?? '—',
            'branch' => optional($emp->branch)->branch_name ?? '—',
            'dept' => optional($emp->department)->name ?? '—',
            'shift_name' => $shiftName,
            'shift_time' => $shiftTime,
            'phone' => $emp->whatsapp_number ?? '—',
            'email' => $emp->local_email ?? '—',
            'absent_type' => $absentType,
            'streak' => $this->computeStreak($companyId, $emp->system_user_id, $date),
            'last_present' => $this->lastPresent($companyId, $emp->system_user_id, $date),
            'approved' => (bool) $leave,
        ];
    }

    // Sort: unapproved first, then streak desc
    usort($rows, function ($a, $b) {
        if ($a['approved'] !== $b['approved']) {
            return $a['approved'] ? 1 : -1;
        }
        return $b['streak'] <=> $a['streak'];
    });

    // 4. Summary
    $approvedCount = collect($rows)->where('approved', true)->count();
    $unapprovedCount = count($rows) - $approvedCount;
    $totalEmployees = $employees->count();
    $absentCount = count($rows);
    $absentPct = $totalEmployees > 0 ? round(($absentCount / $totalEmployees) * 100, 2) : 0;

    return [
        'mode' => 'daily',
        'company' => $this->companyMeta($companyId, $request),
        'period' => [
            'date' => $date,
            'day_name' => Carbon::parse($date)->format('l'),
            'date_label' => Carbon::parse($date)->format('d M Y'),
            'generated_at' => now()->format('h:i A'),
            'branches_label' => $this->branchesLabel($request),
        ],
        'summary' => [
            'total_employees' => $totalEmployees,
            'absent_count' => $absentCount,
            'absent_pct' => $absentPct,
            'approved_count' => $approvedCount,
            'unapproved_count' => $unapprovedCount,
            'branches_count' => $employees->pluck('branch_id')->unique()->filter()->count(),
        ],
        'rows' => $rows,
    ];
}
```

- [ ] **Step 2: Add the helper methods**

Append to `AbsentReportService`:

```php
private function formatTime(?string $t): string
{
    if (!$t) return '—';
    // Accepts "09:30:00" or "09:30" → "09:30"
    return substr($t, 0, 5);
}

private function initialsOf($emp): string
{
    $first = strtoupper(substr($emp->first_name ?? '', 0, 1));
    $last  = strtoupper(substr($emp->last_name ?? '', 0, 1));
    $two = $first . $last;
    if (strlen($two) >= 2) return $two;
    $name = $emp->full_name ?? $emp->display_name ?? '';
    $parts = preg_split('/\s+/', trim($name));
    $a = strtoupper(substr($parts[0] ?? '', 0, 1));
    $b = strtoupper(substr($parts[1] ?? '', 0, 1));
    return ($a . $b) ?: '—';
}

private function displayName($emp): string
{
    $full = trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? ''));
    return $full !== '' ? $full : ($emp->full_name ?? $emp->display_name ?? '—');
}

private function companyMeta(int $companyId, Request $request): array
{
    $company = Company::find($companyId);
    $name = $company->name ?? $request->input('company_name', 'Company');
    return [
        'name' => $name,
        'initials' => $this->companyInitials($name),
        'branch_name' => $request->input('branch_label', ''),
    ];
}

private function companyInitials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name));
    $a = strtoupper(substr($parts[0] ?? '', 0, 1));
    $b = strtoupper(substr($parts[1] ?? '', 0, 1));
    return ($a . $b) ?: strtoupper(substr($name, 0, 2));
}

private function branchesLabel(Request $request): string
{
    $ids = $this->parseIds($request->input('branch_ids'));
    if (empty($ids)) return 'All Branches';
    if (count($ids) === 1) {
        $b = \App\Models\CompanyBranch::find($ids[0]);
        return $b->branch_name ?? '1 Branch';
    }
    return count($ids) . ' Branches';
}

/**
 * Walk back from $date day-by-day. Returns the count of consecutive absent
 * days ending on $date (inclusive). Week-off and Holiday are skipped (they
 * neither count nor break the streak); explicit Present (P) stops the walk;
 * a missing attendance row stops the walk.
 */
public function computeStreak(int $companyId, int $systemUserId, string $date): int
{
    // Look up to 60 days back; anything older won't affect the displayed streak.
    $rangeStart = Carbon::parse($date)->subDays(60)->toDateString();
    $records = Attendance::query()
        ->where('company_id', $companyId)
        ->where('employee_id', $systemUserId)
        ->whereBetween('date', [$rangeStart, $date])
        ->orderBy('date', 'desc')
        ->get(['date', 'status'])
        ->keyBy(fn($r) => Carbon::parse($r->date)->toDateString());

    $streak = 0;
    $cursor = Carbon::parse($date);
    for ($i = 0; $i < 60; $i++) {
        $key = $cursor->toDateString();
        $rec = $records->get($key);
        if (!$rec) break;
        $status = strtoupper($rec->status ?? '');
        if ($status === 'A') {
            $streak++;
        } elseif (in_array($status, ['O', 'WO', 'WEEKOFF', 'H', 'HOLIDAY'], true)) {
            // skip — neither count nor break
        } else {
            break;
        }
        $cursor->subDay();
    }
    return $streak;
}

/**
 * Most recent date strictly before $date where status = 'P'.
 * Returns YYYY-MM-DD or null.
 */
public function lastPresent(int $companyId, int $systemUserId, string $date): ?string
{
    $rec = Attendance::query()
        ->where('company_id', $companyId)
        ->where('employee_id', $systemUserId)
        ->whereDate('date', '<', $date)
        ->where('status', 'P')
        ->orderBy('date', 'desc')
        ->value('date');
    return $rec ? Carbon::parse($rec)->toDateString() : null;
}
```

- [ ] **Step 3: Verify with curl on a real date**

Pick a date you know has absences. From `backend/`, run:

```bash
curl -s -X POST http://127.0.0.1:8000/api/absent-report-data \
  -H "Content-Type: application/json" \
  -d '{"mode":"daily","from_date":"2026-05-09","to_date":"2026-05-09","company_id":1}' \
  | python -m json.tool
```

Expected: full payload with `rows[]` populated, each row having `name`, `emp_id`, `absent_type`, `streak`, `last_present`. Spot-check one row by querying the DB directly to confirm the streak/type are correct.

- [ ] **Step 4: Stop for commit**

---

## Task 4: Monthly mode — per-employee aggregates + summary

**Files:**
- Modify: `backend/app/Services/AbsentReportService.php`

- [ ] **Step 1: Replace `buildMonthlyPayload` with the full implementation**

```php
public function buildMonthlyPayload(Request $request): array
{
    $companyId = (int) $request->input('company_id');
    $fromDate = $request->input('from_date');
    $toDate = $request->input('to_date');
    $employees = $this->resolveEmployees($request);
    $employeeSystemIds = $employees->pluck('system_user_id')->all();
    $employeeIds = $employees->pluck('id')->all();

    // 1. All absent attendances in the window
    $absentRows = Attendance::query()
        ->where('company_id', $companyId)
        ->whereBetween('date', [$fromDate, $toDate])
        ->where('status', 'A')
        ->whereIn('employee_id', $employeeSystemIds)
        ->orderBy('employee_id')
        ->orderBy('date')
        ->get(['employee_id', 'date', 'status']);

    // 2. All approved leaves that overlap the window
    $approvedLeaves = EmployeeLeaves::query()
        ->where('company_id', $companyId)
        ->where('status', EmployeeLeaves::APPROVED)
        ->whereIn('employee_id', $employeeIds)
        ->where(function ($q) use ($fromDate, $toDate) {
            $q->whereDate('start_date', '<=', $toDate)
              ->whereDate('end_date', '>=', $fromDate);
        })
        ->get(['employee_id', 'start_date', 'end_date']);

    // Build a lookup: employee.id => set of approved date strings within window
    $approvedDates = []; // [emp_pk => ['YYYY-MM-DD' => true]]
    foreach ($approvedLeaves as $lv) {
        $start = Carbon::parse($lv->start_date)->max(Carbon::parse($fromDate));
        $end = Carbon::parse($lv->end_date)->min(Carbon::parse($toDate));
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $approvedDates[$lv->employee_id][$d->toDateString()] = true;
        }
    }

    // 3. Group absences per employee
    $perEmp = []; // system_user_id => ['total'=>n, 'approved'=>n, 'unapproved'=>n, 'dates'=>[]]
    foreach ($absentRows as $att) {
        $sid = $att->employee_id;
        $emp = $employees->get($sid);
        if (!$emp) continue;

        $dateStr = Carbon::parse($att->date)->toDateString();
        $day = (int) Carbon::parse($att->date)->format('d');
        $isApproved = isset($approvedDates[$emp->id][$dateStr]);

        if (!isset($perEmp[$sid])) {
            $perEmp[$sid] = ['total' => 0, 'approved' => 0, 'unapproved' => 0, 'dates' => [], 'date_strs' => []];
        }
        $perEmp[$sid]['total']++;
        $isApproved ? $perEmp[$sid]['approved']++ : $perEmp[$sid]['unapproved']++;
        $perEmp[$sid]['dates'][] = ['day' => $day, 'approved' => $isApproved];
        $perEmp[$sid]['date_strs'][] = $dateStr;
    }

    // 4. Build rows + compute longest_streak per employee
    $rows = [];
    foreach ($perEmp as $sid => $agg) {
        $emp = $employees->get($sid);
        $shift = optional($emp->schedule)->shift;
        $rows[] = [
            'id' => $emp->system_user_id,
            'initials' => $this->initialsOf($emp),
            'name' => $this->displayName($emp),
            'emp_id' => $emp->employee_id ?? ('EMP-' . $emp->system_user_id),
            'branch' => optional($emp->branch)->branch_name ?? '—',
            'dept' => optional($emp->department)->name ?? '—',
            'shift' => $shift->name ?? '—',
            'phone' => $emp->whatsapp_number ?? '—',
            'email' => $emp->local_email ?? '—',
            'total' => $agg['total'],
            'approved' => $agg['approved'],
            'unapproved' => $agg['unapproved'],
            'dates' => $agg['dates'],
            'longest_streak' => $this->longestStreak($agg['date_strs']),
        ];
    }

    // Sort: total desc
    usort($rows, fn($a, $b) => $b['total'] <=> $a['total']);

    // 5. Summary
    $totalEmployees = $employees->count();
    $employeesWithAbs = count($rows);
    $totalAbsentDays = array_sum(array_column($rows, 'total'));
    $approvedDays = array_sum(array_column($rows, 'approved'));
    $unapprovedDays = $totalAbsentDays - $approvedDays;
    $absencesPct = $totalEmployees > 0 ? round(($employeesWithAbs / $totalEmployees) * 100, 2) : 0;
    $avgPerEmployee = $employeesWithAbs > 0 ? round($totalAbsentDays / $employeesWithAbs, 2) : 0;

    $top = $rows[0] ?? null;
    $topAbsentee = $top ? [
        'initials' => $top['initials'],
        'name' => $top['name'],
        'days' => $top['total'],
        'dept' => $top['dept'],
        'branch' => $top['branch'],
    ] : null;

    return [
        'mode' => 'monthly',
        'company' => $this->companyMeta($companyId, $request),
        'period' => [
            'from' => $fromDate,
            'to' => $toDate,
            'from_label' => Carbon::parse($fromDate)->format('d M Y'),
            'to_label' => Carbon::parse($toDate)->format('d M Y'),
            'generated_at' => now()->format('h:i A'),
            'branches_label' => $this->branchesLabel($request),
        ],
        'summary' => [
            'total_employees' => $totalEmployees,
            'employees_with_absences' => $employeesWithAbs,
            'absences_pct' => $absencesPct,
            'total_absent_days' => $totalAbsentDays,
            'approved_days' => $approvedDays,
            'unapproved_days' => $unapprovedDays,
            'avg_per_employee' => $avgPerEmployee,
            'top_absentee' => $topAbsentee,
        ],
        'rows' => $rows,
    ];
}

/**
 * Longest run of consecutive absent days within the supplied date strings.
 * Week-offs and holidays are not in this list (we only collected status='A'
 * rows), so they don't skip — but neither do non-absent days. This is the
 * "longest streak within the absent set," matching the sample's intent.
 */
public function longestStreak(array $dateStrs): int
{
    if (empty($dateStrs)) return 0;
    $dates = array_unique($dateStrs);
    sort($dates);
    $longest = 1;
    $current = 1;
    for ($i = 1; $i < count($dates); $i++) {
        $prev = Carbon::parse($dates[$i - 1]);
        $cur = Carbon::parse($dates[$i]);
        if ($cur->diffInDays($prev) === 1) {
            $current++;
            $longest = max($longest, $current);
        } else {
            $current = 1;
        }
    }
    return $longest;
}
```

- [ ] **Step 2: Verify with curl across a month**

Run:

```bash
curl -s -X POST http://127.0.0.1:8000/api/absent-report-data \
  -H "Content-Type: application/json" \
  -d '{"mode":"monthly","from_date":"2026-05-01","to_date":"2026-05-31","company_id":1}' \
  | python -m json.tool
```

Expected: `summary` has all eight fields populated; `rows[]` sorted by `total` desc; first row's `name/days` matches `summary.top_absentee`.

- [ ] **Step 3: Stop for commit**

---

## Task 5: pdf-service static mount for absent-report

**Files:**
- Modify: `pdf-service/index.js`

- [ ] **Step 1: Add the static mount**

Edit `pdf-service/index.js`. Find the existing static mounts (around line 20-22) and add a third line:

```js
app.use("/templates", express.static(path.resolve(__dirname, "..", "summary-report"), NO_CACHE_STATIC));
app.use("/attendance-report", express.static(path.resolve(__dirname, "..", "summary-report", "attendance-report"), NO_CACHE_STATIC));
app.use("/access-control-report", express.static(path.resolve(__dirname, "..", "summary-report", "access-control-report"), NO_CACHE_STATIC));
app.use("/absent-report", express.static(path.resolve(__dirname, "..", "summary-report", "absent-report"), NO_CACHE_STATIC));
```

- [ ] **Step 2: Create the directory**

```bash
mkdir -p d:/newmytime2cloud/summary-report/absent-report
```

Then create a placeholder file so the static mount has something to serve:

```bash
echo "placeholder" > d:/newmytime2cloud/summary-report/absent-report/health.txt
```

- [ ] **Step 3: Restart pdf-service and verify**

Restart `pdf-service` (Ctrl+C the running process, then `node pdf-service/index.js` or use the project's start script). Verify:

```bash
curl http://localhost:3002/absent-report/health.txt
```

Expected: returns `placeholder`. If 404, the static mount is not registered correctly.

- [ ] **Step 4: Confirm landscape rule does NOT apply**

The auto-landscape check at `pdf-service/index.js:110` matches only URLs containing `attendance-report` or `access-control-report`. `absent-report` is intentionally different so it stays portrait. No code change needed — just confirm by reading line 110:

```js
const isLandscapeView = landscape === true || url.includes("attendance-report") || url.includes("access-control-report");
```

`absent-report` is NOT in the substring list — correct.

- [ ] **Step 5: Stop for commit**

---

## Task 6: Daily PDF template — `daily.html`

**Files:**
- Create: `summary-report/absent-report/daily.html`

- [ ] **Step 1: Create the template**

Create `summary-report/absent-report/daily.html` with this full content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1.0" name="viewport" />
  <title>Daily Absent Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: white; color: #111827; }
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      tr { page-break-inside: avoid !important; }
    }

    .wrap { padding: 4mm 2mm; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; text-transform: uppercase; }
    .subtitle { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .subtitle .sep { color: #d1d5db; margin: 0 8px; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 10px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;
      color: #be123c; margin-top: 8px;
    }
    .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: #be123c; }

    .company-badge {
      border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 14px;
      display: flex; align-items: center; gap: 10px;
    }
    .company-badge .icon {
      width: 34px; height: 34px; background: #f3f4f6; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #374151; font-size: 12px; font-weight: 700;
    }
    .company-badge .name { font-size: 12px; font-weight: 700; }
    .company-badge .branch { font-size: 10px; color: #6b7280; }

    .cards { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; }
    .card-label { font-size: 9px; letter-spacing: 1px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
    .card-value { font-size: 22px; font-weight: 700; margin-top: 4px; line-height: 1.1; }
    .card-value.red { color: #be123c; }
    .card-sub { font-size: 9px; color: #6b7280; margin-top: 4px; }

    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
    thead { background: #f9fafb; }
    th {
      padding: 8px 6px; text-align: left; font-size: 9px; font-weight: 600;
      color: #374151; text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #d1d5db;
    }
    td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

    .emp-cell { display: flex; align-items: center; gap: 8px; }
    .emp-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: #fde68a; color: #92400e;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700; flex: 0 0 28px;
    }
    .emp-avatar.c1 { background: #fde68a; color: #92400e; }
    .emp-avatar.c2 { background: #bfdbfe; color: #1e40af; }
    .emp-avatar.c3 { background: #fbcfe8; color: #9d174d; }
    .emp-avatar.c4 { background: #c7d2fe; color: #3730a3; }
    .emp-avatar.c5 { background: #bbf7d0; color: #166534; }
    .emp-name { font-weight: 600; font-size: 11px; }
    .emp-id { color: #6b7280; font-size: 9px; }

    .bds .b { font-weight: 600; }
    .bds .d { color: #6b7280; font-size: 9px; margin-top: 2px; }
    .bds .s { color: #6b7280; font-size: 9px; }

    .contact .p { font-size: 10px; }
    .contact .e { font-size: 9px; color: #6b7280; }

    .pill {
      display: inline-block; padding: 3px 8px; border-radius: 10px;
      font-size: 9px; font-weight: 600; letter-spacing: 0.4px;
    }
    .pill.NOSHOW { background: #fef2f2; color: #b91c1c; }
    .pill.LOP { background: #fff7ed; color: #c2410c; }
    .pill.SICK { background: #fef3c7; color: #92400e; }
    .pill.CASUAL { background: #fefce8; color: #854d0e; }
    .pill.PERMISSION { background: #eff6ff; color: #1d4ed8; }
    .pill.APPROVED { background: #ecfdf5; color: #047857; }

    .streak { font-weight: 700; }
    .streak.high { color: #be123c; }
    .streak.mid { color: #c2410c; }
    .streak.low { color: #6b7280; }

    .legend {
      margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb;
      display: flex; justify-content: center; gap: 18px; flex-wrap: wrap;
      font-size: 9px; color: #6b7280; font-weight: 600;
    }
    .legend .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

    .foot-meta { display: flex; justify-content: space-between; font-size: 9px; color: #6b7280; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header-row">
      <div>
        <div class="title" id="title">DAILY ABSENT REPORT</div>
        <div class="subtitle">
          <span id="date-label">—</span>
          <span class="sep">·</span>
          <span id="branches-label">—</span>
          <span class="sep">·</span>
          <span>Generated <span id="gen-time">—</span></span>
        </div>
        <div class="status-pill"><span class="dot"></span><span id="status-text">— ABSENT OUT OF — EMPLOYEES</span></div>
      </div>
      <div class="company-badge">
        <div class="icon" id="company-initials">—</div>
        <div>
          <div class="name" id="company-name">—</div>
          <div class="branch" id="company-branch">—</div>
        </div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="card-label">Total Employees</div>
        <div class="card-value" id="c-total">—</div>
        <div class="card-sub" id="c-total-sub">—</div>
      </div>
      <div class="card">
        <div class="card-label">Absent Today</div>
        <div class="card-value red" id="c-absent">—</div>
        <div class="card-sub">Includes leave + no-show</div>
      </div>
      <div class="card">
        <div class="card-label">Approved Leave</div>
        <div class="card-value" id="c-approved">—</div>
        <div class="card-sub">Authorised</div>
      </div>
      <div class="card">
        <div class="card-label">Unapproved / No-Show</div>
        <div class="card-value" id="c-unapproved">—</div>
        <div class="card-sub">Needs follow-up</div>
      </div>
    </div>

    <table id="tbl">
      <thead>
        <tr>
          <th style="width: 24px;">#</th>
          <th>Employee</th>
          <th>Designation</th>
          <th>Branch / Dept / Shift</th>
          <th>Contact</th>
          <th>Absent Type</th>
          <th style="width: 50px;">Streak</th>
          <th style="width: 70px;">Last Present</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>

    <div class="legend">
      <span><span class="dot" style="background:#b91c1c"></span>NO-SHOW</span>
      <span><span class="dot" style="background:#c2410c"></span>LOP</span>
      <span><span class="dot" style="background:#854d0e"></span>CASUAL LEAVE</span>
      <span><span class="dot" style="background:#92400e"></span>SICK LEAVE</span>
      <span><span class="dot" style="background:#1d4ed8"></span>PERMISSION</span>
      <span><span class="dot" style="background:#047857"></span>APPROVED</span>
    </div>
    <div class="foot-meta">
      <span id="foot-left">Sorted: unapproved / longest streak first.</span>
      <span>Daily Absent Report</span>
    </div>
  </div>

  <script>
    function qs(name) { return new URLSearchParams(window.location.search).get(name); }
    function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
    function pillClass(type) {
      const t = (type || '').toUpperCase();
      if (t.includes('NO-SHOW') || t === 'NOSHOW') return 'NOSHOW';
      if (t.includes('LOP') || t.includes('LOSS')) return 'LOP';
      if (t.includes('SICK')) return 'SICK';
      if (t.includes('CASUAL')) return 'CASUAL';
      if (t.includes('PERMISSION')) return 'PERMISSION';
      return 'APPROVED';
    }
    function avatarColor(i) { return 'c' + ((i % 5) + 1); }
    function streakClass(n) { return n >= 3 ? 'high' : (n >= 2 ? 'mid' : 'low'); }

    const apiBase = qs('api_base') || 'http://127.0.0.1:8000/api';
    const payload = {
      mode: 'daily',
      from_date: qs('from_date'),
      to_date: qs('to_date'),
      company_id: parseInt(qs('company_id') || '0', 10),
      branch_ids: qs('branch_ids') ? qs('branch_ids').split(',') : [],
      department_ids: qs('department_ids') ? qs('department_ids').split(',') : [],
      employee_ids: qs('employee_ids') ? qs('employee_ids').split(',') : [],
      employee_types: qs('employee_types') ? qs('employee_types').split(',') : [],
      company_name: qs('company_name') || '',
    };

    fetch(apiBase + '/absent-report-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(r => r.json())
    .then(render)
    .catch(err => { document.getElementById('tbody').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#b91c1c">Failed to load: ' + esc(err.message) + '</td></tr>'; });

    function render(data) {
      const c = data.company || {}, p = data.period || {}, s = data.summary || {}, rows = data.rows || [];

      document.getElementById('company-initials').textContent = c.initials || '—';
      document.getElementById('company-name').textContent = c.name || '—';
      document.getElementById('company-branch').textContent = c.branch_name || '';

      document.getElementById('date-label').textContent = (p.date_label || p.date || '—') + ' (' + (p.day_name || '') + ')';
      document.getElementById('branches-label').textContent = p.branches_label || 'All Branches';
      document.getElementById('gen-time').textContent = p.generated_at || '';
      document.getElementById('status-text').textContent = (s.absent_count || 0) + ' ABSENT OUT OF ' + (s.total_employees || 0) + ' EMPLOYEES';

      document.getElementById('c-total').textContent = s.total_employees ?? '—';
      document.getElementById('c-total-sub').textContent = 'Active across ' + (s.branches_count || 0) + ' branches';
      document.getElementById('c-absent').textContent = (s.absent_count ?? '—') + (s.absent_pct != null ? ' (' + s.absent_pct + '%)' : '');
      document.getElementById('c-approved').textContent = s.approved_count ?? '—';
      document.getElementById('c-unapproved').textContent = s.unapproved_count ?? '—';

      const tbody = document.getElementById('tbody');
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#6b7280">No absences for this date.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div class="emp-cell">
              <div class="emp-avatar ${avatarColor(i)}">${esc(r.initials)}</div>
              <div>
                <div class="emp-name">${esc(r.name)}</div>
                <div class="emp-id">${esc(r.emp_id)}</div>
              </div>
            </div>
          </td>
          <td>${esc(r.designation)}</td>
          <td class="bds">
            <div class="b">${esc(r.branch)}</div>
            <div class="d">${esc(r.dept)}</div>
            <div class="s">${esc(r.shift_name)} · ${esc(r.shift_time)}</div>
          </td>
          <td class="contact">
            <div class="p">${esc(r.phone)}</div>
            <div class="e">${esc(r.email)}</div>
          </td>
          <td><span class="pill ${pillClass(r.absent_type)}">${esc(r.absent_type)}</span></td>
          <td><span class="streak ${streakClass(r.streak)}">${r.streak ?? 0}</span></td>
          <td>${r.last_present ? esc(r.last_present) : '—'}</td>
        </tr>
      `).join('');
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Smoke-test the template in a browser**

Open `http://localhost:3002/absent-report/daily.html?api_base=http://127.0.0.1:8000/api&from_date=2026-05-09&to_date=2026-05-09&company_id=1&company_name=Test` in a browser.

Expected: the page loads, shows the header / cards / table populated with real data. Open DevTools Network tab and verify the POST to `/api/absent-report-data` returns 200.

- [ ] **Step 3: Stop for commit**

---

## Task 7: Monthly PDF template — `monthly.html`

**Files:**
- Create: `summary-report/absent-report/monthly.html`

- [ ] **Step 1: Create the template**

Create `summary-report/absent-report/monthly.html` with this full content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1.0" name="viewport" />
  <title>Monthly Absent Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: white; color: #111827; }
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      tr { page-break-inside: avoid !important; }
    }

    .wrap { padding: 4mm 2mm; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; text-transform: uppercase; }
    .subtitle { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .subtitle .sep { color: #d1d5db; margin: 0 8px; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 10px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;
      color: #be123c; margin-top: 8px;
    }
    .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: #be123c; }

    .company-badge {
      border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 14px;
      display: flex; align-items: center; gap: 10px;
    }
    .company-badge .icon {
      width: 34px; height: 34px; background: #f3f4f6; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #374151; font-size: 12px; font-weight: 700;
    }
    .company-badge .name { font-size: 12px; font-weight: 700; }
    .company-badge .branch { font-size: 10px; color: #6b7280; }

    .cards { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; }
    .card-label { font-size: 9px; letter-spacing: 1px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
    .card-value { font-size: 22px; font-weight: 700; margin-top: 4px; line-height: 1.1; }
    .card-sub { font-size: 9px; color: #6b7280; margin-top: 4px; }

    .top-absentee { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
    .top-absentee .avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: #fde68a; color: #92400e;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700;
    }
    .top-absentee .meta .n { font-size: 12px; font-weight: 700; }
    .top-absentee .meta .s { font-size: 9px; color: #6b7280; }

    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
    thead { background: #f9fafb; }
    th {
      padding: 8px 6px; text-align: left; font-size: 9px; font-weight: 600;
      color: #374151; text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #d1d5db;
    }
    td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

    .emp-cell { display: flex; align-items: center; gap: 8px; }
    .emp-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700; flex: 0 0 28px;
    }
    .emp-avatar.c1 { background: #fde68a; color: #92400e; }
    .emp-avatar.c2 { background: #bfdbfe; color: #1e40af; }
    .emp-avatar.c3 { background: #fbcfe8; color: #9d174d; }
    .emp-avatar.c4 { background: #c7d2fe; color: #3730a3; }
    .emp-avatar.c5 { background: #bbf7d0; color: #166534; }
    .emp-name { font-weight: 600; font-size: 11px; }
    .emp-id { color: #6b7280; font-size: 9px; }

    .bds .b { font-weight: 600; }
    .bds .d { color: #6b7280; font-size: 9px; margin-top: 2px; }
    .bds .s { color: #6b7280; font-size: 9px; }

    .contact .p { font-size: 10px; }
    .contact .e { font-size: 9px; color: #6b7280; word-break: break-all; }

    .total-cell { font-size: 16px; font-weight: 700; }
    .app-unapp { font-size: 10px; color: #374151; }
    .app-unapp .a { color: #047857; font-weight: 600; }
    .app-unapp .u { color: #be123c; font-weight: 600; }

    .date-chips { display: flex; flex-wrap: wrap; gap: 4px; max-width: 220px; }
    .chip {
      display: inline-block; padding: 2px 6px; border-radius: 6px;
      font-size: 9px; font-weight: 600;
    }
    .chip.unapp { background: #fef2f2; color: #b91c1c; }
    .chip.app { background: #ecfdf5; color: #047857; }

    .streak { font-weight: 700; }
    .streak.high { color: #be123c; }
    .streak.mid { color: #c2410c; }
    .streak.low { color: #6b7280; }

    .legend {
      margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb;
      display: flex; justify-content: center; gap: 18px; flex-wrap: wrap;
      font-size: 9px; color: #6b7280; font-weight: 600;
    }
    .legend .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

    .foot-meta { display: flex; justify-content: space-between; font-size: 9px; color: #6b7280; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header-row">
      <div>
        <div class="title">MONTHLY ABSENT REPORT</div>
        <div class="subtitle">
          <span id="range-label">—</span>
          <span class="sep">·</span>
          <span id="branches-label">—</span>
          <span class="sep">·</span>
          <span>Generated <span id="gen-time">—</span></span>
        </div>
        <div class="status-pill"><span class="dot"></span><span id="status-text">— EMPLOYEES WITH ABSENCES · — ABSENT-DAYS</span></div>
      </div>
      <div class="company-badge">
        <div class="icon" id="company-initials">—</div>
        <div>
          <div class="name" id="company-name">—</div>
          <div class="branch" id="company-branch">—</div>
        </div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="card-label">Employees With Absences</div>
        <div class="card-value" id="c-emp-abs">—</div>
        <div class="card-sub" id="c-emp-abs-sub">—</div>
      </div>
      <div class="card">
        <div class="card-label">Total Absent Days</div>
        <div class="card-value" id="c-total-days">—</div>
        <div class="card-sub" id="c-total-days-sub">—</div>
      </div>
      <div class="card">
        <div class="card-label">Avg / Employee</div>
        <div class="card-value" id="c-avg">—</div>
        <div class="card-sub">Days per absent employee</div>
      </div>
      <div class="card">
        <div class="card-label">Top Absentee</div>
        <div class="top-absentee">
          <div class="avatar" id="top-init">—</div>
          <div class="meta">
            <div class="n" id="top-name">—</div>
            <div class="s" id="top-sub">—</div>
          </div>
        </div>
      </div>
    </div>

    <table id="tbl">
      <thead>
        <tr>
          <th style="width: 24px;">#</th>
          <th>Employee</th>
          <th>Branch / Dept / Shift</th>
          <th>Contact</th>
          <th style="width: 50px;">Total</th>
          <th style="width: 60px;">App / Unapp</th>
          <th>Absent Dates</th>
          <th style="width: 60px;">Longest Streak</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>

    <div class="legend">
      <span><span class="dot" style="background:#047857"></span>APPROVED LEAVE</span>
      <span><span class="dot" style="background:#be123c"></span>UNAPPROVED / NO-SHOW</span>
      <span>Sorted by Total Absent &darr; — worst absentees on top</span>
    </div>
    <div class="foot-meta">
      <span>Streak = longest consecutive absent days in the period.</span>
      <span>Monthly Absent Report</span>
    </div>
  </div>

  <script>
    function qs(name) { return new URLSearchParams(window.location.search).get(name); }
    function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
    function pad2(n) { return String(n).padStart(2, '0'); }
    function avatarColor(i) { return 'c' + ((i % 5) + 1); }
    function streakClass(n) { return n >= 3 ? 'high' : (n >= 2 ? 'mid' : 'low'); }

    const apiBase = qs('api_base') || 'http://127.0.0.1:8000/api';
    const payload = {
      mode: 'monthly',
      from_date: qs('from_date'),
      to_date: qs('to_date'),
      company_id: parseInt(qs('company_id') || '0', 10),
      branch_ids: qs('branch_ids') ? qs('branch_ids').split(',') : [],
      department_ids: qs('department_ids') ? qs('department_ids').split(',') : [],
      employee_ids: qs('employee_ids') ? qs('employee_ids').split(',') : [],
      employee_types: qs('employee_types') ? qs('employee_types').split(',') : [],
      company_name: qs('company_name') || '',
    };

    fetch(apiBase + '/absent-report-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(r => r.json())
    .then(render)
    .catch(err => { document.getElementById('tbody').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#b91c1c">Failed to load: ' + esc(err.message) + '</td></tr>'; });

    function render(data) {
      const c = data.company || {}, p = data.period || {}, s = data.summary || {}, rows = data.rows || [];

      document.getElementById('company-initials').textContent = c.initials || '—';
      document.getElementById('company-name').textContent = c.name || '—';
      document.getElementById('company-branch').textContent = c.branch_name || '';

      document.getElementById('range-label').textContent = (p.from_label || p.from || '—') + ' – ' + (p.to_label || p.to || '—');
      document.getElementById('branches-label').textContent = p.branches_label || 'All Branches';
      document.getElementById('gen-time').textContent = p.generated_at || '';
      document.getElementById('status-text').textContent =
        (s.employees_with_absences || 0) + ' EMPLOYEES WITH ABSENCES · ' + (s.total_absent_days || 0) + ' ABSENT-DAYS';

      document.getElementById('c-emp-abs').textContent = (s.employees_with_absences ?? '—') + ' / ' + (s.total_employees ?? '—');
      document.getElementById('c-emp-abs-sub').textContent = (s.absences_pct != null ? s.absences_pct + '% of workforce' : '');
      document.getElementById('c-total-days').textContent = s.total_absent_days ?? '—';
      document.getElementById('c-total-days-sub').textContent =
        (s.unapproved_days ?? 0) + ' unapproved · ' + (s.approved_days ?? 0) + ' approved';
      document.getElementById('c-avg').textContent = s.avg_per_employee ?? '—';

      const top = s.top_absentee;
      if (top) {
        document.getElementById('top-init').textContent = top.initials || '—';
        document.getElementById('top-name').textContent = top.name || '—';
        document.getElementById('top-sub').textContent = (top.days || 0) + ' days · ' + (top.dept || '—') + ' · ' + (top.branch || '—');
      } else {
        document.getElementById('top-name').textContent = '—';
        document.getElementById('top-sub').textContent = '';
      }

      const tbody = document.getElementById('tbody');
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#6b7280">No absences in this period.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map((r, i) => {
        const chips = (r.dates || []).map(d =>
          `<span class="chip ${d.approved ? 'app' : 'unapp'}">${pad2(d.day)}</span>`
        ).join('');
        return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div class="emp-cell">
              <div class="emp-avatar ${avatarColor(i)}">${esc(r.initials)}</div>
              <div>
                <div class="emp-name">${esc(r.name)}</div>
                <div class="emp-id">${esc(r.emp_id)}</div>
              </div>
            </div>
          </td>
          <td class="bds">
            <div class="b">${esc(r.branch)}</div>
            <div class="d">${esc(r.dept)}</div>
            <div class="s">${esc(r.shift)}</div>
          </td>
          <td class="contact">
            <div class="p">${esc(r.phone)}</div>
            <div class="e">${esc(r.email)}</div>
          </td>
          <td class="total-cell">${r.total ?? 0}</td>
          <td class="app-unapp"><span class="a">${r.approved ?? 0}</span> / <span class="u">${r.unapproved ?? 0}</span></td>
          <td><div class="date-chips">${chips}</div></td>
          <td><span class="streak ${streakClass(r.longest_streak)}">${r.longest_streak ?? 0}</span></td>
        </tr>`;
      }).join('');
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Smoke-test in browser**

Open `http://localhost:3002/absent-report/monthly.html?api_base=http://127.0.0.1:8000/api&from_date=2026-05-01&to_date=2026-05-31&company_id=1&company_name=Test`.

Expected: monthly layout renders, summary cards show counts, table shows employees sorted by total desc, dates show as color-coded chips.

- [ ] **Step 3: Stop for commit**

---

## Task 8: Frontend — conditional UI for the absent tab

**Files:**
- Modify: `frontend-new/src/components/Report/Report.js`

- [ ] **Step 1: Add `useSearchParams` import and read `?type`**

Open `frontend-new/src/components/Report/Report.js`. Find the existing imports near the top (around line 1-37). Add `useSearchParams` to the next.js navigation imports — but `Report.js` doesn't yet import from `next/navigation`. Add this import after the existing React import:

```js
import { useSearchParams } from 'next/navigation';
```

Then inside the `AttendanceTable` component (near the top of the function body, around line 47), add:

```js
const searchParams = useSearchParams();
const activeType = searchParams.get('type') || '';
const isAbsentTab = activeType === 'absent';
```

- [ ] **Step 2: Hide the Report Template dropdown on the absent tab**

Find the Report Template `DropDown` (around line 550-569). Wrap it in a conditional:

```js
{!isAbsentTab && (
  <div className="flex flex-col min-w-[200px]">
    <DropDown
      placeholder={'Report Template'}
      onChange={(val) => {
        setSelectedReportTemplate(val);
        if (val === "TemplateB" && from && to) {
          const f = new Date(from);
          const t = new Date(to);
          if (f.getFullYear() !== t.getFullYear() || f.getMonth() !== t.getMonth()) {
            const monthEnd = new Date(f.getFullYear(), f.getMonth() + 1, 0);
            setTo(monthEnd);
          }
        }
      }}
      value={selectedReportTemplate}
      items={reportTemplates}
    />
  </div>
)}
```

- [ ] **Step 3: Hide the Excel menu item on the absent tab**

Find the `DropdownMenuContent` block (around line 606-625). Wrap the Excel `DropdownMenuItem` in a conditional:

```js
{!isAbsentTab && (
  <DropdownMenuItem
    onClick={() => { process_file_in_child_comp('monthly_download_csv', 'EXCEL'); setIsMenuOpen(false); }}
    className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
  >
    <img src="/icons/excel.png" alt="Excel Icon" className="w-4 h-4" />
    <span className="text-slate-600 dark:text-slate-300 font-medium">Excel</span>
  </DropdownMenuItem>
)}
```

- [ ] **Step 4: Verify in the browser**

Start the frontend dev server if it isn't running, navigate to `/report` (Attendance Report tab) — verify both the Report Template dropdown and the Excel option are still visible. Click the Absent Report tab — verify both are now hidden.

- [ ] **Step 5: Stop for commit**

---

## Task 9: Frontend — route Download → PDF to the absent template

**Files:**
- Modify: `frontend-new/src/components/Report/Report.js`

- [ ] **Step 1: Add the absent-tab branch in `process_file_in_child_comp`**

Find the `process_file_in_child_comp` function (around line 313). At the very top of the `try` block (just after `try {`, before the existing `const isMultiShift = ...` line around line 332), insert this absent-tab branch:

```js
// --- Absent tab branch (Daily/Monthly auto-selected by date range) ---
if (isAbsentTab && actionType === 'PDF') {
  if (!from || !to) {
    notify("Warning", "Date range must be selected", "warning");
    return;
  }
  const PDF_SERVICE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || 'http://localhost:3002';
  const SUMMARY_BASE = process.env.NEXT_PUBLIC_SUMMARY_REPORT_URL || PDF_SERVICE;
  const user = getUser();
  const fromDate = formatDateDubai(from);
  const toDate = formatDateDubai(to);
  const mode = (fromDate === toDate) ? 'daily' : 'monthly';
  const templatePath = `absent-report/${mode}.html`;

  const paramsObj = {
    mode,
    from_date: fromDate,
    to_date: toDate,
    company_id: user?.company_id ?? 0,
    api_base: API_BASE_URL,
    company_name: user?.company_name || user?.company?.name || 'Company',
  };
  if (selectedBranchIds?.length)     paramsObj.branch_ids     = selectedBranchIds.join(',');
  if (selectedDepartmentIds?.length) paramsObj.department_ids = selectedDepartmentIds.join(',');
  if (selectedEmployeeIds?.length)   paramsObj.employee_ids   = selectedEmployeeIds.join(',');
  if (selectedEmployeeTypes?.length) paramsObj.employee_types = selectedEmployeeTypes.join(',');

  const templateUrl = `${SUMMARY_BASE}/${templatePath}?${new URLSearchParams(paramsObj).toString()}`;

  const filename = mode === 'daily'
    ? `Daily-Absent-Report-${fromDate}.pdf`
    : `Monthly-Absent-Report-${fromDate}-to-${toDate}.pdf`;

  setIsPdfDownloading(true);
  setPdfProgress(0);
  try {
    await downloadReport(templateUrl, filename, (p) => setPdfProgress(p));
  } catch (err) {
    await notify("Error", `Download failed: ${err.message}`, "error");
  } finally {
    setTimeout(() => { setIsPdfDownloading(false); setPdfProgress(0); }, 1000);
  }
  return;
}
```

The check for "no employees selected" earlier in this function (around line 314) should remain — but for absent reports we may want to allow empty (= all eligible employees). Update the early guard to allow absent mode:

Find this block (around line 314):

```js
if (selectedEmployeeIds.length === 0) {
  notify("Warning", "Employee not selected", "warning");
  return;
}
```

Replace with:

```js
if (selectedEmployeeIds.length === 0 && !isAbsentTab) {
  notify("Warning", "Employee not selected", "warning");
  return;
}
```

Similarly, the template guard (line 319):

```js
if (!selectedReportTemplate) {
  notify("Warning", "Template not selected", "warning");
  return;
}
```

Replace with:

```js
if (!selectedReportTemplate && !isAbsentTab) {
  notify("Warning", "Template not selected", "warning");
  return;
}
```

- [ ] **Step 2: End-to-end verify (Daily)**

In the browser, go to `/report?type=absent`. Select a single date (e.g., 2026-05-09 with no range — set both from and to to the same day). Click **Download → PDF**.

Expected: progress overlay shows, then a file `Daily-Absent-Report-2026-05-09.pdf` downloads. Open it; verify the layout matches the daily sample (header, 4 summary cards, table).

- [ ] **Step 3: End-to-end verify (Monthly)**

Pick a date range spanning multiple days (e.g., 2026-05-01 to 2026-05-31). Click **Download → PDF**.

Expected: file `Monthly-Absent-Report-2026-05-01-to-2026-05-31.pdf` downloads, monthly layout, sorted by total absent days desc.

- [ ] **Step 4: Stop for commit**

---

## Task 10: Polish + edge cases

**Files:** None — verification + cleanup only

- [ ] **Step 1: Verify empty-state rendering**

In the browser, navigate to a date with zero absences (e.g., a future date). Download the PDF.

Expected: PDF still renders cleanly with `"No absences for this date."` (daily) or `"No absences in this period."` (monthly) inside the table body, and summary cards show zero counts. No JS errors.

- [ ] **Step 2: Verify with large dataset**

Pick a month-long range with many absences. Download the monthly PDF.

Expected: multi-page output, rows don't break across page boundaries, no overlap with footer. If a row gets clipped, the `tr { page-break-inside: avoid }` rule already handles it — re-check the CSS if it doesn't work.

- [ ] **Step 3: Verify filters propagate**

Pick a single branch in the Branch filter, click Download → PDF on the monthly view.

Expected: only employees from that branch appear in the PDF. Header shows the branch name in the "branches_label" position (e.g., "Bengaluru HO" instead of "All Branches").

- [ ] **Step 4: Verify other tabs unaffected**

Navigate to `/report` (Attendance Report tab). Verify Download → PDF still produces Format A/B/C PDFs as before. Verify Excel still works.

- [ ] **Step 5: Verify pdf-service did not regress**

Curl health endpoint:

```bash
curl http://localhost:3002/healthz
```

Expected: `{"ok": true, "chromium": true, ...}`.

- [ ] **Step 6: Stop for final commit**

---

## Out of scope (per spec)

- Excel/CSV export for Absent tab
- On-page DataTable redesign for Absent tab
- Hiding the Status filter when on Absent tab
- Editing existing Attendance Format A/B/C templates
