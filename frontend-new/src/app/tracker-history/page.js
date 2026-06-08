"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HistoryReplay from "@/components/Map/HistoryReplay";
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";
import { getDeviceLogs, getBranches, getDepartmentsByBranchIds, getScheduledEmployeeList } from "@/lib/api";
import { MapPin, Search, Smartphone, Download, RefreshCw, Loader2 } from "lucide-react";
import { downloadReport } from "@/lib/endpoint/report";
import PDFProgressOverlay from "@/components/Report/PDFProgressOverlay";

const PDF_SERVICE_BASE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || "http://localhost:3002";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://v2backend.mytime2cloud.com/api";

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
async function fetchTrail(companyId, userId, date) {
  const url = `${API_BASE}/realtime_location?company_id=${companyId}&UserID=${encodeURIComponent(userId)}&date=${date}&per_page=5000`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data?.data || [];
    return rows
      .filter((r) => !Number.isNaN(parseFloat(r.latitude)) && !Number.isNaN(parseFloat(r.longitude)))
      .map((r) => ({ lat: parseFloat(r.latitude), lng: parseFloat(r.longitude), datetime: r.datetime }))
      .sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
  } catch (_) { return []; }
}
function statsFromTrail(trail) {
  if (!Array.isArray(trail) || trail.length < 2) return { distanceKm: null, avgSpeed: null, maxSpeed: null };
  let totalKm = 0, maxSpeed = 0; const speeds = [];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i];
    const dKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
    totalKm += dKm;
    const dtMs = new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    if (dtMs > 0) {
      const kmh = dKm / (dtMs / 3600000);
      if (Number.isFinite(kmh) && kmh < 200) { speeds.push(kmh); if (kmh > maxSpeed) maxSpeed = kmh; }
    }
  }
  const avgSpeed = speeds.length ? speeds.reduce((s, x) => s + x, 0) / speeds.length : 0;
  return { distanceKm: Math.round(totalKm * 10) / 10, avgSpeed: Math.round(avgSpeed), maxSpeed: Math.round(maxSpeed) };
}
async function runWithConcurrency(tasks, limit = 6) {
  const results = new Array(tasks.length); let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) { const i = next++; if (i >= tasks.length) return; results[i] = await tasks[i](); }
  });
  await Promise.all(workers);
  return results;
}
function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
function durationBetween(t1, t2) {
  if (!t1 || !t2) return "—";
  const [h1, m1] = String(t1).split(":").map(Number);
  const [h2, m2] = String(t2).split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return "—";
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
import ProfilePicture from "@/components/ProfilePicture";
import DatePicker from "@/components/ui/DatePicker";
import DropDown from "@/components/ui/DropDown";
import MultiDropDown from "@/components/ui/MultiDropDown";
import { groupRows } from "./groupRows";

function TrackerHistoryInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    try {
      const user = getUser();
      setCompanyId(user?.company_id ?? null);
    } catch (_) {
      setCompanyId(null);
    }
  }, []);

  const userId = params.get("user_id");
  const dateParam = params.get("date");
  const fromTime = params.get("from_time");
  const toTime = params.get("to_time");
  const name = params.get("name") || `Employee ${userId || ""}`;
  const avatar = params.get("avatar") || "";
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  if (companyId === null) {
    return <div className="p-10 text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  if (userId) {
    return (
      <HistoryReplay
        employee={{ id: userId, name, avatar }}
        companyId={companyId}
        apiKey={apiKey}
        date={dateParam}
        fromTime={fromTime}
        toTime={toTime}
        layout="page"
        onClose={() => router.push("/tracker-history")}
      />
    );
  }

  return <TrackerHistoryPicker router={router} initialDate={dateParam} />;
}

function TrackerHistoryPicker({ router, initialDate }) {
  const user = getUser();
  const canCreate = can(user, "live_tracker", "tracker-history", "create");
  const canEdit = can(user, "live_tracker", "tracker-history", "edit");
  const canDelete = can(user, "live_tracker", "tracker-history", "delete");
  const canView = can(user, "live_tracker", "tracker-history", "view");

  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDeviceLogs({
      page: 1,
      per_page: 1000,
      sortDesc: "false",
      device_ids: ["Mobile"],
      from_date: selectedDate,
      to_date: selectedDate,
      with_shift_type: 1,
    })
      .then((result) => {
        const rows = Array.isArray(result?.data) ? result.data : [];
        const mobile = rows.filter(
          (r) => String(r?.DeviceID || "").toLowerCase().includes("mobile") || r?.device?.name?.toLowerCase?.() === "mobile"
        );
        setLogs(mobile);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load logs");
        setLoading(false);
      });
  }, [selectedDate, refreshKey]);

  const handleDownloadPdf = async () => {
    const user = getUser();
    const companyId = user?.company_id;
    const companyName = user?.company_name || user?.company?.name || "Company";
    let branchName = "All Branches";
    if (selectedBranchIds.length === 1) {
      branchName = branches.find((b) => String(b.id) === String(selectedBranchIds[0]))?.name || "All Branches";
    } else if (selectedBranchIds.length > 1) {
      branchName = `${selectedBranchIds.length} branches`;
    }

    const PHOTO_BASE = API_BASE.replace(/\/api\/?$/, "");
    const rawLogo = user?.logo || user?.company_logo || user?.company?.logo;
    let companyLogo = "";
    if (rawLogo && typeof rawLogo === "string") {
      companyLogo = (rawLogo.startsWith("http://") || rawLogo.startsWith("https://") || rawLogo.startsWith("data:"))
        ? rawLogo
        : `${PHOTO_BASE}/media/company/logo/${rawLogo}`;
    }

    setIsDownloading(true);
    setProgress(0);
    try {
      // Use the already-loaded + filtered + grouped logs
      const visibleRows = filtered;

      setProgress(15);
      const trailTasks = visibleRows.map((row) => async () => {
        const anyLog = row.inLog || row.outLog;
        const userId = anyLog?.UserID;
        const date = anyLog?.date;
        if (!companyId || !userId || !date) return [];
        return fetchTrail(companyId, userId, date);
      });
      const trails = await runWithConcurrency(trailTasks, 6);
      setProgress(45);

      const pdfRows = visibleRows.map((row, idx) => {
        const anyLog = row.inLog || row.outLog;
        const emp = anyLog?.employee || {};
        const trail = trails[idx] || [];
        const { distanceKm, avgSpeed, maxSpeed } = statsFromTrail(trail);
        const inLoc = row?.inLog?.gps_location || row?.inLog?.device?.location || "";
        const outLoc = row?.outLog?.gps_location || row?.outLog?.device?.location || "";
        const stops = (row?.inLog ? 1 : 0) + (row?.extraPunches?.length || 0) + (row?.outLog ? 1 : 0);
        const isLive = row?.inLog && !row?.outLog;
        const noGps = !inLoc && !outLoc && distanceKm == null;
        const status = isLive ? "LIVE" : noGps ? "PARTIAL GPS" : "COMPLETED";
        return {
          first_name: emp.first_name || "",
          last_name: emp.last_name || "",
          full_name: [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim() || `Employee ${anyLog?.UserID || ""}`,
          employee_id: emp.employee_id || anyLog?.UserID || "",
          profile_picture: emp.profile_picture || "",
          branch_name: emp?.branch?.branch_name || "—",
          dept_name: emp?.department?.name || "—",
          date: anyLog?.date || "",
          in_time: row?.inLog?.time || "",
          in_location: inLoc,
          out_time: row?.outLog?.time || "",
          out_location: outLoc,
          duration: durationBetween(row?.inLog?.time, row?.outLog?.time),
          distance_km: distanceKm,
          stops,
          avg_speed: avgSpeed,
          max_speed: maxSpeed,
          status,
        };
      });

      const totals = pdfRows.reduce(
        (acc, r) => {
          if (typeof r.distance_km === "number") acc.distance += r.distance_km;
          acc.stops += r.stops || 0;
          if (typeof r.max_speed === "number" && r.max_speed > acc.maxSpeed) acc.maxSpeed = r.max_speed;
          if (r.status === "LIVE") acc.live += 1;
          if (r.in_time && r.out_time) {
            const [h1, m1] = r.in_time.split(":").map(Number);
            const [h2, m2] = r.out_time.split(":").map(Number);
            let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (mins < 0) mins += 24 * 60;
            acc.minutes += mins;
          }
          return acc;
        },
        { distance: 0, stops: 0, maxSpeed: 0, live: 0, minutes: 0 }
      );
      const payload = {
        rows: pdfRows,
        totals: {
          tracked: pdfRows.length,
          live: totals.live,
          distance: Math.round(totals.distance * 10) / 10,
          active_hours: Math.floor(totals.minutes / 60),
          active_minutes: totals.minutes % 60,
          stops: totals.stops,
          avg_per_emp: pdfRows.length ? Math.round((totals.distance / pdfRows.length) * 10) / 10 : 0,
          max_speed: totals.maxSpeed,
        },
      };

      setProgress(60);
      const params = new URLSearchParams({
        company_id: String(companyId ?? ""),
        from_date: selectedDate,
        to_date: selectedDate,
        api_base: API_BASE,
        company_name: companyName,
        branch_name: branchName,
      });
      if (companyLogo) params.set("company_logo", companyLogo);
      params.set("data", b64encode(JSON.stringify(payload)));
      const templateUrl = `${PDF_SERVICE_BASE}/live-tracker-report/?${params.toString()}`;
      const filename = `Live-Tracker-Report-${selectedDate}.pdf`;
      await downloadReport(templateUrl, filename, (p) => setProgress(Math.max(60, p)));
    } catch (err) {
      alert(`Download failed: ${err.message || "Unknown error"}`);
    } finally {
      setTimeout(() => { setIsDownloading(false); setProgress(0); }, 1000);
    }
  };

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    (async () => { try { setBranches(await getBranches()); } catch (_) {} })();
  }, []);

  useEffect(() => {
    (async () => { try { setDepartments(await getDepartmentsByBranchIds(selectedBranchIds)); } catch (_) {} })();
  }, [selectedBranchIds]);

  useEffect(() => {
    (async () => {
      try {
        const result = await getScheduledEmployeeList(selectedDeptIds);
        setEmployees((result || []).map((e) => ({ ...e, name: e.full_name + (e.id ? ` (${e.id})` : "") })));
      } catch (_) {}
    })();
  }, [selectedDeptIds]);

  const filtered = useMemo(() => {
    const wantBranch = new Set(selectedBranchIds.map(String));
    const wantDept = new Set(selectedDeptIds.map(String));
    const wantEmp = new Set(selectedEmployeeIds.map(String));
    const filteredLogs = logs.filter((l) => {
      const bId = l?.employee?.branch?.id;
      const dId = l?.employee?.department?.id;
      if (wantBranch.size && !wantBranch.has(String(bId))) return false;
      if (wantDept.size && !wantDept.has(String(dId))) return false;
      if (wantEmp.size && !wantEmp.has(String(l?.UserID))) return false;
      return true;
    });
    return groupRows(filteredLogs);
  }, [logs, selectedBranchIds, selectedDeptIds, selectedEmployeeIds]);

  const toIsoDate = (raw) => {
    if (!raw) return selectedDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return selectedDate;
  };

  const openHistory = (row) => {
    const anyLog = row?.inLog || row?.outLog;
    const emp = anyLog?.employee || {};
    const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim() || `Employee ${anyLog?.UserID || ""}`;
    const isoDate = anyLog?.edit_date || toIsoDate(anyLog?.date);
    const params = {
      user_id: String(anyLog?.UserID || ""),
      date: isoDate,
      name: fullName,
      avatar: emp.profile_picture || "",
    };
    if (row?.inLog?.time) params.from_time = row.inLog.time;
    if (row?.outLog?.time) params.to_time = row.outLog.time;
    router.push(`/tracker-history?${new URLSearchParams(params).toString()}`);
  };

  const ctl = "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-xl px-4 h-11 text-sm w-[180px] focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="p-6 min-h-[calc(100vh-70px)] text-slate-700 dark:text-slate-200">
      <div className="flex items-center gap-2 mb-5">
        <MapPin size={22} className="text-primary" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tracker History</h1>
      </div>

      <PDFProgressOverlay isOpen={isDownloading} progress={progress} />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Branch"
            items={branches}
            value={selectedBranchIds}
            onChange={(v) => { setSelectedBranchIds(v); setSelectedDeptIds([]); setSelectedEmployeeIds([]); }}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Department"
            items={departments}
            value={selectedDeptIds}
            onChange={(v) => { setSelectedDeptIds(v); setSelectedEmployeeIds([]); }}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[220px]">
          <MultiDropDown
            placeholder="Employees"
            items={employees}
            value={selectedEmployeeIds}
            onChange={setSelectedEmployeeIds}
            badgesCount={1}
          />
        </div>
        <div className="flex items-center min-w-[180px] h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden">
          <DatePicker value={selectedDate} onChange={(d) => setSelectedDate(d)} placeholder="Date" />
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-5 text-xs font-semibold text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-px transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Submit
        </button>
        {canView && (
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading || loading || filtered.length === 0}
            className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-5 text-xs font-semibold text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-px transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-[1]">
              <tr>
                <Th>Personnel</Th>
                <Th>Branch / Department</Th>
                <Th>Date</Th>
                <Th>Login</Th>
                <Th>Logout</Th>
                <Th>Shift</Th>
                <Th>Mode</Th>
                <Th>Location</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">Loading logs…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={8} className="p-6 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">No mobile clock-ins found for {selectedDate}.</td></tr>
              )}
              {!loading && !error && filtered.map((row) => {
                const anyLog = row.inLog || row.outLog;
                const emp = anyLog?.employee || {};
                const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
                const branchName = emp?.branch?.branch_name || "—";
                const deptName = emp?.department?.name || "—";
                const inLoc = row?.inLog?.gps_location || row?.inLog?.device?.location;
                const outLoc = row?.outLog?.gps_location || row?.outLog?.device?.location;
                return (
                  <tr key={row.key} className={`${row.groupRowIndex === 0 ? "border-t border-gray-100 dark:border-slate-800" : ""} hover:bg-gray-50 dark:hover:bg-slate-800/50 align-top`}>
                    {row.groupRowIndex === 0 && (
                      <>
                        <Td rowSpan={row.groupRowCount}>
                          <div className="flex items-center gap-2.5">
                            <ProfilePicture src={emp.profile_picture} />
                            <div>
                              <div className="text-slate-700 dark:text-slate-200 font-medium">{fullName || "—"}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">ID: {emp.employee_id || anyLog?.UserID}</div>
                            </div>
                          </div>
                        </Td>
                        <Td rowSpan={row.groupRowCount}>{branchName} / {deptName}</Td>
                        <Td rowSpan={row.groupRowCount}>{anyLog?.date || "—"}</Td>
                      </>
                    )}
                    <Td>
                      {row.inLog ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {row.inLog.time}
                          </span>
                          {row.extraPunches && row.extraPunches.length > 0 && (
                            <span
                              className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-help"
                              title={row.extraPunches.map((p) => `${p.time} ${String(p.log_type || "").toUpperCase()}`).join("\n")}
                            >
                              +{row.extraPunches.length} punches
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={inLoc || ""}>
                            {inLoc || "—"}
                          </span>
                        </div>
                      ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </Td>
                    <Td>
                      {row.outLog ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {row.outLog.time}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={outLoc || ""}>
                            {outLoc || "—"}
                          </span>
                        </div>
                      ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </Td>
                    <Td>
                      {row.shiftLabel && row.shiftLabel !== "—" ? (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.shiftLabel}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
                      )}
                    </Td>
                    <Td><Smartphone size={16} className="text-slate-400 dark:text-slate-500" /></Td>
                    <Td>
                      <button
                        onClick={() => openHistory(row)}
                        title="Play movement between these times"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-sm transition"
                      >
                        <MapPin size={14} />
                        Play
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">{label}</span>
      {children}
    </label>
  );
}

function Th({ children }) {
  return <th className="px-3.5 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">{children}</th>;
}
function Td({ children, rowSpan }) {
  return <td rowSpan={rowSpan} className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 align-middle">{children}</td>;
}

export default function TrackerHistoryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-slate-500 dark:text-slate-400">Loading…</div>}>
      <TrackerHistoryInner />
    </Suspense>
  );
}
