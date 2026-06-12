# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**MyTime2Cloud** — a multi-tenant HRMS / workforce-management SaaS (attendance, access control, payroll, visitor management, live camera/face recognition, geo-tracking). It is a polyglot monorepo of cooperating services, not a single app. The Laravel backend is the system of record; everything else feeds logs into it or renders views of its data.

## Services & ports

**Folder reorg (2026-06-10):** device SDKs now live under `sdk/`, all child services under `services/`. (nginx left at repo root for now — to be organized later when asked.)

| Dir | Stack | Port | Role |
|-----|-------|------|------|
| `backend/` | Laravel 9 / PHP 8 | 8000 | Core REST API, system of record, queue worker, scheduler |
| `frontend-new/` | Next.js 15 / React 19 (static export) | 3001 | Current web UI (the app users see) |
| `sdk/dotnet/` | .NET (FCardProtocolAPI) | 8080 | Card/fingerprint/door device SDK — REST + `/WebSocket` live feed (device comms 7001/7002/8101) |
| `sdk/java/` | Java (SxDeviceManager) | 8888 | Megvii SX face-device SDK |
| `services/face/` | Python FastAPI (MediaPipe + InsightFace) | 8500 | Face validator — `/validate-passport` (photo crop/enhance) + `/verify-face-fast-file` |
| `services/push/` | Node (pure http, zero-dep) | 8077 | Local SSE push relay (replaces live v2push); backend POSTs `/notify`, browser subscribes `/stream` |
| `services/log-listener/` | Node (ws/aedes MQTT, pg) | (1883/8083 broker) | `log-listener-batch.js` = SDK WebSocket → Postgres `attendance_logs`; also has the MQTT broker + mqtt listeners |
| `services/pdf/` | Node Express + Puppeteer | 3002 | HTML→PDF rendering (serves templates from `../../summary-report`) |
| `services/sync-calendar/` | Node Express | — | Calendar (iCal) sync |
| `employee/` | Nuxt 2 (legacy) | — | Older employee portal; `frontend-new` is the active UI |
| `summary-report/` | static HTML | — | Standalone report templates |

> **Removed (2026-06-10):** `camera-service/` (Python face recognition, :8500) and `camera-proxy/` (RTSP→WS, :8501) folders were deleted — out of scope for the desktop build. Ignore them; don't try to run them. Camera-related *source code* in the backend/frontend remains untouched.
>
> **Desktop build:** the app is launched as an Electron desktop shell (`electron/main.js`) where **nginx** is the front door — it serves the Laravel API on :8000 (via a bundled **php-cgi** worker pool on 9000-9003) and the static Next build on :3001 (rewriting the `__M2C_HOST__` host token per-request). This replaces `artisan serve` + the old Node static server in desktop mode. See [[electron-desktop-direction]] in memory.

The `.bat` files hardcode `D:\newmytime2cloud\...`, but the repo actually lives at `d:\projects\newmytime2cloud` and `D:\newmytime2cloud` does **not** exist — so the scripts won't run as-is; fix the `cd` targets first. **PHP version matters — do not use bare `php`.** This is Laravel 9 (supports PHP 8.0–8.2). Three PHPs exist on this machine:
- `backend/php/php.exe` — **PHP 8.1.10**, a full runtime bundled in the repo with its own `php.ini` (and `libpq.dll` for Postgres). **Prefer this** — it travels with the code and doesn't depend on machine paths.
- `D:\php\php.exe` — **PHP 8.1.10**, what the `.bat` scripts call (but `D:\newmytime2cloud` in those scripts is stale).
- bare `php` on PATH → `C:\Users\SERVER\.config\herd-lite\bin\php.exe` — **PHP 8.4.21** (Laravel Herd). Too new for Laravel 9; emits deprecations and can break. Avoid for artisan/composer.

Run artisan from the backend dir as `.\php\php.exe artisan ...`.

## Running

Start everything (Windows): `start-all.bat` (9 services). `start.bat` is a lighter subset. Individually:

```
# Backend API   (.\php\php.exe = bundled PHP 8.1.10; see "PHP version matters" below)
cd backend && .\php\php.exe artisan serve --host=0.0.0.0 --port=8000
# Queue worker — REQUIRED for emails, notifications, device pushes, report generation
cd backend && .\php\php.exe artisan queue:work --tries=3 --timeout=60     # or queue-supervisor.bat (auto-restart loop)
# Scheduler — REQUIRED for attendance regen, device sync, daily reports, alerts
cd backend && .\php\php.exe artisan schedule:work
# Frontend
cd frontend-new && npm run dev          # next dev --turbopack -p 3001 -H 0.0.0.0
cd frontend-new && npm run build         # static export to out/ (next.config: output:'export')
# Other services
cd camera-service && python main.py
cd camera-proxy && node server.js
cd pdf-service && node index.js
cd loglistner_mqtt && node mqtt-broker.js   # broker; log-listener-batch.js is the device listener
```

The **queue worker and scheduler are not optional** for realistic behavior — most report generation, device synchronization, and notifications happen via dispatched Jobs (`app/Jobs/`) and scheduled commands (`app/Console/Kernel.php`), never inline in the HTTP request.

## Tests

- Backend: `cd backend && .\php\php.exe artisan test` (PHPUnit; suites in `tests/Unit` and `tests/Feature`). Single test: `... artisan test --filter=SomeTest`.
- Frontend: no test runner configured.

## Database

**The backend uses a LOCAL database (desktop build).** `backend/.env` points at `pgsql` on `127.0.0.1:5432`, database `mytime2cloud-desktop-v2` (a local PostgreSQL). This is the desktop direction — everything runs on-machine. `QUEUE_CONNECTION=database`, cache/session = `file`. Migrations/seeders in `backend/database/`.

**🚫 NEVER point this at the live production DB `139.59.69.241` (database `mytime2cloud-v2`).** That DigitalOcean host holds real customer data; the desktop build must stay fully local. Do not set `DB_HOST`/`DATABASE_URL` to that IP, do not restore from it, and do not "temporarily" switch to it for testing — `artisan tinker`, `migrate`, `db:seed`, `delete_old_records`, the queue worker, and attendance-recompute commands would all hit production. If you ever see `139.59.69.241` reappear in any config, treat it as a mistake to remove.

There is also a legacy `mytime2cloud` Postgres DB; per-tenant migration between it and `mytime2cloud-v2` is handled by separate tooling (the `migrate-tenant` / `tenant-drift-catchup` skills), not by this codebase.

## Architecture notes that span files

**Multi-tenancy is a `company_id` column, not separate databases.** Every tenant-scoped table carries `company_id`; rows with `company_id = 0` are global/system rows. There is no automatic global query scope — scoping is applied **explicitly per query**. The base `App\Http\Controllers\Controller` provides helpers like `FilterCompanyList($model, $request)` and `filterByCompanyId(...)` that controllers must call; forgetting them leaks cross-tenant data. When writing a new controller/query, always scope by `company_id` the same way neighboring controllers do.

**Sub-tenant scoping (branch & department) lives in the frontend.** `frontend-new/src/lib/api-client.js` and `api.js` export `buildQueryParams()`, which injects `company_id`, `branch_ids`, and `department_ids` into every request based on the logged-in user. Branch scope priority is: explicit caller selection → user's assigned branches (`user_branches` pivot) → legacy scalar `users.branch_id`. **Do not trust the scalar `branch_id`** for managers — it holds their personal employee branch, which often differs from the branch(es) they manage (this caused managers to see zero data; see the comments in those files). Use the assignment pivot.

**Auth:** Laravel Sanctum bearer tokens + `spatie/laravel-permission` for roles/permissions. The frontend stores the token + user object in `localStorage`; the axios instance auto-attaches `Authorization: Bearer`. Frontend permission gating uses `<Can>` / `AccessGuard` components and `lib/permissions*.js` / `moduleAccess.js`.

**Routes** are split across ~60 files in `backend/routes/`, all stitched together by `routes/api.php` via `include()`. **Order matters** — `api.php` documents that mobile/specific routes must be included *before* `company.php`, because `apiResource('employee', ...)` greedily matches `/employee/{id}` and would swallow more specific paths. Add new route files to the `include()` list and mind ordering near resource routes.

**Attendance data flow (the core loop):** physical devices push punch events → ingested via MQTT (`loglistner_mqtt/`), the SDK listener, or the camera-service (face match) → stored in `attendance_logs` → scheduled commands recompute derived attendance (`attendance:auto-regenerate` runs every minute, `task:sync_attendance_logs` every 15 min, `render:weekoff-all`, night-shift rendering, etc.) → reports are generated as async Jobs and rendered to PDF either via `barryvdh/laravel-dompdf` or the external `pdf-service`. The `RecalculateEmployeeAttendance` job / `attendance:auto-regenerate` command are the recompute entry points after data changes.

**Reports** follow a consistent pattern: a `Service` class (`app/Services/*ReportService.php`) builds the dataset, a `Job` (`app/Jobs/Generate*Report{PDF,Excel}.php`) runs it in the background, and delivery jobs (`DeliverReportViaApiJob`, `DeliverReportViaFtpJob`) ship the result. Excel via `maatwebsite/excel` (`app/Exports/`), PDF via dompdf or Puppeteer.

**Frontend structure:** App Router under `src/app/` (one folder per feature: `attendance`, `payroll-tabs`, `visitor`, `live-camera`, `access_control`, etc.), feature components under `src/components/`, API service wrappers under `src/lib/`. Path alias `@/*` → `src/*`. UI is shadcn/Radix + Tailwind v4; i18n via `react-i18next` (`src/locales/`). Because it's a **static export**, there is no Next.js server/API-route runtime — all dynamic data comes from the Laravel API at `NEXT_PUBLIC_API_URL`.
