// @ts-nocheck
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    CalendarDays,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    Clock,
    LogIn,
    Coffee,
    Smartphone,
} from "lucide-react";
import { api, buildQueryParams } from "@/lib/api-client";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STAT_CARD =
    "rounded-2xl border border-slate-200 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/40 p-5";

const Pill = ({ children, className = "" }) => (
    <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
        {children}
    </span>
);

const Donut = ({ value = 0, size = 120, stroke = 12 }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="transparent"
                stroke="rgba(148,163,184,0.18)"
                strokeWidth={stroke}
            />
            <defs>
                <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
            </defs>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="transparent"
                stroke="url(#donutGrad)"
                strokeWidth={stroke}
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
            />
        </svg>
    );
};

const StatusBadge = ({ status }) => {
    const map = {
        "Present": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        "On-time": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        "Active": "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30",
        "Late": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
        "Early Going": "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30",
        "Half Day": "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30",
        "Manual": "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30",
        "Leave": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        "Holiday": "bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30",
        "Weekoff": "bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30",
        "Weekend": "bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30",
        "Absent": "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
        "Missing": "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
        "Off": "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20",
    };
    return (
        <span
            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${
                map[status] || "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20"
            }`}
        >
            {status}
        </span>
    );
};

const EMPTY = {
    punctuality: { score: 0, label: "—", on_time_pct: 0, late_pct: 0, streak: 0, delta: null },
    monthly: { month: "", days_recorded: 0, present: 0, absent: 0, late: 0, half_day: 0 },
    hours: { month: "", total: "—", overtime: "—", average_per_day: "—", progress: 0, target: "—" },
    today: { status: "—", check_in: "—", check_out: "—", worked: "—", device: "—" },
    log: [],
    log_label: "Last 7 days",
    is_current_month: true,
};

const Attendance = ({ payload } = {}) => {
    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
    const [pickerOpen, setPickerOpen] = useState(false);
    const [logRange, setLogRange] = useState("1w"); // "1w" | "1m" | "6m"
    const [logPage, setLogPage] = useState(1);
    const LOG_PAGE_SIZE = 10;
    const pickerRef = useRef(null);

    // Reset page when filter/range changes
    useEffect(() => {
        setLogPage(1);
    }, [logRange, selectedYear, selectedMonth]);

    useEffect(() => {
        if (!pickerOpen) return;
        const handleClick = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [pickerOpen]);

    useEffect(() => {
        const lookupId = payload?.system_user_id || payload?.id;
        if (!lookupId) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const params = await buildQueryParams({
                    employee_id: lookupId,
                    year: selectedYear,
                    month: selectedMonth + 1, // backend expects 1-12
                    log_range: logRange,
                });
                const { data: resp } = await api.get("/employee-attendance-summary", { params });
                if (cancelled) return;
                if (resp?.debug) console.log("[Attendance summary]", resp.debug);
                setData({
                    punctuality: resp?.punctuality || EMPTY.punctuality,
                    monthly: resp?.monthly || EMPTY.monthly,
                    hours: resp?.hours || EMPTY.hours,
                    today: resp?.today || EMPTY.today,
                    log: Array.isArray(resp?.log) ? resp.log : [],
                    log_label: resp?.log_label || "Last 7 days",
                    is_current_month: resp?.is_current_month ?? true,
                });
            } catch (e) {
                console.warn("[Attendance summary] fetch failed:", e?.response?.status, e?.message);
                if (!cancelled) setData(EMPTY);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [payload?.system_user_id, payload?.id, selectedYear, selectedMonth, logRange]);

    const { punctuality, monthly, hours, today, log, log_label, is_current_month } = data;
    const deltaPositive = (punctuality.delta ?? 0) >= 0;

    const totalLogPages = Math.max(1, Math.ceil((log?.length || 0) / LOG_PAGE_SIZE));
    const safePage = Math.min(logPage, totalLogPages);
    const pagedLog = (log || []).slice((safePage - 1) * LOG_PAGE_SIZE, safePage * LOG_PAGE_SIZE);
    const showFrom = log.length === 0 ? 0 : (safePage - 1) * LOG_PAGE_SIZE + 1;
    const showTo = Math.min(safePage * LOG_PAGE_SIZE, log.length);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Attendance</h2>
                    <p className="text-xs text-[#9db0b9] mt-0.5">
                        {loading ? "Loading…" : `${monthly.month || MONTH_NAMES[selectedMonth]} ${selectedYear} · ${monthly.days_recorded} days recorded`}
                    </p>
                </div>
                <div className="relative" ref={pickerRef}>
                    <button
                        type="button"
                        onClick={() => setPickerOpen((o) => !o)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                    >
                        <Calendar size={14} className="text-violet-300" />
                        {MONTH_NAMES[selectedMonth]} {selectedYear}
                        <ChevronRight size={14} className={`text-slate-400 transition-transform ${pickerOpen ? "rotate-90" : ""}`} />
                    </button>
                    {pickerOpen && (
                        <div className="absolute right-0 mt-2 z-50 w-64 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3">
                            <div className="flex items-center justify-between mb-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedYear((y) => y - 1)}
                                    className="size-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors"
                                    title="Previous year"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-sm font-bold text-white tabular-nums">{selectedYear}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedYear((y) => y + 1)}
                                    className="size-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors"
                                    title="Next year"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const t = new Date();
                                    setSelectedYear(t.getFullYear());
                                    setSelectedMonth(t.getMonth());
                                    setPickerOpen(false);
                                }}
                                className="w-full mb-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors bg-white/5 text-slate-300 hover:bg-white/10"
                            >
                                Jump to current month
                            </button>
                            <div className="grid grid-cols-3 gap-1.5">
                                {MONTH_NAMES.map((name, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => { setSelectedMonth(idx); setPickerOpen(false); }}
                                        className={`px-2 py-2 text-xs font-bold rounded-lg transition-colors ${
                                            selectedMonth === idx
                                                ? "bg-violet-500 text-white"
                                                : "text-slate-300 hover:bg-white/10"
                                        }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Punctuality Score */}
                <div className={STAT_CARD}>
                    <div className="flex items-start justify-between mb-3">
                        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            PUNCTUALITY SCORE
                        </div>
                        {punctuality.delta !== null && (
                            <Pill className={deltaPositive
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/15 text-red-600 dark:text-red-400"}>
                                {deltaPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {deltaPositive ? "+" : ""}{punctuality.delta}%
                            </Pill>
                        )}
                    </div>
                    <div className="text-2xl font-medium text-slate-900 dark:text-white mb-3">
                        {punctuality.label}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <Donut value={punctuality.score} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-xl font-bold text-slate-900 dark:text-white">
                                    {punctuality.score}%
                                </div>
                                <div className="text-[10px] tracking-widest text-slate-400">
                                    SCORE
                                </div>
                            </div>
                        </div>
                        <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                            <li className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-violet-500" />
                                On-time {punctuality.on_time_pct}%
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-amber-500" />
                                Late {punctuality.late_pct}%
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                Streak {punctuality.streak} days
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Attendance · This Month */}
                <div className={STAT_CARD}>
                    <div className="flex items-start justify-between mb-3">
                        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            ATTENDANCE · THIS MONTH
                        </div>
                        <Pill className="bg-slate-200/60 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-600/30">
                            {monthly.month || "—"}
                        </Pill>
                    </div>
                    <div className="text-3xl font-medium text-slate-900 dark:text-white mb-4">
                        {monthly.days_recorded} days
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                <Calendar className="w-4 h-4" /> Present
                            </div>
                            <div className="text-2xl font-bold text-emerald-500 mt-1">{monthly.present}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                <Calendar className="w-4 h-4" /> Absent
                            </div>
                            <div className="text-2xl font-bold text-rose-500 mt-1">{monthly.absent}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                <Clock className="w-4 h-4" /> Late
                            </div>
                            <div className="text-2xl font-bold text-amber-500 mt-1">{monthly.late}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                <Clock className="w-4 h-4" /> Half Day
                            </div>
                            <div className="text-2xl font-bold text-cyan-500 mt-1">{monthly.half_day}</div>
                        </div>
                    </div>
                </div>

                {/* Working Hours */}
                <div className={STAT_CARD}>
                    <div className="flex items-start justify-between mb-3">
                        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            WORKING HOURS
                        </div>
                        <Pill className="bg-slate-200/60 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-600/30">
                            <Clock className="w-3 h-3" /> {hours.month || "—"}
                        </Pill>
                    </div>
                    <div className="text-3xl font-medium text-slate-900 dark:text-white mb-4">
                        {hours.total}
                    </div>
                    <ul className="space-y-2 text-sm">
                        <li className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>Total hours</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{hours.total}</span>
                        </li>
                        <li className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>Overtime</span>
                            <span className="font-semibold text-amber-500">{hours.overtime}</span>
                        </li>
                        <li className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>Average / day</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{hours.average_per_day}</span>
                        </li>
                    </ul>
                    <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800/80 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                                style={{ width: `${hours.progress}%` }}
                            />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5">
                            {hours.progress}% of {hours.target}
                        </div>
                    </div>
                </div>

                {/* Today */}
                <div className={STAT_CARD}>
                    <div className="flex items-start justify-between mb-3">
                        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            TODAY
                        </div>
                    </div>
                    <div className="text-2xl font-medium text-slate-900 dark:text-white mb-4">
                        {is_current_month ? today.status : "—"}
                    </div>
                    <ul className="space-y-2.5 text-sm">
                        <li className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-2">
                                <LogIn className="w-4 h-4" /> Check-in
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{today.check_in}</span>
                        </li>
                        <li className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-2">
                                <Coffee className="w-4 h-4" /> Check-out
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{today.check_out}</span>
                        </li>
                        <li className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Worked
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{today.worked}</span>
                        </li>
                        <li className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4" /> Device
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{today.device}</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Attendance Log */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/40 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Attendance Log
                    </h3>
                    <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-0.5">
                        {[
                            { id: "1w", label: "1W", Icon: Calendar, title: "Last 7 days" },
                            { id: "1m", label: "1M", Icon: CalendarDays, title: "Last 30 days" },
                            { id: "6m", label: "6M", Icon: CalendarRange, title: "Last 6 months" },
                        ].map(opt => {
                            const Icon = opt.Icon;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setLogRange(opt.id)}
                                    title={opt.title}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                                        logRange === opt.id
                                            ? "bg-violet-500 text-white shadow"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    }`}
                                >
                                    <Icon className="w-3 h-3" /> {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="py-3 pr-4 font-semibold">Date</th>
                                <th className="py-3 px-4 font-semibold">Shift Type</th>
                                <th className="py-3 px-4 font-semibold">Check-in</th>
                                <th className="py-3 px-4 font-semibold">Check-out</th>
                                <th className="py-3 px-4 font-semibold">Hours</th>
                                <th className="py-3 px-4 font-semibold">Device</th>
                                <th className="py-3 px-4 font-semibold">Location</th>
                                <th className="py-3 pl-4 font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                            {log.length === 0 && (
                                <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-500">
                                    {loading ? "Loading…" : "No attendance log"}
                                </td></tr>
                            )}
                            {pagedLog.map((row) => (
                                <tr key={row.date} className="text-sm">
                                    <td className="py-4 pr-4 font-bold text-slate-900 dark:text-white">{row.date_label}</td>
                                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{row.shift_type || "—"}</td>
                                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{row.check_in}</td>
                                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{row.check_out}</td>
                                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{row.hours}</td>
                                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{row.device}</td>
                                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{row.location || "—"}</td>
                                    <td className="py-4 pl-4 text-right">
                                        <StatusBadge status={row.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {log.length > LOG_PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{showFrom}-{showTo}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{log.length}</span>
                        </span>
                        <div className="inline-flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
                            <button
                                type="button"
                                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                className="size-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Previous page"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 text-xs font-bold text-white tabular-nums">
                                {safePage} / {totalLogPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                                disabled={safePage >= totalLogPages}
                                className="size-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Next page"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Attendance;
