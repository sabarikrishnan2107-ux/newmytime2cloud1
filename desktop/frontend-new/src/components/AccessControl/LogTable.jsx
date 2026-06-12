"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, FileText, LogIn, LogOut, ScanFace, KeyRound, Fingerprint, CreditCard, Smartphone, QrCode, Loader2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadReport } from "@/lib/endpoint/report";
import { API_BASE_URL, getUser } from "@/config";
import PDFProgressOverlay from "@/components/Report/PDFProgressOverlay";
import TimeRangePopover from "@/components/AccessControl/TimeRangePopover";

const PAGE_SIZE = 12;

// Compact circular progress ring used inside the Download PDF button while
// the report is rendering. Stroke-dashoffset gives the filling-up effect.
function ProgressRing({ value = 0, size = 16, stroke = 2.5, className = "" }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dashOffset = circumference * (1 - clamped / 100);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: "stroke-dashoffset 200ms ease-out" }}
      />
    </svg>
  );
}

function modeIcon(mode) {
  const m = String(mode || "").toLowerCase();
  if (m.includes("face")) return ScanFace;
  if (m.includes("finger")) return Fingerprint;
  if (m.includes("card") || m.includes("rfid")) return CreditCard;
  if (m.includes("pin") || m.includes("password")) return KeyRound;
  if (m.includes("qr")) return QrCode;
  if (m.includes("mobile") || m.includes("phone")) return Smartphone;
  return ScanFace;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDateTime(date, time) {
  let dateStr = "";
  if (date) {
    const m = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const yy = m[1].slice(2);
      const mon = MONTHS[parseInt(m[2], 10) - 1] || m[2];
      dateStr = `${m[3]}-${mon}-${yy}`;
    } else {
      dateStr = String(date);
    }
  }
  const timeStr = time ? String(time).slice(0, 5) : "";
  return [dateStr, timeStr].filter(Boolean).join(" ");
}

function isOut(l) {
  if (typeof l?._isOut === "boolean") return l._isOut;
  const f = (l?.device?.function || "").toLowerCase();
  const t = (l?.log_type || l?.LogType || "").toLowerCase();
  if (f === "out" || t === "out") return true;
  if (f === "in" || t === "in") return false;
  const dev = String(l?.DeviceID || l?.device_id || l?.device?.device_id || "").toLowerCase();
  return !dev.includes("in");
}
function logKey(l, idx) { return l?.id ?? l?.log_id ?? `${l?.employee?.id ?? "?"}-${l?.date ?? ""}-${l?.time ?? ""}-${idx}`; }

function exportCsv(logs) {
  const headers = ["Employee", "ID", "Department", "Device", "Branch", "Type", "Date", "Time", "Mode"];
  const rows = logs.map((l) => [
    l?.employee?.full_name || "",
    l?.employee?.employee_id || "",
    l?.employee?.department?.name || "",
    l?.device?.name || "",
    l?.employee?.branch?.branch_name || "",
    isOut(l) ? "OUT" : "IN",
    l?.date || "",
    l?.time || "",
    l?.mode || "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `access-logs-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Trim "HH:MM:SS" → "HH:MM" so native time inputs (HH:MM) can compare it cleanly.
function trimToHHMM(t) {
  if (!t) return "";
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : String(t).slice(0, 5);
}

export function LogTable({ logs = [], isLoading = false, onRowClick, filters = null, branches = [], devices = [], employees = [] }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setPdfProgress(0);
    try {
      const user = await getUser();
      const PDF_SERVICE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || "http://localhost:3002";
      const SUMMARY_BASE = process.env.NEXT_PUBLIC_SUMMARY_REPORT_URL || `${PDF_SERVICE}/templates`;

      const branchId = filters?.branchIds?.[0];
      const deviceId = filters?.deviceIds?.[0];
      const employeeId = filters?.employeeIds?.[0];

      const branchName = branchId ? (branches.find((b) => String(b.id) === String(branchId))?.branch_name || branches.find((b) => String(b.id) === String(branchId))?.name) : "";
      const deviceName = deviceId ? (devices.find((d) => String(d.id) === String(deviceId))?.name) : "";
      const employeeName = employeeId ? (employees.find((e) => String(e.id) === String(employeeId))?.name) : "";

      const paramsObj = {
        api_base: API_BASE_URL,
        company_id: user?.company_id ?? "",
        company_name: user?.company_name || user?.company?.name || "Company",
        from_date: filters?.fromDate || "",
        to_date: filters?.toDate || "",
      };
      if (branchId) { paramsObj.branch_id = branchId; if (branchName) paramsObj.branch_name = branchName; }
      if (deviceId) { paramsObj.device_id = deviceId; if (deviceName) paramsObj.device_name = deviceName; }
      if (employeeId) { paramsObj.employee_id = employeeId; if (employeeName) paramsObj.employee_name = employeeName; }
      if (filters?.userType) paramsObj.user_type = filters.userType;
      if (timeFrom) paramsObj.time_from = timeFrom;
      if (timeTo)   paramsObj.time_to   = timeTo;

      const params = new URLSearchParams(paramsObj);
      const url = `${SUMMARY_BASE}/access-control-report/sample.html?${params.toString()}`;
      const fileName = `Access_Control_Report_${filters?.fromDate || "report"}${filters?.toDate && filters.toDate !== filters?.fromDate ? `_to_${filters.toDate}` : ""}.pdf`;

      await downloadReport(url, fileName, (p) => setPdfProgress(p));
    } catch (err) {
      console.error("Download PDF failed", err);
      alert(t("accessControl.table.downloadFailed", { error: err?.message || "Unknown error" }));
    } finally {
      // Brief delay so the user actually sees 100% before the button resets.
      setTimeout(() => {
        setIsDownloadingPdf(false);
        setPdfProgress(0);
      }, 600);
    }
  };

  const filteredByTime = useMemo(() => {
    if (!timeFrom && !timeTo) return logs;
    const lo = timeFrom || "00:00";
    const hi = timeTo   || "23:59";
    return logs.filter((l) => {
      const t = trimToHHMM(l?.time);
      if (!t) return false;
      return t >= lo && t <= hi;
    });
  }, [logs, timeFrom, timeTo]);

  const sorted = useMemo(() => {
    const ts = (l) => `${l?.date || ""} ${l?.time || ""}`;
    return [...filteredByTime].sort((a, b) => sortDesc ? ts(b).localeCompare(ts(a)) : ts(a).localeCompare(ts(b)));
  }, [filteredByTime, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{t("accessControl.table.title")}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> {t("accessControl.table.live")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("accessControl.table.records", { count: sorted.length })}
            {(timeFrom || timeTo) && (
              <span className="ml-1 text-cyan-500">
                · {t("accessControl.table.timeFiltered")}{" "}
                {timeFrom && timeTo ? `${timeFrom}–${timeTo}` :
                 timeFrom ? t("accessControl.table.from", { time: timeFrom }) : t("accessControl.table.until", { time: timeTo })}
              </span>
            )}
            {!(timeFrom || timeTo) && ` · ${t("accessControl.table.autoRefreshing")}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time-of-day filter */}
          <TimeRangePopover
            timeFrom={timeFrom}
            timeTo={timeTo}
            onChange={(f, t) => { setTimeFrom(f); setTimeTo(t); }}
            onClear={() => { setTimeFrom(""); setTimeTo(""); }}
          />

          <Button variant="outline" size="sm" onClick={() => exportCsv(sorted)}>
            <Download className="mr-1.5 h-4 w-4" /> {t("accessControl.table.exportCsv")}
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="bg-gradient-primary text-primary-foreground hover:opacity-95 disabled:opacity-60"
          >
            {isDownloadingPdf ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-1.5 h-4 w-4" />
            )}
            {isDownloadingPdf ? t("accessControl.table.generating") : t("accessControl.table.downloadPdf")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">
                <button onClick={() => setSortDesc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">
                  {t("accessControl.table.colDateTime")} <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3">{t("accessControl.table.colEmployee")}</th>
              <th className="px-3 py-3">{t("accessControl.table.colId")}</th>
              <th className="px-3 py-3">{t("accessControl.table.colDevice")}</th>
              <th className="px-3 py-3">{t("accessControl.table.colBranch")}</th>
              <th className="px-3 py-3">{t("accessControl.table.colMode")}</th>
              <th className="px-5 py-3">{t("accessControl.table.colType")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">{t("accessControl.table.loading")}</td></tr>
            )}
            {!isLoading && slice.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">{t("accessControl.table.noLogs")}</td></tr>
            )}
            {!isLoading && slice.map((l, i) => {
              const employee = l?.employee || {};
              const name = employee.full_name || "—";
              const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
              const VIcon = modeIcon(l?.mode);
              const out = isOut(l);
              return (
                <tr
                  key={logKey(l, i)}
                  onClick={() => onRowClick && onRowClick(l)}
                  className={cn(
                    "border-t border-border transition-colors hover:bg-muted/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  <td className="px-5 py-3 text-xs tabular-nums text-foreground whitespace-nowrap">{fmtDateTime(l?.date, l?.time)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {employee.profile_picture ? (
                        <img alt={name} src={employee.profile_picture} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                          {initials || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{employee.department?.name || employee.designation?.title || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-700 dark:text-white tabular-nums">{employee.employee_id || "—"}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-white">{l?.device?.name || "—"}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-white">{employee.branch?.branch_name || "—"}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-white">
                      <VIcon className="h-3.5 w-3.5" />
                      {l?.mode ? <span>{l.mode}</span> : null}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      !out ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {!out ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                      {!out ? t("accessControl.table.in") : t("accessControl.table.out")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>{t("accessControl.table.pageOf", { page: safePage + 1, total: totalPages })}</span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PDFProgressOverlay isOpen={isDownloadingPdf} progress={Math.round(pdfProgress)} />
    </div>
  );
}
