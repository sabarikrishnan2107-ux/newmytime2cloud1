"use client";

import { useEffect, useState } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { getStaffUser } from "@/lib/staff-user";
import ProfilePicture from "@/components/ProfilePicture";
import DateRangeSelect from "@/components/ui/DateRange";
import { formatDateLocal } from "@/lib/utils";
import {
  Contact,
  Edit3,
  Fingerprint,
  Hash,
  Monitor,
  RefreshCw,
  ScanFace,
  Smartphone,
} from "lucide-react";

const baseIcons = {
  Card: <Contact size={16} title="Card" />,
  Fing: <Fingerprint size={16} title="Fingerprint" />,
  Face: <ScanFace size={16} title="Face" />,
  Pin: <Hash size={16} title="PIN" />,
  Manual: <Edit3 size={16} title="Manual" />,
  Repeated: <RefreshCw size={16} title="Repeated" />,
  Mobile: <Smartphone size={16} title="Mobile" />,
  Device: <Monitor size={16} title="Device" />,
};

const iconGroups = {
  Card: [baseIcons.Card],
  Fing: [baseIcons.Fing],
  Face: [baseIcons.Face],
  "Fing + Card": [baseIcons.Fing, baseIcons.Card],
  "Face + Fing": [baseIcons.Face, baseIcons.Fing],
  "Face + Card": [baseIcons.Face, baseIcons.Card],
  "Card + Pin": [baseIcons.Card, baseIcons.Pin],
  "Face + Pin": [baseIcons.Face, baseIcons.Pin],
  "Fing + Pin": [baseIcons.Fing, baseIcons.Pin],
  "Fing + Card + Pin": [baseIcons.Fing, baseIcons.Card, baseIcons.Pin],
  "Face + Card + Pin": [baseIcons.Face, baseIcons.Card, baseIcons.Pin],
  "Face + Fing + Pin": [baseIcons.Face, baseIcons.Fing, baseIcons.Pin],
  "Face + Fing + Card": [baseIcons.Face, baseIcons.Fing, baseIcons.Card],
  Manual: [baseIcons.Manual],
  Repeated: [baseIcons.Repeated],
};

function getStatusStyles(status) {
  const themes = {
    Allowed: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
    Present: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
    Late: "bg-amber-500/5 border-amber-500/20 text-amber-400",
    "Access Denied": "bg-red-500/5 border-red-500/20 text-red-400",
    Absent: "bg-red-500/5 border-red-500/20 text-red-400",
    neutral: "bg-slate-500/10 border-slate-500/20 text-slate-300",
  };

  return themes[status] || themes.neutral;
}

function formatDateForTable(dateTime, fallbackDate) {
  const parsed = dateTime ? new Date(dateTime) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
      .replace(/ /g, "-");
  }
  return fallbackDate || "---";
}

function formatDayForTable(dateTime) {
  const parsed = dateTime ? new Date(dateTime) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", { weekday: "short" });
  }
  return "---";
}

function formatTimeForTable(dateTime, fallbackTime) {
  if (fallbackTime) return fallbackTime;
  const parsed = dateTime ? new Date(dateTime) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return "---";
}

function getModeIcons(log) {
  if (log?.DeviceID?.includes("Mobile")) return [baseIcons.Mobile];
  if (log?.DeviceID?.startsWith("Camera") || log?.channel === "camera") return [baseIcons.Face];
  if (iconGroups[log?.mode]) return iconGroups[log.mode];
  return [baseIcons.Device];
}

function cleanLabel(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeCompare(value) {
  return cleanLabel(value).toLowerCase().replace(/[\s_-]+/g, "");
}

function isGenericLocation(value, aliases = []) {
  const normalized = normalizeCompare(value);
  if (!normalized) return true;

  const genericTokens = new Set([
    "---",
    "na",
    "n/a",
    "null",
    "undefined",
    "unknown",
    "manual",
    "mobile",
    "device",
    "camera",
    "camera1",
    "camera2",
    "camera3",
    "cam",
    "cam1",
    "cam2",
    "cam3",
  ]);

  if (genericTokens.has(normalized)) return true;

  return aliases.some((alias) => {
    const aliasNormalized = normalizeCompare(alias);
    return aliasNormalized && aliasNormalized === normalized;
  });
}

function compactLocation(value) {
  const label = cleanLabel(value);
  if (!label) return "Location not available";

  const parts = label.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const shortened = `${parts[0]}, ${parts[1]}`;
    if (shortened.length <= 48) return shortened;
  }

  return label;
}

function getLocationInfo(log) {
  const aliases = [log?.device?.name, log?.DeviceID];
  const gpsLocation = cleanLabel(log?.gps_location);
  const deviceLocation = cleanLabel(log?.device?.location);

  let full = "";
  if (!isGenericLocation(gpsLocation, aliases)) {
    full = gpsLocation;
  } else if (!isGenericLocation(deviceLocation, aliases)) {
    full = deviceLocation;
  }

  return {
    full: full || "Location not available",
    display: full ? compactLocation(full) : "Location not available",
  };
}

function formatFunction(log) {
  const raw = cleanLabel(log?.device?.function);
  if (raw) {
    if (raw.toLowerCase() === "auto") return "Auto";
    if (raw.toLowerCase() === "in") return "In";
    if (raw.toLowerCase() === "out") return "Out";
    return raw;
  }

  const logType = cleanLabel(log?.log_type);
  if (logType) {
    if (logType.toLowerCase() === "in") return "In";
    if (logType.toLowerCase() === "out") return "Out";
    return logType;
  }

  if (log?.DeviceID?.includes("Mobile")) return "Mobile";
  if (log?.DeviceID?.startsWith("Camera") || log?.channel === "camera") return "Auto";
  return "Recorded";
}

function resolveStatus(log) {
  if (log?.status) return log.status;
  if (String(log?.VerifyStatus) === "1") return "Allowed";
  if (String(log?.VerifyStatus) === "0") return "Access Denied";
  return "Recorded";
}

function getLogDateKey(log) {
  if (log?.LogTime) return String(log.LogTime).split(" ")[0]?.split("T")[0];
  if (log?.edit_date) return log.edit_date;
  return log?.date || "";
}

function parseDateOnly(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function getDefaultDateRange() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    from: formatDateLocal(monthStart),
    to: formatDateLocal(today),
  };
}

function getRangeDaysCount(from, to) {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (!start || !end) return 0;

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const effectiveEnd = end > todayOnly ? todayOnly : end;

  if (start > effectiveEnd) return 0;

  const diffMs = effectiveEnd.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

function buildBranchDept(log, user) {
  const branch =
    log?.employee?.branch?.branch_name ||
    user?.branch?.branch_name ||
    user?.branch_name ||
    "";
  const department =
    log?.employee?.department?.name ||
    user?.department?.name ||
    user?.department_name ||
    "";

  return [branch, department].filter(Boolean).join(" / ") || "---";
}

function buildRangeStats(logs, from, to) {
  const uniqueDaysWithLogs = new Set();
  const lateDays = new Set();

  for (const log of logs) {
    const dateKey = getLogDateKey(log);
    if (!dateKey) continue;
    uniqueDaysWithLogs.add(dateKey);
    if (log?.status === "Late") lateDays.add(dateKey);
  }

  const total = getRangeDaysCount(from, to);
  const present = uniqueDaysWithLogs.size;
  const absent = Math.max(total - present, 0);
  const late = lateDays.size;

  return { present, absent, late, total };
}

function formatRangeLabel(from, to) {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);

  if (!start || !end) return "selected range";

  const options = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}

export default function StaffAttendancePage() {
  const defaultRange = getDefaultDateRange();
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  useEffect(() => {
    const fetchData = async () => {
      if (!from || !to) {
        setRows([]);
        setStats({ present: 0, absent: 0, late: 0, total: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const staffUser = await getStaffUser();
        const params = await buildQueryParams({});
        const systemUserId = staffUser.system_user_id || staffUser.employee_id;

        const { data } = await api.get("/attendance_logs", {
          params: { ...params, from_date: from, to_date: to, system_user_id: systemUserId, per_page: 100 },
        });

        const logs = data?.data || [];

        const mappedRows = logs
          .map((log, index) => {
            const employeeName =
              [log?.employee?.first_name, log?.employee?.last_name].filter(Boolean).join(" ") ||
              staffUser.employee_name ||
              "---";
            const locationInfo = getLocationInfo(log);

            return {
              id: log?.id || `${log?.LogTime || "log"}-${index}`,
              sortTime: log?.LogTime ? new Date(log.LogTime).getTime() : 0,
              dateLabel: formatDateForTable(log?.LogTime, log?.date),
              dayLabel: formatDayForTable(log?.LogTime),
              name: employeeName,
              employeeId: log?.employee?.employee_id || staffUser.employee_id || staffUser.system_user_id || "---",
              dept: buildBranchDept(log, staffUser),
              modes: getModeIcons(log),
              deviceName: log?.device?.name || "---",
              deviceLocation: locationInfo.display,
              deviceLocationFull: locationInfo.full,
              deviceFunction: formatFunction(log),
              time: formatTimeForTable(log?.LogTime, log?.time),
              status: resolveStatus(log),
              profilePicture: log?.employee?.profile_picture || staffUser.employee_profile_picture || null,
            };
          })
          .sort((a, b) => b.sortTime - a.sortTime);

        setRows(mappedRows);
        setStats(buildRangeStats(logs, from, to));
      } catch (error) {
        console.error("Attendance error:", error);
        setRows([]);
        setStats({ present: 0, absent: 0, late: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [from, to]);

  const attendancePercent = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  const rangeLabel = formatRangeLabel(from, to);

  const summaryCards = [
    {
      icon: "calendar_month",
      iconClass: "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20",
      label: "Days Present",
      value: stats.present,
      unit: "Days",
      badge: `${attendancePercent}%`,
      badgeClass: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20",
      footerType: "bar",
      footerLabel: "Attendance rate",
      footerClass: "bg-emerald-300",
      footerWidth: `${attendancePercent}%`,
    },
    {
      icon: "schedule",
      iconClass: "bg-purple-400/10 text-purple-300 border border-purple-400/20",
      label: "Days Absent",
      value: stats.absent,
      unit: "Days",
      badge: stats.absent > 3 ? "Action" : "OK",
      badgeClass: stats.absent > 3 ? "text-red-300" : "text-emerald-300",
      footerType: "text",
      footerLabel: "Selected range",
    },
    {
      icon: "history",
      iconClass: "bg-red-400/10 text-red-300 border border-red-400/20",
      label: "Late Days",
      value: stats.late,
      unit: "Days",
      badge: stats.late > 2 ? "Warning" : "OK",
      badgeClass: stats.late > 2 ? "text-red-300" : "text-emerald-300",
      footerType: "text",
      footerLabel: "Selected range",
      footerIcon: stats.late > 2 ? "trending_up" : null,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm">Loading attendance...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div>
        <section className="mb-4">
          <nav className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-slate-500">
            <span>DASHBOARD</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-cyan-300">ATTENDANCE LOGS</span>
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-headline text-xl font-bold tracking-tight text-slate-100">Attendance Logs</h1>
            <div className="w-full max-w-[320px]">
              <DateRangeSelect
                className="w-full"
                value={{ from, to }}
                onChange={({ from: nextFrom, to: nextTo }) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                }}
              />
            </div>
          </div>
        </section>

        <section className="mb-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="staff-glass-card rounded-2xl p-4 transition hover:bg-slate-800/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}>
                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{card.label}</p>
                    <h3 className="font-headline text-2xl font-bold text-slate-100">
                      {card.value} <span className="text-sm font-medium text-slate-500">{card.unit}</span>
                    </h3>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end">
                  {card.footerType === "bar" ? (
                    <>
                      <span className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${card.badgeClass}`}>
                        {card.badge}
                      </span>
                      <div className="mt-1.5 h-1 w-14 overflow-hidden rounded-full bg-slate-700">
                        <div className={`h-full ${card.footerClass}`} style={{ width: card.footerWidth }}></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={`flex items-center gap-1 text-xs font-bold ${card.badgeClass}`}>
                        {card.footerIcon && <span className="material-symbols-outlined text-sm">{card.footerIcon}</span>}
                        {card.badge}
                      </span>
                      <span className="mt-0.5 text-[9px] font-medium uppercase text-slate-500">{card.footerLabel}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="staff-glass-card overflow-hidden rounded-2xl border border-white/5">
          <div className="hidden lg:block">
            <div className="grid grid-cols-[1.1fr_2.2fr_2.2fr_0.9fr_1.1fr_2.1fr_1fr_0.9fr_1.2fr] px-6 py-3 border-y border-white/5 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-white/[0.02] gap-4">
              <div>Date</div>
              <div>Employee</div>
              <div>Branch / Dept</div>
              <div>Mode</div>
              <div>Device</div>
              <div>Location</div>
              <div>Function</div>
              <div>Time</div>
              <div className="text-right pr-2">Status</div>
            </div>

            <div className="max-h-[640px] overflow-y-auto px-4">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[1.1fr_2.2fr_2.2fr_0.9fr_1.1fr_2.1fr_1fr_0.9fr_1.2fr] py-4 items-center gap-4 transition-colors hover:bg-white/5 ${
                    index !== rows.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="pl-2">
                    <span className="text-[11px] font-medium text-slate-300 block">{row.dateLabel}</span>
                    <span className="text-[10px] text-slate-500">{row.dayLabel}</span>
                  </div>

                  <div className="flex gap-3 pl-2 min-w-0">
                    <div className="size-8 min-w-[32px] rounded-full overflow-hidden relative border border-white/10 flex items-center justify-center">
                      <ProfilePicture alt={row.name} src={row.profilePicture} />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[11px] font-bold text-slate-200">{row.name}</span>
                      <span className="text-xs text-slate-400">ID: {row.employeeId}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 min-w-0 break-words">{row.dept}</div>

                  <div className="flex items-center gap-1 text-slate-300">
                    {row.modes.map((icon, iconIndex) => (
                      <span key={`${row.id}-mode-${iconIndex}`}>{icon}</span>
                    ))}
                  </div>

                  <div className="text-xs font-medium text-slate-300 min-w-0 break-words">{row.deviceName}</div>
                  <div
                    className="text-xs font-medium leading-4 text-slate-300 whitespace-normal break-words min-w-0"
                    title={row.deviceLocationFull}
                  >
                    {row.deviceLocation}
                  </div>
                  <div className="text-xs font-medium text-slate-300">{row.deviceFunction}</div>
                  <div className="text-xs text-slate-300">{row.time}</div>

                  <div className="text-right pr-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium ${getStatusStyles(
                        row.status,
                      )}`}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}

              {rows.length === 0 && (
                <div className="px-6 py-10 text-center text-xs text-slate-500">No attendance logs for the selected date range</div>
              )}
            </div>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-slate-900/20 p-6 text-center text-xs text-slate-500">
                No attendance logs for the selected date range
              </div>
            ) : (
              rows.map((row) => (
                <div key={`${row.id}-mobile`} className="rounded-xl border border-white/5 bg-slate-900/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ProfilePicture alt={row.name} src={row.profilePicture} />
                      <div>
                        <p className="text-xs font-bold text-slate-100">{row.name}</p>
                        <p className="text-[10px] text-slate-500">ID: {row.employeeId}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${getStatusStyles(
                        row.status,
                      )}`}
                    >
                      {row.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-800/40 p-2">
                      <p className="text-[8px] font-bold uppercase text-slate-500">Date</p>
                      <p className="text-xs font-semibold text-slate-100">{row.dateLabel}</p>
                      <p className="text-[10px] text-slate-500">{row.dayLabel}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/40 p-2">
                      <p className="text-[8px] font-bold uppercase text-slate-500">Time</p>
                      <p className="text-xs font-semibold text-slate-100">{row.time}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/40 p-2">
                      <p className="text-[8px] font-bold uppercase text-slate-500">Branch / Dept</p>
                      <p className="text-xs font-semibold text-slate-100">{row.dept}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/40 p-2">
                      <p className="text-[8px] font-bold uppercase text-slate-500">Device</p>
                      <p className="text-xs font-semibold text-slate-100">{row.deviceName}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/40 p-2">
                      <p className="text-[8px] font-bold uppercase text-slate-500">Location / Function</p>
                      <p className="text-xs font-semibold text-slate-100">
                        {row.deviceLocation} / {row.deviceFunction}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/40 p-2">
                      <p className="text-[8px] font-bold uppercase text-slate-500">Mode</p>
                      <div className="mt-1 flex items-center gap-1 text-slate-200">
                        {row.modes.map((icon, iconIndex) => (
                          <span key={`${row.id}-mobile-mode-${iconIndex}`}>{icon}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-900/20 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-500">
              Showing <span className="text-slate-100">{rows.length}</span> logs for {rangeLabel}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
