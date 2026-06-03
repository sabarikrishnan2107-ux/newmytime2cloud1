// Authoritative recovery: backfill v2 attendance_logs from the OLD mytime2cloud DB
// (the complete source of truth) for devices that are REGISTERED in v2.
// - Reads OLD db read-only; writes ONLY to v2.
// - Re-stamps company_id with the v2 value (mapped by device_id) — old/v2 company ids differ.
// - ON CONFLICT ("DeviceID","LogTime","UserID") DO NOTHING -> only inserts what's missing,
//   never duplicates, never alters existing rows.
// Usage: node recover-from-old.js "2026-06-01 00:00:00"
const { Pool } = require("pg");
require("dotenv").config();

const since = process.argv[2] || "2026-06-01 00:00:00";

const base = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  max: 10,
};
const v2  = new Pool({ ...base, database: process.env.DB_DATABASE });   // mytime2cloud-v2
const old = new Pool({ ...base, database: "mytime2cloud" });            // old / truth

// columns we copy across (company_id is overridden with the v2 value)
const cols = ["UserID","DeviceID","company_id","LogTime","SerialNumber","status","mode",
  "reason","log_type","log_date_time","index_serial_number","log_date","created_at","updated_at"];

(async () => {
  // 1) v2 device -> v2 company_id  (only registered devices, exclude the Manual pseudo-device)
  const dev = await v2.query(
    `SELECT device_id, company_id FROM devices
     WHERE company_id IS NOT NULL AND device_id IS NOT NULL AND device_id <> 'Manual'`
  );
  const map = new Map(dev.rows.map(r => [String(r.device_id), r.company_id]));
  const ids = [...map.keys()];
  console.log(`v2 registered devices: ${ids.length} | since ${since}`);

  let totalRead = 0, totalIns = 0, totalDup = 0, totalFail = 0;
  const perDevice = [];

  for (const deviceId of ids) {
    // 2) read this device's punches from OLD db in the window
    const src = await old.query(
      `SELECT "UserID","DeviceID","LogTime","SerialNumber","status","mode","reason",
              "log_type","log_date_time","index_serial_number","log_date","created_at","updated_at"
       FROM attendance_logs
       WHERE "DeviceID" = $1 AND "LogTime" >= $2`,
      [deviceId, since]
    );
    if (src.rows.length === 0) continue;
    totalRead += src.rows.length;
    const cid = map.get(deviceId);

    let ins = 0, fail = 0;
    for (let i = 0; i < src.rows.length; i += 300) {
      const chunk = src.rows.slice(i, i + 300).map(r => ({ ...r, company_id: cid }));
      const params = [];
      const values = chunk.map((r, idx) => {
        cols.forEach(c => params.push(r[c] ?? null));
        const b = idx * cols.length;
        return `(${cols.map((_, k) => `$${b + k + 1}`).join(",")})`;
      }).join(",");
      const sql = `INSERT INTO attendance_logs (${cols.map(c => `"${c}"`).join(",")})
                   VALUES ${values}
                   ON CONFLICT ("DeviceID","LogTime","UserID") DO NOTHING`;
      try {
        const res = await v2.query(sql, params);
        ins += res.rowCount;
      } catch (e) {
        // row-by-row fallback so one bad row can't drop the chunk
        for (const r of chunk) {
          try {
            const p = []; cols.forEach(c => p.push(r[c] ?? null));
            const vsql = `INSERT INTO attendance_logs (${cols.map(c => `"${c}"`).join(",")})
                          VALUES (${cols.map((_, k) => `$${k + 1}`).join(",")})
                          ON CONFLICT ("DeviceID","LogTime","UserID") DO NOTHING`;
            ins += (await v2.query(vsql, p)).rowCount;
          } catch (e2) { fail++; console.error("row fail", r.DeviceID, r.LogTime, e2.message); }
        }
      }
    }
    const dup = src.rows.length - ins - fail;
    totalIns += ins; totalDup += dup; totalFail += fail;
    if (ins > 0) perDevice.push(`  ${deviceId} (company ${cid}): read ${src.rows.length}, inserted ${ins}, dup ${dup}`);
  }

  console.log("Recovered rows per device:");
  perDevice.forEach(l => console.log(l));
  console.log(`\nTOTAL: read ${totalRead} | inserted ${totalIns} | duplicates ${totalDup} | failed ${totalFail}`);
  await v2.end(); await old.end();
})().catch(e => { console.error(e); process.exit(1); });
