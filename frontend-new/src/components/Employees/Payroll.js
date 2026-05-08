"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Wallet, Download, FileText, CheckCircle2, TrendingUp, TrendingDown, AreaChart as AreaIcon, LineChart as LineIcon, BarChart3 as BarIcon } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart, Area,
    BarChart, Bar,
    LineChart, Line,
    ComposedChart,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, LabelList,
} from "recharts";
import { api, buildQueryParams } from "@/lib/api-client";

const COLOR_GROSS = "#a78bfa";
const COLOR_NET = "#22d3ee";
const COLOR_NET_BAR = "#10b981";
const COLOR_DEDUCT = "#ef4444";
const COMPOSITION_COLORS = ["#a78bfa", "#22d3ee", "#10b981", "#f59e0b"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtK = (n) => {
    const v = Number(n || 0);
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return `${v}`;
};

const formatLong = (raw) => {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const TrendTooltip = ({ active, payload, label, currency }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl text-xs">
            <div className="font-bold text-white mb-1">{label}</div>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: p.color }} />
                    <span className="capitalize text-slate-300">{p.dataKey} :</span>
                    <span className="font-semibold text-white">{currency} {fmt(p.value)}</span>
                </div>
            ))}
        </div>
    );
};

const Payroll = ({ employee_id, bank, payroll = {} }) => {
    const [records, setRecords] = useState([]);
    const [structure, setStructure] = useState(null);
    const [settingsCurrency, setSettingsCurrency] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState("all"); // "all" or 0-11
    const [pickerOpen, setPickerOpen] = useState(false);
    const [trendChartType, setTrendChartType] = useState("bar"); // "area" | "line" | "bar"
    const pickerRef = React.useRef(null);

    React.useEffect(() => {
        if (!pickerOpen) return;
        const handleClick = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [pickerOpen]);

    useEffect(() => {
        if (!employee_id) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const params = await buildQueryParams({});
                const [{ data: payslips }, { data: struct }] = await Promise.all([
                    api.get("/payroll-management/staff-payslips", {
                        params: { ...params, employee_id, year: selectedYear, limit: 24 },
                    }),
                    api.get(`/payroll-management/employee-salary/${employee_id}`, { params }).catch(() => ({ data: null })),
                ]);
                if (cancelled) return;
                const list = Array.isArray(payslips) ? payslips : [];
                console.log("[Payroll] staff-payslips response:", list[0]);
                // First record may be a currency-only placeholder when the employee has no payslips
                if (list.length === 1 && list[0]?.placeholder) {
                    setRecords([]);
                    setSettingsCurrency(list[0].currency || null);
                } else {
                    setRecords(list);
                    setSettingsCurrency(list[0]?.currency || null);
                }
                setStructure(struct || null);
            } catch (e) {
                console.warn("Payroll fetch error:", e?.response?.status, e?.message);
                if (!cancelled) {
                    setRecords([]);
                    setStructure(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [employee_id, selectedYear]);

    const currency = settingsCurrency || records[0]?.currency || payroll?.currency || payroll?.company?.currency || "AED";

    // Filter records by selected month if a specific month is chosen
    const filteredRecords = useMemo(() => {
        if (selectedMonth === "all") return records;
        return records.filter((r) => Number(r.month) === Number(selectedMonth));
    }, [records, selectedMonth]);

    const latest = filteredRecords[0];

    const lastNetPay = Number(latest?.net_salary ?? latest?.final_salary ?? payroll?.net_salary ?? 0);
    const lastPaidRaw = latest?.paid_at || (latest ? `${latest.year}-${String(latest.month + 1).padStart(2, "0")}-01` : "");
    const latestStatus = (latest?.status || "").toString().toLowerCase();
    const isProcessed = latestStatus === "paid" || latestStatus === "approved";

    const ytdEarnings = useMemo(
        () => records.reduce((sum, r) => sum + Number(r.net_salary || 0), 0),
        [records]
    );

    const nextPaydayLabel = (() => {
        if (!lastPaidRaw) return "";
        const d = new Date(lastPaidRaw);
        if (isNaN(d.getTime())) return "";
        d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    })();

    const downloadPayslipFor = async (year, month) => {
        const baseParams = await buildQueryParams({});
        const url = `${api.defaults.baseURL}/payroll-management/employee-payslip?employee_id=${employee_id}&year=${year}&month=${month}&company_id=${baseParams.company_id}`;
        window.open(url, "_blank");
    };

    const downloadLatest = () => {
        if (latest) return downloadPayslipFor(latest.year, latest.month + 1);
        const now = new Date();
        return downloadPayslipFor(now.getFullYear(), now.getMonth() + 1);
    };

    const recentPayslips = useMemo(() => filteredRecords.slice(0, 5), [filteredRecords]);

    const trendData = useMemo(() => {
        return [...records]
            .slice(0, 6)
            .reverse()
            .map((r) => ({
                month: MONTH_NAMES[r.month] || "",
                gross: Number(r.gross_earned || 0),
                net: Number(r.net_salary || 0),
            }));
    }, [records]);

    const deductionData = useMemo(() => {
        return [...records]
            .slice(0, 6)
            .reverse()
            .map((r) => ({
                month: MONTH_NAMES[r.month] || "",
                net: Number(r.net_salary || 0),
                deductions: Number(r.total_deduction || 0),
            }));
    }, [records]);

    const yoyChange = useMemo(() => {
        if (trendData.length < 2) return null;
        const newest = trendData[trendData.length - 1].net;
        const oldest = trendData[0].net;
        if (!oldest) return null;
        return ((newest - oldest) / oldest) * 100;
    }, [trendData]);

    const composition = useMemo(() => {
        const basic = Number(latest?.basic_salary ?? structure?.basic_salary ?? 0);
        const allowances = Number(latest?.total_allowances ?? (
            structure
                ? Number(structure.house_allowance || 0) +
                  Number(structure.transport_allowance || 0) +
                  Number(structure.food_allowance || 0) +
                  Number(structure.medical_allowance || 0) +
                  Number(structure.other_allowance || 0)
                : 0
        ));
        const ot = Number(latest?.ot_amount ?? 0);
        const bonus = Number((latest?.bonus ?? 0)) + Number((latest?.incentive ?? 0));
        const allItems = [
            { name: "Basic", value: basic, color: COMPOSITION_COLORS[0] },
            { name: "Allowances", value: allowances, color: COMPOSITION_COLORS[1] },
            { name: "OT", value: ot, color: COMPOSITION_COLORS[2] },
            { name: "Bonus", value: bonus, color: COMPOSITION_COLORS[3] },
        ];
        const total = allItems.reduce((s, i) => s + i.value, 0);
        const items = allItems.filter((i) => i.value > 0);
        return { items, allItems, total };
    }, [latest, structure]);

    const noData = !loading && records.length === 0;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payroll</h2>
                    <p className="text-xs text-[#9db0b9] mt-0.5">
                        {loading
                            ? "Loading…"
                            : noData
                            ? `No payroll records for ${selectedYear}.`
                            : selectedMonth === "all"
                            ? `${records.length} ${records.length === 1 ? "record" : "records"} for ${selectedYear}`
                            : `${filteredRecords.length} ${filteredRecords.length === 1 ? "record" : "records"} for ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                    </p>
                </div>
                <div className="relative" ref={pickerRef}>
                    <button
                        type="button"
                        onClick={() => setPickerOpen((o) => !o)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                    >
                        <Calendar size={14} className="text-violet-300" />
                        {selectedMonth === "all" ? "All months" : MONTH_NAMES[selectedMonth]} {selectedYear}
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
                                onClick={() => { setSelectedMonth("all"); setPickerOpen(false); }}
                                className={`w-full mb-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                                    selectedMonth === "all"
                                        ? "bg-violet-500 text-white"
                                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                                }`}
                            >
                                All months
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="glass-card rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payroll Summary</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        <CheckCircle2 size={14} /> {isProcessed ? "Processed" : latestStatus ? latestStatus.charAt(0).toUpperCase() + latestStatus.slice(1) : "—"}
                    </span>
                </div>

                <div className="flex flex-col gap-1 mb-5">
                    <span className="text-xs font-bold text-[#9db0b9] uppercase tracking-wider">Last Net Pay</span>
                    <span className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                        {currency} {fmt(lastNetPay)}
                    </span>
                    {lastPaidRaw && (
                        <span className="text-sm text-[#9db0b9]">Paid {formatLong(lastPaidRaw)}</span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="rounded-xl p-3.5 bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 text-[#9db0b9] mb-1">
                            <Calendar size={14} />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Next Payday</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {nextPaydayLabel || "—"}
                        </span>
                    </div>
                    <div className="rounded-xl p-3.5 bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 text-[#9db0b9] mb-1">
                            <Wallet size={14} />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">{selectedYear} Earnings</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {currency} {fmt(ytdEarnings)}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={downloadLatest}
                    className="mt-auto inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-sm shadow-lg shadow-violet-500/30 transition-all"
                >
                    <Download size={16} /> Download Salary Slip
                </button>
            </div>

            <div className="glass-card rounded-2xl p-6 lg:col-span-2 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Recent Payslips</h3>
                <div className="flex flex-col gap-2.5">
                    {recentPayslips.length === 0 && (
                        <div className="text-center text-sm text-slate-500 py-10">
                            {loading
                                ? "Loading…"
                                : selectedMonth === "all"
                                ? `No payslips for ${selectedYear}`
                                : `No payslip for ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                        </div>
                    )}
                    {recentPayslips.map((r) => {
                        const itemStatus = (r.status || "").toString().toLowerCase();
                        const itemPaid = itemStatus === "paid" || itemStatus === "approved";
                        const monthName = `${MONTH_NAMES[r.month] || ""} ${r.year}`;
                        return (
                            <div
                                key={r.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {monthName}
                                        </span>
                                        <span className="text-xs text-[#9db0b9]">
                                            Net pay {currency} {fmt(r.net_salary)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span
                                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                                            itemPaid
                                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                        }`}
                                    >
                                        {itemPaid ? "Paid" : itemStatus ? itemStatus.charAt(0).toUpperCase() + itemStatus.slice(1) : "—"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => downloadPayslipFor(r.year, r.month + 1)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                                    >
                                        <Download size={14} /> PDF
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6 lg:col-span-3">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Salary Trend</h3>
                        <p className="text-xs text-[#9db0b9] mt-0.5">Gross vs Net · last 6 months in {selectedYear}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-0.5">
                            {[
                                { id: "area", Icon: AreaIcon, title: "Area chart" },
                                { id: "line", Icon: LineIcon, title: "Line chart" },
                                { id: "bar", Icon: BarIcon, title: "Bar chart" },
                            ].map(opt => {
                                const Icon = opt.Icon;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setTrendChartType(opt.id)}
                                        title={opt.title}
                                        className={`size-8 inline-flex items-center justify-center rounded-md transition-colors ${
                                            trendChartType === opt.id
                                                ? "bg-violet-500 text-white shadow"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/10"
                                        }`}
                                    >
                                        <Icon size={14} />
                                    </button>
                                );
                            })}
                        </div>
                        {yoyChange !== null && (
                            <span
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                    yoyChange >= 0
                                        ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                                        : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}
                            >
                                {yoyChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {yoyChange >= 0 ? "+" : ""}
                                {yoyChange.toFixed(1)}% YoY
                            </span>
                        )}
                    </div>
                </div>
                <div className="h-[260px] w-full">
                    {trendData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">
                            {loading ? "Loading…" : "Trend data not available yet"}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            {trendChartType === "area" ? (
                                <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="grossAreaFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={COLOR_GROSS} stopOpacity={0.45} />
                                            <stop offset="100%" stopColor={COLOR_GROSS} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="netAreaFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={COLOR_NET} stopOpacity={0.4} />
                                            <stop offset="100%" stopColor={COLOR_NET} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="month" tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency} ${fmtK(v)}`} />
                                    <Tooltip content={<TrendTooltip currency={currency} />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#9db0b9" }} />
                                    <Area type="monotone" dataKey="gross" name="Gross" stroke={COLOR_GROSS} strokeWidth={2} fill="url(#grossAreaFill)" />
                                    <Area type="monotone" dataKey="net" name="Net" stroke={COLOR_NET} strokeWidth={2} fill="url(#netAreaFill)" />
                                </AreaChart>
                            ) : trendChartType === "line" ? (
                                <LineChart data={trendData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="month" tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency} ${fmtK(v)}`} />
                                    <Tooltip content={<TrendTooltip currency={currency} />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#9db0b9" }} />
                                    <Line type="monotone" dataKey="gross" name="Gross" stroke={COLOR_GROSS} strokeWidth={2.5} dot={{ r: 4, fill: COLOR_GROSS, stroke: "#0f172a", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="net" name="Net" stroke={COLOR_NET} strokeWidth={2.5} dot={{ r: 4, fill: COLOR_NET, stroke: "#0f172a", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            ) : (
                                <ComposedChart data={trendData} margin={{ top: 28, right: 24, left: 0, bottom: 0 }} barCategoryGap="25%">
                                    <defs>
                                        <linearGradient id="grossBarFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={COLOR_GROSS} stopOpacity={0.95} />
                                            <stop offset="100%" stopColor={COLOR_GROSS} stopOpacity={0.55} />
                                        </linearGradient>
                                        <linearGradient id="netBarFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={COLOR_NET} stopOpacity={0.95} />
                                            <stop offset="100%" stopColor={COLOR_NET} stopOpacity={0.55} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency} ${fmtK(v)}`} />
                                    <Tooltip content={<TrendTooltip currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#9db0b9", paddingTop: 8 }} />
                                    <Bar dataKey="gross" name="Gross" fill="url(#grossBarFill)" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                        <LabelList dataKey="gross" position="top" formatter={(v) => fmtK(v)} fill="#cbd5e1" fontSize={10} fontWeight={600} />
                                    </Bar>
                                    <Bar dataKey="net" name="Net" fill="url(#netBarFill)" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                        <LabelList dataKey="net" position="top" formatter={(v) => fmtK(v)} fill="#cbd5e1" fontSize={10} fontWeight={600} />
                                    </Bar>
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6 lg:col-span-1">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Net vs Deductions</h3>
                        <p className="text-xs text-[#9db0b9] mt-0.5">Monthly stacked breakdown</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {currency}
                    </span>
                </div>
                <div className="h-[230px] w-full">
                    {deductionData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">
                            {loading ? "Loading…" : "No breakdown data"}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deductionData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#9db0b9", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
                                <Tooltip content={<TrendTooltip currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                                <Bar dataKey="net" stackId="a" fill={COLOR_NET_BAR} radius={[0, 0, 4, 4]} />
                                <Bar dataKey="deductions" stackId="a" fill={COLOR_DEDUCT} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6 lg:col-span-2">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Salary Composition</h3>
                        <p className="text-xs text-[#9db0b9] mt-0.5">Latest month split</p>
                    </div>
                    {composition.total > 0 && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {currency} {fmt(composition.total)}
                        </span>
                    )}
                </div>
                {composition.total === 0 ? (
                    <div className="h-[230px] flex items-center justify-center text-sm text-slate-500">
                        {loading ? "Loading…" : "No composition data"}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 items-center">
                        <div className="sm:col-span-2 relative h-[210px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const p = payload[0];
                                            const pct = composition.total ? ((p.value / composition.total) * 100).toFixed(1) : 0;
                                            return (
                                                <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl text-xs">
                                                    <div className="font-bold text-white">{p.name}</div>
                                                    <div className="text-slate-300">{currency} {fmt(p.value)} <span className="text-slate-500">· {pct}%</span></div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Pie
                                        data={composition.items}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={62}
                                        outerRadius={90}
                                        paddingAngle={composition.items.length > 1 ? 2 : 0}
                                        stroke="none"
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {composition.items.map((it, idx) => (
                                            <Cell key={idx} fill={it.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-bold text-[#9db0b9] uppercase tracking-wider">Total</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                                    {fmt(composition.total)}
                                </span>
                                <span className="text-[10px] text-[#9db0b9]">{currency}</span>
                            </div>
                        </div>
                        <div className="sm:col-span-3 flex flex-col gap-2">
                            {composition.allItems.map((item) => {
                                const pct = composition.total ? (item.value / composition.total) * 100 : 0;
                                const isZero = item.value === 0;
                                return (
                                    <div key={item.name} className={`flex items-center gap-3 ${isZero ? "opacity-40" : ""}`}>
                                        <span
                                            className="size-2.5 rounded-full shrink-0"
                                            style={{ background: item.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                                    {item.name}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                                                    {currency} {fmt(item.value)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{ width: `${pct}%`, background: item.color }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-semibold text-[#9db0b9] tabular-nums w-10 text-right">
                                                    {pct.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default Payroll;
