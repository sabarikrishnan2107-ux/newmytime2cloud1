// MyTime2Cloud - Electron desktop shell.
// Spawns nginx as the front door: it serves the Laravel API on :8000 (via a
// bundled php-cgi FastCGI worker pool) and the static Next build on :3001,
// rewriting the __M2C_HOST__ token to the client's host so no static IP is
// needed. Also spawns the SSE push relay and the .NET/Java device SDKs.
// All paths are repo-relative; all runtimes are bundled. No global drive paths.

const { app, BrowserWindow, Menu, ipcMain, clipboard } = require('electron');
const { spawn, exec } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cfg = require('./config');
const pg = require('./postgres');   // bundled PostgreSQL (auto init + start, no install/import)
const { spawnSync } = require('child_process');

// Dev: repo root is electron/..  Packaged: the bundled trees (backend, sdk,
// services, conf, nginx.exe, frontend/out) are copied to resources/ via
// electron-builder extraResources, so ROOT = process.resourcesPath.
const ROOT = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
const NGINX = path.join(ROOT, 'nginx.exe');                       // front door :8000 + :3001
const PHP_CGI = path.join(ROOT, 'backend', 'php', 'php-cgi.exe');  // FastCGI workers behind nginx
const PHP_CLI = path.join(ROOT, 'backend', 'php', 'php.exe');     // artisan CLI (queue worker, scheduler)
const BACKEND = path.join(ROOT, 'backend');
// Device SDKs live under sdk/ ; all child services under services/.
const DOTNET_SDK = path.join(ROOT, 'sdk', 'dotnet');     // FCardProtocolAPI — REST + /WebSocket on :8080
const JAVA_SDK = path.join(ROOT, 'sdk', 'java');         // SxDeviceManager.jar
const FACE_SERVICE = path.join(ROOT, 'services', 'face'); // FastAPI face validator (/validate-passport) on :8500
const PUSH_SERVICE = path.join(ROOT, 'services', 'push'); // SSE push relay on :8077
const LOG_LISTENER = path.join(ROOT, 'services', 'log-listener'); // SDK WebSocket -> Postgres attendance_logs
const PDF_SERVICE = path.join(ROOT, 'services', 'pdf');           // HTML -> PDF rendering on :3002
const SYNC_CALENDAR = path.join(ROOT, 'services', 'sync-calendar'); // holidays/calendar API on :4000

// Python for the face service. Prefer the per-user 3.12 install (where mediapipe
// + insightface are installed) via LOCALAPPDATA so it's not hardcoded to a user;
// fall back to whatever `python` is on PATH. NOTE: this is a SYSTEM Python, not a
// bundled runtime — for a packaged installer, freeze services/face with PyInstaller.
function resolvePython() {
  const local = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python312', 'python.exe')
    : null;
  if (local && fs.existsSync(local)) return local;
  return 'python';
}

// Detect this machine's LAN IPv4 so the app is reachable from other PCs.
function lanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const HOST = lanIp();
// All service ports come from desktop-config.json (DEFAULT_PORTS + any overrides).
// Changing a port there is enough — nginx is rendered from a template with these
// values and rewrites the matching tokens into the static frontend per-request.
const PORTS = cfg.load().ports;
const API_PORT = PORTS.api;
const WEB_PORT = PORTS.web;
const PUSH_PORT = PORTS.push;
const FACE_PORT = PORTS.face;   // face validator — frontend FACE_VALIDATOR_URL points here
const GATEWAY_PORT = PORTS.gateway;  // MQTT device gateway HTTP API
const PDF_PORT = PORTS.pdf;
const SYNC_PORT = PORTS.sync;
const DOTNET_PORT = PORTS.dotnet;
const JAVA_PORT = PORTS.java;
const MQTT_TCP_PORT = PORTS.mqttTcp;
const MQTT_WS_PORT = PORTS.mqttWs;
const DEVICE_UDP = PORTS.deviceUdp;
const DEVICE_TCP = PORTS.deviceTcp;
const DEVICE_UDP2 = PORTS.deviceUdp2;
// php-cgi FastCGI worker pool — must match the `php_workers` upstream rendered
// into nginx.conf. Each php-cgi -b instance serves one request at a time on
// Windows, so the pool is what gives the API concurrency.
const PHP_PORTS = PORTS.php;
const LOGIN_URL = `http://${HOST}:${WEB_PORT}/login/`;
const API_PROBE = `http://${HOST}:${API_PORT}/`;   // Laravel redirects / -> api/test (cheap, no DB)

const children = [];
let shuttingDown = false;
const phpRestartTimers = new Set();
let mainWindow = null;
let settingsWindow = null;
let logsWindow = null;
let licenseWindow = null;

// ── In-memory log feed for the in-app Logs window ───────────────────────────
// Every service's stdout/stderr is already written as "[label] text"; we tee
// those writes into a ring buffer and live-stream them to the Logs window.
const LOG_BUFFER = [];
const LOG_MAX = 3000;
function recordFromStream(text) {
  for (let line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    let label = 'app';
    const m = line.match(/^\[([^\]]+)\]\s?(.*)$/);
    if (m) { label = m[1]; line = m[2]; }
    const entry = { label, line, t: Date.now() };
    LOG_BUFFER.push(entry);
    if (LOG_BUFFER.length > LOG_MAX) LOG_BUFFER.shift();
    if (logsWindow && !logsWindow.isDestroyed()) {
      try { logsWindow.webContents.send('logs:line', entry); } catch (_) {}
    }
  }
}
for (const stream of [process.stdout, process.stderr]) {
  const orig = stream.write.bind(stream);
  stream.write = (chunk, enc, cb) => { try { recordFromStream(chunk); } catch (_) {} return orig(chunk, enc, cb); };
}

function log(...a) { console.log('[mytime2cloud]', ...a); }

// ── Port preflight ───────────────────────────────────────────────────────────
// On another PC some of the fixed ports the app binds may already be taken by
// other software. Binding then silently fails and the app breaks with no obvious
// cause. We check the externally-facing ports up front and, on a clash, tell the
// user exactly which port and which process — instead of a white screen. Port
// numbers honor any overrides in desktop-config.json (ports: {...}). Postgres
// (54329) and the php-cgi pool (9000-9003) are excluded: they self-manage / are
// uncommon, and a lingering instance of our own would be a false positive.
function requiredPorts() {
  return [
    { label: 'API (nginx)',         port: API_PORT },
    { label: 'Web UI (nginx)',      port: WEB_PORT },
    { label: 'MQTT device gateway', port: GATEWAY_PORT },
    { label: 'SSE push relay',      port: PUSH_PORT },
    { label: '.NET device SDK',     port: DOTNET_PORT },
    { label: 'device inbound TCP',  port: DEVICE_TCP },
    { label: 'Java device SDK',     port: JAVA_PORT },
    { label: 'face validator',      port: FACE_PORT },
    { label: 'PDF service',         port: PDF_PORT },
    { label: 'sync-calendar',       port: SYNC_PORT },
    { label: 'MQTT broker',         port: MQTT_TCP_PORT },
    { label: 'MQTT WebSocket',      port: MQTT_WS_PORT },
  ];
}

// True if we can bind the TCP port (i.e. it is free). Tests 0.0.0.0 since the
// services bind all interfaces.
function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '0.0.0.0');
  });
}

// Best-effort: which process holds a listening port (Windows netstat + tasklist).
function processOnPort(port) {
  try {
    const ns = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8', windowsHide: true });
    const line = (ns.stdout || '').split(/\r?\n/).find(
      (l) => /LISTENING/i.test(l) && new RegExp(`[:.]${port}\\b`).test(l.split(/\s+/)[2] || ''));
    if (!line) return null;
    const pid = line.trim().split(/\s+/).pop();
    const tl = spawnSync('tasklist', ['/fi', `PID eq ${pid}`, '/fo', 'csv', '/nh'],
      { encoding: 'utf8', windowsHide: true });
    const name = ((tl.stdout || '').split(',')[0] || '').replace(/"/g, '').trim();
    return { pid, name: name || 'unknown' };
  } catch (_) { return null; }
}

// Returns the list of conflicting ports (empty = all clear).
async function preflightPorts() {
  const conflicts = [];
  for (const { label, port } of requiredPorts()) {
    if (!(await isPortFree(port))) {
      conflicts.push({ label, port, owner: processOnPort(port) });
    }
  }
  return conflicts;
}

// ── PHP-CGI worker pool (the API, behind nginx) ──────────────────────────────
// Each worker is a FastCGI listener on 127.0.0.1:<port>; nginx load-balances
// across them (conf/nginx.conf `php_workers`). PHP_FCGI_MAX_REQUESTS=0 stops a
// worker from self-terminating after N requests (default 500), which would
// drop in-flight requests; we still auto-restart on a real crash.
function startPhpCgiWorker(port) {
  if (shuttingDown) return;
  const p = spawn(PHP_CGI, ['-b', `127.0.0.1:${port}`], {
    cwd: ROOT,
    env: { ...process.env, PHP_FCGI_MAX_REQUESTS: '0' },
    windowsHide: true,
  });
  p.stdout.on('data', d => process.stdout.write(`[php-cgi:${port}] ` + d));
  p.stderr.on('data', d => process.stderr.write(`[php-cgi:${port}] ` + d));
  p.on('close', code => {
    if (shuttingDown) return;
    log(`php-cgi:${port} exited (${code}) — restarting in 2s`);
    const t = setTimeout(() => { phpRestartTimers.delete(t); startPhpCgiWorker(port); }, 2000);
    phpRestartTimers.add(t);
  });
  children.push(p);
}

function startPhpCgiWorkers() {
  log('Starting PHP-CGI worker pool on', PHP_PORTS.join(', '));
  PHP_PORTS.forEach(startPhpCgiWorker);
}

// ── nginx front door ─────────────────────────────────────────────────────────
// Serves the Laravel API + the static Next build. `-p ROOT` makes every relative
// path in the conf resolve under the repo root. The conf is RENDERED from
// conf/nginx.conf.template with the configured ports (so api/web/php ports and the
// frontend __*_PORT__ token rewrites all track desktop-config.json). Falls back to
// the static conf/nginx.conf if the template is missing.
// Where nginx writes (generated conf + logs + temp). A packaged install dir can be
// read-only (e.g. Program Files), so when packaged these live under userData; in dev
// they stay under the repo root. Static roots (backend/public, frontend/out) are
// read-only and stay relative to the -p prefix (ROOT).
const NGINX_RUNTIME = (app && app.isPackaged) ? path.join(app.getPath('userData'), 'nginx') : ROOT;
const fwdslash = p => p.replace(/\\/g, '/');

function renderNginxConf() {
  const confDir = path.join(ROOT, 'conf');
  const tplPath = path.join(confDir, 'nginx.conf.template');
  for (const d of ['logs', 'temp']) {
    try { fs.mkdirSync(path.join(NGINX_RUNTIME, d), { recursive: true }); } catch (_) {}
  }
  if (!fs.existsSync(tplPath)) return path.join('conf', 'nginx.conf');
  const phpUpstream = PHP_PORTS.map(p => `        server 127.0.0.1:${p};`).join('\n');
  const repl = {
    API_PORT, WEB_PORT, PUSH_PORT, FACE_PORT,
    DOTNET_PORT, PDF_PORT, SYNC_PORT, MQTT_WS_PORT,
  };
  let tpl = fs.readFileSync(tplPath, 'utf8');
  for (const [k, v] of Object.entries(repl)) tpl = tpl.split(`{{${k}}}`).join(String(v));
  tpl = tpl.split('{{PHP_UPSTREAM}}').join(phpUpstream);
  // Make includes (read from the install dir) and all WRITABLE paths (logs, temp)
  // absolute, so the rendered conf can live in a writable dir outside the install.
  const inc = f => `"${fwdslash(path.join(confDir, f))}"`;
  const rt  = (...p) => `"${fwdslash(path.join(NGINX_RUNTIME, ...p))}"`;
  tpl = tpl
    .replace(/include\s+mime\.types;/, `include       ${inc('mime.types')};`)
    .replace(/include\s+fastcgi_params;/, `include      ${inc('fastcgi_params')};`)
    .replace(/access_log\s+logs\/access\.log;/, `access_log  ${rt('logs', 'access.log')};`)
    .replace(/error_log\s+logs\/error\.log;/, `error_log   ${rt('logs', 'error.log')};`)
    .replace(/client_body_temp_path\s+temp\/client_body;/, `client_body_temp_path ${rt('temp', 'client_body')};`)
    .replace(/fastcgi_temp_path\s+temp\/fastcgi;/, `fastcgi_temp_path     ${rt('temp', 'fastcgi')};`)
    .replace(/proxy_temp_path\s+temp\/proxy;/, `proxy_temp_path       ${rt('temp', 'proxy')};`)
    .replace(/uwsgi_temp_path\s+temp\/uwsgi;/, `uwsgi_temp_path       ${rt('temp', 'uwsgi')};`)
    .replace(/scgi_temp_path\s+temp\/scgi;/, `scgi_temp_path        ${rt('temp', 'scgi')};`);
  const outPath = path.join(NGINX_RUNTIME, 'nginx.runtime.conf');
  fs.writeFileSync(outPath, tpl);
  return outPath;   // absolute; nginx -c accepts it, -p ROOT still resolves static roots
}

function startNginx() {
  let confPath;
  try { confPath = renderNginxConf(); }
  catch (e) { log('nginx render error, using static conf:', e.message); confPath = path.join('conf', 'nginx.conf'); }
  log(`Starting nginx (:${API_PORT} API, :${WEB_PORT} web)`);
  const p = spawn(NGINX, ['-p', ROOT, '-c', confPath], {
    cwd: ROOT,
    windowsHide: true,
  });
  p.stdout.on('data', d => process.stdout.write('[nginx] ' + d));
  p.stderr.on('data', d => process.stderr.write('[nginx] ' + d));
  children.push(p);
}

// ── Local device SDKs (bundled, self-contained) ─────────────────────────────
// .NET FCardProtocolAPI: REST device commands + the /WebSocket live feed on :8080
// (configured in sdk/dotnet/appsettings.json). Uses the bundled .NET runtime so
// it does not depend on a system .NET install.
function startDotnetSdk() {
  const dotnetExe = path.join(DOTNET_SDK, 'dotnet', 'dotnet.exe');
  log('Starting .NET device SDK (FCardProtocolAPI) on :' + DOTNET_PORT);
  // Kestrel honors ASPNETCORE_URLS; the device ports live in appsettings "Options"
  // and .NET binds them from Options__<key> env vars (double-underscore = section).
  const p = spawn(dotnetExe, ['FCardProtocolAPI.dll'], {
    cwd: DOTNET_SDK,
    env: { ...process.env,
      ASPNETCORE_URLS: `http://0.0.0.0:${DOTNET_PORT}`,
      Options__UDPServerPort: String(DEVICE_UDP),
      Options__TCPServerPort: String(DEVICE_TCP),
      Options__UDPPort: String(DEVICE_UDP2),
    },
    windowsHide: true });
  p.stdout.on('data', d => process.stdout.write('[sdk-dotnet] ' + d));
  p.stderr.on('data', d => process.stderr.write('[sdk-dotnet] ' + d));
  children.push(p);
}

// Java SxDeviceManager (Suprema/SX devices), bundled JRE.
function startJavaSdk() {
  const javaExe = path.join(JAVA_SDK, 'bin', 'java.exe');
  log('Starting Java device SDK (SxDeviceManager) on :' + JAVA_PORT);
  // Spring Boot maps --server.port to the embedded Tomcat port.
  const p = spawn(javaExe, ['-jar', 'SxDeviceManager.jar', `--server.port=${JAVA_PORT}`], { cwd: JAVA_SDK, env: process.env, windowsHide: true });
  p.stdout.on('data', d => process.stdout.write('[sdk-java] ' + d));
  p.stderr.on('data', d => process.stderr.write('[sdk-java] ' + d));
  children.push(p);
}

// ── Face validator (FastAPI) ─────────────────────────────────────────────────
// Serves /validate-passport (employee photo crop/enhance via MediaPipe) and
// /verify-face-fast-file (InsightFace 1:1 match) on :8500 — where the frontend's
// FACE_VALIDATOR_URL points. Source pulled from the live `face-apis` service.
function startFaceService() {
  const py = resolvePython();
  log('Starting face validator (FastAPI) on', FACE_PORT, 'via', py);
  const p = spawn(py, ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', String(FACE_PORT)], {
    cwd: FACE_SERVICE,
    env: process.env,
    windowsHide: true,
  });
  p.stdout.on('data', d => process.stdout.write('[face] ' + d));
  p.stderr.on('data', d => process.stderr.write('[face] ' + d));
  p.on('error', err => log('face service spawn error:', err.message));
  children.push(p);
}

// ── Laravel background workers (queue + scheduler) ───────────────────────────
// REQUIRED, not optional. Dispatched Jobs run ONLY via the queue worker — e.g.
// setting an employee inactive dispatches PushEmployeeActiveStatusToDevices,
// which expires the user on the physical device; without the worker the device
// keeps accepting them. The scheduler runs attendance regen, device sync, daily
// reports, alerts. Bundled CLI PHP; auto-restart on exit (queue:work recycles
// hourly via --max-time to bound memory).
function startArtisan(label, args) {
  if (shuttingDown) return;
  const p = spawn(PHP_CLI, ['artisan', ...args], { cwd: BACKEND, env: process.env, windowsHide: true });
  p.stdout.on('data', d => process.stdout.write(`[${label}] ` + d));
  p.stderr.on('data', d => process.stderr.write(`[${label}] ` + d));
  p.on('close', code => {
    if (shuttingDown) return;
    log(`${label} exited (${code}) — restarting in 3s`);
    const t = setTimeout(() => { phpRestartTimers.delete(t); startArtisan(label, args); }, 3000);
    phpRestartTimers.add(t);
  });
  children.push(p);
}

function startQueueWorker() {
  log('Starting queue worker (artisan queue:work)');
  startArtisan('queue', ['queue:work', '--tries=3', '--timeout=120', '--sleep=2', '--max-time=3600']);
}

function startScheduler() {
  log('Starting scheduler (artisan schedule:work)');
  startArtisan('scheduler', ['schedule:work']);
}

// ── Log listener (device punches → attendance_logs) ──────────────────────────
// Connects to the .NET SDK's WebSocket feed (ws://127.0.0.1:8080/WebSocket, set
// in services/.env), parses each punch, and batch-inserts into the LOCAL Postgres
// attendance_logs. Runs as plain Node via the bundled Electron (no system Node).
// It self-reconnects every 5s, so it tolerates the SDK still coming up.
function startLogListener() {
  log('Starting log listener (SDK WebSocket -> Postgres)');
  const p = spawn(process.execPath, [path.join(LOG_LISTENER, 'log-listener-batch.js')], {
    cwd: LOG_LISTENER,
    // SOCKET_ENDPOINT follows the configured .NET SDK port so it survives a port change.
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', SOCKET_ENDPOINT: `ws://127.0.0.1:${DOTNET_PORT}/WebSocket` },
    windowsHide: true,
  });
  p.stdout.on('data', d => process.stdout.write('[listener] ' + d));
  p.stderr.on('data', d => process.stderr.write('[listener] ' + d));
  children.push(p);
}

// ── Node helper services (plain Node via bundled Electron) ───────────────────
// Generic spawner for the small Node services so we don't repeat boilerplate.
function startNodeService(label, dir, script, extraEnv) {
  log(`Starting ${label}`);
  const p = spawn(process.execPath, [path.join(dir, script)], {
    cwd: dir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ...(extraEnv || {}) },
    windowsHide: true,
  });
  p.stdout.on('data', d => process.stdout.write(`[${label}] ` + d));
  p.stderr.on('data', d => process.stderr.write(`[${label}] ` + d));
  p.on('error', err => log(`${label} spawn error:`, err.message));
  children.push(p);
}

// PDF rendering (:3002, Puppeteer), holidays/calendar API (:4000), and the MQTT
// broker (:1883 + :8083 — accepts MQTT-device publishes and forwards punch
// events to the local API). The WebSocket log listener stays the primary punch
// path; the broker only matters if MQTT-based devices are in use.
function startPdfService()  { startNodeService('pdf', PDF_SERVICE, 'index.js', { PDF_PORT: String(PDF_PORT) }); }
function startSyncCalendar(){ startNodeService('sync-calendar', SYNC_CALENDAR, 'server.js', { SYNC_PORT: String(SYNC_PORT) }); }
function startMqttBroker()  { startNodeService('mqtt-broker', LOG_LISTENER, 'mqtt-broker.js', { MQTT_TCP_PORT: String(MQTT_TCP_PORT), MQTT_WS_PORT: String(MQTT_WS_PORT) }); }
// MQTT device gateway (MYTIME/FRT MQTT devices): subscribes to the broker, tracks
// per-device Online/Offline + heartbeats, and serves the device status/command
// HTTP API on :8001 — which the backend device-health check queries for MQTT
// (model_number=MYTIME1) devices. Without it, MQTT devices never report online.
function startMqttDeviceGateway(){ startNodeService('mqtt-device-sdk', LOG_LISTENER, 'mqtt-mytime-device-sdk.js', { HTTP_PORT: String(GATEWAY_PORT), MQTT_PORT: String(MQTT_TCP_PORT) }); }
// MQTT punch ingestion for MYTIME devices: subscribes to mqtt/face/+/Rec (RecPush
// records) + mqtt/face/heartbeat, and batch-inserts punches into the local
// attendance_logs. This is the MQTT-device counterpart of startLogListener()
// (which handles the .NET SDK WebSocket feed for FCard/TCP devices).
function startMytimeMqttListener(){ startNodeService('mqtt-listener', LOG_LISTENER, 'log-listener-mytime-mqtt-batch.js', { MQTT_PORT: String(MQTT_TCP_PORT) }); }

// ── Local SSE push relay ─────────────────────────────────────────────────────
// Replaces the live external push server (v2push.mytime2cloud.com) for the
// local build: backend POSTs events to :8077/notify, the browser subscribes via
// EventSource at :8077/stream. Pure Node, no deps; binds 0.0.0.0, CORS-open.
function startPushService() {
  log('Starting push relay (SSE) on :8077');
  const p = spawn(process.execPath, [path.join(PUSH_SERVICE, 'server.js')], {
    cwd: PUSH_SERVICE,
    // ELECTRON_RUN_AS_NODE makes the bundled Electron binary behave as plain
    // Node, so we don't depend on a system Node install for this helper.
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PUSH_PORT: String(PUSH_PORT) },
    windowsHide: true,
  });
  p.stdout.on('data', d => process.stdout.write('[push] ' + d));
  p.stderr.on('data', d => process.stderr.write('[push] ' + d));
  children.push(p);
}

// Poll until nginx serves the web app (any HTTP response). Near-instant once up.
function waitForUrl(target, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(target, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for ' + target));
        setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

// Poll until the API is genuinely ready to serve PHP — i.e. nginx AND a php-cgi
// worker are both up. While nginx is up but no worker has answered yet, the
// upstream returns 502/503/504; we only resolve on a real Laravel response
// (the `/` route redirects to api/test, so 3xx/2xx = ready). This is what
// removes the first-paint "Network Error": the window doesn't load until the
// API behind it can actually respond.
function waitForApi(target, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const retry = () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for API ' + target));
        setTimeout(tryOnce, 400);
      };
      const req = http.get(target, res => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else retry();   // 502/503/504 = php-cgi not ready yet
      });
      req.on('error', retry);
      req.setTimeout(3000, () => req.destroy());
    };
    tryOnce();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'MyTime2Desktop',
    show: true,
    webPreferences: { contextIsolation: true },
  });

  // Keep the OS window/taskbar title fixed to the product name — don't let the
  // loaded web page's <title> override it.
  mainWindow.on('page-title-updated', (e) => e.preventDefault());

  // Recover from any transient main-frame load failure (also covers refresh).
  let retries = 0;
  const loadApp = () => { mainWindow.loadURL(LOGIN_URL).catch(() => {}); };
  mainWindow.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
    if (code === -3 || !isMainFrame) return;
    if (retries++ > 20) return;
    setTimeout(loadApp, 800);
  });

  // Wait for BOTH the web server and the API before navigating, so the login
  // page's first requests don't fire into a not-yet-ready backend.
  Promise.all([waitForUrl(LOGIN_URL), waitForApi(API_PROBE)])
    .then(() => {
      log('Web + API ready, loading login');
      loadApp();
      // Start heavy/background processes only AFTER the window is loading, so
      // they don't starve php-cgi's cold-boot and delay first paint. None are
      // needed at the login screen.
      startFaceService();    // InsightFace load is CPU-bound (~10s)
      startQueueWorker();    // processes dispatched Jobs (e.g. expire-on-device)
      startScheduler();      // attendance regen, device sync, daily reports
    })
    .catch(err => {
      log('ERROR:', err.message);
      mainWindow.loadURL('data:text/html,' + encodeURIComponent(
        `<body style="font-family:system-ui;padding:2rem"><h2>Could not start</h2>
         <pre>${err.message}</pre></body>`));
    });
}

// ── Settings (DB connection config) ──────────────────────────────────────────
function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({
    width: 660, height: 820, title: 'Settings', parent: mainWindow || undefined,
    modal: false, autoHideMenuBar: true, resizable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

// ── Logs viewer ──────────────────────────────────────────────────────────────
function openLogsWindow() {
  if (logsWindow && !logsWindow.isDestroyed()) { logsWindow.focus(); return; }
  logsWindow = new BrowserWindow({
    width: 1000, height: 640, title: 'Logs', autoHideMenuBar: true,
    backgroundColor: '#0b1220',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  logsWindow.loadFile(path.join(__dirname, 'logs.html'));
  logsWindow.on('closed', () => { logsWindow = null; });
}

// ── License (update / re-activate anytime) ───────────────────────────────────
// Lets an admin paste a new key without waiting for the current one to expire —
// e.g. to raise the device/employee limit or extend the date.
function openLicenseWindow() {
  if (licenseWindow && !licenseWindow.isDestroyed()) { licenseWindow.focus(); return; }
  licenseWindow = new BrowserWindow({
    width: 620, height: 680, title: 'License', parent: mainWindow || undefined,
    modal: false, autoHideMenuBar: true, resizable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  licenseWindow.loadFile(path.join(__dirname, 'license.html'));
  licenseWindow.on('closed', () => { licenseWindow = null; });
}

// Minimal JSON call to the local Laravel API (main process → no CORS, works
// pre-login since the license routes are public).
function apiRequest(method, apiPath, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port: API_PORT, path: '/api' + apiPath, method,
      headers: {
        Accept: 'application/json',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let parsed; try { parsed = JSON.parse(buf || '{}'); } catch { parsed = { message: buf }; }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, data: { message: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

// Test a DB connection using the pg client bundled with the log-listener service
// (so we don't add a dependency to the electron shell itself).
async function testDbConnection(db) {
  let Client;
  try { ({ Client } = require(path.join(SERVICES_PG))); }
  catch (e) { return { ok: false, message: 'pg client unavailable: ' + e.message }; }
  const client = new Client({
    host: db.host, port: Number(db.port) || 5432, database: db.database,
    user: db.username, password: String(db.password),
    connectionTimeoutMillis: 6000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return { ok: true, message: `Connected to ${db.database} @ ${db.host}:${db.port}` };
  } catch (e) {
    try { await client.end(); } catch (_) {}
    return { ok: false, message: e.message };
  }
}
const SERVICES_PG = path.join(ROOT, 'services', 'log-listener', 'node_modules', 'pg');

function registerIpc() {
  ipcMain.handle('config:get', () => ({ ...cfg.load(), defaultPorts: cfg.DEFAULT_PORTS }));
  ipcMain.handle('config:testDb', (_e, db) => testDbConnection(db));
  ipcMain.handle('config:saveDb', (_e, db) => {
    if (db.host === cfg.LIVE_DB_HOST) return { ok: false, message: 'live host blocked' };
    cfg.applyDb(db);
    log('DB config saved — relaunching to apply');
    cleanup();   // kill spawned services first so the relaunched instance gets free ports
    setTimeout(() => { app.relaunch(); app.exit(0); }, 2000);
    return { ok: true };
  });
  ipcMain.handle('config:savePorts', (_e, ports) => {
    // Validate: every value a port in 1..65535, no duplicates.
    const vals = Object.values(ports || {});
    if (!vals.length || vals.some(v => !Number.isInteger(v) || v < 1 || v > 65535))
      return { ok: false, message: 'Ports must be whole numbers between 1 and 65535.' };
    if (new Set(vals).size !== vals.length)
      return { ok: false, message: 'Two services cannot share the same port.' };
    cfg.applyPorts(ports);
    log('Service ports saved — relaunching to apply');
    cleanup();   // free the old ports before the relaunched instance binds the new ones
    setTimeout(() => { app.relaunch(); app.exit(0); }, 2000);
    return { ok: true };
  });
  ipcMain.handle('settings:close', () => { if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close(); });
  ipcMain.handle('logs:get', () => LOG_BUFFER.slice(-1500));
  ipcMain.handle('logs:clear', () => { LOG_BUFFER.length = 0; return true; });
  // License window: proxy the public license endpoints + clipboard.
  ipcMain.handle('license:status', () => apiRequest('GET', '/license/status'));
  ipcMain.handle('license:activate', (_e, token) => apiRequest('POST', '/license/activate', { token }));
  ipcMain.handle('license:close', () => { if (licenseWindow && !licenseWindow.isDestroyed()) licenseWindow.close(); });
  ipcMain.handle('clip:write', (_e, text) => { clipboard.writeText(String(text ?? '')); return true; });
}

function buildMenu() {
  const template = [
    { label: 'Settings', submenu: [
      { label: 'Database && Service Ports…', accelerator: 'CmdOrCtrl+,', click: openSettingsWindow },
      { type: 'separator' },
      { role: 'quit' },
    ] },
    { label: 'License', submenu: [
      { label: 'Update License…', click: openLicenseWindow },
    ] },
    { label: 'Logs', submenu: [
      { label: 'View Logs…', accelerator: 'CmdOrCtrl+L', click: openLogsWindow },
    ] },
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
      { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'togglefullscreen' },
    ] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function cleanup() {
  shuttingDown = true;                                   // stop php-cgi auto-restart
  for (const t of phpRestartTimers) clearTimeout(t);
  phpRestartTimers.clear();
  for (const c of children) {
    // /T kills the process tree (nginx master + its worker, etc.) by PID, so we
    // only ever kill what this app spawned — not the user's other nginx/php/java.
    if (c.pid) { try { exec(`taskkill /pid ${c.pid} /T /F`); } catch (_) {} }
  }
  try { pg.stopPostgres(); } catch (_) {}   // stop the bundled DB last
}

// This machine's GPU process errors (seen as "Gpu Cache Creation failed"); the
// page renders fine in Chrome but blanks in Electron's GPU-backed renderer.
// Software rendering is reliable here and fine for a forms/dashboard UI.
app.disableHardwareAcceleration();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });

  app.whenReady().then(async () => {
    registerIpc();
    buildMenu();            // native menu: Settings → Database Connection…

    // Port preflight: if another program already holds a port we need, say so
    // clearly (which port + which process) instead of failing with a blank window.
    try {
      const conflicts = await preflightPorts();
      if (conflicts.length) {
        const { dialog } = require('electron');
        const lines = conflicts.map(c =>
          `  • ${c.port}  ${c.label}` +
          (c.owner ? `  — in use by ${c.owner.name} (PID ${c.owner.pid})` : '  — already in use'));
        log('PORT CONFLICT:', conflicts.map(c => c.port).join(', '));
        const choice = dialog.showMessageBoxSync({
          type: 'warning',
          title: 'Ports already in use',
          message: 'Some ports MyTime2Cloud needs are already in use by other programs:',
          detail: lines.join('\n') +
            '\n\nClose the program using that port, then restart MyTime2Cloud.' +
            '\n\nIf you continue, the services on the busy ports will not work.',
          buttons: ['Quit', 'Continue anyway'],
          defaultId: 0, cancelId: 0, noLink: true,
        });
        if (choice === 0) { app.quit(); return; }
        // else → continue and let the user see which services fail
      }
    } catch (e) { log('port preflight error:', e.message); }

    try {
      const fp = cfg.ensureMachineFp();   // bind license to THIS machine; write MACHINE_FP to backend/.env
      log('machine fingerprint:', fp.slice(0, 16) + '…');
    } catch (e) { log('machine fingerprint error:', e.message); }

    // Mirror the configured service ports into backend/.env so the Laravel backend
    // reaches the local SDK / gateway on the right ports (managed, not hand-set).
    try { cfg.applyServicePorts(PORTS); } catch (e) { log('applyServicePorts error:', e.message); }

    // Bundled database: init + start the local PostgreSQL BEFORE the API workers
    // (they connect to it on boot). First launch creates the cluster and restores
    // the starter data — no install, no import. On app updates, apply any new
    // Laravel migrations so the existing user database stays in sync.
    try {
      const { firstRun } = pg.ensurePostgres();
      if (!firstRun) {
        log('Applying any pending database migrations…');
        const m = spawnSync(PHP_CLI, ['artisan', 'migrate', '--force'],
          { cwd: BACKEND, env: process.env, windowsHide: true });
        if (m.status !== 0) log('migrate returned', m.status, '(continuing)');
      }
    } catch (e) {
      log('FATAL: database init failed:', e.message);
      try { require('electron').dialog.showErrorBox('Database error',
        'MyTime2Cloud could not start its database:\n\n' + e.message); } catch (_) {}
      app.quit();
      return;
    }

    startPhpCgiWorkers();   // API workers first… (read MACHINE_FP from .env at start)
    startNginx();           // …then the front door that proxies to them
    startDotnetSdk();
    startJavaSdk();
    startPushService();
    startLogListener();      // ingests SDK punches into local attendance_logs
    startPdfService();       // HTML -> PDF (:3002)
    startSyncCalendar();     // holidays/calendar API (:4000)
    startMqttBroker();       // MQTT broker (:1883/:8083) for MQTT-based devices
    startMqttDeviceGateway(); // MQTT device status/command gateway (:8001)
    startMytimeMqttListener(); // MQTT punch ingestion -> attendance_logs
    createWindow();          // face validator + queue + scheduler start after window loads
  });
}

app.on('window-all-closed', () => { cleanup(); app.quit(); });
app.on('before-quit', cleanup);
process.on('exit', cleanup);
