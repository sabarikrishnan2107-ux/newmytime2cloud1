"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KPICard } from "@/components/payroll/KPICard";
import { StatusBadge } from "@/components/payroll/StatusBadge";
import { api, buildQueryParams } from "@/lib/api-client";
import {
  Users, DollarSign, TrendingDown, Wallet, Clock, CheckCircle, CreditCard,
  AlertCircle, Plus, Play, ThumbsUp, Download, FileText, Eye,
  AreaChart as AreaIcon, BarChart3 as BarIcon, LineChart as LineIcon
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart
} from "recharts";

const COLORS = ['hsl(199,89%,38%)', 'hsl(152,60%,40%)', 'hsl(38,92%,50%)', 'hsl(262,52%,47%)', 'hsl(0,72%,51%)', 'hsl(199,89%,58%)'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: 'rgba(15,23,42,0.97)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        color: '#f8fafc',
        fontSize: '12px',
        minWidth: '140px',
      }}
    >
      {label && (
        <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '6px', fontSize: '12px', letterSpacing: '0.3px' }}>
          {label}
        </div>
      )}
      {payload.map((entry, idx) => {
        const color = entry.color || entry.payload?.fill || entry.fill;
        const name = entry.name || entry.dataKey;
        const val = typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', color: '#f8fafc' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#cbd5e1', fontSize: '11px' }}>{name}</span>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '12px' }}>{val}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PayrollDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [month] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [deptCost, setDeptCost] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [trendType, setTrendType] = useState("bar"); // bar | area | line
  const [trendPeriod, setTrendPeriod] = useState("1y"); // 1m | 6m | 1y | all

  // Filter monthlyTrend by selected period (last N months)
  const filteredTrend = (() => {
    if (!Array.isArray(monthlyTrend) || monthlyTrend.length === 0) return [];
    if (trendPeriod === "all") return monthlyTrend;
    const counts = { "1m": 1, "6m": 6, "1y": 12 };
    const n = counts[trendPeriod] || 12;
    return monthlyTrend.slice(-n);
  })();

  useEffect(() => {
    const fetchData = async () => {
      const params = await buildQueryParams({});
      try {
        const { data } = await api.get("/payroll-management/dashboard", { params: { ...params, month } });
        setStats(data);
        setMonthlyTrend(data.monthly_trend || []);
        setDeptCost(data.department_cost || []);
      } catch (e) { console.warn("Dashboard stats error", e); }
      try {
        const batchRes = await api.get("/payroll-management/batches", { params: { ...params, per_page: 10 } });
        console.log("Batches API response:", batchRes.data);
        setBatches(batchRes.data?.data || []);
      } catch (e) { console.warn("Batches error", e?.response?.data || e); }
    };
    fetchData();
  }, [month]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const params = await buildQueryParams({});
      const { data } = await api.post("/payroll-management/generate", { ...params, month });
      alert(data.message || "Payroll generated");
      // Refresh
      const res = await api.get("/payroll-management/dashboard", { params: { ...params, month } });
      setStats(res.data);
      setMonthlyTrend(res.data.monthly_trend || []);
      setDeptCost(res.data.department_cost || []);
      const bRes = await api.get("/payroll-management/batches", { params: { ...params, per_page: 10 } });
      setBatches(bRes.data?.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || "Error generating payroll");
    } finally {
      setGenerating(false);
    }
  };

  const totals = {
    gross: stats?.total_gross || 0,
    ded: stats?.total_deductions || 0,
    net: stats?.total_net || 0,
    ot: stats?.total_ot || 0,
    approved: stats?.approved || 0,
    paid: stats?.paid || 0,
    pending: stats?.pending || 0,
    empCount: stats?.total_employees || 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Payroll Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage salary processing, approvals, deductions, allowances, and payslip generation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/payslips/salary-structures')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Salary Structures
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" /> {generating ? "Generating..." : "Generate Payroll"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Employees" value={totals.empCount} icon={Users} variant="primary" />
        <KPICard title="Gross Salary" value={totals.gross.toLocaleString()} icon={DollarSign} variant="primary" />
        <KPICard title="Total Deductions" value={totals.ded.toLocaleString()} icon={TrendingDown} variant="destructive" />
        <KPICard title="Net Salary" value={totals.net.toLocaleString()} icon={Wallet} variant="success" />
        <KPICard title="Overtime Amount" value={totals.ot.toLocaleString()} icon={Clock} variant="warning" />
        <KPICard title="Pending Approval" value={totals.pending} icon={AlertCircle} variant="warning" />
        <KPICard title="Approved" value={totals.approved} icon={CheckCircle} variant="success" />
        <KPICard title="Paid Employees" value={totals.paid} icon={CreditCard} variant="primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Monthly Payroll Trend</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Gross, Net & Deductions over time</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Period selector */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800 p-0.5">
                {[
                  { id: "1m", label: "1M" },
                  { id: "6m", label: "6M" },
                  { id: "1y", label: "1Y" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setTrendPeriod(opt.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                      trendPeriod === opt.id
                        ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Chart-type toggle (icons) */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800 p-0.5">
                {[
                  { id: "area", Icon: AreaIcon, title: "Area" },
                  { id: "bar", Icon: BarIcon, title: "Bar" },
                  { id: "line", Icon: LineIcon, title: "Line" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setTrendType(opt.id)} title={opt.title}
                    className={`p-1.5 rounded-md transition ${
                      trendType === opt.id
                        ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}>
                    <opt.Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {trendType === "bar" ? (
              <BarChart data={filteredTrend} margin={{ top: 18, right: 12, left: -8, bottom: 4 }} barCategoryGap="28%" barGap={4}>
                <defs>
                  <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="dedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)', radius: 6 }} wrapperStyle={{ zIndex: 50, outline: 'none', pointerEvents: 'none' }} content={<ChartTooltip />} />
                <Bar dataKey="gross" name="Gross" fill="url(#grossGrad)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="net" name="Net" fill="url(#netGrad)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="deductions" name="Deductions" fill="url(#dedGrad)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            ) : trendType === "area" ? (
              <ComposedChart data={filteredTrend} margin={{ top: 18, right: 12, left: -8, bottom: 4 }} barCategoryGap="22%" barGap={3}>
                <defs>
                  <linearGradient id="grossBar2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="netArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="dedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)', radius: 6 }} wrapperStyle={{ zIndex: 50, outline: 'none', pointerEvents: 'none' }} content={<ChartTooltip />} />
                <Bar dataKey="gross" name="Gross" fill="url(#grossBar2)" radius={[6, 6, 0, 0]} maxBarSize={42} />
                <Area type="monotone" dataKey="net" name="Net" stroke="#059669" strokeWidth={2.5} fill="url(#netArea)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="deductions" name="Deductions" stroke="#e11d48" strokeWidth={2.5} fill="url(#dedArea)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            ) : (
              <LineChart data={filteredTrend} margin={{ top: 18, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ stroke: 'rgba(148,163,184,0.3)', strokeWidth: 1 }} wrapperStyle={{ zIndex: 50, outline: 'none', pointerEvents: 'none' }} content={<ChartTooltip />} />
                <Line type="monotone" dataKey="gross" name="Gross" stroke="#0284c7" strokeWidth={3} dot={{ fill: '#0284c7', r: 4 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', r: 4 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                <Line type="monotone" dataKey="deductions" name="Deductions" stroke="#e11d48" strokeWidth={3} dot={{ fill: '#e11d48', r: 4 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            )}
          </ResponsiveContainer>
          {/* Legend at bottom */}
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px] font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-sky-400 to-sky-600"></span><span className="text-gray-500 dark:text-gray-400">Gross</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600"></span><span className="text-gray-500 dark:text-gray-400">Net</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-rose-400 to-rose-600"></span><span className="text-gray-500 dark:text-gray-400">Deductions</span></span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Department Salary Cost</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Distribution across departments</p>
            </div>
          </div>
          {(() => {
            const totalCost = deptCost.reduce((s, d) => s + (d.cost || 0), 0);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 items-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <defs>
                      {deptCost.map((_, i) => {
                        const c = COLORS[i % COLORS.length];
                        return (
                          <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={c} stopOpacity={1} />
                            <stop offset="100%" stopColor={c} stopOpacity={0.7} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <Pie
                      data={deptCost}
                      dataKey="cost"
                      nameKey="department"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {deptCost.map((_, i) => (
                        <Cell key={i} fill={`url(#pieGrad${i})`} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 50, outline: 'none', pointerEvents: 'none' }}
                      content={<ChartTooltip />}
                    />
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 dark:fill-gray-400" style={{ fontSize: 10, letterSpacing: 0.5 }}>TOTAL</text>
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-800 dark:fill-gray-100" style={{ fontSize: 16, fontWeight: 700 }}>{totalCost >= 1000 ? `${(totalCost / 1000).toFixed(1)}k` : totalCost}</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                  {deptCost.map((d, i) => {
                    const pct = totalCost > 0 ? ((d.cost / totalCost) * 100).toFixed(1) : 0;
                    return (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }}></span>
                        <span className="flex-1 truncate text-gray-600 dark:text-gray-300" title={d.department}>{d.department}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Recent Batches Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recent Payroll Batches</h3>
          <button onClick={() => router.push('/payslips')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {batches.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{b.month}</td>
                  <td className="px-4 py-3">{b.branch_id || "All"}</td>
                  <td className="px-4 py-3">{b.total_employees}</td>
                  <td className="px-4 py-3">{parseFloat(b.total_gross || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{parseFloat(b.total_deductions || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{parseFloat(b.total_net || 0).toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {b.status === "draft" && (
                        <button onClick={async () => {
                          if (!confirm("Approve this batch?")) return;
                          const params = await buildQueryParams({});
                          try {
                            await api.post(`/payroll-management/approve/${b.id}`, params);
                            const res = await api.get("/payroll-management/batches", { params: { ...params, per_page: 10 } });
                            setBatches(res.data?.data || []);
                          } catch (e) { alert("Failed"); }
                        }} className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition">
                          Approve
                        </button>
                      )}
                      {b.status === "approved" && (
                        <button onClick={async () => {
                          if (!confirm("Mark as Paid?")) return;
                          const params = await buildQueryParams({});
                          try {
                            await api.post(`/payroll-management/mark-paid/${b.id}`, params);
                            const res = await api.get("/payroll-management/batches", { params: { ...params, per_page: 10 } });
                            setBatches(res.data?.data || []);
                          } catch (e) { alert("Failed"); }
                        }} className="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition">
                          Mark Paid
                        </button>
                      )}
                      {b.status === "paid" && (
                        <span className="text-[10px] text-gray-400">Completed</span>
                      )}
                      <button title="View Records" onClick={() => router.push(`/payslips/register?batch=${b.id}`)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400 text-xs">No batches yet. Click "Generate Payroll" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {batches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {batches[0]?.status === "draft" && (
            <button onClick={async () => {
              if (!confirm("Approve the latest payroll batch?")) return;
              try {
                const params = await buildQueryParams({});
                await api.post(`/payroll-management/approve/${batches[0].id}`, params);
                alert("Payroll approved!");
                const { data } = await api.get("/payroll-management/batches", { params: { ...params, per_page: 10 } });
                setBatches(data?.data || []);
              } catch (e) { alert(e?.response?.data?.message || "Approve failed"); }
            }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition">
              <ThumbsUp className="h-3.5 w-3.5" /> Approve Payroll
            </button>
          )}
          {batches[0]?.status === "approved" && (
            <button onClick={async () => {
              if (!confirm("Mark the latest batch as Paid?")) return;
              try {
                const params = await buildQueryParams({});
                await api.post(`/payroll-management/mark-paid/${batches[0].id}`, params);
                alert("Payroll marked as paid!");
                const { data } = await api.get("/payroll-management/batches", { params: { ...params, per_page: 10 } });
                setBatches(data?.data || []);
              } catch (e) { alert(e?.response?.data?.message || "Failed"); }
            }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/10 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition">
              <CreditCard className="h-3.5 w-3.5" /> Mark as Paid
            </button>
          )}
          <button onClick={() => router.push('/payslips/register')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <FileText className="h-3.5 w-3.5" /> View Register
          </button>
          <button onClick={() => router.push('/payslips/reports')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <Download className="h-3.5 w-3.5" /> Download Reports
          </button>
        </div>
      )}
    </div>
  );
}
