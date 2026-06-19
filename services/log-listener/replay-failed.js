// One-off recovery: re-ingest rows from failed-attendance-*.jsonl into attendance_logs.
// - Re-resolves company_id from the live devices table (so newly-registered devices recover too)
// - Skips rows that still have no company (genuinely unregistered) -> writes them to *.skipped.jsonl
// - Chunked INSERT ... ON CONFLICT DO NOTHING, with row-by-row fallback so one bad row never drops a chunk
// Usage: node replay-failed.js <file1.jsonl> [file2.jsonl ...]
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const files = process.argv.slice(2);
if (!files.length) { console.error("Usage: node replay-failed.js <file.jsonl> [...]"); process.exit(1); }

const dbPool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 10,
});

const cols = ["UserID","DeviceID","company_id","LogTime","SerialNumber","status","mode",
  "reason","log_date_time","index_serial_number","log_date","created_at","updated_at"];

function buildInsert(rows) {
  const params = [];
  const values = rows.map((r, idx) => {
    cols.forEach(c => params.push(r[c] ?? null));
    const b = idx * cols.length;
    return `(${cols.map((_, k) => `$${b + k + 1}`).join(",")})`;
  }).join(",");
  const sql = `INSERT INTO attendance_logs (${cols.map(c => `"${c}"`).join(",")})
               VALUES ${values}
               ON CONFLICT ("DeviceID","LogTime","UserID") DO NOTHING`;
  return { sql, params };
}

async function insertChunk(rows) {
  try {
    const { sql, params } = buildInsert(rows);
    const res = await dbPool.query(sql, params);
    return { inserted: res.rowCount, failed: 0 };
  } catch (e) {
    // fall back to row-by-row so a single bad row can't drop the whole chunk
    let inserted = 0, failed = 0;
    for (const r of rows) {
      try {
        const { sql, params } = buildInsert([r]);
        const res = await dbPool.query(sql, params);
        inserted += res.rowCount;
      } catch (err) {
        failed++;
        console.error("row failed:", r.DeviceID, r.LogTime, "-", err.message);
      }
    }
    return { inserted, failed };
  }
}

(async () => {
  // 1) collect all distinct device ids that lack a company in the files
  const allRows = [];
  for (const file of files) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { allRows.push(JSON.parse(line)); } catch {}
    }
  }
  const needLookup = [...new Set(allRows.filter(r => r.company_id == null).map(r => String(r.DeviceID)))];
  const resolved = new Map();
  if (needLookup.length) {
    const r = await dbPool.query(
      `SELECT device_id, serial_number, company_id FROM devices
       WHERE company_id IS NOT NULL AND (device_id = ANY($1::text[]) OR serial_number = ANY($1::text[]))`,
      [needLookup]
    );
    r.rows.forEach(d => {
      if (d.device_id) resolved.set(String(d.device_id), d.company_id);
      if (d.serial_number) resolved.set(String(d.serial_number), d.company_id);
    });
  }

  let attempted = 0, inserted = 0, failed = 0, skipped = 0;
  const skippedRows = [];
  const insertable = [];
  for (const r of allRows) {
    let cid = r.company_id;
    if (cid == null) cid = resolved.get(String(r.DeviceID)) ?? null;
    if (cid == null) { skipped++; skippedRows.push(r); continue; }
    r.company_id = cid;
    insertable.push(r);
  }

  for (let i = 0; i < insertable.length; i += 300) {
    const res = await insertChunk(insertable.slice(i, i + 300));
    inserted += res.inserted; failed += res.failed; attempted += Math.min(300, insertable.length - i);
  }

  if (skippedRows.length) {
    const out = path.join(path.dirname(files[0]), "replay-skipped-unregistered.jsonl");
    fs.writeFileSync(out, skippedRows.map(r => JSON.stringify(r)).join("\n") + "\n");
    console.log(`Skipped ${skipped} unregistered rows -> ${out}`);
  }
  console.log(`DONE. attempted=${attempted} inserted=${inserted} duplicates=${attempted - inserted - failed} failed=${failed} skippedUnregistered=${skipped}`);
  await dbPool.end();
})().catch(e => { console.error(e); process.exit(1); });
