"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import {
  Users, UserCheck, Clock, AlertTriangle, CalendarCheck, DoorOpen, UserX,
  BadgeCheck, Fingerprint, Activity, BarChart3, LineChart as LineChartIcon,
  Search, X, Mail, Phone, Briefcase, Shield, MapPin,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import KpiDetailDialog from "@/components/Visitor/KpiDetailDialog";

const accessMethodData = [];

const statusColors = {
  "checked-in": "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  "checked-out": "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  pending: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  approved: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  "pre-registered": "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
};

const KPI_ACCENTS = {
  neutral: { iconBg: "rgba(100,116,139,.18)", iconFg: "#94a3b8", label: "#94a3b8" },
  green:   { iconBg: "rgba(34,197,94,.20)",   iconFg: "#4ade80", label: "#4ade80" },
  red:     { iconBg: "rgba(239,68,68,.22)",   iconFg: "#fca5a5", label: "#fb7185" },
  purple:  { iconBg: "rgba(168,85,247,.20)",  iconFg: "#c084fc", label: "#c084fc" },
  amber:   { iconBg: "rgba(245,158,11,.22)",  iconFg: "#fbbf24", label: "#fbbf24" },
  blue:    { iconBg: "rgba(59,130,246,.20)",  iconFg: "#60a5fa", label: "#60a5fa" },
  emerald: { iconBg: "rgba(16,185,129,.20)",  iconFg: "#34d399", label: "#34d399" },
};

function KpiCard({ icon: Icon, title, value, accent = "neutral", badge, onClick }) {
  const a = KPI_ACCENTS[accent] || KPI_ACCENTS.neutral;
  const clickable = typeof onClick === "function";
  const interactive = clickable
    ? "cursor-pointer transition-all hover:ring-1 hover:ring-white/20 hover:shadow-lg hover:shadow-black/20"
    : "";
  const Tag = clickable ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      type={clickable ? "button" : undefined}
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3.5 dark:border-[#1d2b4a] dark:bg-[#0e1730] w-full text-left ${interactive}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{ color: a.label }}
        >
          {title}
        </p>
        <div
          className="grid place-items-center w-9 h-9 rounded-[10px]"
          style={{ background: a.iconBg, color: a.iconFg }}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-gray-900 dark:text-white">
          {value}
        </span>
        {badge && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1"
            style={{ color: a.iconFg, background: a.iconBg }}
          >
            {badge}
          </span>
        )}
      </div>
    </Tag>
  );
}

function ProgressBar({ value, label, valueLabel }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">{valueLabel || `${value}%`}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

const notifColors = {
  arrival: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10",
  overstay: "border-l-amber-500 bg-amber-50 dark:bg-amber-900/10",
  alert: "border-l-red-500 bg-red-50 dark:bg-red-900/10",
};

// Traffic chart time-range presets — keyed by id, used both for the dropdown
// label and as the from_hour / to_hour query params passed to analytics.
const TRAFFIC_RANGES = {
  "24h":      { label: "24 Hours",          from: 0,  to: 23 },
  "business": { label: "Business (6AM-6PM)", from: 6,  to: 18 },
  "morning":  { label: "Morning (6AM-12PM)", from: 6,  to: 12 },
  "afternoon":{ label: "Afternoon (12PM-6PM)", from: 12, to: 18 },
  "evening":  { label: "Evening (6PM-12AM)", from: 18, to: 23 },
  "night":    { label: "Night (12AM-6AM)",   from: 0,  to: 6 },
};

export default function VisitorDashboard() {
  const [weeklyChartType, setWeeklyChartType] = useState("bar");
  const [trafficChartType, setTrafficChartType] = useState("area");
  const [trafficRange, setTrafficRange] = useState("24h");
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [visitorSearch, setVisitorSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [kpiDialog, setKpiDialog] = useState({ open: false, kpiKey: null, title: "" });
  const openKpiDialog = (kpiKey, title) => setKpiDialog({ open: true, kpiKey, title });
  const closeKpiDialog = () => setKpiDialog((s) => ({ ...s, open: false }));
  const [liveVisitors, setLiveVisitors] = useState([]);
  const [realHourlyData, setRealHourlyData] = useState([]);
  const [realWeeklyTrend, setRealWeeklyTrend] = useState([]);
  const [realTypeData, setRealTypeData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const params = await buildQueryParams({});
      try {
        const { data } = await api.get("/visitor-management/dashboard", { params });
        setStats(data);
      } catch (e) { console.warn("Dashboard stats error", e); }
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await api.get("/visitor-management/logs", { params: { ...params, date: today, per_page: 10 } });
        const items = (data?.data || []).map(l => ({
          name: l.visitor ? `${l.visitor.first_name} ${l.visitor.last_name || ""}`.trim() : `Visitor ${l.visitor_id}`,
          company: l.visitor?.visitor_company_name || "---",
          host: "---",
          status: l.out ? "checked-out" : "checked-in",
          time: l.in || "---",
          type: "Business",
          method: "---",
          zone: "---",
          email: "---",
          phone: "---",
          badge: "---",
          dept: "---",
        }));
        setLiveVisitors(items);
      } catch (e) {}
    };
    fetchData();
  }, []);

  // Analytics depends on the traffic range — refetch when the user picks a new window.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const baseParams = await buildQueryParams({});
      const r = TRAFFIC_RANGES[trafficRange] || TRAFFIC_RANGES["24h"];
      try {
        const { data } = await api.get("/visitor-management/analytics", {
          params: { ...baseParams, from_hour: r.from, to_hour: r.to },
        });
        if (cancelled) return;
        setRealHourlyData(Array.isArray(data.hourly_data) ? data.hourly_data : []);
        setRealWeeklyTrend(Array.isArray(data.weekly_trend) ? data.weekly_trend : []);
        setRealTypeData(Array.isArray(data.type_data) ? data.type_data : []);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      } catch (e) { console.warn("Analytics error", e); }
    })();
    return () => { cancelled = true; };
  }, [trafficRange]);

  const displayVisitors = liveVisitors;

  const filteredVisitors = displayVisitors.filter((v) => {
    const matchesSearch = !visitorSearch || [v.name, v.company, v.host].some(f => f.toLowerCase().includes(visitorSearch.toLowerCase()));
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesType = typeFilter === "all" || v.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const chartStyle = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' };
  const tickStyle = { fill: '#94a3b8', fontSize: 11 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Visitor Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Real-time overview across all sites</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> All systems operational</span>
        </div>
      </div>

      {/* Host Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`flex items-center justify-between rounded-lg border-l-4 px-4 py-3 ${notifColors[n.type] || ""}`}>
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-sm ${n.type === "arrival" ? "text-emerald-500" : n.type === "overstay" ? "text-amber-500" : "text-red-500"}`}>
                  {n.type === "arrival" ? "login" : n.type === "overstay" ? "schedule" : "warning"}
                </span>
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{n.visitor}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400"> {n.message}</span>
                  <span className="text-[10px] text-gray-400 ml-2">
                    {n.time}
                    {n.host ? ` | Host: ${n.host}` : ""}
                  </span>
                </div>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                className="p-1 rounded hover:bg-black/10 text-gray-400 hover:text-gray-600 transition">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}          title="Total Visitors Today" value={stats?.total_today ?? 0}        accent="neutral" onClick={() => openKpiDialog("total_today", "Total Visitors Today")} />
        <KpiCard icon={UserCheck}      title="Currently Inside"     value={stats?.checked_in ?? 0}         accent="green"   onClick={() => openKpiDialog("currently_inside", "Currently Inside")} />
        <KpiCard icon={Clock}          title="Pending Approvals"    value={stats?.pending_approvals ?? 0}  accent="amber"   onClick={() => openKpiDialog("pending_approvals", "Pending Approvals")} />
        <KpiCard icon={AlertTriangle}  title="Blacklisted"          value={stats?.blacklisted ?? 0}        accent="red"     onClick={() => openKpiDialog("blacklisted", "Blacklisted Visitors")} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Pre-Registered",    value: stats?.pre_registered ?? 0, icon: CalendarCheck, accent: "purple",  kpiKey: "pre_registered" },
          { label: "Weekly Total",      value: stats?.weekly_count ?? 0,   icon: DoorOpen,      accent: "blue",    kpiKey: "weekly_total" },
          { label: "Overstayed",        value: stats?.overstayed ?? 0,     icon: UserX,         accent: "amber",   kpiKey: "overstayed" },
          { label: "Badges Printed",    value: stats?.total_today ?? 0,    icon: BadgeCheck,    accent: "emerald" },
          { label: "Face Verifications",value: 0,                          icon: Fingerprint,   accent: "blue" },
          { label: "Avg Wait Time",     value: "---",                      icon: Clock,         accent: "purple" },
        ].map((kpi) => (
          <KpiCard
            key={kpi.label}
            icon={kpi.icon}
            title={kpi.label}
            value={kpi.value}
            accent={kpi.accent}
            onClick={kpi.kpiKey ? () => openKpiDialog(kpi.kpiKey, kpi.label) : undefined}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Traffic Chart */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Visitor Traffic — Today</h3>
            <div className="flex items-center gap-2">
              <select
                value={trafficRange}
                onChange={(e) => setTrafficRange(e.target.value)}
                className="text-[11px] font-medium rounded-md border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {Object.entries(TRAFFIC_RANGES).map(([key, r]) => (
                  <option key={key} value={key}>{r.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                {[["area", "Area"], ["bar", "Bar"], ["line", "Line"]].map(([type, label]) => (
                  <button key={type} onClick={() => setTrafficChartType(type)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${trafficChartType === type ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {trafficChartType === "bar" ? (
              <BarChart data={realHourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                <XAxis dataKey="hour" tick={tickStyle} /><YAxis tick={tickStyle} />
                <Tooltip cursor={false} contentStyle={chartStyle} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="visitors" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} name="Visitors" />
                <Bar dataKey="expected" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Expected" opacity={0.6} />
              </BarChart>
            ) : trafficChartType === "line" ? (
              <LineChart data={realHourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                <XAxis dataKey="hour" tick={tickStyle} /><YAxis tick={tickStyle} />
                <Tooltip cursor={false} contentStyle={chartStyle} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="visitors" stroke="hsl(173, 58%, 39%)" strokeWidth={2.5} dot={{ r: 3 }} name="Visitors" />
                <Line type="monotone" dataKey="expected" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Expected" />
              </LineChart>
            ) : (
              <AreaChart data={realHourlyData}>
                <defs><linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                <XAxis dataKey="hour" tick={tickStyle} /><YAxis tick={tickStyle} />
                <Tooltip cursor={false} contentStyle={chartStyle} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="visitors" stroke="hsl(173, 58%, 39%)" fillOpacity={1} fill="url(#colorV)" strokeWidth={2} name="Visitors" />
                <Line type="monotone" dataKey="expected" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Expected" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Visitor Types */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-5 relative overflow-hidden">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-4">Visitor Types</h3>
          {realTypeData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">No visitor type data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart><Pie data={realTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {realTypeData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie><Tooltip cursor={false} contentStyle={chartStyle} /></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {realTypeData.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><div className="w-2 h-2 rounded-full" style={{ background: t.color }} />{t.name}</div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{t.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Access Methods */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-5 relative overflow-hidden">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-4">Access Methods</h3>
          {accessMethodData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">No access method data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart><Pie data={accessMethodData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {accessMethodData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie><Tooltip cursor={false} contentStyle={chartStyle} /></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {accessMethodData.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><div className="w-2 h-2 rounded-full" style={{ background: t.color }} />{t.name}</div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{t.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Weekly Trend</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">This week vs last week</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {[["bar", BarChart3, "Bar"], ["line", LineChartIcon, "Line"]].map(([type, Icon, label]) => (
              <button key={type} onClick={() => setWeeklyChartType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${weeklyChartType === type ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          {weeklyChartType === "bar" ? (
            <BarChart data={realWeeklyTrend} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="day" tick={tickStyle} /><YAxis tick={tickStyle} />
              <Tooltip cursor={false} contentStyle={chartStyle} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="thisWeek" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} name="This Week" />
              <Bar dataKey="lastWeek" fill="hsl(220, 13%, 85%)" radius={[4, 4, 0, 0]} name="Last Week" />
            </BarChart>
          ) : (
            <LineChart data={realWeeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="day" tick={tickStyle} /><YAxis tick={tickStyle} />
              <Tooltip cursor={false} contentStyle={chartStyle} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="thisWeek" stroke="hsl(173, 58%, 39%)" strokeWidth={2.5} dot={{ r: 4 }} name="This Week" />
              <Line type="monotone" dataKey="lastWeek" stroke="hsl(220, 13%, 75%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Last Week" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Recent Visitors Table */}
      <div className="glass-panel rounded-2xl relative overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Recent Visitor Activity</h3>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">{filteredVisitors.length}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input placeholder="Search by name, company, host..." value={visitorSearch} onChange={(e) => setVisitorSearch(e.target.value)}
                className="w-full pl-8 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300">
              <option value="all">All Statuses</option>
              <option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option>
              <option value="pending">Pending</option><option value="approved">Approved</option><option value="pre-registered">Pre-registered</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300">
              <option value="all">All Types</option>
              <option value="Business">Business</option><option value="Contractor">Contractor</option>
              <option value="Delivery">Delivery</option><option value="Interview">Interview</option><option value="VIP">VIP</option>
            </select>
            {(visitorSearch || statusFilter !== "all" || typeFilter !== "all") && (
              <button onClick={() => { setVisitorSearch(""); setStatusFilter("all"); setTypeFilter("all"); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"><X className="w-3 h-3" /> Clear</button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Visitor</th><th className="px-3 py-3">Host</th><th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Method</th><th className="px-3 py-3">Zone</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredVisitors.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-xs text-gray-400">No visitors match the current filters</td></tr>
              ) : filteredVisitors.map((v) => (
                <tr key={v.name} className="hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer text-xs text-gray-600 dark:text-gray-300"
                  onClick={() => setSelectedVisitor(v)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                        {v.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-100 text-xs">{v.name}</div>
                        <div className="text-[10px] text-gray-400">{v.company}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{v.host}</td>
                  <td className="px-3 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">{v.type}</span></td>
                  <td className="px-3 py-3 font-mono text-[11px]">{v.method}</td>
                  <td className="px-3 py-3">{v.zone}</td>
                  <td className="px-3 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[v.status] || ""}`}>{v.status}</span></td>
                  <td className="px-3 py-3">{v.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visitor Detail Dialog */}
      {selectedVisitor && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedVisitor(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Visitor Profile</h3>
              <button onClick={() => setSelectedVisitor(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-lg font-bold text-purple-700 dark:text-purple-400">
                  {selectedVisitor.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{selectedVisitor.name}</div>
                  <div className="text-sm text-gray-500">{selectedVisitor.company}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[selectedVisitor.status]}`}>{selectedVisitor.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2.5 text-sm"><Mail className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-700 dark:text-gray-300">{selectedVisitor.email}</span></div>
                <div className="flex items-center gap-2.5 text-sm"><Phone className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-700 dark:text-gray-300">{selectedVisitor.phone}</span></div>
                <div className="flex items-center gap-2.5 text-sm"><Briefcase className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-700 dark:text-gray-300">{selectedVisitor.type}</span></div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Visit Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Host", selectedVisitor.host], ["Department", selectedVisitor.dept],
                    ["Check-in", selectedVisitor.time], ["Badge", selectedVisitor.badge],
                    ["Access Method", selectedVisitor.method], ["Zone", selectedVisitor.zone],
                  ].map(([label, value]) => (
                    <div key={label}><div className="text-[10px] text-gray-400">{label}</div><div className="text-xs font-medium text-gray-800 dark:text-gray-200">{value}</div></div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition">
                  <Shield className="w-3.5 h-3.5" /> Security Check
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <MapPin className="w-3.5 h-3.5" /> Track Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <KpiDetailDialog
        open={kpiDialog.open}
        onClose={closeKpiDialog}
        kpiKey={kpiDialog.kpiKey}
        title={kpiDialog.title}
      />

    </div>
  );
}
