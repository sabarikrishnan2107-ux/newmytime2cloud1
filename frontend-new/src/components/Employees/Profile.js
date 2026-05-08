"use client";

import { getDocuments } from '@/lib/api';
import { api, buildQueryParams } from '@/lib/api-client';
import { calculateYearsOfService } from '@/lib/utils';
import {
  FileType, ImageIcon, IdCard, Briefcase, Building2, Users, Mail, Phone,
  Clock, UserCheck, Calendar, MapPin, Award, TrendingUp, TrendingDown,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const Profile = ({ payload }) => {
  const completionFields = [
    payload?.first_name, payload?.last_name, payload?.email, payload?.phone_number,
    payload?.profile_picture, payload?.joining_date, payload?.department_id,
    payload?.designation_id, payload?.branch_id, payload?.gender, payload?.dob,
    payload?.address, payload?.emergency_contact, payload?.system_user_id,
  ];
  const filled = completionFields.filter(v => v !== null && v !== undefined && v !== '' && v !== 0).length;
  const profileCompletion = Math.round((filled / completionFields.length) * 100);

  const annualLeaveTotal = payload?.leave_group?.annual_leaves ?? payload?.annual_leaves ?? 0;
  const annualLeaveUsed = payload?.leave_summary?.annual_used ?? 0;
  const annualLeaveAvail = Math.max(0, annualLeaveTotal - annualLeaveUsed);
  const annualPct = annualLeaveTotal > 0 ? Math.round((annualLeaveAvail / annualLeaveTotal) * 360) : 0;

  const [documents, setDocuments] = useState([]);

  const fetchDocuments = async () => {
    try {
      const employees = await getDocuments(payload.id);
      setDocuments(employees);
    } catch {
      setDocuments([]);
    }
  };

  useEffect(() => { fetchDocuments(); }, [payload.id]);

  const [punctuality, setPunctuality] = useState({ monthly: [], weekly: [], daily: [], daily_30: [], mom_change: null, week_days_with_data: 0 });
  const [trendRange, setTrendRange] = useState("1w"); // "1w" | "1m" | "6m"
  const [checkInRange, setCheckInRange] = useState("1w"); // "1w" | "1m" | "6m"
  const [weekRange, setWeekRange] = useState("1w"); // "1w" | "1m" | "1y"

  useEffect(() => {
    const lookupId = payload?.system_user_id || payload?.id;
    if (!lookupId) return;
    let cancelled = false;
    (async () => {
      try {
        const params = await buildQueryParams({ employee_id: lookupId });
        const { data } = await api.get('/employee-punctuality-stats', { params });
        if (cancelled) return;
        if (data) {
          if (data.debug) console.log('[Punctuality]', data.debug);
          setPunctuality(data);
        }
      } catch (e) {
        console.warn('[Punctuality] fetch failed:', e?.response?.status, e?.message);
        if (!cancelled) setPunctuality({ monthly: [], weekly: [], daily: [], daily_30: [], mom_change: null, week_days_with_data: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, [payload?.system_user_id, payload?.id]);

  const trendData = useMemo(() => {
    if (trendRange === "1w") {
      return (punctuality.daily || []).map(d => ({ m: d.label, onTime: Number(d.on_time_pct) || 0, late: Number(d.late) || 0 }));
    }
    if (trendRange === "1m") {
      return (punctuality.daily_30 || []).map(d => ({ m: d.label, onTime: Number(d.on_time_pct) || 0, late: Number(d.late) || 0 }));
    }
    return (punctuality.monthly || []).slice(-6).map(m => ({ m: m.month, onTime: Number(m.on_time_pct) || 0, late: Number(m.late) || 0 }));
  }, [punctuality, trendRange]);

  const trendChange = useMemo(() => {
    const withData = trendData.filter(d => d.onTime > 0 || d.late > 0);
    if (withData.length < 2) return null;
    const newest = withData[withData.length - 1].onTime;
    const oldest = withData[0].onTime;
    return Math.round((newest - oldest) * 10) / 10;
  }, [trendData]);

  const trendChangeLabel = trendRange === "1w" ? "WoW" : trendRange === "1m" ? "MoM" : "6M";
  const trendSubtitle = trendRange === "1w" ? "last 7 days" : trendRange === "1m" ? "last 30 days" : "last 6 months";

  const checkInData = useMemo(() => {
    if (checkInRange === "1w") {
      return (punctuality.daily || [])
        .filter(d => d.avg_check_in_hours !== null && d.avg_check_in_hours !== undefined)
        .map(d => ({ m: d.label, t: Number(d.avg_check_in_hours) }));
    }
    if (checkInRange === "1m") {
      return (punctuality.daily_30 || [])
        .filter(d => d.avg_check_in_hours !== null && d.avg_check_in_hours !== undefined)
        .map(d => ({ m: d.label, t: Number(d.avg_check_in_hours) }));
    }
    return (punctuality.monthly || [])
      .slice(-6)
      .filter(m => m.avg_check_in_hours !== null && m.avg_check_in_hours !== undefined)
      .map(m => ({ m: m.month, t: Number(m.avg_check_in_hours) }));
  }, [punctuality, checkInRange]);

  const checkInDomain = useMemo(() => {
    if (checkInData.length === 0) return [0, 24];
    const values = checkInData.map(d => d.t);
    const min = Math.floor(Math.min(...values) * 10) / 10;
    const max = Math.ceil(Math.max(...values) * 10) / 10;
    return [min === max ? min - 0.2 : min - 0.05, min === max ? max + 0.2 : max + 0.05];
  }, [checkInData]);

  const checkInDeltaMin = useMemo(() => {
    if (checkInData.length < 2) return null;
    const cur = checkInData[checkInData.length - 1].t;
    const prev = checkInData[checkInData.length - 2].t;
    return Math.round((cur - prev) * 60);
  }, [checkInData]);

  const weekData = useMemo(() => {
    if (weekRange === "1w") {
      return (punctuality.weekly || []).map(w => ({ d: w.day, onTime: Number(w.on_time) || 0, late: Number(w.late) || 0 }));
    }
    if (weekRange === "1m") {
      return (punctuality.daily_30 || []).map(d => ({ d: d.label, onTime: Number(d.on_time) || 0, late: Number(d.late) || 0 }));
    }
    return (punctuality.monthly || []).slice(-12).map(m => ({ d: m.month, onTime: Number(m.on_time) || 0, late: Number(m.late) || 0 }));
  }, [punctuality, weekRange]);

  const weekTotals = useMemo(() => {
    const days = weekData.filter(d => d.onTime + d.late > 0);
    return { activeBuckets: days.length, label: weekRange === "1w" ? "days" : weekRange === "1m" ? "days" : "months" };
  }, [weekData, weekRange]);

  const tenureYears = payload?.joining_date
    ? calculateYearsOfService(new Date(payload.joining_date))
    : 0;

  const formatJoined = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return "—"; }
  };

  const managerName = [
    payload?.reporting_manager?.first_name,
    payload?.reporting_manager?.last_name,
  ].filter(Boolean).join(" ") || "—";

  const shiftSource = payload?.schedule?.shift || payload?.schedule?.shift_type || payload?.shift;
  const shiftValue = shiftSource?.name
    ? `${shiftSource.name}${shiftSource?.start_time ? ` · ${shiftSource.start_time}${shiftSource?.end_time ? `–${shiftSource.end_time}` : ""}` : ""}`
    : "—";

  const countryLabel = payload?.country?.name || payload?.nationality || payload?.present_address?.city;

  const infoTiles = [
    { icon: IdCard, label: "Employee ID", value: payload?.employee_id || "—" },
    { icon: Briefcase, label: "Designation", value: payload?.designation?.name || "—" },
    { icon: Building2, label: "Branch", value: payload?.branch?.branch_name || payload?.branch?.name || "—" },
    { icon: Users, label: "Department", value: payload?.department?.name || "—" },
    { icon: Mail, label: "Email", value: payload?.user?.email || payload?.email || "—", truncate: true },
    { icon: Phone, label: "Phone", value: payload?.phone_number || "—" },
    { icon: Clock, label: "Shift", value: shiftValue },
    { icon: UserCheck, label: "Reporting Manager", value: managerName },
    { icon: Calendar, label: "Joined", value: formatJoined(payload?.joining_date) },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Employee{" "}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Profile
          </span>
        </h2>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/50 bg-gradient-to-br from-white via-white to-violet-50/40 dark:from-slate-900/80 dark:via-slate-900 dark:to-violet-950/40 p-6 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-center relative z-10">
          {/* Left: avatar + name + pills */}
          <div className="flex flex-col items-start gap-3">
            <div className="relative">
              <div
                className="size-32 rounded-full bg-cover bg-center ring-4 ring-violet-500/30 shadow-xl shadow-violet-500/20 bg-slate-200 dark:bg-slate-800"
                style={payload?.profile_picture ? { backgroundImage: `url("${payload.profile_picture}")` } : undefined}
              />
              <span className="absolute bottom-2 right-2 size-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {payload?.full_name || "—"}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {payload?.designation?.name || "—"} · {payload?.employee_id || "—"}
            </p>
            <div className="flex flex-wrap gap-2">
              {(payload?.branch?.branch_name || payload?.branch?.name) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                  <Building2 className="w-3 h-3" /> {payload.branch.branch_name || payload.branch.name}
                </span>
              )}
              {countryLabel && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  <MapPin className="w-3 h-3" /> {countryLabel}
                </span>
              )}
              {payload?.joining_date && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200/60 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-600/30">
                  <Award className="w-3 h-3" /> {tenureYears} yrs tenure
                </span>
              )}
            </div>
          </div>

          {/* Right: 3x3 info tile grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {infoTiles.map((tile) => (
              <div key={tile.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40">
                <div className="size-9 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <tile.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold">{tile.label}</div>
                  <div className={`text-sm font-semibold text-slate-900 dark:text-white ${tile.truncate ? "truncate" : ""}`} title={tile.truncate ? String(tile.value) : undefined}>
                    {tile.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Punctuality / Avg Check-in / This Week charts */}
      <div className="space-y-5">
        {/* Punctuality Trend (full width) */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-700 dark:text-white">Punctuality Trend</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">On-time % vs late days · {trendSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-0.5">
                {[
                  { id: "1w", label: "1W" },
                  { id: "1m", label: "1M" },
                  { id: "6m", label: "6M" },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTrendRange(opt.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                      trendRange === opt.id
                        ? "bg-violet-500 text-white shadow"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {trendChange !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  trendChange >= 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                }`}>
                  {trendChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {trendChange >= 0 ? "+" : ""}{trendChange}% {trendChangeLabel}
                </span>
              )}
            </div>
          </div>
          <div className="h-[260px]">
            {trendData.every(d => d.onTime === 0 && d.late === 0) ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
                <span>No attendance in this range</span>
                {punctuality.debug && (
                  <span className="text-[10px] text-slate-600 font-mono">
                    sys_id: {String(punctuality.debug.resolved_system_user_id ?? "—")}
                    {" · "}company: {String(punctuality.debug.resolved_company_id ?? "—")}
                    {" · "}rows in window: {punctuality.debug.rows_in_window}
                    {" · "}all time: {punctuality.debug.total_rows_for_employee_all_time}
                  </span>
                )}
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="ontimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0" }}
                  labelStyle={{ color: "#a3a3a3", fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="onTime" stroke="#a855f7" strokeWidth={2.5} fill="url(#ontimeGrad)" name="On-time %" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Late days" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Avg Check-in Time */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 p-5">
            <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-gray-700 dark:text-white">Avg Check-in Time</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Earlier is better</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-0.5">
                  {[
                    { id: "1w", label: "1W" },
                    { id: "1m", label: "1M" },
                    { id: "6m", label: "6M" },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCheckInRange(opt.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                        checkInRange === opt.id
                          ? "bg-cyan-500 text-white shadow"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {checkInDeltaMin !== null && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    checkInDeltaMin <= 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }`}>
                    {checkInDeltaMin > 0 ? "+" : ""}{checkInDeltaMin} min
                  </span>
                )}
              </div>
            </div>
            <div className="h-[220px]">
              {checkInData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">No check-in data yet</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={checkInData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} domain={checkInDomain} tickFormatter={(v) => v.toFixed(1)} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0" }} formatter={(v) => [`${Math.floor(v)}:${String(Math.round((v - Math.floor(v)) * 60)).padStart(2, "0")}`, "Avg in"]} />
                  <Line type="monotone" dataKey="t" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: "#06b6d4" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* This Week / Month / Year */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 p-5">
            <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-gray-700 dark:text-white">
                  {weekRange === "1w" ? "This Week" : weekRange === "1m" ? "Last 30 Days" : "Last 12 Months"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">On-time vs late {weekRange === "1y" ? "per month" : "per day"}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-0.5">
                  {[
                    { id: "1w", label: "1W" },
                    { id: "1m", label: "1M" },
                    { id: "1y", label: "1Y" },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWeekRange(opt.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                        weekRange === opt.id
                          ? "bg-cyan-500 text-white shadow"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="inline-flex items-center rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 px-2.5 py-1 text-[11px] font-semibold">
                  {weekTotals.activeBuckets} {weekTotals.label}
                </span>
              </div>
            </div>
            <div className="h-[220px]">
              {weekData.every(w => w.onTime === 0 && w.late === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">No attendance data for this range yet</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0" }} />
                  <Bar dataKey="onTime" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="late" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Existing dashboard tiles below — hidden, replaced by the charts above */}
      <div className="hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[minmax(140px,auto)]">
        {/* Payroll */}
        <div className="glass-card col-span-1 md:col-span-1 row-span-2 p-6 flex flex-col rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">payments</span>
              <span className="text-sm font-bold uppercase tracking-wider">Payroll</span>
            </div>
            <button className="text-xs text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              History
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1 mb-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">Next Payday</span>
            <span className="text-3xl font-light text-gray-600 dark:text-gray-300 tracking-tight">Oct 30</span>
            <span className="text-xs text-teal-600 mt-1 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px] filled">check_circle</span>
              Confirmed
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-4 border border-slate-100 dark:border-gray-700 mb-4 shadow-inner">
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-300">Last Net Pay</span>
              <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
                {payload?.payroll?.net_salary ? `$${Number(payload.payroll.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </span>
            </div>
            <div className="flex items-end gap-1 h-8 mt-2 opacity-80">
              <div className="w-1/6 bg-indigo-200 rounded-t-sm h-[40%]"></div>
              <div className="w-1/6 bg-indigo-200 rounded-t-sm h-[60%]"></div>
              <div className="w-1/6 bg-indigo-200 rounded-t-sm h-[50%]"></div>
              <div className="w-1/6 bg-indigo-200 rounded-t-sm h-[75%]"></div>
              <div className="w-1/6 bg-indigo-200 rounded-t-sm h-[65%]"></div>
              <div className="w-1/6 bg-primary rounded-t-sm h-[90%] shadow-[0_0_10px_rgba(79,70,229,0.3)]"></div>
            </div>
          </div>
          <button className="w-full mt-auto py-2.5 text-gray-600 dark:text-gray-300 rounded-lg bg-white dark:bg-gray-800 glass-card shadow-sm hover:shadow text-sm font-medium hover:text-primary transition-all flex items-center justify-center gap-2 group">
            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">download</span>
            Latest Slip
          </button>
        </div>

        {/* Tenure */}
        <div className="glass-card col-span-1 p-5 flex flex-col justify-between rounded-2xl hover:border-primary/20 group">
          <div className="flex justify-between items-start">
            <div className="size-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 group-hover:bg-orange-100 transition-colors">
              <span className="material-symbols-outlined">workspace_premium</span>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tenure</span>
          </div>
          <div>
            <span className="text-3xl font-light text-gray-600 dark:text-gray-300 block">{tenureYears}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">Years of Service</span>
          </div>
        </div>

        {/* Annual Leave */}
        <div className="glass-card col-span-1 p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start z-10 relative">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Annual Leave</span>
            <button className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-primary text-slate-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 z-10 relative">
            <div
              className="size-16 rounded-full flex items-center justify-center relative bg-slate-100 shadow-inner"
              style={{ background: `conic-gradient(#4f46e5 ${annualPct}deg, #e2e8f0 0deg)` }}
            >
              <div className="size-14 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center z-10 shadow-sm">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{annualLeaveAvail}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-light text-gray-600 dark:text-gray-300">{annualLeaveAvail}/{annualLeaveTotal}</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">Days Available</span>
            </div>
          </div>
          <div className="absolute bottom-[-20%] right-[-20%] w-24 h-24 bg-blue-100 rounded-full blur-[30px] pointer-events-none opacity-50"></div>
        </div>

        {/* Profile Completion */}
        <div className="glass-card col-span-1 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">Profile Completion</span>
          <div className="flex flex-col gap-2 mt-auto">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-light text-primary">{profileCompletion}%</span>
              <a className="text-xs text-primary font-medium hover:underline mb-1" href="#">Finish setup</a>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="glass-card col-span-1 md:col-span-2 lg:col-span-2 p-6 flex flex-col rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 dark:text-gray-300 font-bold text-lg">Recent Documents</h3>
            <a className="text-xs font-medium text-primary hover:text-primary/80 transition-colors" href="#">View All</a>
          </div>
          <div className="flex flex-col gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center p-3 rounded-xl glass-card border border-transparent hover:shadow-sm transition-all group cursor-pointer"
              >
                <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${doc.type === 'pdf' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {doc.type === 'pdf' ? <FileType size={20} /> : <ImageIcon size={20} />}
                </div>
                <div className="flex-1 min-w-0 ml-5">
                  <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 truncate">{doc.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Added on {doc.created_at}</p>
                </div>
                <a href={doc.access_url} download={doc.access_url} target="_blank" rel="noopener noreferrer">
                  <button className="p-2 text-gray-400 hover:text-blue-500">
                    <span className="material-symbols-outlined">download</span>
                  </button>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Leave */}
        <div className="glass-card col-span-1 p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Upcoming Leave</span>
            <span className="material-symbols-outlined text-gray-500 dark:text-gray-300 text-[20px]">flight_takeoff</span>
          </div>
          <div className="mt-auto">
            <div className="flex items-center gap-3 glass-card p-3 rounded-xl">
              <div className="flex flex-col items-center justify-center glass-card shadow-sm rounded px-2 py-1 min-w-[3rem]">
                <span className="text-[10px] uppercase text-gray-600 dark:text-gray-300 font-bold">Nov</span>
                <span className="text-lg font-bold text-gray-600 dark:text-gray-300 leading-none">14</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Thanksgiving</span>
                <span className="text-xs text-gray-600 dark:text-gray-300">2 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
