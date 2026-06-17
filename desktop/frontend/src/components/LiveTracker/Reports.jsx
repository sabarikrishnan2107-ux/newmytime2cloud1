"use client";

import { useState, useEffect, useMemo } from "react";
import { LocateFixed, Download, Loader2, RefreshCw, Smartphone, MapPin } from "lucide-react";
import { getBranches, getDepartmentsByBranchIds, getScheduledEmployeeList, getDeviceLogs } from "@/lib/api";
import { getUser } from "@/config";
import { downloadReport } from "@/lib/endpoint/report";
import PDFProgressOverlay from "@/components/Report/PDFProgressOverlay";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DatePicker from "@/components/ui/DatePicker";
import ProfilePicture from "@/components/ProfilePicture";
import { groupRows } from "@/app/tracker-history/groupRows";

const PDF_SERVICE_BASE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || "http://localhost:3002";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://v2backend.mytime2cloud.com/api";

// HH:MM minus HH:MM → "Xh Ym"
function durationBetween(t1, t2) {
  if (!t1 || !t2) return "—";
  const [h1, m1] = String(t1).split(":").map(Number);
  const [h2, m2] = String(t2).split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return "—";
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Fetch GPS trail for one employee + date from realtime_location (public endpoint)
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
  } catch (_) {
    return [];
  }
}

// Sum haversine deltas + max instantaneous speed (filtering >200km/h GPS jumps)
function statsFromTrail(trail) {
  if (!Array.isArray(trail) || trail.length < 2) {
    return { distanceKm: null, avgSpeed: null, maxSpeed: null };
  }
  let totalKm = 0;
  let maxSpeed = 0;
  const speeds = [];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    const dKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
    totalKm += dKm;
    const dtMs = new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    if (dtMs > 0) {
      const kmh = dKm / (dtMs / 3600000);
      if (Number.isFinite(kmh) && kmh < 200) {
        speeds.push(kmh);
        if (kmh > maxSpeed) maxSpeed = kmh;
      }
    }
  }
  const avgSpeed = speeds.length ? speeds.reduce((s, x) => s + x, 0) / speeds.length : 0;
  return {
    distanceKm: Math.round(totalKm * 10) / 10,
    avgSpeed: Math.round(avgSpeed),
    maxSpeed: Math.round(maxSpeed),
  };
}

// Run async tasks with a concurrency limit so we don't fire 100s of fetches at once
async function runWithConcurrency(tasks, limit = 6) {
  const results = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

// Base64-encode a unicode string (handles non-ASCII in names/locations)
function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export default function LiveTrackerReports() {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState(today);
  const fromDate = selectedDate;
  const toDate = selectedDate;

  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [logs, setLogs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => { try { setBranches(await getBranches()); } catch (_) {} })();
  }, []);

  useEffect(() => {
    (async () => { try { setDepartments(await getDepartmentsByBranchIds(selectedBranchIds)); } catch (_) {} })();
  }, [selectedBranchIds]);

  useEffect(() => {
    (async () => {
      try {
        const result = await getScheduledEmployeeList(selectedDepartmentIds);
        setEmployees((result || []).map((e) => ({ ...e, name: e.full_name + (e.id ? ` (${e.id})` : "") })));
      } catch (_) {}
    })();
  }, [selectedDepartmentIds]);

  const branchNameOf = (id) => branches.find((b) => String(b.id) === String(id))?.name || "";
  const buildBranchLabel = () => {
    if (!selectedBranchIds?.length) return "All Branches";
    if (selectedBranchIds.length === 1) return branchNameOf(selectedBranchIds[0]) || "All Branches";
    return `${selectedBranchIds.length} branches`;
  };

  const handleSubmit = async () => {
    if (!fromDate || !toDate) {
      alert("Please pick a date range.");
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const result = await getDeviceLogs({
        page: 1,
        per_page: 2000,
        sortDesc: "false",
        device_ids: ["Mobile"],
        from_date: fromDate,
        to_date: toDate,
        with_shift_type: 1,
      });
      let rows = Array.isArray(result?.data) ? result.data : [];
      rows = rows.filter(
        (r) => String(r?.DeviceID || "").toLowerCase().includes("mobile") || r?.device?.name?.toLowerCase?.() === "mobile"
      );
      if (selectedBranchIds.length) {
        rows = rows.filter((r) => selectedBranchIds.map(String).includes(String(r?.employee?.branch?.id)));
      }
      if (selectedDepartmentIds.length) {
        rows = rows.filter((r) => selectedDepartmentIds.map(String).includes(String(r?.employee?.department?.id)));
      }
      if (selectedEmployeeIds.length) {
        const want = new Set(selectedEmployeeIds.map(String));
        rows = rows.filter((r) => want.has(String(r?.UserID)) || want.has(String(r?.employee?.id)));
      }
      setLogs(rows);
    } catch (err) {
      setSearchError(err?.message || "Failed to load logs");
      setLogs([]);
    } finally {
      setIsSearching(false);
    }
  };

  const grouped = useMemo(() => groupRows(logs), [logs]);

  const handleDownloadPdf = async () => {
    if (!fromDate || !toDate) {
      alert("Please pick a date range.");
      return;
    }
    const user = getUser();
    const companyId = user?.company_id;
    const companyName = user?.company_name || user?.company?.name || "Company";

    // Build company logo URL (raw filename → full URL via PHOTO_BASE)
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
      // 1. Ensure we have the device logs grouped by employee+date
      let rowsForPdf = grouped;
      if (!hasSearched) {
        const result = await getDeviceLogs({
          page: 1,
          per_page: 2000,
          sortDesc: "false",
          device_ids: ["Mobile"],
          from_date: fromDate,
          to_date: toDate,
          with_shift_type: 1,
        });
        let rawRows = Array.isArray(result?.data) ? result.data : [];
        rawRows = rawRows.filter(
          (r) => String(r?.DeviceID || "").toLowerCase().includes("mobile") || r?.device?.name?.toLowerCase?.() === "mobile"
        );
        if (selectedBranchIds.length)     rawRows = rawRows.filter((r) => selectedBranchIds.map(String).includes(String(r?.employee?.branch?.id)));
        if (selectedDepartmentIds.length) rawRows = rawRows.filter((r) => selectedDepartmentIds.map(String).includes(String(r?.employee?.department?.id)));
        if (selectedEmployeeIds.length) {
          const want = new Set(selectedEmployeeIds.map(String));
          rawRows = rawRows.filter((r) => want.has(String(r?.UserID)) || want.has(String(r?.employee?.id)));
        }
        rowsForPdf = groupRows(rawRows);
        setLogs(rawRows);
        setHasSearched(true);
      }

      // 2. For each grouped row, fetch the GPS trail in parallel (concurrency capped)
      setProgress(15);
      const trailTasks = rowsForPdf.map((row) => async () => {
        const anyLog = row.inLog || row.outLog;
        const userId = anyLog?.UserID;
        const date = anyLog?.date;
        if (!companyId || !userId || !date) return [];
        return fetchTrail(companyId, userId, date);
      });
      const trails = await runWithConcurrency(trailTasks, 6);
      setProgress(45);

      // 3. Build the PDF data payload
      const pdfRows = rowsForPdf.map((row, idx) => {
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

      // 4. Compute totals
      const totals = pdfRows.reduce(
        (acc, r) => {
          if (typeof r.distance_km === "number") acc.distance += r.distance_km;
          acc.stops += r.stops || 0;
          if (typeof r.max_speed === "number" && r.max_speed > acc.maxSpeed) acc.maxSpeed = r.max_speed;
          if (r.status === "LIVE") acc.live += 1;
          // Duration sum
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
      const totalHours = Math.floor(totals.minutes / 60);
      const totalMins = totals.minutes % 60;
      const avgPerEmp = pdfRows.length ? totals.distance / pdfRows.length : 0;

      const payload = {
        rows: pdfRows,
        totals: {
          tracked: pdfRows.length,
          live: totals.live,
          distance: Math.round(totals.distance * 10) / 10,
          active_hours: totalHours,
          active_minutes: totalMins,
          stops: totals.stops,
          avg_per_emp: Math.round(avgPerEmp * 10) / 10,
          max_speed: totals.maxSpeed,
        },
      };

      // 5. Build URL with base64-encoded data
      setProgress(60);
      const params = new URLSearchParams({
        company_id: String(companyId ?? ""),
        from_date: fromDate,
        to_date: toDate,
        api_base: API_BASE,
        company_name: companyName,
        branch_name: buildBranchLabel(),
      });
      if (companyLogo) params.set("company_logo", companyLogo);
      params.set("data", b64encode(JSON.stringify(payload)));

      const templateUrl = `${PDF_SERVICE_BASE}/live-tracker-report/?${params.toString()}`;
      const filename = fromDate === toDate
        ? `Live-Tracker-Report-${fromDate}.pdf`
        : `Live-Tracker-Report-${fromDate}-to-${toDate}.pdf`;

      await downloadReport(templateUrl, filename, (p) => setProgress(Math.max(60, p)));
    } catch (err) {
      alert(`Download failed: ${err.message || "Unknown error"}`);
    } finally {
      setTimeout(() => { setIsDownloading(false); setProgress(0); }, 1000);
    }
  };

  return (
    <div className="space-y-5">
      <PDFProgressOverlay isOpen={isDownloading} progress={progress} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">Live Tracking Report</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Generate and download the Live Tracking movement report for employees tracked via the mobile app.
        </p>
      </div>

      {/* Filter + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Branch"
            items={branches}
            value={selectedBranchIds}
            onChange={setSelectedBranchIds}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Department"
            items={departments}
            value={selectedDepartmentIds}
            onChange={setSelectedDepartmentIds}
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
          <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder="Date" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={isSearching}
            className="inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-5 text-xs font-semibold text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-px transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Submit
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-5 text-xs font-semibold text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-px transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download
          </button>
        </div>
      </div>

      {/* Preview table (always visible; populates after Submit) */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-[1]">
              <tr>
                <Th>Employee</Th>
                <Th>Branch / Dept</Th>
                <Th>Date</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Duration</Th>
                <Th>Stops</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
                {!hasSearched && !isSearching && (
                  <tr><td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">Pick filters and click <span className="text-primary font-semibold">Submit</span> to load the report.</td></tr>
                )}
                {isSearching && (
                  <tr><td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">Loading…</td></tr>
                )}
                {hasSearched && !isSearching && searchError && (
                  <tr><td colSpan={8} className="p-6 text-center text-red-500">{searchError}</td></tr>
                )}
                {hasSearched && !isSearching && !searchError && grouped.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">No mobile clock-ins found for {fromDate}.</td></tr>
                )}
                {hasSearched && !isSearching && !searchError && grouped.map((row) => {
                  const anyLog = row.inLog || row.outLog;
                  const emp = anyLog?.employee || {};
                  const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
                  const branchName = emp?.branch?.branch_name || "—";
                  const deptName = emp?.department?.name || "—";
                  const inLoc = row?.inLog?.gps_location || row?.inLog?.device?.location;
                  const outLoc = row?.outLog?.gps_location || row?.outLog?.device?.location;
                  const stops = 1 + (row?.extraPunches?.length || 0) + (row?.outLog ? 1 : 0);
                  const duration = durationBetween(row?.inLog?.time, row?.outLog?.time);
                  let status = "COMPLETED";
                  let statusColor = "text-emerald-500";
                  if (row?.inLog && !row?.outLog) { status = "LIVE"; statusColor = "text-rose-500"; }
                  else if (!inLoc && !outLoc) { status = "PARTIAL GPS"; statusColor = "text-amber-500"; }

                  return (
                    <tr key={row.key} className="border-t border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 align-top">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <ProfilePicture src={emp.profile_picture} />
                          <div>
                            <div className="text-slate-700 dark:text-slate-200 font-medium">{fullName || "—"}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">ID: {emp.employee_id || anyLog?.UserID}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="text-slate-700 dark:text-slate-200">{branchName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{deptName}</div>
                      </Td>
                      <Td>{anyLog?.date || "—"}</Td>
                      <Td>
                        {row.inLog ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {row.inLog.time}
                            </span>
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
                      <Td><span className="text-slate-600 dark:text-slate-300">{duration}</span></Td>
                      <Td><span className="text-amber-600 dark:text-amber-400 font-semibold">{stops}</span></Td>
                      <Td><span className={`text-[11px] font-bold ${statusColor}`}>{status}</span></Td>
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

function Th({ children }) {
  return <th className="px-3.5 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 align-middle">{children}</td>;
}
