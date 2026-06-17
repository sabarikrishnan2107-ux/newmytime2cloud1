"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plane, ArrowUpRight, ChevronLeft, ChevronRight, Calendar,
    CheckCircle2, Clock, XCircle, TrendingUp,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api, buildQueryParams } from "@/lib/api-client";

const COLOR_MAP = {
    violet: { ring: "ring-violet-500/20", bg: "bg-violet-500/10", text: "text-violet-400", bar: "bg-violet-500" },
    emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500" },
    cyan: { ring: "ring-cyan-500/20", bg: "bg-cyan-500/10", text: "text-cyan-400", bar: "bg-cyan-500" },
    pink: { ring: "ring-pink-500/20", bg: "bg-pink-500/10", text: "text-pink-400", bar: "bg-pink-500" },
    blue: { ring: "ring-blue-500/20", bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500" },
    amber: { ring: "ring-amber-500/20", bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500" },
    orange: { ring: "ring-orange-500/20", bg: "bg-orange-500/10", text: "text-orange-400", bar: "bg-orange-500" },
    teal: { ring: "ring-teal-500/20", bg: "bg-teal-500/10", text: "text-teal-400", bar: "bg-teal-500" },
    slate: { ring: "ring-slate-500/20", bg: "bg-slate-500/10", text: "text-slate-400", bar: "bg-slate-500" },
};

const STATUS_CFG = {
    0: { label: "Pending", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: Clock },
    1: { label: "Approved", cls: "bg-green-500/10 text-green-400 border-green-500/20", Icon: CheckCircle2 },
    2: { label: "Rejected", cls: "bg-red-500/10 text-red-400 border-red-500/20", Icon: XCircle },
};

const fmtDateRange = (from, to) => {
    if (!from) return "";
    const fd = new Date(from);
    if (isNaN(fd.getTime())) return "";
    const td = to ? new Date(to) : null;
    if (!td || isNaN(td.getTime()) || fd.getTime() === td.getTime()) {
        return fd.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }
    if (fd.getMonth() === td.getMonth() && fd.getFullYear() === td.getFullYear()) {
        return `${fd.getDate()}–${td.getDate()} ${fd.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
    }
    return `${fd.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${td.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
};

const Leaves = ({ employee_id, payload }) => {
    const router = useRouter();
    const [data, setData] = useState({
        year: new Date().getFullYear(),
        allowances: [],
        stats: { total_taken: 0, approved_count: 0, pending_count: 0, rejected_count: 0 },
        upcoming: null,
        history: [],
        monthly_breakdown: [],
    });
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState("all"); // all | pending | approved | rejected

    useEffect(() => {
        if (!employee_id) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const params = await buildQueryParams({ employee_id, year: selectedYear });
                const { data: resp } = await api.get("/employee-leaves-summary", { params });
                if (cancelled) return;
                if (resp?.debug) console.log("[Leaves]", resp.debug);
                setData({
                    year: resp?.year ?? selectedYear,
                    allowances: Array.isArray(resp?.allowances) ? resp.allowances : [],
                    stats: resp?.stats || { total_taken: 0, approved_count: 0, pending_count: 0, rejected_count: 0 },
                    upcoming: resp?.upcoming || null,
                    history: Array.isArray(resp?.history) ? resp.history : [],
                    monthly_breakdown: Array.isArray(resp?.monthly_breakdown) ? resp.monthly_breakdown : [],
                });
            } catch (e) {
                console.warn("[Leaves] fetch failed:", e?.response?.status, e?.message);
                if (!cancelled) setData((d) => ({ ...d, allowances: [], history: [], stats: { total_taken: 0, approved_count: 0, pending_count: 0, rejected_count: 0 }, upcoming: null }));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [employee_id, selectedYear]);

    const filteredHistory = useMemo(() => {
        if (statusFilter === "all") return data.history;
        const map = { pending: 0, approved: 1, rejected: 2 };
        return data.history.filter((h) => h.status === map[statusFilter]);
    }, [data.history, statusFilter]);

    const totalAllowance = data.allowances.reduce((s, a) => s + a.total, 0);
    const totalUsed = data.allowances.reduce((s, a) => s + a.used, 0);
    const overallPct = totalAllowance > 0 ? Math.round((totalUsed / totalAllowance) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Leaves</h2>
                    <p className="text-xs text-[#9db0b9] mt-0.5">
                        {loading
                            ? "Loading…"
                            : `${selectedYear} · ${totalUsed} of ${totalAllowance} days used (${overallPct}%)`}
                    </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
                    <button
                        type="button"
                        onClick={() => setSelectedYear((y) => y - 1)}
                        className="size-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="px-3 text-sm font-bold text-white tabular-nums">{selectedYear}</span>
                    <button
                        type="button"
                        onClick={() => setSelectedYear((y) => y + 1)}
                        className="size-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Stat KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl p-4 bg-violet-500/5 border border-violet-500/10">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-violet-300/80 uppercase tracking-wider">
                        <TrendingUp size={12} /> Total Taken
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.total_taken}</span>
                        <span className="text-xs text-[#9db0b9]">days</span>
                    </div>
                </div>
                <div className="rounded-xl p-4 bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Approved
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.approved_count}</span>
                        <span className="text-xs text-[#9db0b9]">requests</span>
                    </div>
                </div>
                <div className="rounded-xl p-4 bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300/80 uppercase tracking-wider">
                        <Clock size={12} /> Pending
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.pending_count}</span>
                        <span className="text-xs text-[#9db0b9]">requests</span>
                    </div>
                </div>
                <div className="rounded-xl p-4 bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-red-300/80 uppercase tracking-wider">
                        <XCircle size={12} /> Rejected
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.rejected_count}</span>
                        <span className="text-xs text-[#9db0b9]">requests</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Leave Allowances + Upcoming + Apply */}
                <div className="glass-card rounded-2xl p-6 flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Leave Balance</h3>
                    <div className="flex flex-col gap-3 mb-4">
                        {data.allowances.length === 0 && (
                            <div className="text-center text-sm text-slate-500 py-6">
                                {loading ? "Loading…" : "No leave allowance configured"}
                            </div>
                        )}
                        {data.allowances.map((a) => {
                            const c = COLOR_MAP[a.color] || COLOR_MAP.slate;
                            const usedPct = a.total > 0 ? Math.min(100, (a.used / a.total) * 100) : 0;
                            const pendingPct = a.total > 0 ? Math.min(100 - usedPct, (a.pending / a.total) * 100) : 0;
                            return (
                                <div key={a.type} className="rounded-xl p-3 bg-white/5 border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`size-2 rounded-full ${c.bar}`} />
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{a.type}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-300">
                                            <span className={c.text}>{a.remaining}</span>
                                            <span className="text-[#9db0b9]"> / {a.total}</span>
                                        </span>
                                    </div>
                                    <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
                                        <div className={`absolute left-0 top-0 h-full ${c.bar}`} style={{ width: `${usedPct}%` }} />
                                        {pendingPct > 0 && (
                                            <div className="absolute top-0 h-full bg-amber-500/60" style={{ left: `${usedPct}%`, width: `${pendingPct}%` }} />
                                        )}
                                    </div>
                                    <div className="flex justify-between mt-1.5 text-[10px] text-[#9db0b9]">
                                        <span>{a.used} used{a.pending > 0 ? ` · ${a.pending} pending` : ""}</span>
                                        <span>{Math.round(usedPct)}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {data.upcoming && (
                        <div className="rounded-xl p-3.5 bg-white/5 border border-white/5 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                                    <Plane size={18} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[11px] font-bold text-[#9db0b9] uppercase tracking-wider">Upcoming Leave</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {data.upcoming.type} · {fmtDateRange(data.upcoming.from, data.upcoming.to)}
                                    </span>
                                </div>
                                <ArrowUpRight size={18} className="text-[#9db0b9] shrink-0" />
                            </div>
                        </div>
                    )}

                </div>

                {/* Monthly breakdown chart + History */}
                <div className="glass-card rounded-2xl p-6 lg:col-span-2 flex flex-col">
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Leave History</h3>
                            <p className="text-xs text-[#9db0b9] mt-0.5">{filteredHistory.length} {filteredHistory.length === 1 ? "request" : "requests"} in {selectedYear}</p>
                        </div>
                        <div className="inline-flex items-center gap-0.5 rounded-lg bg-white/5 border border-white/10 p-0.5">
                            {["all", "approved", "pending", "rejected"].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md capitalize transition-colors ${
                                        statusFilter === s
                                            ? "bg-violet-500 text-white shadow"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Monthly mini chart */}
                    {data.monthly_breakdown.some((m) => m.days > 0) && (
                        <div className="h-[120px] mb-4 -mx-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.monthly_breakdown} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fill: "#9db0b9", fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "#9db0b9", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                                        labelStyle={{ color: "#cbd5e1" }}
                                        formatter={(v) => [`${v} days`, "Approved"]}
                                    />
                                    <Bar dataKey="days" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* History list */}
                    <div className="flex flex-col gap-2.5 flex-1">
                        {filteredHistory.length === 0 && (
                            <div className="text-center text-sm text-slate-500 py-10">
                                {loading ? "Loading…" : statusFilter === "all" ? "No leave history" : `No ${statusFilter} leaves`}
                            </div>
                        )}
                        {filteredHistory.map((l) => {
                            const cfg = STATUS_CFG[l.status] || STATUS_CFG[0];
                            const Icon = cfg.Icon;
                            return (
                                <div
                                    key={l.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                                            <Plane size={18} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {l.type} · {l.days}d
                                            </span>
                                            <span className="text-xs text-[#9db0b9]">
                                                {fmtDateRange(l.from_date, l.to_date)}
                                                {l.reason ? ` · ${l.reason}` : ""}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${cfg.cls}`}>
                                        <Icon size={12} /> {cfg.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaves;
