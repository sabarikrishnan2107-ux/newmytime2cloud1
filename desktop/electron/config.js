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

// Defaults. Keep in sync with conf/nginx.conf + the frontend port tokens.
const DEFAULT_PORTS = {
  api: 8000, web: 3001, push: 8077, face: 8500,
  dotnet: 8080, java: 8888, pdf: 3002, sync: 4000,
  mqttTcp: 1883, mqttWs: 8083,
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

const LIVE_DB_HOST = '139.59.69.241';   // hard-blocked: live production DB

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

module.exports = { load, save, applyDb, ensureMachineFp, computeMachineFp, DEFAULT_PORTS, CONFIG_PATH, LIVE_DB_HOST };
