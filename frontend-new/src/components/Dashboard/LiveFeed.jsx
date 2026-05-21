import React, { useEffect, useState } from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import ProfilePicture from "../ProfilePicture";
import { getDeviceLogs } from "@/lib/api";
import {
  Smartphone,
  Contact,
  Fingerprint,
  ScanFace,
  Hash,
  RefreshCw,
  Edit3,
  Monitor,
  User,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useLiveAttendance } from "@/context/LiveAttendanceContext";

// 1. Define the base icon mapping
const baseIcons = {
  Card: <Contact size={18} title="Card" />,
  Fing: <Fingerprint size={18} title="Fingerprint" />,
  Face: <ScanFace size={18} title="Face" />,
  Pin: <Hash size={18} title="PIN" />,
  Manual: <Edit3 size={18} title="Manual" />,
  Repeated: <RefreshCw size={18} title="Repeated" />,
  Mobile: <Smartphone size={18} title="Mobile" />,
  Device: <ScanFace size={18} title="Face Scan" />,
};

// 2. Define how each mode maps to those icons
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

function LiveFeed({ branch_ids, department_ids }) {
  const { t } = useTranslation();
  const router = useRouter();

  const { lastAttendanceEvent } = useLiveAttendance();

  const { isDark } = useDarkMode();

  // Helper to determine Status Badge Styles
  const getStatusStyles = (type) => {
    const themes = {
      Allowed: isDark
        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
        : "bg-emerald-50 border-emerald-200 text-emerald-600",
      "Access Denied": "bg-amber-500/5 border-amber-500/20 text-amber-400",
      neutral: isDark
        ? "bg-slate-500/50 border-slate-600/50 text-slate-100"
        : "bg-slate-100 border-slate-200 text-slate-500",
    };
    return themes[type] || themes.neutral;
  };

  const getPunctualityDot = (punctuality = "On Time") => {
    const themes = {
      "On Time": "bg-emerald-500",
      Late: "bg-amber-500",
      Early: "bg-cyan-500",
    };
    return themes[punctuality] || themes.neutral;
  };

  const getPunctualityColor = (punctuality = "On Time") => {
    const themes = {
      "On Time": "text-emerald-600",
      Late: "text-amber-600",
      Early: "text-cyan-600",
    };
    return themes[punctuality] || themes.neutral;
  };

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch device logs API
  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const params = {
        page: 1,
        per_page: 200,
        from_date: today,
        to_date: today,
      };
      if (branch_ids?.length > 0) params.branch_ids = branch_ids;
      if (department_ids?.length > 0) params.department_ids = department_ids;
      const response = await getDeviceLogs(params);
      const data = response?.data || response || [];
      console.log("LiveFeed raw response:", response);
      console.log("LiveFeed data array:", data, "length:", data?.length);

      if (!Array.isArray(data)) {
        console.error("LiveFeed: data is not an array", typeof data, data);
        setRecords([]);
        return;
      }

      // Map data to match Vue logic for columns (employee, branch/department, device info, time, in/out, mode, status)
      let result = data.map((e) => {
        // Employee name logic
        const employeeName =
          [e?.employee?.first_name, e?.employee?.last_name]
            .filter(Boolean)
            .join(" ") || "---";
        // Branch/Department logic
        const branchDept =
          [e?.employee?.branch?.branch_name, e?.employee?.department?.name]
            .filter(Boolean)
            .join(" / ") || "---";
        // Device info logic - Use device name and location
        let deviceName = e?.device?.name || "---";
        let deviceLocation = e.gps_location ?? e?.device?.location ?? "---";

        // Direct replacement for "Unknown"
        if (deviceLocation === "Unknown") {
          deviceLocation = "Manual";
        }

        // In/Out logic - In/Out shown as-is; Auto or Option both show as "Auto"
        let inout = "---";
        const lt = String(e.log_type || "").toLowerCase();
        if (lt === "out") inout = "Out";
        else if (lt === "in") inout = "In";
        else if (lt === "auto" || lt === "option") inout = "Auto";
        else if (e.log_type) inout = e.log_type;

        // Mode logic
        let modes = [];
        const isMobileLog = e.DeviceID?.includes("Mobile");
        if (isMobileLog) {
          modes = [baseIcons.Mobile];
        } else if (e.DeviceID?.startsWith("Camera") || e.channel === "camera") {
          modes = [baseIcons.Face];
        } else if (iconGroups[e.mode]) {
          modes = iconGroups[e.mode];
        } else {
          modes = [baseIcons.Device];
        }

        // Mobile logs have no device record, so device.function is null. Show "Auto"
        // since mobile punches auto-resolve in/out (same treatment as option → Auto).
        const resolvedFunction =
          e?.device?.function || (isMobileLog ? "Auto" : "---");

        return {
          ...e,
          id: e?.employee?.employee_id,
          name: employeeName,
          dept: branchDept,
          branchName: e?.employee?.branch?.branch_name || "—",
          departmentName: e?.employee?.department?.name || "—",
          deviceName,
          deviceLocation,
          deviceFunction: resolvedFunction,
          deviceType: e?.device?.device_type || (isMobileLog ? "all" : "---"),
          time: `${e.time}`,
          profile_picture: `${e.employee?.profile_picture}`,
          inout,
          modes,
          // Keep status and punctuality as before
          punctuality: "On Time",
          punctualityColor: "text-emerald-600",
          punctualityDot: "bg-emerald-500",
          status: e.status,
          statusType: "neutral",
        };
      }).sort((a, b) => {
        // Sort by date and time, most recent first
        const aTime = new Date(`${a.date} ${a.time}`);
        const bTime = new Date(`${b.date} ${b.time}`);
        return bTime - aTime;
      });
      setRecords(result);
    } catch (err) {
      console.error("LiveFeed fetch error:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [branch_ids, department_ids]);

  useEffect(() => {
    setPage(1);
  }, [rowsPerPage, records.length]);

  const totalPages = Math.max(1, Math.ceil(records.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const pagedRecords = records.slice(startIdx, startIdx + rowsPerPage);

  useEffect(() => {
    if (!lastAttendanceEvent) return;

    // Optimistically prepend the event so the user sees it immediately,
    // even before the backend has logged it.
    const ev = lastAttendanceEvent;
    const optimistic = {
      id: ev.customId,
      name: ev.personName || "—",
      dept: ev.dept || "—",
      branchName: (ev.dept || "").split("/")[0]?.trim() || "—",
      departmentName: (ev.dept || "").split("/")[1]?.trim() || "—",
      deviceName: ev.location || "—",
      deviceLocation: ev.location || "—",
      deviceFunction: ev.log_type || "Auto",
      time: ev.time || "",
      date: new Date().toISOString().slice(0, 10),
      profile_picture: ev.profile_picture,
      punctuality: ev.punctuality || "On Time",
      punctualityColor: ev.punctualityColor || "text-emerald-600",
      punctualityDot: ev.punctualityDot || "bg-emerald-500",
      status: ev.status || "Allowed",
      statusType: ev.status === "Access Denied" ? "Access Denied" : "Allowed",
      modes: [
        ev.source === "websocket" || ev.source === "mqtt"
          ? baseIcons.Face
          : ev.eventId?.includes("Mobile")
            ? baseIcons.Mobile
            : baseIcons.Face,
      ],
      _optimisticId: ev.eventId,
    };

    setRecords((prev) => {
      // Skip if we've already injected this exact event
      if (prev[0]?._optimisticId === ev.eventId) return prev;
      return [optimistic, ...prev].slice(0, 200);
    });

    // Re-fetch from backend after a short delay so the row gets canonical data.
    const t = setTimeout(() => fetchRecords(), 1500);
    return () => clearTimeout(t);
  }, [lastAttendanceEvent]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 font-display tracking-wide">
            {t('dashboard.feed.title')}
          </h3>

          <RefreshCw
            className={`${isLoading ? "animate-spin" : ""}`}
            onClick={fetchRecords}
            size={16}
          />
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.push("/logs")}
            className="text-sm font-bold text-primary hover:text-gray-600 dark:text-gray-300 transition-colors uppercase tracking-wider"
          >
            {t('dashboard.feed.viewFullLog')}
          </button>
        </div>
      </div>

      {/* Table Header - Equal-width columns */}
      <div className="overflow-x-auto">
      <div className="grid grid-cols-8 px-6 py-3 gap-4 border-y border-gray-200 dark:border-white/5 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-white/[0.02] min-w-[1100px]">
        <div className="text-center">{t('dashboard.feed.colNumber')}</div>
        <div className="text-left">{t('dashboard.feed.colEmployee')}</div>
        <div className="text-center">{t('dashboard.feed.colBranch')}</div>
        <div className="text-center">{t('dashboard.feed.colDepartment')}</div>
        <div className="text-center">{t('dashboard.feed.colDateTime')}</div>
        <div className="text-center">{t('dashboard.feed.colInOut')}</div>
        <div className="text-center">{t('dashboard.feed.colMode')}</div>
        <div className="text-center">{t('dashboard.feed.colDeviceName')}</div>
      </div>

      {/* List Body */}
      <div className="flex-1 overflow-y-auto min-w-[1100px]">
        {pagedRecords.map((item, index) => (
          <div
            key={index}
            onClick={() => setSelectedEmployee(item)}
            className={`grid grid-cols-8 px-6 py-3 gap-4 items-center min-h-[64px] cursor-pointer group transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${index !== pagedRecords.length - 1
              ? "border-b border-gray-100 dark:border-white/5"
              : ""
              }`}
          >
            {/* # */}
            <div className="text-sm text-slate-600 dark:text-slate-300 text-center">
              {startIdx + index + 1}
            </div>

            {/* Employee */}
            <div className="flex gap-3 min-w-0">
              <div className="size-9 min-w-[36px] rounded-full overflow-hidden relative border border-border flex items-center justify-center">
                <ProfilePicture src={item?.profile_picture} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors truncate">
                  {item.name}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  ID: {item.id}
                </span>
              </div>
            </div>

            {/* Branch */}
            <div className="text-sm text-slate-600 dark:text-slate-300 text-center truncate">
              {item.branchName}
            </div>

            {/* Department */}
            <div className="text-sm text-slate-600 dark:text-slate-300 text-center truncate">
              {item.departmentName}
            </div>

            {/* Date & Time */}
            <div className="text-sm text-slate-600 dark:text-slate-300 text-center">
              {item.date} {item.time}
            </div>

            {/* In/Out — Function fixed to In/Out shows that. If device lets the user
                choose (option/auto/all/mobile), show the actual choice from log_type. */}
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">
              {(() => {
                const f = String(item.deviceFunction || "").trim().toLowerCase();
                if (f === "in") return "In";
                if (f === "out") return "Out";
                if (f === "option" || f === "auto" || f === "all" || f === "mobile") {
                  const lt = String(item.log_type || "").trim().toLowerCase();
                  if (lt === "in") return "In";
                  if (lt === "out") return "Out";
                  return "Auto";
                }
                return item.deviceFunction || "—";
              })()}
            </div>

            {/* Mode */}
            <div className="flex items-center justify-center text-slate-600 dark:text-slate-300">
              {item?.modes?.map((icon, idx) => (
                <span key={idx}>{icon}</span>
              ))}
            </div>

            {/* Device Name + Location */}
            <div className="min-w-0 text-center">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate" title={item.deviceName}>
                {item.deviceName}
              </div>
              {item.deviceLocation && item.deviceLocation !== "---" ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={item.deviceLocation}>
                  {item.deviceLocation}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-end gap-6 px-6 py-3 border-t border-gray-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="bg-transparent border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-xs focus:outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <span>
          {records.length === 0
            ? "0 - 0"
            : `${startIdx + 1} - ${Math.min(startIdx + rowsPerPage, records.length)} of ${records.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}

function EmployeeDetailModal({ employee, onClose }) {
  const { t } = useTranslation();
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const employeeId = employee?.employee?.employee_id || employee?.id;

  React.useEffect(() => {
    const run = async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 9);
        const params = {
          page: 1,
          per_page: 500,
          from_date: start.toISOString().slice(0, 10),
          to_date: end.toISOString().slice(0, 10),
        };
        const res = await getDeviceLogs(params);
        const all = Array.isArray(res?.data) ? res.data : [];
        const mine = all.filter(
          (l) => String(l?.employee?.employee_id || l?.UserID || "") === String(employeeId || "")
        );
        const tsOf = (l) => {
          const raw = l?.LogTime || `${l?.date || ""} ${l?.time || ""}`.trim();
          const t = new Date(raw).getTime();
          return Number.isFinite(t) ? t : 0;
        };
        mine.sort((a, b) => tsOf(b) - tsOf(a));
        setLogs(mine);
      } catch (_) {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [employeeId]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isSameDayFmt = (raw) => {
    if (!raw) return false;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10) === todayStr;
    return false;
  };
  const todayLogs = logs.filter((l) => isSameDayFmt(l.edit_date || l.date));
  const firstInToday = todayLogs
    .filter((l) => String(l.log_type || "").toLowerCase() === "in")
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))[0]?.time;
  const lastOutToday = todayLogs
    .filter((l) => String(l.log_type || "").toLowerCase() === "out")
    .sort((a, b) => String(b.time).localeCompare(String(a.time)))[0]?.time;

  // Shift info from schedule (same pattern as access control EmployeeLogsDialog)
  const shift =
    employee?.employee?.schedule?.shift ||
    employee?.schedule?.shift ||
    employee?.employee?.shift ||
    employee?.shift;
  const shiftType =
    employee?.employee?.schedule?.shift_type ||
    employee?.schedule?.shift_type;
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
  logs.forEach((l) => {
    const d = l.edit_date || l.date;
    if (d) dateSet.add(d);
  });
  const presents = dateSet.size;
  const absence = Math.max(0, 10 - presents);
  const incomplete = (() => {
    const byDate = new Map();
    logs.forEach((l) => {
      const d = l.edit_date || l.date;
      if (!d) return;
      if (!byDate.has(d)) byDate.set(d, { hasIn: false, hasOut: false });
      const t = String(l.log_type || "").toLowerCase();
      if (t === "in") byDate.get(d).hasIn = true;
      if (t === "out") byDate.get(d).hasOut = true;
    });
    let c = 0;
    byDate.forEach((v) => { if (v.hasIn !== v.hasOut) c += 1; });
    return c;
  })();
  const manualEntry = logs.filter((l) => String(l?.DeviceID || "").toLowerCase() === "manual").length;

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
          title={t('dashboard.feedDialog.close')}
          className="group absolute top-3 right-3 z-20 h-8 w-8 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 shadow-md hover:bg-rose-500 hover:text-white active:bg-rose-600 hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <X size={16} className="transition-transform duration-200 group-hover:rotate-90" />
        </button>


        <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 px-4 pb-4">
          {/* Row 1: Avatar+name | Stat boxes */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <img
                src={employee?.profile_picture && employee.profile_picture !== "undefined" ? employee.profile_picture : "/avatar-placeholder.png"}
                alt={employee?.name || "Employee"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (!e.target.src.endsWith("/avatar-placeholder.png")) {
                    e.target.src = "/avatar-placeholder.png";
                  }
                }}
              />
            </div>
            <div className="mt-1.5 text-[13px] font-bold text-slate-800 dark:text-white uppercase tracking-wide">
              {employee?.name || "Employee"}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">---</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">---</div>

            {/* Sidebar stats stacked under avatar */}
            <div className="w-full text-xs space-y-2 text-slate-700 dark:text-slate-200 mt-3 text-left">
              <StatRow label={t('dashboard.feedDialog.presents')} value={presents} />
              <StatRow label={t('dashboard.feedDialog.absence')} value={absence} />
              <StatRow label={t('dashboard.feedDialog.incomplete')} value={incomplete} />
              <StatRow label={t('dashboard.feedDialog.manualEntry')} value={manualEntry} />
              <StatRow label={t('dashboard.feedDialog.leaves')} value={0} />
              <StatRow label={t('dashboard.feedDialog.holidays')} value={0} />
            </div>
          </div>

          {/* Right side: shift info on top, table below */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-3 text-center">
                <div className="text-sm text-slate-700 dark:text-white">{t('dashboard.feedDialog.shift')}</div>
                <div className="text-base font-medium text-slate-800 dark:text-white truncate mt-1">{shiftName}</div>
              </div>
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-3 text-center">
                <div className="text-sm text-slate-700 dark:text-white">{t('dashboard.feedDialog.shiftTime')}</div>
                <div className="text-base font-medium text-slate-800 dark:text-white tabular-nums mt-1">{shiftTime}</div>
              </div>
            </div>

            <div className="text-[12px]">
              <div className="grid grid-cols-[28px_1fr_60px_70px] gap-x-3 text-slate-500 dark:text-slate-400 font-semibold text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>#</div>
                <div>{t('dashboard.feedDialog.dateTime')}</div>
                <div>{t('dashboard.feed.colInOut')}</div>
                <div>{t('dashboard.feedDialog.device')}</div>
              </div>
              {loading ? (
                <div className="py-3 text-center text-slate-500 dark:text-slate-400">Loading…</div>
              ) : logs.length === 0 ? (
                <div className="py-3 text-center text-slate-500 dark:text-slate-400">No logs in last 10 days.</div>
              ) : logs.slice(0, 10).map((log, i) => {
                const t = String(log.log_type || "").toLowerCase();
                const label = t === "in" ? "In" : t === "out" ? "Out" : (log.log_type || "—");
                const color = t === "in" ? "text-emerald-600 dark:text-emerald-400" : t === "out" ? "text-rose-600 dark:text-rose-400" : "text-slate-500";
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

function StatBox({ label, value }) {
  return (
    <div className="rounded-md px-3 py-2.5 text-center">
      <div className="text-base font-bold text-slate-800 dark:text-white">{value}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-white tabular-nums">{value}</span>
    </div>
  );
}

export default LiveFeed;
