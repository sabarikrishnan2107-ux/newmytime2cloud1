# MyTime2Cloud Desktop — Packaging Plan (.exe installer)

**Status:** plan for review (not yet built). **Date:** 2026-06-10.
**Deployment model chosen:** *point at an existing PostgreSQL* via the in-app
Settings → Database screen. **No portable Postgres is bundled.** Each install
connects to a Postgres the customer provides (central server or pre-installed).

---

## 0. Goal & non-goals
- **Goal:** a Windows NSIS installer (`.exe`) produced by `electron-builder` that
  runs on a *fairly clean* PC, with everything bundled **except** the database
  (which the operator points at via Settings on first run).
- **Non-goals (this round):** bundling Postgres; auto-update; code signing
  (can add later). IP-camera face recognition is out of scope (camera-service removed).

## 1. What already bundles cleanly (no work)
Electron shell, **nginx.exe** + `conf/`, **PHP** (`backend/php` cli+cgi),
**sdk/dotnet** (self-contained .NET), **sdk/java** (bundled JRE), all **Node
services** (run via Electron-as-Node, no system Node), the static **frontend-new/out**.

## 2. Blockers to solve (in order)

### 2.1 Packaged paths — `app.isPackaged` (REQUIRED, do first)
`electron/main.js` uses `ROOT = path.resolve(__dirname, '..')`. In a packaged app
the bundled trees live under `process.resourcesPath`. Add:
```js
const ROOT = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
```
Everything (PHP_CGI, NGINX, SDKs, services, conf, frontend out) is derived from
ROOT, so this one change relocates them all. Verify each derived path resolves
under `resources/` once packaged.

### 2.2 electron-builder config
Add to `electron/package.json` (or a `electron-builder.yml`):
- `appId`, `productName: MyTime2Cloud`, `win.target: nsis`, icon.
- `nsis: { oneClick:false, perMachine:true, allowToChangeInstallationDirectory:true }`
  (perMachine + `requireAdministrator` so php-cgi/nginx/SDK ports + firewall work).
- **`extraResources`** (these need real on-disk paths, so NOT inside asar):
  `backend`, `sdk`, `services`, `conf`, `nginx.exe`, `frontend-new/out`,
  `allow-lan-access.bat`, `vs_redist.exe`. Map each to `resources/<name>`.
- The electron app itself (`electron/main.js`, `config.js`, `preload.js`,
  `settings.html`, `logs.html`) packs into `app.asar`.
- Note: `sdk/` and `services/*/node_modules` are `.gitignore`d but electron-builder
  copies by its own globs — list them explicitly in `extraResources`/`files`.

### 2.3 Python face-service → PyInstaller (the hard one)
Today it uses system Python 3.12 + mediapipe/insightface/numpy and the
`~/.insightface/buffalo_l` model. For packaging:
- **PyInstaller-freeze** `services/face/app/main.py` into `face-service.exe`
  (onedir), bundling mediapipe assets + insightface. Pin numpy<2.
- **Bundle the `buffalo_l` model** (~280MB) and set `INSIGHTFACE_HOME` (or copy to
  the expected dir on first run) so it doesn't try to download.
- Change `startFaceService()` to spawn the frozen `face-service.exe` (packaged)
  vs `resolvePython()` + uvicorn (dev). Branch on `app.isPackaged`.
- Risk: mediapipe + PyInstaller data files are fiddly; budget time. Alternative:
  bundle a portable embeddable Python + a pre-built venv (simpler to assemble,
  larger). Decide during build.

### 2.4 Puppeteer Chromium for pdf-service
Chromium currently sits in the user cache. Options (pick one):
- Set `PUPPETEER_CACHE_DIR` to a bundled `resources/chromium` and ship that folder, **or**
- `puppeteer.launch({ executablePath: <bundled chrome> })`, **or**
- run `puppeteer browsers install chrome` into a bundled dir as a postinstall.
Wire pdf-service to the bundled path; branch dev vs packaged.

### 2.5 VC++ runtime (vcruntime140 / msvcp140)
nginx, php, dotnet, java need it. Adopt desktop-branch's approach: bundle
`vs_redist.exe` + a first-run check (`runInstaller` in their `helpers.js`:
test for `vcruntime140.dll`+`msvcp140.dll` in System32, install quietly if missing,
cache a marker). Port that into the electron app.

### 2.6 Database provisioning (point-at-existing model)
The app connects to the operator's Postgres via **Settings → Database**. The
**schema + data are provisioned SEPARATELY by the operator** (pg_dump export /
restore, done out-of-band).
- ⚠️ **The app must NEVER run `php artisan migrate` / `db:seed`.** Migrations are
  OUT OF SYNC with the live-derived schema and running them would corrupt/break
  the DB. Schema delivery is the operator's export/import, not the app's job.
- On first run (no `desktop-config.json`), open the Settings window automatically;
  block service start until a DB connection **tests OK against an already-loaded DB**.
- Do NOT migrate or seed from the app — assume the target DB is pre-populated.
- Document that the target Postgres must be reachable AND pre-loaded with the dump.
- The hard live-IP block (139.59.69.241) stays.

## 3. First-run / onboarding flow (packaged)
1. App starts → VC++ redist check (install if missing).
2. If no DB config yet → open Settings, require a passing Test before proceeding.
3. On DB save → relaunch. (No migrate/seed — the DB is pre-provisioned by the operator via export/import.)
4. Normal start: php-cgi pool → nginx → SDKs → node services → window → face + queue + scheduler.

## 4. Build steps (once the above is in)
1. `cd frontend-new && npm run build` (static export with the `__M2C_HOST__` token).
2. PyInstaller build of face-service → `face-service/dist/face-service/`.
3. Ensure `sdk/dotnet`, `sdk/java`, bundled Chromium, buffalo_l model, vs_redist present.
4. `cd electron && npx electron-builder --win nsis` → produces the installer in `electron/dist/`.
5. Smoke-test the installer on a clean (or clean-ish) VM with a pre-loaded DB:
   install → first-run DB config (connect to the restored DB) → all 11 services up
   → login → photo validate → device punch → PDF.

## 5. Open decisions / risks
- **Schema delivery:** provisioned out-of-band by the operator via pg_dump export/import. The app NEVER runs migrations (they're out of sync with the live-derived schema). No app-side schema work — just connect + verify.
- **PyInstaller vs portable-Python** for face-service — decide during build by whichever assembles cleanly.
- **Installer size:** buffalo_l (~280MB) + Chromium (~150MB) + JRE + .NET + Chromium make this a large installer (likely 700MB–1GB+). Acceptable? Could make face/pdf optional components.
- **perMachine + admin:** needed for firewall + low ports; confirm acceptable for the customer's deployment.
- **Multi-instance / ports:** ports are fixed defaults (Phase-2 port config was declined); document required free ports, or revisit tokenized ports if conflicts arise in the field.

## 6. Suggested build order
1. `app.isPackaged` path fix + electron-builder config + extraResources → produce an installer that runs on a machine that *already* has Python/Chromium/DB (validates packaging mechanics).
2. VC++ redist bundling + check.
3. Chromium bundling for pdf.
4. PyInstaller face-service + buffalo_l bundling.
5. First-run DB onboarding (connect to a pre-loaded DB — NO migrate/seed).
6. Clean-VM smoke test + iterate.
