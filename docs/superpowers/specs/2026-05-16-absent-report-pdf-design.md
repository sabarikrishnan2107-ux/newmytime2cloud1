# Absent Report PDF Download — Design

**Date:** 2026-05-16
**Status:** Draft, pending user review
**Owner:** mail@akilgroup.com

## Problem

The Report page has an **Absent Report** tab (`/report?type=absent`), but today the tab routes through the same `AttendanceTable` component as every other tab — there is no absent-specific rendering, and clicking **Download → PDF** generates an Attendance Report, not an Absent Report.

The user has a sample PDF format in mind (two variants — daily and monthly). When the Absent Report tab is active, **Download → PDF** must produce that sample format.

## Sample format (target)

Two layouts, both portrait A4, both styled as light/airy with summary cards and a data table.

### Daily Absent Report — used when `from_date == to_date`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ DAILY ABSENT REPORT                                      ┌─────────────┐   │
│ 09 May 2026 (Saturday)  ·  All Branches  ·  Gen 09:42 AM │ AK  AKIL    │   │
│ ● 14 ABSENT OUT OF 142 EMPLOYEES                         │     GROUP   │   │
│                                                          └─────────────┘   │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─TOTAL─────┐ ┌─ABSENT TODAY─┐ ┌─APPROVED LV─┐ ┌─UNAPPROVED ─┐             │
│ │   142     │ │  14 (9.86%)  │ │      8      │ │     6       │             │
│ │ 4 branches│ │ leave+no-show│ │ CL · SL · P │ │ Needs f-up  │             │
│ └───────────┘ └──────────────┘ └─────────────┘ └─────────────┘             │
├────────────────────────────────────────────────────────────────────────────┤
│ # │ EMPLOYEE   │ DESIG  │ BRANCH/DEPT/SHIFT │ CONTACT │ TYPE │ STK │ LAST  │
│ 1 │ RK Rahul.. │ SalesE │ Bgl HO · Sales··· │ ph/mail │NO-SHW│  4  │05May  │
│ ...                                                                         │
├────────────────────────────────────────────────────────────────────────────┤
│ ● NO-SHOW  ● LOP  ● CASUAL LV  ● SICK LV  ● PERMISSION  ● APPROVED         │
│ Showing top 10 of 14 absentees. Sorted: unapproved/longest streak first    │
└────────────────────────────────────────────────────────────────────────────┘
```

Columns: `# | Employee (initials avatar + name + emp_id) | Designation | Branch/Dept/Shift (multi-line) | Contact (phone+email) | Absent Type (colored pill) | Streak (color-coded) | Last Present (date)`.

Sort order: unapproved first, then longest streak descending.

### Monthly Absent Report — used when `from_date != to_date`

Same header/card framing, different data:

- Status pill: `● N EMPLOYEES WITH ABSENCES · M ABSENT-DAYS`
- Summary cards: Employees With Absences (n/total + %), Total Absent Days (split approved/unapproved), Avg / Employee, Top Absentee (name + days + dept + branch).
- Table columns: `# | Employee | Branch/Dept/Shift | Contact | Total | App/Unapp | Absent Dates (chips with day numbers, color = approved/unapproved) | Longest Streak`.
- Sort order: total absent days descending.

## Architecture

Follows the existing **pdf-service + summary-report templates** pattern used for Attendance Format A/B/C and the Daily report. No new infrastructure.

```
Frontend (Report.js)                    pdf-service (Puppeteer)               Laravel
─────────────────────              ─────────────────────────              ────────────
Download → PDF clicked  ──URL──▶  Loads absent-report HTML  ──fetch──▶  /api/absent-
(type=absent)                     in headless Chrome                    report-data
                                  Renders table                          (JSON)
                                  Returns PDF stream  ──blob──▶  download
```

### 1. Backend — Laravel JSON endpoint

`POST /api/absent-report-data`

**Request body:**
```json
{
  "mode": "daily" | "monthly",
  "from_date": "YYYY-MM-DD",
  "to_date": "YYYY-MM-DD",
  "branch_ids": [int, ...],
  "department_ids": [int, ...],
  "employee_ids": [int, ...],
  "employee_types": ["Full Time", ...],
  "company_id": int
}
```

**Response — daily mode:**
```json
{
  "company": { "name": "AKIL GROUP", "branch_name": "Bengaluru HO", "initials": "AK" },
  "period": {
    "date": "2026-05-09", "day_name": "Saturday",
    "generated_at": "09:42 AM", "branches_label": "All Branches"
  },
  "summary": {
    "total_employees": 142,
    "absent_count": 14, "absent_pct": 9.86,
    "approved_count": 8, "unapproved_count": 6
  },
  "rows": [
    {
      "id": 1042, "initials": "RK", "name": "Rahul Kumar", "emp_id": "EMP-1042",
      "designation": "Sales Executive",
      "branch": "Bengaluru HO", "dept": "Sales",
      "shift_name": "GENERAL", "shift_time": "09:30–18:30",
      "phone": "+91 98450 12345", "email": "rahul.k@akilgroup.com",
      "absent_type": "NO-SHOW",
      "streak": 4, "last_present": "2026-05-05"
    }
  ]
}
```

**Response — monthly mode:**
```json
{
  "company": {...},
  "period": { "from": "2026-05-01", "to": "2026-05-31", "generated_at": "...", "branches_label": "..." },
  "summary": {
    "total_employees": 142,
    "employees_with_absences": 22, "absences_pct": 15.49,
    "total_absent_days": 78, "approved_days": 26, "unapproved_days": 52,
    "avg_per_employee": 3.55,
    "top_absentee": { "initials": "RK", "name": "Rahul Kumar", "days": 8,
                      "dept": "Sales", "branch": "Bengaluru HO" }
  },
  "rows": [
    {
      "id": 1042, "initials": "RK", "name": "Rahul Kumar", "emp_id": "EMP-1042",
      "branch": "Bengaluru HO", "dept": "Sales", "shift": "GENERAL",
      "phone": "...", "email": "...",
      "total": 8, "approved": 1, "unapproved": 7,
      "dates": [
        { "day": 2,  "approved": false },
        { "day": 4,  "approved": false },
        { "day": 22, "approved": true }
      ],
      "longest_streak": 4
    }
  ]
}
```

**Backend file layout:**
- `app/Http/Controllers/Reports/AbsentReportController.php` (new) — `data(Request)` method
- `app/Services/AbsentReportService.php` (new) — query + aggregation logic, separated for testability
- `routes/api.php` — register route

**Query approach (high-level):**
1. Resolve the in-scope employee list from filters (branch, dept, type, explicit ids).
2. Pull `attendances` rows in `[from, to]` where `status` indicates absence (see open question #1).
3. Join `employee_leaves` (or equivalent) to determine approved/unapproved and leave subtype per absent day.
4. For daily mode: per row, compute streak (walk back from date), last_present (most recent non-absent before date).
5. For monthly mode: per employee, group dates, compute totals + longest streak in window.
6. Compute summary aggregates from the result set.

### 2. PDF templates — `summary-report/absent-report/`

New directory, two HTML files:
- `summary-report/absent-report/daily.html`
- `summary-report/absent-report/monthly.html`

Each is a self-contained HTML page that:
1. Reads URL params via `URLSearchParams` (matching the pattern in [format-c.html:122-163](summary-report/attendance-report/format-c.html#L122-L163)).
2. POSTs to `apiBase + '/absent-report-data'` with the filter payload + `mode`.
3. Renders the layout with inline CSS (matching the airy Inter-font style of the existing format-c).
4. Uses `@page { size: A4 portrait; margin: 10mm }`.

**Color tokens (consistent with sample):**
- Header text: `#111827`
- Subtitle: `#6b7280`
- Status pill / accent red: `#be123c`
- Approved green: `#047857`
- Card border: `#e5e7eb`
- Type pills:
  - NO-SHOW: red `#fef2f2` / `#b91c1c`
  - LOP: orange `#fff7ed` / `#c2410c`
  - SICK LEAVE: amber `#fef3c7` / `#92400e`
  - CASUAL LEAVE: yellow `#fefce8` / `#854d0e`
  - PERMISSION: blue `#eff6ff` / `#1d4ed8`
  - APPROVED (generic): green `#ecfdf5` / `#047857`

### 3. pdf-service — `pdf-service/index.js`

One addition near [line 22](pdf-service/index.js#L22):

```js
app.use("/absent-report", express.static(
  path.resolve(__dirname, "..", "summary-report", "absent-report"), NO_CACHE_STATIC
));
```

The existing auto-landscape rule at [line 110](pdf-service/index.js#L110) checks for `attendance-report` / `access-control-report` in the URL — absent-report stays portrait by default, no change needed.

### 4. Frontend — `frontend-new/src/components/Report/Report.js`

**Changes:**
1. Add `useSearchParams` import and read `?type` inside the component.
2. Add a helper `isAbsentTab = (type === 'absent')`.
3. Conditional UI:
   - Hide the **Report Template** dropdown when `isAbsentTab`.
   - Hide the **Excel** menu item when `isAbsentTab`.
4. New branch in `process_file_in_child_comp(...)`:
   ```js
   if (isAbsentTab && actionType === 'PDF') {
     const mode = (formatDateDubai(from) === formatDateDubai(to)) ? 'daily' : 'monthly';
     const templatePath = `absent-report/${mode}.html`;
     // build URL with filters + mode + api_base + company_name, reuse downloadReport()
     // filename: mode==='daily' ? `Daily-Absent-Report-${from}.pdf`
     //                          : `Monthly-Absent-Report-${from}-to-${to}.pdf`
     return;
   }
   ```
5. No changes to the on-page DataTable this round (out of scope).

### 5. No changes to:
- `frontend-new/src/app/report/page.js` — tab routing already works.
- `Report/columns.js` / `Report/data.js` — table behavior unchanged.
- `AbsentController.php` — that's the absent-marking cron, not report generation.
- `AdminAlertAbsent.php` — that's the email alert; sample-styled but separate use case.

## Pagination

The PDF includes **all** absent rows — no global cap. Puppeteer paginates naturally via `tr { page-break-inside: avoid }` on the table. The footer renders `Page X of Y · <Report Name>` using Puppeteer's built-in page number tokens (already used by the daily report in [pdf-service/index.js:163-181](pdf-service/index.js#L163-L181)). The sample's "Showing top 10 of 14" wording is purely artwork from the screenshot — we won't replicate that literal text since it's misleading on multi-page output.

## Filename convention

- Daily: `Daily-Absent-Report-2026-05-09.pdf`
- Monthly: `Monthly-Absent-Report-2026-05-01-to-2026-05-31.pdf`

## Open questions to resolve during planning

These four data-model questions are unresolved and must be answered before the controller can be written. They will be checked while writing the implementation plan.

1. **Absent type categorization.** How does the system distinguish NO-SHOW vs LOP vs CASUAL LEAVE vs SICK LEAVE vs PERMISSION? Candidates: `attendances.status` + a join to `employee_leaves.leave_type`. Need to verify the exact field names and the mapping rules.
2. **Approved vs Unapproved classification.** Most likely keyed off `employee_leaves.status = 'Approved'` for the date. Need to confirm the table, status values, and whether multiple leave records per (employee, date) are possible.
3. **Streak and last_present.** Both require walking attendance history before the report date. Need to confirm what statuses count as "present" (`P`, `Late`, etc. — does Weekoff break a streak or not?). Decision: **Weekoff and Holiday do NOT break a streak**; only an explicit present log breaks it.
4. **Shift name and time.** Likely from `shifts` joined via `employee_schedules`. Need the exact join path and field names. Fallback: show `—` if no shift assigned for the date.

If any question can't be answered cleanly, the affected column degrades to `—` rather than blocking the feature.

## Out of scope

- **Excel/CSV export for Absent tab.** Sample exists only as PDF. Can be added later if requested.
- **On-page table redesign.** The DataTable in the Absent tab continues to render the existing attendance schema. Restyling it to match the PDF is a separate task.
- **Hiding/repurposing the Status filter on the Absent tab.** It becomes a no-op for the PDF endpoint (status is implicitly absent). Leaving visible to avoid conditional layout churn.
- **Editing existing Attendance/Format A/B/C templates.** Untouched.
- **Localization / RTL.** Inherits whatever the existing templates do.

## Validation plan

- Manual: run the dev stack (`start-all.bat`), open `/report?type=absent`, pick a single date → verify Daily PDF downloads with correct structure; pick a date range → verify Monthly PDF.
- Cross-check totals against the existing DataTable for the same filter set on a known dataset.
- Verify the PDF renders correctly when there are zero absent rows (empty-state messaging).
- Verify rendering with a large dataset (e.g. 200+ rows) doesn't break pagination or layout.
