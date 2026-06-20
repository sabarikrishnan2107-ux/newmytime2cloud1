# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

MyTime2Cloud is a multi-tenant (company-scoped) attendance / access-control / payroll
system. This repo packages it as a **self-contained Windows desktop app** — an Electron
shell that bundles every runtime (PHP, PostgreSQL, nginx, .NET/Java device SDKs, and
several Node helpers) so the end user installs and imports nothing.

### Everything lives under `desktop/`

`desktop/` is the desktop product and the only thing in this repo. `desktop/backend/` is the
Laravel app that gets bundled, configured for the local Postgres and the local services.

## Running & building (from `desktop/`)

The whole app launches through Electron, which spawns every other process:

```
desktop/start-desktop.bat        # launches the packaged-style app (clears ELECTRON_RUN_AS_NODE first)
cd desktop/electron && npm install && npm start   # dev run (electron .)
cd desktop/electron && npm run dist               # build the Windows NSIS installer (electron-builder)
```

**ELECTRON_RUN_AS_NODE gotcha:** this machine has `ELECTRON_RUN_AS_NODE=1` set globally
(VSCode/Claude run on Electron). That makes `electron.exe` behave like plain `node`, so the
window never opens. `start-desktop.bat` clears the var before launching — always start the
app that way, not by calling `electron.exe` directly. (The same var is set *intentionally*
for the bundled Node helper services so they reuse the Electron binary as Node — see
`startNodeService` in `main.js`.)

Frontend (Next.js) is shipped as a **static export** (`next.config.mjs` → `output: 'export'`),
served by nginx out of `frontend/out`. To rebuild the web UI:

```
cd desktop/frontend && npm install && npm run build   # emits frontend/out
```

Backend tests (Laravel/PHPUnit, run with the bundled PHP):

```
cd desktop/backend && php artisan test                       # full suite
cd desktop/backend && php artisan test --filter SomeTest      # single test
```

## Architecture (the desktop runtime)

`electron/main.js` is the orchestrator — read it first. On boot it:

1. **Port preflight** — checks every externally-facing port is free; on a clash it names the
   port and the owning process instead of failing with a blank window.
2. **Machine fingerprint** — `config.js` derives a stable per-machine id (from the Windows
   MachineGuid) and writes `MACHINE_FP` into `backend/.env` for license binding.
3. **Bundled PostgreSQL** (`postgres.js`) — on first launch creates a private cluster on
   **port 54329**, creates DB `mytime2cloud-desktop-v2`, and restores
   `backend/database/seed/baseline.dump` (admin/admin + one empty company). Later launches
   just start the cluster and run `artisan migrate --force`. Listens on 127.0.0.1 only.
4. **php-cgi worker pool** — spawns several `php-cgi -b 127.0.0.1:<port>` FastCGI workers
   (default 9000–9003). On Windows each serves one request at a time, so the pool *is* the
   API's concurrency. `PHP_FCGI_MAX_REQUESTS=0` stops workers self-terminating mid-request;
   crashed workers auto-restart.
5. **nginx** as the single front door — serves the Laravel API on **:8000** (FastCGI to the
   php-cgi pool) and the static Next build on **:3001**.
6. Device SDKs and helper services (see below), then the window.
7. After the window loads: the **queue worker** and **scheduler** start
   (deferred so they don't starve php-cgi's cold boot and delay first paint).

The **queue worker and scheduler are required, not optional** — dispatched Jobs (e.g.
expiring a deactivated employee on the physical device via `PushEmployeeActiveStatusToDevices`)
only run through `queue:work`, and attendance regeneration / device sync / daily reports run
through `schedule:work`.

### Ports are configured in one place

`electron/config.js` `DEFAULT_PORTS` is the single source of truth for every service port.
`main.js` threads these into the services it spawns, renders `conf/nginx.conf.template` with
them, and mirrors the derived local-service URLs into `backend/.env` (`SDK_URL`,
`MQTT_GATEWAY_URL`, etc.) on every boot — the Laravel code can't read `desktop-config.json`,
so the desktop manages those `.env` keys for it. Overrides go in `desktop-config.json`
(`ports: {...}`); changing a port there is sufficient. The Postgres port (54329) is separate.

### No baked-in host — per-request token rewriting

The static frontend must work on any IP/hostname (LAN access from other PCs), so nothing is
hardcoded. nginx rewrites tokens in the served HTML/JS per request via `sub_filter`:
`__M2C_HOST__` → the client's host, and `__API_PORT__` / `__PUSH_PORT__`
/ etc. → the configured ports. So **changing a port needs no web rebuild.** The frontend's
runtime fallback for these lives in `frontend/src/lib/runtimeHost.js` (`svcUrl()`), consumed
by `frontend/src/config/index.js`.

### Helper services (`desktop/services/`)

All spawned by `main.js`; Node ones run on the bundled Electron-as-Node (no system Node).

- `log-listener/` — **two punch-ingestion paths into local `attendance_logs`:**
  `log-listener-batch.js` reads the .NET SDK WebSocket feed (FCard/TCP devices);
  `log-listener-mytime-mqtt-batch.js` ingests MQTT punches (MYTIME/face devices). Also hosts
  `mqtt-broker.js` (:1883/:8083) and `mqtt-mytime-device-sdk.js` (the MQTT device
  status/command gateway on :8001, queried by the backend's device-health check).
- `push/server.js` — local SSE relay (:8077) replacing the live `v2push` server; backend
  POSTs to `/notify`, browser subscribes via `EventSource` at `/stream`.
  (The Python face service that previously served `/validate-passport` and
  `/verify-face-fast-file` on :8500 has been removed — employee photo upload is now a plain
  client-side upload in `frontend/src/components/ImageUploader.jsx`. Visitor reception still
  does its face crop / background removal entirely in-browser via `face-api.js`.)
- `pdf/` — Puppeteer HTML→PDF (:3002). `sync-calendar/` — holidays/calendar API (:4000).
- `sdk/dotnet` (FCardProtocolAPI, REST + `/WebSocket` on :8080, bundled .NET runtime) and
  `sdk/java` (SxDeviceManager.jar for Suprema/SX, bundled JRE) are the device SDKs.

### Licensing (offline, RSA)

The desktop **verifies** signed license tokens but can never mint them. `config/license.php`
holds only the public PEM (`config/keys/license_public.pem`); the private key lives only on
the master/live backend. A token activates only on the machine whose fingerprint matches
`MACHINE_FP`. Activation/status routes (`routes/license.php`) stay outside the license gate;
the `licensed` middleware gates create-employee endpoints. The native menu's License window
proxies the public endpoints.

## Hard rules

- **Never point the DB at the live production host.** Desktop uses the local bundled
  `mytime2cloud-desktop-v2`. `config.js` hard-blocks the live host in `applyDb` (the host is
  base64-encoded there so the literal IP isn't shipped in source); don't work around it.
- **No global-PATH runtime dependencies.** Everything is bundled and referenced repo-relative
  (`ROOT = app.isPackaged ? process.resourcesPath : ..`). Don't add `env`-var config for
  values derivable in code — mirror them into `.env` the way `config.js` already does.
- Backend is **Laravel 9 / PHP 8** on **PostgreSQL** (despite `desktop/backend/.env.example`
  showing MySQL — that's the legacy example). Routes are split across many files under
  `desktop/backend/routes/`, pulled in from `api.php`.
