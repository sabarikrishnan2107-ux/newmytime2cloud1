// electron/postgres.js — bundled portable PostgreSQL lifecycle.
//
// This removes the two manual setup steps the desktop app used to require:
//   1. installing PostgreSQL, and
//   2. importing the database.
//
// PostgreSQL ships *inside* the app (resources/pgsql, copied from a normal PG
// install — bin+lib+share, no installer). On FIRST launch we create a private
// data cluster, start the server on a dedicated port, create the app database,
// and restore the bundled clean baseline dump (admin/admin + an empty company).
// On LATER launches we just start the existing cluster. The end user installs
// nothing and imports nothing.
//
// Auth is "trust" but the server only ever listens on 127.0.0.1, so it is not
// reachable off-machine — this is a single-user local desktop database.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { app } = require('electron');

const PACKAGED = !!(app && app.isPackaged);
// Packaged: bundled trees live under resources/ (extraResources). Dev: repo root.
const ROOT = PACKAGED ? process.resourcesPath : path.resolve(__dirname, '..');

const PG_BIN     = path.join(ROOT, 'pgsql', 'bin');
const INITDB     = path.join(PG_BIN, 'initdb.exe');
const PG_CTL     = path.join(PG_BIN, 'pg_ctl.exe');
const CREATEDB   = path.join(PG_BIN, 'createdb.exe');
const PSQL       = path.join(PG_BIN, 'psql.exe');
const PG_RESTORE = path.join(PG_BIN, 'pg_restore.exe');

// Dedicated port so the bundled server never collides with any other PostgreSQL
// the machine might already run on the default 5432. Keep in sync with the
// DB_PORT written into backend/.env and services/log-listener/.env.
const PG_PORT  = 54329;
const PG_USER  = 'postgres';
const DB_NAME  = 'mytime2cloud-desktop-v2';
const BASELINE_DUMP = path.join(ROOT, 'backend', 'database', 'seed', 'baseline.dump');

// Cluster + log must be WRITABLE and PERSISTENT. The packaged app dir (asar /
// Program Files) is read-only, so use userData when packaged; a gitignored
// runtime/ dir in dev so repeated dev runs reuse the same data.
const STATE_DIR = PACKAGED ? app.getPath('userData') : path.join(ROOT, 'runtime');
const DATA_DIR  = path.join(STATE_DIR, 'pgdata');
const PG_LOG    = path.join(STATE_DIR, 'postgres.log');

function log(...a) { console.log('[postgres]', ...a); }

// Run a bundled tool. stdio is 'ignore' so the postgres child can never inherit
// and hold open a pipe we'd block waiting on (a real Windows pg_ctl gotcha).
function run(file, args, opts = {}) {
  return spawnSync(file, args, { stdio: 'ignore', windowsHide: true, ...opts });
}

// Run psql and capture stdout (for readiness checks / verification).
function psql(dbName, sql) {
  return spawnSync(PSQL, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', PG_USER,
    '-d', dbName, '-tAc', sql], { encoding: 'utf8', windowsHide: true });
}

function clusterExists() {
  return fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
}

function isRunning() {
  return run(PG_CTL, ['-D', DATA_DIR, 'status']).status === 0;
}

function acceptingConnections() {
  return psql('postgres', 'select 1').status === 0;
}

// ── public API ───────────────────────────────────────────────────────────────

// Ensure the bundled server is initialized, running, and the app DB exists.
// Returns { firstRun } so the caller can decide whether to run migrations.
function ensurePostgres() {
  if (!fs.existsSync(INITDB)) {
    throw new Error('bundled PostgreSQL not found at ' + PG_BIN + ' (pgsql/ missing from the build?)');
  }

  const firstRun = !clusterExists();

  if (firstRun) {
    log('First launch — creating database cluster (one-time)…');
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const r = run(INITDB, ['-D', DATA_DIR, '-U', PG_USER, '-A', 'trust',
      '--encoding=UTF8', '--locale=C']);
    if (r.status !== 0) throw new Error('initdb failed (code ' + r.status + ')');
  }

  if (!isRunning()) {
    log('Starting bundled PostgreSQL on 127.0.0.1:' + PG_PORT);
    // -w waits until the server accepts connections (or fails). The port is
    // forced here regardless of postgresql.conf's default.
    const r = run(PG_CTL, ['-D', DATA_DIR, '-l', PG_LOG, '-o', `-p ${PG_PORT}`, '-w', 'start']);
    if (r.status !== 0 && !acceptingConnections()) {
      throw new Error('PostgreSQL failed to start — see ' + PG_LOG);
    }
  }

  if (firstRun) {
    log('Creating database "' + DB_NAME + '" and restoring starter data…');
    const c = run(CREATEDB, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', PG_USER, DB_NAME]);
    if (c.status !== 0) throw new Error('createdb failed (code ' + c.status + ')');

    if (!fs.existsSync(BASELINE_DUMP)) {
      throw new Error('baseline dump missing at ' + BASELINE_DUMP);
    }
    // pg_restore can exit non-zero on benign warnings; verify by content below.
    run(PG_RESTORE, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', PG_USER,
      '-d', DB_NAME, '--no-owner', '--no-privileges', BASELINE_DUMP]);

    const check = psql(DB_NAME, 'select count(*) from users');
    if (check.status !== 0 || !/\d/.test(String(check.stdout))) {
      throw new Error('baseline restore did not populate the database');
    }
    log('Starter database ready (' + String(check.stdout).trim() + ' user).');
  }

  return { firstRun, port: PG_PORT, database: DB_NAME };
}

// Stop the server cleanly. Safe to call even if it isn't running.
function stopPostgres() {
  if (!clusterExists()) return;
  try {
    log('Stopping bundled PostgreSQL…');
    run(PG_CTL, ['-D', DATA_DIR, '-m', 'fast', '-w', 'stop']);
  } catch (_) { /* best effort on shutdown */ }
}

module.exports = { ensurePostgres, stopPostgres, PG_PORT, DB_NAME, DATA_DIR };
