"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

function explicitIsOut(l) {
  const f = (l?.device?.function || "").toLowerCase();
  const t = (l?.log_type || l?.LogType || "").toLowerCase();
  if (f === "out" || t === "out") return true;
  if (f === "in" || t === "in") return false;
  const dev = String(l?.DeviceID || l?.device_id || l?.device?.device_id || "").toLowerCase();
  if (dev.includes("out")) return true;
  if (dev.includes("in")) return false;
  return null;
}

// Auto-classify: explicit signal wins; else alternate per day by time (1st=IN, 2nd=OUT, …)
function classifyLogs(logs) {
  const enriched = logs.map((l) => ({ ...l, _isOut: explicitIsOut(l) }));
  const groups = new Map();
  for (const l of enriched) {
    if (l._isOut !== null) continue;
    const date = l?.date || l?.edit_date || (l?.LogTime ? String(l.LogTime).slice(0, 10) : "");
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(l);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ta = `${a?.date || ""} ${a?.time || ""}`;
      const tb = `${b?.date || ""} ${b?.time || ""}`;
      return ta.localeCompare(tb);
    });
    list.forEach((l, idx) => { l._isOut = idx % 2 === 1; });
  }
  return enriched;
}

function isOut(l) {
  return !!l?._isOut;
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-white tabular-nums">{value}</span>
    </div>
  );
}

export default function EmployeeLogsDialog({ open, onClose, employee, logs = [], loading = false }) {
  const classifiedLogs = useMemo(() => classifyLogs(logs), [logs]);

  if (!open) return null;

  // Shift info from schedule
  const shift = employee?.schedule?.shift || employee?.shift;
  const shiftType = employee?.schedule?.shift_type;
  const fmtTime = (t) => {
    if (!t) return "";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
  };
  const shiftName = shift?.name || shiftType?.name || "—";
  const shiftStart = fmtTime(shift?.on_duty_time || shift?.beginning_in || shift?.start_time);
  const shiftEnd = fmtTime(shift?.off_duty_time || shift?.ending_out || shift?.end_time);
  const shiftTime = shiftStart && shiftEnd ? `${shiftStart} – ${shiftEnd}` : (shiftStart || "—");

  // 10-day stats
  const dateSet = new Set();
  classifiedLogs.forEach((l) => {
    const d = l.edit_date || l.date;
    if (d) dateSet.add(d);
  });
  const presents = dateSet.size;
  const absence = Math.max(0, 10 - presents);
  const byDate = new Map();
  classifiedLogs.forEach((l) => {
    const d = l.edit_date || l.date;
    if (!d) return;
    if (!byDate.has(d)) byDate.set(d, { hasIn: false, hasOut: false });
    if (isOut(l)) byDate.get(d).hasOut = true;
    else byDate.get(d).hasIn = true;
  });
  let incomplete = 0;
  byDate.forEach((v) => { if (v.hasIn !== v.hasOut) incomplete += 1; });
  const manualEntry = classifiedLogs.filter((l) => String(l?.DeviceID || l?.device_id || "").toLowerCase() === "manual").length;

  const name = employee?.full_name || "Employee";
  const profile = employee?.profile_picture && employee.profile_picture !== "undefined"
    ? employee.profile_picture
    : "/avatar-placeholder.png";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65"
      onClick={onClose}
    >
      <div
        className="relative w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          title="Close"
          className="group absolute top-3 right-3 z-20 h-8 w-8 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 shadow-md hover:bg-rose-500 hover:text-white active:bg-rose-600 hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <X size={16} className="transition-transform duration-200 group-hover:rotate-90" />
        </button>

        <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 px-4 pb-4">
          {/* Left side: avatar + sidebar stats */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <img
                src={profile}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (!e.target.src.endsWith("/avatar-placeholder.png")) {
                    e.target.src = "/avatar-placeholder.png";
                  }
                }}
              />
            </div>
            <div className="mt-1.5 text-[13px] font-bold text-slate-800 dark:text-white uppercase tracking-wide">
              {name}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">{employee?.designation?.title || "---"}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">{employee?.department?.name || "---"}</div>

            <div className="w-full text-xs space-y-2 text-slate-700 dark:text-slate-200 mt-3 text-left">
              <StatRow label="Presents" value={presents} />
              <StatRow label="Absence" value={absence} />
              <StatRow label="Incomplete" value={incomplete} />
              <StatRow label="Manual Entry" value={manualEntry} />
              <StatRow label="Leaves" value={0} />
              <StatRow label="Holidays" value={0} />
            </div>
          </div>

          {/* Right side: shift info + table */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-3 text-center">
                <div className="text-sm text-slate-700 dark:text-white">Shift</div>
                <div className="text-base font-medium text-slate-800 dark:text-white truncate mt-1">{shiftName}</div>
              </div>
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-3 text-center">
                <div className="text-sm text-slate-700 dark:text-white">Shift Time</div>
                <div className="text-base font-medium text-slate-800 dark:text-white tabular-nums mt-1">{shiftTime}</div>
              </div>
            </div>

            <div className="text-[12px]">
              <div className="grid grid-cols-[28px_1fr_60px_70px] gap-x-3 text-slate-500 dark:text-slate-400 font-semibold text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>#</div>
                <div>Date Time</div>
                <div>In/Out</div>
                <div>Device</div>
              </div>
              {loading ? (
                <div className="py-3 text-center text-slate-500 dark:text-slate-400">Loading…</div>
              ) : classifiedLogs.length === 0 ? (
                <div className="py-3 text-center text-slate-500 dark:text-slate-400">No logs in last 10 days.</div>
              ) : classifiedLogs.slice(0, 10).map((log, i) => {
                const out = isOut(log);
                const label = out ? "Out" : "In";
                const color = out ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400";
                return (
                  <div key={log.id || i} className="grid grid-cols-[28px_1fr_60px_70px] gap-x-3 py-1 text-slate-700 dark:text-slate-200 leading-tight">
                    <div>{i + 1}</div>
                    <div className="whitespace-nowrap">{log.date} {log.time}</div>
                    <div className={`font-semibold ${color}`}>{label}</div>
                    <div>{log?.device?.name || "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
