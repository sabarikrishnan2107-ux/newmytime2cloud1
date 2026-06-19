"use client";

// Tailwind safelist (do not remove): bg-amber-500/10 text-amber-400 border-amber-500/20 bg-amber-400 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 bg-emerald-400 bg-rose-500/10 text-rose-400 border-rose-500/20 bg-rose-400 bg-slate-500/10 text-slate-400 border-slate-500/20 bg-slate-400

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, IdCard, Briefcase, MapPin, Building, Calendar, Sun, Mail, Phone, User, Paperclip, FileText, BarChart3, TrendingUp, LineChart as LineIcon, AreaChart as AreaIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { getLeavesRequest, approveLeave, rejectLeave, getLeaveDocuments, uploadLeaveDocuments, getLeaveTypesByGroupId } from "@/lib/endpoint/leaves";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function TypeChip({ name }) {
  const color = colorForType(name);
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `${color}22`, color }}>
      {name || "—"}
    </span>
  );
}

function InfoCard({ icon: Icon, label, value, accent = "#8b5cf6", required }) {
  const hasValue = value && value !== "—" && String(value).trim() !== "";
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.03]">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
        style={{ background: `${accent}15`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}22` }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[9px] uppercase font-medium tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</p>
          {required && <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />}
        </div>
        <p className={`text-[15px] font-medium leading-tight truncate mt-0.5 ${hasValue ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
          {hasValue ? value : "—"}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ label, accent }) {
  return (
    <div className="flex items-center gap-3 mb-3 px-3">
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full px-3 ring-1" style={{ background: `${accent}15`, color: accent, "--tw-ring-color": `${accent}33` }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em]">{label}</span>
      </span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${accent}33, transparent)` }} />
    </div>
  );
}

const TABS = ["Personal", "Leave Info", "Documents", "Activity"];

const TYPE_COLORS = {
  annual: "#3b82f6", sick: "#06b6d4", casual: "#10b981",
  emergency: "#f59e0b", maternity: "#ec4899", unpaid: "#64748b",
  wfh: "#0ea5e9", comp: "#a855f7",
};
const FALLBACK_COLORS = ["#8b5cf6", "#14b8a6", "#f43f5e", "#a855f7", "#84cc16"];
const colorForType = (name, idx = 0) => {
  const k = (name || "").toLowerCase().split(" ")[0];
  return TYPE_COLORS[k] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
};
const fmtDate = (s) => (s ? String(s).split("T")[0] : "—");

function Avatar({ name, src, size = 36 }) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["bg-emerald-500","bg-sky-500","bg-amber-500","bg-pink-500","bg-violet-500","bg-rose-500","bg-cyan-500","bg-indigo-500"];
  const hash = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  if (showImage) {
    return <img src={src} alt={name || ""} onError={() => setErrored(true)} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className={`${bg} text-white font-medium rounded-full flex items-center justify-center text-xs shrink-0`} style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = {
    0: { label: "Pending", color: "amber" },
    1: { label: "Approved", color: "emerald" },
    2: { label: "Rejected", color: "rose" },
  }[status] || { label: "—", color: "slate" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20 px-2.5 py-0.5 text-[11px] font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-${cfg.color}-400`} />
      {cfg.label}
    </span>
  );
}

function LeaveViewInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get("id");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(idParam ? Number(idParam) : null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Personal");
  const [chartType, setChartType] = useState("area");
  const [leaveDocuments, setLeaveDocuments] = useState([]);
  const [decisionDialog, setDecisionDialog] = useState({ open: false, action: null, notes: "", file: null });
  const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);
  const [leaveQuota, setLeaveQuota] = useState([]); // [{ name, total, used }]

  const fetchRows = async () => {
    setLoading(true);
    try {
      const result = await getLeavesRequest({ page: 1, per_page: 500, sortDesc: "false" });
      const list = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      setRows(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(); }, []);

  useEffect(() => {
    if (idParam) setSelectedId(Number(idParam));
  }, [idParam]);

  const leave = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);
  const employee = leave?.employee;

  useEffect(() => {
    if (!leave?.id) { setLeaveDocuments([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getLeaveDocuments({ leave_id: leave.id, employee_id: employee?.id });
        if (!cancelled) setLeaveDocuments(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setLeaveDocuments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [leave?.id, employee?.id]);

  // Fetch all leave quotas (per leave type) for the employee.
  useEffect(() => {
    const groupId = employee?.leave_group_id || employee?.leave_group?.id;
    const employeeId = employee?.id;
    if (!groupId || !employeeId) { setLeaveQuota([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getLeaveTypesByGroupId(groupId, { per_page: 1000, employee_id: employeeId });
        const list = (Array.isArray(data) ? data : []).map((e) => ({
          name: e?.leave_type?.name || e?.leave_type?.short_name || `Type ${e?.leave_type_id || ""}`,
          total: Number(e?.leave_type_count) || 0,
          used: Number(e?.employee_used) || 0,
        }));
        if (!cancelled) setLeaveQuota(list);
      } catch (e) {
        if (!cancelled) setLeaveQuota([]);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id, employee?.leave_group_id]);

  const branchName = employee?.department?.branch?.branch_name || employee?.department?.branch?.name || employee?.branch?.branch_name || employee?.branch?.name;
  const computedTotalDays = (() => {
    if (leave?.total_days) return leave.total_days;
    if (leave?.days) return leave.days;
    const s = leave?.from_date || leave?.start_date;
    const e = leave?.to_date || leave?.end_date;
    if (!s || !e) return null;
    const ms = new Date(e).getTime() - new Date(s).getTime();
    if (isNaN(ms) || ms < 0) return null;
    const days = Math.floor(ms / 86400000) + 1;
    if (leave?.day_type === "half_first" || leave?.day_type === "half_second") return days - 0.5;
    return days;
  })();
  const reportingManagerName = leave?.reporting?.full_name
    || (leave?.reporting?.first_name && leave.reporting.first_name !== "---"
        ? `${leave.reporting.first_name} ${leave.reporting.last_name || ""}`.trim()
        : "")
    || employee?.reporting_manager?.full_name
    || (employee?.reporting_manager?.first_name
        ? `${employee.reporting_manager.first_name} ${employee.reporting_manager.last_name || ""}`.trim()
        : "");
  const name = employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.full_name : "—";
  const typeName = leave?.leave_type?.name || leave?.leave_group_type?.leave_type?.name;
  const reason = leave?.reason || leave?.leave_note || "—";

  const yearChart = useMemo(() => {
    const empId = leave?.employee?.id || leave?.employee_id;
    const year = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (!empId) return { data: [], totalDays: 0, year, typeKeys: [], typeColors: {}, byType: {}, busiestMonth: null, currentMonth };

    const computeDays = (r) => {
      const fromS = r.from_date || r.start_date;
      const toS = r.to_date || r.end_date;
      const n = Number(r.total_days ?? r.days);
      if (Number.isFinite(n) && n > 0) return n;
      if (!fromS) return 0;
      if (!toS) return 1;
      const d1 = new Date(fromS); d1.setHours(0,0,0,0);
      const d2 = new Date(toS); d2.setHours(0,0,0,0);
      return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
    };

    const typeTotals = {};
    const buckets = months.map((m, idx) => ({ month: m, monthIdx: idx, total: 0 }));
    let total = 0;

    rows.forEach((r) => {
      const rEmp = r.employee?.id || r.employee_id;
      if (rEmp !== empId) return;
      if (Number(r.status) !== 1) return;
      const d = r.from_date || r.start_date;
      if (!d) return;
      const dt = new Date(d);
      if (dt.getFullYear() !== year) return;
      const days = computeDays(r);
      if (days <= 0) return;
      const typeName = r.leave_type?.name || r.leave_group_type?.leave_type?.name || "Other";
      buckets[dt.getMonth()][typeName] = (buckets[dt.getMonth()][typeName] || 0) + days;
      buckets[dt.getMonth()].total += days;
      typeTotals[typeName] = (typeTotals[typeName] || 0) + days;
      total += days;
    });

    const typeKeys = Object.keys(typeTotals).sort((a, b) => typeTotals[b] - typeTotals[a]);
    const typeColors = {};
    typeKeys.forEach((t, i) => { typeColors[t] = colorForType(t, i); });

    // Fill missing type keys with 0 on every bucket so Line/Area charts render continuously
    buckets.forEach((b) => {
      typeKeys.forEach((t) => {
        if (b[t] === undefined) b[t] = 0;
      });
    });

    const busiest = buckets.reduce((best, b) => (b.total > (best?.total || 0) ? b : best), null);

    return { data: buckets, totalDays: total, year, typeKeys, typeColors, byType: typeTotals, busiestMonth: busiest, currentMonth };
  }, [rows, leave]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const nm = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
      const tp = (r.leave_type?.name || r.leave_group_type?.leave_type?.name || "").toLowerCase();
      return nm.includes(q) || tp.includes(q);
    });
  }, [rows, search]);

  // One sidebar entry per employee — the full per-person history is shown in
  // the main panel's Leave History table, so the list itself stays compact.
  const employeeGroups = useMemo(() => {
    const byEmp = new Map();
    for (const r of filtered) {
      const empId = r?.employee?.id || r?.employee_id;
      if (!empId) continue;
      if (!byEmp.has(empId)) byEmp.set(empId, []);
      byEmp.get(empId).push(r);
    }
    const ts = (r) => {
      const d = r?.from_date || r?.start_date || r?.created_at;
      const t = d ? new Date(d).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };
    return Array.from(byEmp.values())
      .map((leaves) => {
        const sorted = [...leaves].sort((a, b) => ts(b) - ts(a));
        return { latest: sorted[0], leaves: sorted, count: sorted.length };
      })
      .sort((a, b) => ts(b.latest) - ts(a.latest));
  }, [filtered]);

  const selectLeave = (id) => {
    setSelectedId(id);
    router.replace(`/leaves/view?id=${id}`, { scroll: false });
  };

  const handleAction = (action) => {
    if (!leave) return;
    setDecisionDialog({ open: true, action, notes: "", file: null });
  };

  const handleConfirmDecision = async () => {
    if (!leave) return;
    const { action, notes, file } = decisionDialog;
    const leaveId = leave.id;
    const employeeId = employee?.id;
    setIsDecisionSubmitting(true);
    // Close the dialog immediately on click — API runs in the background.
    setDecisionDialog({ open: false, action: null, notes: "", file: null });
    try {
      const payload = { approve_reject_notes: notes || "" };
      if (action === "approve") await approveLeave(leaveId, payload);
      if (action === "reject") await rejectLeave(leaveId, payload);
      if (file) {
        try {
          await uploadLeaveDocuments(leaveId, employeeId, [{ title: file.name, file }]);
        } catch (docErr) { console.warn("document upload failed", docErr); }
      }
      await fetchRows();
    } catch (e) { console.error(e); }
    finally { setIsDecisionSubmitting(false); }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 font-[system-ui,-apple-system,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,sans-serif]">
      {/* Side list */}
      <aside className="w-80 shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-3">
          <Link href="/leaves" className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4" /> All Requests
          </Link>
          <input
            type="text"
            placeholder="Search by name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 h-9 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <p className="text-xs text-slate-500">
            All Requests <span className="text-slate-400">({employeeGroups.length})</span>
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <p className="text-center text-sm text-slate-500 py-6">Loading...</p>
          ) : employeeGroups.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">No requests.</p>
          ) : employeeGroups.map(({ latest, leaves, count }) => {
            const emp = latest.employee;
            const nm = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.full_name : "—";
            const active = leaves.some((l) => l.id === selectedId);
            const sub = latest.leave_type?.name || latest.leave_group_type?.leave_type?.name || "Leave";
            const empId = emp?.id || latest.employee_id;
            return (
              <button
                key={empId}
                onClick={() => selectLeave(latest.id)}
                className={`w-full text-left rounded-lg px-2.5 py-2.5 flex items-center gap-2.5 transition-colors ${
                  active ? "bg-violet-500/15 ring-1 ring-violet-500/30" : "hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <Avatar name={nm} src={emp?.profile_picture} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${active ? "text-violet-700 dark:text-violet-200" : "text-slate-900 dark:text-white"}`}>{nm}</p>
                    {count > 1 && (
                      <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-200">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{sub} · {fmtDate(latest.from_date || latest.start_date)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-5">
          {!leave ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-10 text-center text-slate-500">
              {loading ? "Loading..." : "Select a leave request from the left to view details."}
            </div>
          ) : (
            <>
              {/* Two-column layout: Details on the left, Overview (quota / reason / documents) on the right */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                {/* ===== LEFT: Details ===== */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-6 relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
                  <div className="relative space-y-6">

                    {/* Profile header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-slate-200 dark:border-white/10">
                      <div className="relative shrink-0 self-center sm:self-auto">
                        <Avatar name={name} src={employee?.profile_picture} size={88} />
                        <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      </div>
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-lg font-semibold text-slate-900 dark:text-white truncate">{name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{employee?.designation?.name || "—"} · ID {employee?.employee_id || "—"}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                          <StatusPill status={leave.status} />
                          {branchName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200">
                              <MapPin className="w-3 h-3" /> {branchName}
                            </span>
                          )}
                          {typeName && <TypeChip name={typeName} />}
                        </div>
                      </div>
                    </div>

                    {/* Employee meta */}
                    <section>
                      <SectionTitle label="Employee" accent="#0ea5e9" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoCard icon={IdCard} label="Employee ID" value={employee?.employee_id} accent="#0ea5e9" />
                        <InfoCard icon={MapPin} label="Branch" value={branchName} accent="#0ea5e9" />
                        <InfoCard icon={User} label="Reporting Manager" value={reportingManagerName} accent="#0ea5e9" />
                        <InfoCard icon={Briefcase} label="Designation" value={employee?.designation?.name} accent="#0ea5e9" />
                      </div>
                    </section>

                    {/* Leave Schedule */}
                    <section>
                      <SectionTitle label="Leave Schedule" accent="#8b5cf6" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoCard icon={Briefcase} label="Leave Type" value={typeName} accent="#8b5cf6" required />
                        <InfoCard icon={Sun} label="Day Type" value={leave?.day_type === "half_first" ? "First Half" : leave?.day_type === "half_second" ? "Second Half" : "Full Day"} accent="#8b5cf6" />
                        <InfoCard icon={Calendar} label="From Date" value={fmtDate(leave?.from_date || leave?.start_date)} accent="#8b5cf6" required />
                        <InfoCard icon={Calendar} label="To Date" value={fmtDate(leave?.to_date || leave?.end_date)} accent="#8b5cf6" required />
                        <InfoCard icon={Calendar} label="Total Days" value={computedTotalDays} accent="#10b981" />
                        <InfoCard icon={User} label="Handover To" value={leave?.alternate_employee ? `${leave.alternate_employee.first_name || ""} ${leave.alternate_employee.last_name || ""}`.trim() : ""} accent="#f59e0b" />
                      </div>
                    </section>

                  </div>
                </div>

                {/* ===== RIGHT: Overview (Quota / Reason / Documents) ===== */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-6 relative overflow-hidden">
                  <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                  <div className="relative space-y-6">

                    {/* Quota */}
                    <section>
                      <SectionTitle label="Leave Quota" accent="#8b5cf6" />
                      <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            <tr className="border-b border-slate-200 dark:border-white/10">
                              <th className="text-left font-medium px-4 py-2.5">Leave Type</th>
                              <th className="text-center font-medium px-4 py-2.5">Total</th>
                              <th className="text-center font-medium px-4 py-2.5">Used</th>
                              <th className="text-center font-medium px-4 py-2.5">Available</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700 dark:text-slate-200">
                            {leaveQuota.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-500">No quota data available.</td>
                              </tr>
                            ) : leaveQuota.map((q, i) => (
                              <tr key={i} className="border-b border-slate-200 dark:border-white/10 last:border-0">
                                <td className="px-4 py-2.5">{q.name}</td>
                                <td className="px-4 py-2.5 text-center tabular-nums">{q.total}</td>
                                <td className="px-4 py-2.5 text-center tabular-nums">{q.used}</td>
                                <td className="px-4 py-2.5 text-center tabular-nums font-medium">{Math.max(0, q.total - q.used)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Reason */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-violet-500 dark:text-violet-300" />
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white">Reason</h3>
                      </div>
                      <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap min-h-[80px]">
                        {reason}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">Applied {fmtDate(leave?.created_at)} · Updated {fmtDate(leave?.updated_at)}</p>

                      {leave?.approve_reject_notes && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className={`w-4 h-4 ${leave?.status === 2 ? "text-rose-500 dark:text-rose-300" : "text-emerald-500 dark:text-emerald-300"}`} />
                            <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                              Admin Note <span className="text-xs font-normal text-slate-500">({leave?.status === 2 ? "Rejected" : leave?.status === 1 ? "Approved" : "Pending"})</span>
                            </h3>
                          </div>
                          <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap min-h-[60px]">
                            {leave.approve_reject_notes}
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Documents */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Paperclip className="w-4 h-4 text-violet-500 dark:text-violet-300" />
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white">Documents</h3>
                      </div>
                      {leaveDocuments.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
                          No attachments uploaded.
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {leaveDocuments.map((doc, i) => (
                            <li key={doc.id || i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                                <span className="truncate text-slate-700 dark:text-slate-200">{doc.key || `Document ${i + 1}`}</span>
                              </div>
                              <a
                                href={doc.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-colors text-xs font-medium"
                              >
                                View
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                  </div>
                </div>
              </div>

              {/* Leave History (full width below the split) */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-violet-500 dark:text-violet-300" />
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Leave History</h3>
                </div>
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          <th className="text-left font-medium px-4 py-2.5">Type</th>
                          <th className="text-left font-medium px-4 py-2.5">From</th>
                          <th className="text-left font-medium px-4 py-2.5">To</th>
                          <th className="text-center font-medium px-4 py-2.5">Days</th>
                          <th className="text-center font-medium px-4 py-2.5">Status</th>
                          <th className="text-left font-medium px-4 py-2.5">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 dark:text-slate-200">
                        {(() => {
                          const empId = employee?.id;
                          const history = rows.filter((r) => (r?.employee?.id || r?.employee_id) === empId);
                          if (history.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">No leave history found.</td>
                              </tr>
                            );
                          }
                          return history.map((r) => {
                            const s = r?.from_date || r?.start_date;
                            const e = r?.to_date || r?.end_date;
                            let days = r?.total_days || r?.days;
                            if (!days && s && e) {
                              const ms = new Date(e).getTime() - new Date(s).getTime();
                              if (!isNaN(ms) && ms >= 0) {
                                days = Math.floor(ms / 86400000) + 1;
                                if (r?.day_type === "half_first" || r?.day_type === "half_second") days -= 0.5;
                              }
                            }
                            const t = r?.leave_type?.name || r?.leave_group_type?.leave_type?.name || "—";
                            const isActive = r.id === leave.id;
                            return (
                              <tr
                                key={r.id}
                                onClick={() => router.replace(`/leaves/view?id=${r.id}`, { scroll: false })}
                                className={`border-b border-slate-200 dark:border-white/10 last:border-0 cursor-pointer transition-colors ${isActive ? "bg-violet-500/10" : "hover:bg-slate-100/60 dark:hover:bg-white/5"}`}
                              >
                                <td className="px-4 py-2.5">{t}</td>
                                <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(s)}</td>
                                <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(e)}</td>
                                <td className="px-4 py-2.5 text-center tabular-nums">{days ?? "—"}</td>
                                <td className="px-4 py-2.5 text-center"><StatusPill status={r.status} /></td>
                                <td className="px-4 py-2.5 truncate max-w-[280px]" title={r?.reason || r?.leave_note}>{r?.reason || r?.leave_note || "—"}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => router.push("/leaves")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.98] transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Close
                </button>
                {leave.status !== 1 && (
                  <button
                    onClick={() => handleAction("approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] transition-all ring-1 ring-emerald-400/40"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                )}
                {leave.status !== 2 && (
                  <button
                    onClick={() => handleAction("reject")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-rose-500/25 hover:from-rose-400 hover:to-rose-500 hover:shadow-lg hover:shadow-rose-500/30 active:scale-[0.98] transition-all ring-1 ring-rose-400/40"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Dialog
        open={decisionDialog.open}
        onOpenChange={(v) => !isDecisionSubmitting && setDecisionDialog((d) => ({ ...d, open: v }))}
      >
        <DialogContent className="!w-[480px] !max-w-[95%] p-6">
          <DialogHeader>
            <DialogTitle>
              {decisionDialog.action === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {name} — {typeName || "Leave"}
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Reason {decisionDialog.action === "reject" && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                value={decisionDialog.notes}
                onChange={(e) => setDecisionDialog((d) => ({ ...d, notes: e.target.value }))}
                placeholder={
                  decisionDialog.action === "approve"
                    ? "Optional note for the approval…"
                    : "Reason for rejecting this request…"
                }
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDecisionDialog({ open: false, action: null, notes: "", file: null })}
                disabled={isDecisionSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDecision}
                disabled={isDecisionSubmitting || (decisionDialog.action === "reject" && !decisionDialog.notes.trim())}
                className={decisionDialog.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
              >
                {isDecisionSubmitting ? "Saving…" : decisionDialog.action === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeaveViewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading...</div>}>
      <LeaveViewInner />
    </Suspense>
  );
}
