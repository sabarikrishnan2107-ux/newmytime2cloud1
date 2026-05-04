"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, FileText, LogIn, LogOut, ScanFace, KeyRound, Fingerprint, CreditCard, Smartphone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

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

export function LogTable({ logs = [], isLoading = false, onRowClick }) {
  const [page, setPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const ts = (l) => `${l?.date || ""} ${l?.time || ""}`;
    return [...logs].sort((a, b) => sortDesc ? ts(b).localeCompare(ts(a)) : ts(a).localeCompare(ts(b)));
  }, [logs, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Access Log History</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> LIVE
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {sorted.length.toLocaleString()} record{sorted.length !== 1 && "s"} · auto-refreshing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(sorted)}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-95">
            <FileText className="mr-1.5 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">
                <button onClick={() => setSortDesc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">
                  Date Time <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Device</th>
              <th className="px-3 py-3">Branch</th>
              <th className="px-3 py-3">Mode</th>
              <th className="px-5 py-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && slice.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">No logs match your filters.</td></tr>
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
                      {!out ? "IN" : "OUT"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>Page {safePage + 1} of {totalPages}</span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
