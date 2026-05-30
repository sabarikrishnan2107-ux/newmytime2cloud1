"use client";

// Tailwind safelist (do not remove): bg-amber-500/10 text-amber-400 border-amber-500/20 bg-amber-400 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 bg-emerald-400 bg-rose-500/10 text-rose-400 border-rose-500/20 bg-rose-400 bg-slate-500/10 text-slate-400 border-slate-500/20 bg-slate-400

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, Clock, CheckCircle2, XCircle, Users, Filter, Download, TrendingUp,
  TrendingDown, MoreHorizontal, ChevronRight, X,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { getLeavesRequest, approveLeave, rejectLeave } from "@/lib/endpoint/leaves";
import { getBranches, getDepartments, getDepartmentsByBranchIds } from "@/lib/api";
import { getUser } from "@/config/index";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DropDown from "@/components/ui/DropDown";

const TYPE_COLORS = {
  annual: "#3b82f6", sick: "#06b6d4", casual: "#10b981",
  emergency: "#f59e0b", maternity: "#ec4899", unpaid: "#64748b",
};
const FALLBACK_COLORS = ["#8b5cf6", "#14b8a6", "#f43f5e", "#a855f7", "#84cc16"];

const colorForType = (name, idx) => {
  const k = (name || "").toLowerCase().split(" ")[0];
  return TYPE_COLORS[k] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
};

const STATUS = { 0: "Pending", 1: "Approved", 2: "Rejected" };

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmtDate = (s) => (s ? String(s).split("T")[0] : "—");
const parseDate = (s) => (s ? new Date(s) : null);

// ---------- Pure derivations ----------

function computeKpis(leaves, today) {
  const onLeaveToday = leaves.filter((l) => {
    if (l.status !== 1) return false;
    const from = parseDate(l.from_date || l.start_date);
    const to = parseDate(l.to_date || l.end_date);
    return from && to && from <= today && today <= to;
  });
  const deptCount = new Set(onLeaveToday.map((l) => l.employee?.department?.name).filter(Boolean)).size;

  const curMonth = today.getMonth();
  const prevMonth = (curMonth + 11) % 12;
  const inMonth = (l, m) => {
    const d = parseDate(l.created_at);
    return d && d.getMonth() === m;
  };
  const delta = (cur, prev) => {
    if (prev === 0) return { value: cur > 0 ? 100 : 0, positive: cur >= 0 };
    const pct = ((cur - prev) / prev) * 100;
    return { value: Math.abs(Math.round(pct * 10) / 10), positive: pct >= 0 };
  };
  const countDelta = (cur, prev) => ({ value: Math.abs(cur - prev), positive: cur - prev >= 0 });
  const sliceMonth = (m) => leaves.filter((l) => inMonth(l, m));

  const curPending = sliceMonth(curMonth).filter((l) => l.status === 0).length;
  const prevPending = sliceMonth(prevMonth).filter((l) => l.status === 0).length;
  const onLeavePrevMonth = leaves.filter((l) => {
    if (l.status !== 1) return false;
    const created = parseDate(l.created_at);
    return created && created.getMonth() === prevMonth;
  }).length;

  return {
    total: leaves.length,
    pending: leaves.filter((l) => l.status === 0).length,
    approved: leaves.filter((l) => l.status === 1).length,
    rejected: leaves.filter((l) => l.status === 2).length,
    onLeaveToday: onLeaveToday.length,
    onLeaveDeptCount: deptCount,
    deltas: {
      total: delta(sliceMonth(curMonth).length, sliceMonth(prevMonth).length),
      pending: countDelta(curPending, prevPending),
      approved: delta(sliceMonth(curMonth).filter((l) => l.status === 1).length, sliceMonth(prevMonth).filter((l) => l.status === 1).length),
      rejected: delta(sliceMonth(curMonth).filter((l) => l.status === 2).length, sliceMonth(prevMonth).filter((l) => l.status === 2).length),
      onLeaveToday: countDelta(onLeaveToday.length, onLeavePrevMonth),
    },
  };
}

function computeMonthlySeries(leaves, year) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((month, idx) => {
    const monthLeaves = leaves.filter((l) => {
      const d = parseDate(l.from_date || l.start_date);
      return d && d.getFullYear() === year && d.getMonth() === idx;
    });
    return {
      month,
      approved: monthLeaves.filter((l) => l.status === 1).length,
      pending: monthLeaves.filter((l) => l.status === 0).length,
    };
  });
}

function computeUpcoming(leaves, today, limit = 5) {
  return leaves
    .filter((l) => {
      const from = parseDate(l.from_date || l.start_date);
      return from && from > today;
    })
    .sort((a, b) => parseDate(a.from_date || a.start_date) - parseDate(b.from_date || b.start_date))
    .slice(0, limit);
}

// ---------- Shared primitives ----------

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-white/5 ${className}`} />;
}

function Avatar({ name, src, size = 36 }) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-pink-500", "bg-violet-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"];
  const hash = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  if (showImage) {
    return (
      <img
        src={src}
        alt={name || ""}
        onError={() => setErrored(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className={`${bg} text-white font-semibold rounded-full flex items-center justify-center text-xs shrink-0`} style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}

function DeltaChip({ delta, format = "percent" }) {
  if (!delta) return null;
  const Icon = delta.positive ? TrendingUp : TrendingDown;
  const color = delta.positive ? "text-emerald-400 bg-emerald-500/15" : "text-rose-400 bg-rose-500/15";
  const suffix = format === "count" ? "" : "%";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {delta.positive ? "+" : "−"}{delta.value}{suffix}
    </span>
  );
}

function StatusPill({ status }) {
  const { t } = useTranslation();
  const cfg = {
    0: { label: t("leave.status.pending"), color: "amber" },
    1: { label: t("leave.status.approved"), color: "emerald" },
    2: { label: t("leave.status.rejected"), color: "rose" },
  }[status] || { label: "—", color: "slate" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20 px-2.5 py-0.5 text-[11px] font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-${cfg.color}-400`} />
      {cfg.label}
    </span>
  );
}

function TypeChip({ name }) {
  const color = colorForType(name || "", 0);
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `${color}22`, color }}>
      {name || "—"}
    </span>
  );
}

// ---------- Section components ----------

function MoreFilterPopover({ status, onStatusChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Filter className="w-4 h-4" />
          {t("leave.more")}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align="end" className="z-50 w-56 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-xl">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">{t("leave.status.label")}</p>
          <DropDown
            placeholder={t("leave.allStatus")}
            items={[
              { id: -1, name: t("leave.allStatus") },
              { id: 0, name: t("leave.status.pending") },
              { id: 1, name: t("leave.status.approved") },
              { id: 2, name: t("leave.status.rejected") },
            ]}
            value={status}
            onChange={(val) => onStatusChange(val === -1 ? null : val)}
            portalled={false}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HeaderBand({
  firstName,
  branches, departments,
  selectedBranchIds, setSelectedBranchIds,
  selectedDepartmentIds, setSelectedDepartmentIds,
  selectedStatus, setSelectedStatus,
  onExport,
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent p-6 relative">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 relative">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1 text-xs text-slate-700 dark:text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
            {t("leave.welcomeBack", { name: firstName })}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{t("leave.dashboardTitle")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("leave.dashboardSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <MultiDropDown placeholder={t("leave.allBranches")} items={branches} value={selectedBranchIds} onChange={setSelectedBranchIds} badgesCount={1} portalled={false} />
          </div>
          <div className="w-48">
            <MultiDropDown placeholder={t("leave.allDepartments")} items={departments} value={selectedDepartmentIds} onChange={setSelectedDepartmentIds} badgesCount={1} portalled={false} />
          </div>
          <MoreFilterPopover status={selectedStatus} onStatusChange={setSelectedStatus} />
          <button onClick={onExport} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">
            <Download className="w-4 h-4" />
            {t("leave.export")}
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, accent, delta, deltaFormat, loading, onClick }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col gap-1.5 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md dark:hover:shadow-none transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-100 uppercase tracking-wider">{title}</p>
        <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: accent }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div>
        {loading ? <Skeleton className="h-7 w-14" /> : <p className="text-[26px] font-bold text-slate-900 dark:text-white leading-none">{value}</p>}
        <p className="text-xs text-slate-500 dark:text-slate-100 mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {loading ? <Skeleton className="h-4 w-14" /> : <DeltaChip delta={delta} format={deltaFormat} />}
        <span className="text-xs text-slate-500 dark:text-slate-100">{t("leave.vsLastMonth")}</span>
      </div>
    </button>
  );
}

function DrillDownModal({ open, onClose, title, accent, rows }) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-x-0 bottom-0 top-[72px] z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[calc(50%+36px)] z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
              <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">{title}</Dialog.Title>
              <span className="text-xs text-slate-500">({rows.length})</span>
            </div>
            <Dialog.Close asChild>
              <button className="rounded p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {rows.length === 0 ? (
              <p className="text-center py-10 text-sm text-slate-500">{t("leave.noRecords")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    {[
                      t("leave.columns.employee"),
                      t("leave.columns.leaveType"),
                      t("leave.columns.duration"),
                      t("leave.columns.days"),
                      t("leave.columns.status"),
                    ].map((h) => (
                      <th key={h} className="text-left font-medium text-slate-500 dark:text-slate-400 px-4 py-2.5 text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const name = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.trim() || "—";
                    const role = r.employee?.designation?.name || "";
                    const branch = r.employee?.branch?.name || "";
                    const meta = [role, branch].filter(Boolean).join(" · ");
                    const typeName = r.leave_type?.name || r.leave_group_type?.leave_type?.name;
                    return (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} src={r.employee?.profile_picture} size={32} />
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{name}</p>
                              <p className="text-xs text-slate-500">{meta || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><TypeChip name={typeName} /></td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{fmtDate(r.from_date || r.start_date)} → {fmtDate(r.to_date || r.end_date)}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{r.total_days || r.days || "—"}</td>
                        <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TrendAreaChart({ data, year, onYearChange, years }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("leave.trend.title")}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t("leave.trend.subtitle")}</p>
        </div>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.1)" />
          <Tooltip contentStyle={{ borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }} />
          <Area type="monotone" dataKey="approved" stroke="#38bdf8" strokeWidth={2} fill="url(#gradApproved)" />
          <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fill="url(#gradPending)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function UpcomingLeaves({ items }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("leave.upcoming.title")}</h3>
        <button className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
          {t("leave.upcoming.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">{t("leave.upcoming.empty")}</p>
      ) : (
        <div className="space-y-3 text-slate-700 dark:text-slate-300">
          {items.map((l) => {
            const name = `${l.employee?.first_name || ""} ${l.employee?.last_name || ""}`.trim() || "—";
            const from = l.from_date || l.start_date;
            const to = l.to_date || l.end_date;
            const sameDay = from === to;
            const typeName = l.leave_type?.name || l.leave_group_type?.leave_type?.name || t("leave.leaveFallback");
            const color = colorForType(typeName, 0);
            const days = l.total_days || l.days || 1;
            return (
              <div key={l.id} className="flex items-center gap-3">
                <Avatar name={name} src={l.employee?.profile_picture} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{name}</p>
                  <p className="text-xs text-slate-500">{sameDay ? fmtDate(from) : `${fmtDate(from)} — ${fmtDate(to)}`}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-medium" style={{ color }}>{typeName}</span>
                  <p className="text-xs text-slate-500">{days} {days === 1 ? t("leave.upcoming.day") : t("leave.upcoming.days")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RowMenu({ row, onAction }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const showApprove = row.status !== 1;
  const showReject = row.status !== 2;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="rounded p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="end" className="z-50 w-40 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1 shadow-xl text-sm">
          {showApprove && (
            <button onClick={() => { onAction("approve", row); setOpen(false); }} className="w-full text-left rounded px-2 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5">{t("leave.actions.approve")}</button>
          )}
          {showReject && (
            <button onClick={() => { onAction("reject", row); setOpen(false); }} className="w-full text-left rounded px-2 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/5">{t("leave.actions.reject")}</button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ActivityTable({ rows, loading, onAction }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl">
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("leave.activity.title")}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t("leave.activity.subtitle")}</p>
        </div>
        <button className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
          {t("leave.activity.viewAll")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              {[
                { key: "employee", label: t("leave.columns.employee") },
                { key: "leaveType", label: t("leave.columns.leaveType") },
                { key: "duration", label: t("leave.columns.duration") },
                { key: "days", label: t("leave.columns.days") },
                { key: "status", label: t("leave.columns.status") },
                { key: "applied", label: t("leave.columns.applied") },
                { key: "actions", label: "" },
              ].map((h) => (
                <th key={h.key} className="text-left font-medium text-slate-500 dark:text-slate-400 px-5 py-3 text-xs uppercase">{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">{t("leave.activity.loading")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">{t("leave.activity.empty")}</td></tr>
            ) : rows.slice(0, 8).map((r) => {
              const name = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.trim() || "—";
              const role = r.employee?.designation?.name || "";
              const branch = r.employee?.branch?.name || "";
              const meta = [role, branch].filter(Boolean).join(" · ");
              const typeName = r.leave_type?.name || r.leave_group_type?.leave_type?.name;
              return (
                <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={name} src={r.employee?.profile_picture} />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{name}</p>
                        <p className="text-xs text-slate-500">{meta || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><TypeChip name={typeName} /></td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{fmtDate(r.from_date || r.start_date)} → {fmtDate(r.to_date || r.end_date)}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{r.total_days || r.days || "—"}</td>
                  <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{fmtDate(r.created_at)}</td>
                  <td className="px-5 py-3 text-right"><RowMenu row={r} onAction={onAction} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function LeaveDashboard() {
  const { t } = useTranslation();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [drillDown, setDrillDown] = useState(null);

  const user = useMemo(() => getUser(), []);
  const firstName = user?.first_name || user?.name?.split?.(" ")?.[0] || "there";
  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => { getBranches().then(setBranches).catch(console.error); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setDepartments(
          selectedBranchIds.length > 0
            ? await getDepartmentsByBranchIds(selectedBranchIds)
            : await getDepartments()
        );
      } catch (e) { console.error(e); setDepartments([]); }
    };
    load();
  }, [selectedBranchIds]);

  useEffect(() => { fetchLeaves(); }, [selectedBranchIds, selectedDepartmentIds, selectedStatus]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const start = new Date(today); start.setDate(start.getDate() - 365);
      const end = new Date(today); end.setDate(end.getDate() + 60);
      const params = {
        per_page: 500,
        start_date: fmtDate(start.toISOString()),
        end_date: fmtDate(end.toISOString()),
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
        status_ids: selectedStatus !== null ? [String(selectedStatus)] : undefined,
      };
      const result = await getLeavesRequest(params);
      setLeaves(Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []);
    } catch (e) { console.error(e); setLeaves([]); }
    finally { setLoading(false); }
  };

  const kpis = useMemo(() => computeKpis(leaves, today), [leaves, today]);
  const trend = useMemo(() => computeMonthlySeries(leaves, year), [leaves, year]);
  const upcoming = useMemo(() => computeUpcoming(leaves, today, 5), [leaves, today]);
  const years = useMemo(() => {
    const set = new Set();
    const current = new Date().getFullYear();
    for (let y = current; y >= current - 5; y--) set.add(y);
    leaves.forEach((l) => {
      const d = parseDate(l.from_date || l.start_date);
      if (d) set.add(d.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [leaves]);

  const handleExport = () => {
    const rows = [
      ["Employee", "Role", "Branch", "Department", "Leave Type", "From", "To", "Days", "Status", "Applied"],
      ...leaves.map((l) => [
        `${l.employee?.first_name || ""} ${l.employee?.last_name || ""}`.trim() || "—",
        l.employee?.designation?.name || "",
        l.employee?.branch?.name || "",
        l.employee?.department?.name || "",
        l.leave_type?.name || l.leave_group_type?.leave_type?.name || "",
        fmtDate(l.from_date || l.start_date),
        fmtDate(l.to_date || l.end_date),
        l.total_days || l.days || "",
        STATUS[l.status] || "",
        fmtDate(l.created_at),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-dashboard-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRowAction = async (action, row) => {
    try {
      if (action === "approve") await approveLeave(row.id);
      if (action === "reject") await rejectLeave(row.id);
      await fetchLeaves();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      <HeaderBand
        firstName={firstName}
        branches={branches}
        departments={departments}
        selectedBranchIds={selectedBranchIds}
        setSelectedBranchIds={setSelectedBranchIds}
        selectedDepartmentIds={selectedDepartmentIds}
        setSelectedDepartmentIds={setSelectedDepartmentIds}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onExport={handleExport}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title={t("leave.kpi.totalRequests")} value={kpis.total.toLocaleString()} subtitle={t("leave.kpi.totalRequestsSub")} icon={FileText} accent="#38bdf8" delta={kpis.deltas.total} deltaFormat="percent" loading={loading}
          onClick={() => setDrillDown({ title: t("leave.kpi.totalRequests"), accent: "#38bdf8", rows: leaves })} />
        <KpiCard title={t("leave.kpi.pendingApprovals")} value={kpis.pending} subtitle={t("leave.kpi.pendingApprovalsSub")} icon={Clock} accent="#f97316" delta={kpis.deltas.pending} deltaFormat="count" loading={loading}
          onClick={() => setDrillDown({ title: t("leave.kpi.pendingApprovals"), accent: "#f97316", rows: leaves.filter((l) => l.status === 0) })} />
        <KpiCard title={t("leave.kpi.approved")} value={kpis.approved.toLocaleString()} subtitle={t("leave.kpi.approvedSub")} icon={CheckCircle2} accent="#10b981" delta={kpis.deltas.approved} deltaFormat="percent" loading={loading}
          onClick={() => setDrillDown({ title: t("leave.kpi.approved"), accent: "#10b981", rows: leaves.filter((l) => l.status === 1) })} />
        <KpiCard title={t("leave.kpi.totalRejected")} value={kpis.rejected.toLocaleString()} subtitle={t("leave.kpi.totalRejectedSub")} icon={XCircle} accent="#f43f5e" delta={kpis.deltas.rejected} deltaFormat="percent" loading={loading}
          onClick={() => setDrillDown({ title: t("leave.kpi.totalRejected"), accent: "#f43f5e", rows: leaves.filter((l) => l.status === 2) })} />
        <KpiCard title={t("leave.kpi.onLeaveToday")} value={kpis.onLeaveToday} subtitle={t("leave.kpi.onLeaveTodaySub", { count: kpis.onLeaveDeptCount })} icon={Users} accent="#8b5cf6" delta={kpis.deltas.onLeaveToday} deltaFormat="count" loading={loading}
          onClick={() => setDrillDown({ title: t("leave.kpi.onLeaveToday"), accent: "#8b5cf6", rows: leaves.filter((l) => {
            if (l.status !== 1) return false;
            const from = parseDate(l.from_date || l.start_date);
            const to = parseDate(l.to_date || l.end_date);
            return from && to && from <= today && today <= to;
          }) })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrendAreaChart data={trend} year={year} onYearChange={setYear} years={years} />
        </div>
        <UpcomingLeaves items={upcoming} />
      </div>

      <ActivityTable rows={leaves} loading={loading} onAction={handleRowAction} />

      <DrillDownModal
        open={!!drillDown}
        onClose={() => setDrillDown(null)}
        title={drillDown?.title || ""}
        accent={drillDown?.accent || "#38bdf8"}
        rows={drillDown?.rows || []}
      />
    </div>
  );
}
