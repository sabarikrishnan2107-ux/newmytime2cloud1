# Unified Monthly Attendance PDF Report — Design Spec
**Date:** 2026-03-25
**Project:** MyTime2Cloud
**Status:** Approved

---

## 1. Problem Statement

The current system maintains separate Blade templates and job classes per shift type (`Template1-general-new`, `Template1-multi-in-out`, etc.). Adding or changing a shift type requires touching multiple files. The goal is a single unified pipeline that handles all 6 shift types (FILO, Multi, Auto, Night, Split, Single) with one template, one job, and one service.

---

## 2. Approved Approach: Normalize at Service Layer

Read the existing `logs` JSON column from the `attendances` table. A dedicated `AttendanceSessionNormalizer` service maps any shift type's log structure into a standard 5-slot session array. The Blade template consumes only this normalized shape — it has zero awareness of shift type.

---

## 3. Architecture

```
HTTP Request / Artisan Command
        │
        ▼
AttendanceReportController::monthlyPdf()
        │  Inputs: company_id, employee_id(s), month, year
        ▼
AttendanceReportService
        │  Queries attendances with eager-loaded relations
        │  Groups by employee → by date
        ▼
AttendanceSessionNormalizer
        │  logs[] column → standard 5-slot session array
        │  Computes duration from in/out timestamps (no stored duration trusted)
        │  Fills missing slots with null
        ▼
Normalized Day Records (array per employee)
        │
        ▼
GenerateMonthlyAttendancePDF (Queued Job)
        │  Chunk: 10 employees per job
        │  Saves PDF to storage/reports/{company_id}/{year}-{month}/
        │  Cache::increment('report_batch_{batchId}_done')
        │  On last job: dispatches ZipReportBatchJob
        ▼
unified-attendance-report.blade.php
        │  Single template — loops sessions[], renders punch cards
        ▼
DOMPDF (barryvdh/laravel-dompdf) — already installed
        │
        ▼
PDF files saved → ZipReportBatchJob creates archive → Download URL returned
```

---

## 4. New Files

```
app/Services/Attendance/
    AttendanceSessionNormalizer.php      ← core normalizer
    AttendanceReportService.php          ← orchestrator / query layer

app/Jobs/
    GenerateMonthlyAttendancePDF.php     ← unified queued job
    ZipReportBatchJob.php               ← creates ZIP when all PDFs are done

app/Http/Controllers/
    AttendanceReportController.php       ← monthlyPdf() + status() methods

resources/views/pdf/attendance_reports/
    unified-attendance-report.blade.php  ← single template for all shift types

docs/superpowers/specs/
    2026-03-25-unified-monthly-attendance-pdf-design.md  ← this file
```

**Existing files:** All existing templates and jobs remain untouched for backward compatibility.

---

## 5. Session Data Contract

Every day record passed to the Blade template has this exact shape:

```php
[
    'date'         => '01 Dec 2025',       // formatted display date (see note below)
    'day'          => 'Monday',            // full day name
    'shift_name'   => 'Morning Shift',     // shift name from shifts table
    'shift_type'   => 'Split Duty',        // human-readable shift type label
    'sessions'     => [
        [
            'in_time'    => '08:05',       // null → renders as "--:--"
            'out_time'   => '12:05',       // null → renders as "--:--"
            'device_in'  => 'Front Door',  // null → renders as "---"
            'device_out' => 'Staff Exit',  // null → renders as "---"
            'duration'   => '04:00',       // computed by normalizer; null if incomplete
        ],
        // ... up to 5 slots; unused slots are null (not rendered)
        null,
        null,
        null,
        null,
    ],
    'total_hrs'    => '08:03',
    'late_coming'  => '00:07',             // '---' if none
    'early_going'  => '---',               // '---' if none
    'ot'           => '00:00',             // '---' if none
    'status'       => 'P',                 // P | A | M | O | H | L | LC | EG
]
```

> **Note on summary fields (`total_hrs`, `late_coming`, `early_going`, `ot`, `status`):**
> These fields are read directly from the `attendances` row by `AttendanceReportService`. They are **not** computed by `AttendanceSessionNormalizer`. The normalizer's sole responsibility is building the `sessions` array and computing per-session `duration`.

### Important: Reading the `date` Field

The `Attendance` model defines a `getDateAttribute()` accessor that mutates the raw date to a 2-digit-year string (`"01 Dec 25"`). The normalizer **must** read the raw value to avoid this mutation:

```php
// WRONG — returns pre-formatted string e.g. "01 Dec 25"
$attendance->date

// CORRECT — returns raw Y-m-d string for safe reformatting
$rawDate = $attendance->getRawOriginal('date');
$formatted = date('d M Y', strtotime($rawDate));  // → "01 Dec 2025"
```

### Normalizer Mapping per Shift Type

| shift_type_id | Shift Type | Sessions | Source for in/out/device |
|---|---|---|---|
| 1 | FILO | 1 | `device_id_in` / `device_id_out` FK on `attendances` row → load via `device_in` / `device_out` relations |
| 2 | Multi In/Out | 1–5 | `logs[0..N]` array; device name embedded in `logs[n]['device_in']` / `logs[n]['device_out']` |
| 3 | Auto Shift | 1 | Same as FILO |
| 4 | Night Shift | 1 | Same as FILO (spans midnight — no special session logic needed) |
| 5 | Split / Dual Duty | 2 | `logs[0]` and `logs[1]`; device name embedded in logs |
| 6 | Single Shift | 1 | Same as FILO |
| 0 / unknown | Fallback | 1 | Same as FILO — treat as single session |

> **Note on device names for single-session shifts (IDs 1, 3, 4, 6):**
> `device_id_in` and `device_id_out` store device FKs, not names. The normalizer must resolve the name via the already eager-loaded `device_in` and `device_out` relations (`$attendance->device_in->name`). For multi/split shifts (IDs 2, 5), the device name is embedded directly in the `logs` JSON.

> **Note on `duration` field:**
> No stored `duration` field can be trusted across shift types. Existing code uses `"diff"`, `"total_minutes"`, or omits it entirely depending on the controller that wrote the log. The normalizer **must always compute `duration`** from `in_time` and `out_time`:
> ```php
> $duration = ($inTime && $outTime)
>     ? gmdate('H:i', strtotime($outTime) - strtotime($inTime))
>     : null;
> ```

> **Note on `shift_type_id` column:**
> The `attendances.shift_type_id` column is a string in the database with default value `"---"`. The model casts it to integer, causing `"---"` to cast to `0`. The normalizer must handle `0` as a fallback case (single-session from `device_id_in`/`device_id_out`).

> **Note on `employees.branch_id`:**
> The eager-load path `employee.branch` uses `employees.branch_id` as the FK to `company_branches`. Do not confuse with `attendances.branch_id`, which refers to the branch at the time of the attendance record and may differ.

### Missing Punch Rules

| Condition | Behaviour |
|---|---|
| `in_time = null` | Render "--:--", contribute to Missing status |
| `out_time = null` | Render "--:--", contribute to Missing status |
| Both null | Entire session slot is `null` — not rendered |
| `device = null` | Render "---" below time |

---

## 6. PDF Template Layout (Landscape A4)

### Header
- Left: Report title, date range, report type label
- Right: Company logo + name + branch

### Employee Summary Card
- Employee name, ID, department, shift type label
- Score %, Total worked hours, Late In total, Overtime total

### Status Summary Bar
| Present | Absent | Week Off | Leaves | Holidays | Missing | Manual |

### Daily Logs Table

| Column | Width | Content |
|---|---|---|
| DATE | 18mm | Date + day name, coloured for Holiday/Weekend |
| SHIFT DETAILS | 30mm | Time range (on_duty–off_duty) + shift type label |
| PUNCH RECORDS | 140mm | Dynamic session punch cards |
| OVERTIME | 16mm | OT hours |
| WORK HRS | 16mm | Total worked hours |
| STATUS | 20mm | Coloured badge |

### Punch Card (per session)
```
┌──────────────────┐
│  08:34  →  13:00 │  ← in_time  out_time
│ Front Door Staff │  ← device_in  device_out (max 10 chars each)
│     4h 26m       │  ← duration (computed by normalizer)
└──────────────────┘
```
- Cards are rendered inline (side-by-side) within the PUNCH RECORDS cell
- `null` session → no card rendered
- Missing time → "--:--"
- Missing device → "---"

### Status Badge Colours

| Status | Display | Colour |
|---|---|---|
| P | PRESENT | Green |
| A | ABSENT | Red |
| O | WEEK OFF | Grey |
| L | LEAVE | Orange |
| H | HOLIDAY | Yellow/Gold |
| M | MISSING | Orange |
| LC | LATE IN | Red text |
| EG | EARLY GO | Orange text |

---

## 7. Performance Strategy

### Chunked Queue (for batch / 100+ employees)
- Employees split into chunks of 10
- One `GenerateMonthlyAttendancePDF` job dispatched per chunk
- At dispatch time, store total job count in cache:
  ```php
  Cache::put("report_batch_{$batchId}_total", $totalJobs, now()->addHours(2));
  Cache::put("report_batch_{$batchId}_done", 0, now()->addHours(2));
  Cache::put("report_batch_{$batchId}_failed", 0, now()->addHours(2));
  ```
- Each job: queries → normalizes → generates PDF per employee → saves to disk
- After each job completes, increment done count:
  ```php
  $done = Cache::increment("report_batch_{$batchId}_done");
  $total = Cache::get("report_batch_{$batchId}_total");
  if ($done === $total) {
      ZipReportBatchJob::dispatch($batchId, $company_id, $year, $month);
  }
  ```
- `failed()` hook increments `report_batch_{batchId}_failed` so the status endpoint can expose failure state
- Status endpoint: `GET /reports/monthly-pdf/status/{batchId}`
  Returns: `{ done, total, failed, ready, download_url }`

### Single Employee (on-demand)
- `GET /reports/monthly-pdf/{employeeId}/{year}/{month}`
- Synchronous: generate inline → stream as PDF download

### Eager Loading (prevents N+1)
```php
Attendance::select([
    'id',
    'employee_id',
    'company_id',
    'date',             // read via getRawOriginal('date') in normalizer
    'shift_id',
    'shift_type_id',    // may be "---" in DB; casts to 0
    'in_time',          // for single-session shifts
    'out_time',
    'device_id_in',     // FK for device_in relation
    'device_id_out',    // FK for device_out relation
    'logs',             // JSON array for multi/split sessions
    'total_hrs',
    'late_coming',
    'early_going',
    'ot',
    'status',
    'is_manual_entry',
    'branch_id',
])
->with([
    'employee:system_user_id,first_name,last_name,employee_id,department_id,branch_id',
    'employee.department:id,name',
    'employee.branch:id,name',       // uses employees.branch_id FK → company_branches
    'shift:id,name,shift_type_id,on_duty_time,off_duty_time',
    'device_in:device_id,name',      // for single-session shift types (IDs 1,3,4,6)
    'device_out:device_id,name',
])
->whereIn('employee_id', $employeeIds)
->whereBetween('date', [$from, $to])
->orderBy('date')
->get();
```

### Additional Techniques
- `select()` only required columns — reduces payload ~60%
- `ini_set('memory_limit', '512M')` inside job
- PDF written to file (not held in memory)
- Use `$attendance->getRawOriginal('date')` to bypass the date accessor mutation

---

## 8. API Endpoints

| Method | URI | Description |
|---|---|---|
| POST | `/reports/monthly-pdf` | Dispatch batch jobs; returns `batchId` |
| GET | `/reports/monthly-pdf/status/{batchId}` | Poll progress: `{ done, total, failed, ready, download_url }` |
| GET | `/reports/monthly-pdf/{employeeId}/{year}/{month}` | Single employee on-demand PDF stream |

---

## 9. Out of Scope
- Modifying existing templates (`Template1-general-new`, `Template1-multi-in-out`, etc.)
- Changing the `attendances` database schema
- Frontend UI changes
- Access control / permissions (handled by existing middleware)
