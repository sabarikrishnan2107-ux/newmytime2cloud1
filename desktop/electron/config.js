// electron/config.js — desktop configuration (DB connection + service ports).
//
// Source of truth is desktop-config.json (next to this file). On first run it is
// seeded from the current backend/.env so the Settings UI shows real values.
// Applying DB settings writes the DB_* keys into backend/.env and the
// log-listener .env; the app then relaunches to pick them up.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { app } = require('electron');

const PACKAGED = !!(app && app.isPackaged);
// Packaged: bundled trees are under resources/ (extraResources). Dev: repo root.
const ROOT = PACKAGED ? process.resourcesPath : path.resolve(__dirname, '..');
// desktop-config.json must be WRITABLE — the packaged app dir (asar) is not, so
// use userData when packaged; next to the code in dev.
const CONFIG_PATH = path.join(PACKAGED ? app.getPath('userData') : __dirname, 'desktop-config.json');
const BACKEND_ENV = path.join(ROOT, 'backend', '.env');
const LISTENER_ENV = path.join(ROOT, 'services', 'log-listener', '.env');

// Defaults. Single source of truth for every service port. main.js threads these
// into the services it spawns, renders conf/nginx.conf.template with them, and
// nginx rewrites the matching __*_PORT__ tokens in the static frontend per-request
// (so the web build needs no rebuild when a port changes). Override any of them in
// desktop-config.json ("ports": { ... }); defaults work out of the box.
// NOTE: the Postgres port is configured separately via the DB settings (db.port /
// backend .env DB_PORT), not here.
const DEFAULT_PORTS = {
  api: 8000, web: 3001, push: 8077, face: 8500,
  dotnet: 8080, java: 8888, pdf: 3002, sync: 4000,
  mqttTcp: 1883, mqttWs: 8083, gateway: 8001,
  php: [9000, 9001, 9002, 9003],          // php-cgi FastCGI pool (internal)
  deviceUdp: 7001, deviceTcp: 7002, deviceUdp2: 8101,  // .NET SDK device ports
};

function readEnvValue(file, key) {
  try {
    const m = fs.readFileSync(file, 'utf8').match(new RegExp('^' + key + '=(.*)$', 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
}

// Seed DB fields from the live backend/.env so the form opens with real values.
function seedDbFromEnv() {
  return {
    host: readEnvValue(BACKEND_ENV, 'DB_HOST') || '127.0.0.1',
    port: Number(readEnvValue(BACKEND_ENV, 'DB_PORT')) || 5432,
    database: readEnvValue(BACKEND_ENV, 'DB_DATABASE') || 'mytime2cloud-desktop-v2',
    username: readEnvValue(BACKEND_ENV, 'DB_USERNAME') || 'postgres',
    password: readEnvValue(BACKEND_ENV, 'DB_PASSWORD') || '',
  };
}

function load() {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { cfg = {}; }
  return {
    db: { ...seedDbFromEnv(), ...(cfg.db || {}) },
    ports: { ...DEFAULT_PORTS, ...(cfg.ports || {}) },
  };
}

function save(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// Update or append `KEY=value` lines in an .env file, preserving everything else.
function updateEnvFile(file, kv) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const [k, v] of Object.entries(kv)) {
    const re = new RegExp('^' + k + '=.*$', 'm');
    if (re.test(txt)) txt = txt.replace(re, `${k}=${v}`);
    else txt += (txt.endsWith('\n') ? '' : '\n') + `${k}=${v}\n`;
  }
  fs.writeFileSync(file, txt);
}

// Write DB settings into the Laravel backend .env and the log-listener .env.
// 🚫 NEVER allow the live prod host here — see [[local-dev-database]] rule.
function applyDb(db) {
  // Quote the password so special chars don't break dotenv parsing.
  const pwd = `"${String(db.password).replace(/"/g, '\\"')}"`;
  const kv = {
    DB_HOST: db.host, DB_PORT: db.port, DB_DATABASE: db.database,
    DB_USERNAME: db.username, DB_PASSWORD: pwd,
  };
  updateEnvFile(BACKEND_ENV, kv);
  updateEnvFile(LISTENER_ENV, kv);
}

// Write the configured service ports the BACKEND needs to reach into backend/.env.
// The Laravel code can't read desktop-config.json, so the desktop mirrors the
// derived local-service URLs into its .env on every boot (same managed pattern as
// MACHINE_FP / DB settings — the user never sets these by hand). Keeps backend ->
// local SDK / gateway calls pointed at the right port when a port is overridden.
function applyServicePorts(ports) {
  const p = { ...DEFAULT_PORTS, ...(ports || {}) };
  updateEnvFile(BACKEND_ENV, {
    SDK_URL: `http://127.0.0.1:${p.dotnet}`,
    SDK_PORT: p.dotnet,
    JAVA_PORT: p.java,
    OX900_SDK_URL: `127.0.0.1:${p.java}`,
    MQTT_GATEWAY_URL: `http://127.0.0.1:${p.gateway}`,
  });
}

// Persist service-port overrides into desktop-config.json (merging, so machine_fp
// and db are preserved). main.js relaunches afterwards to apply them.
function applyPorts(ports) {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { cfg = {}; }
  cfg.ports = { ...(cfg.ports || {}), ...ports };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// Hard-blocked live production DB host. Stored base64-encoded so the literal IP
// is not shipped in the desktop source; decoded at runtime for the guard check.
const LIVE_DB_HOST = Buffer.from('MTM5LjU5LjY5LjI0MQ==', 'base64').toString('utf8');

// ── Machine fingerprint (license binding) ────────────────────────────────────
// A stable per-machine id derived from the Windows MachineGuid (falls back to
// hostname). Hashed so the raw guid never leaves the device. The desktop's
// license can only be activated on the machine whose fingerprint matches the one
// embedded in the signed key — this is what binds "exactly one machine".
function machineGuid() {
  try {
    // execFileSync (no shell) so the backslashes in the registry key survive.
    const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8' });
    const m = out.match(/MachineGuid\s+REG_SZ\s+([\w-]+)/i);
    if (m) return m[1].trim();
  } catch { /* fall through */ }
  return os.hostname();
}

function computeMachineFp() {
  return crypto.createHash('sha256').update('m2c-license:' + machineGuid()).digest('hex');
}

// Compute the fingerprint and write it into backend/.env as MACHINE_FP so the
// Laravel LicenseService can read it (config/license.php -> env('MACHINE_FP')).
// Also mirror it into desktop-config.json for the Settings/diagnostics UI.
// Call this on boot BEFORE the php-cgi workers start so env() picks it up.
function ensureMachineFp() {
  const fp = computeMachineFp();
  updateEnvFile(BACKEND_ENV, { MACHINE_FP: fp });
  try {
    let cfg = {};
    try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { cfg = {}; }
    cfg.machine_fp = fp;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  } catch { /* non-fatal: .env is the source of truth */ }
  return fp;
}

module.exports = { load, save, applyDb, applyPorts, applyServicePorts, ensureMachineFp, computeMachineFp, DEFAULT_PORTS, CONFIG_PATH, LIVE_DB_HOST };
