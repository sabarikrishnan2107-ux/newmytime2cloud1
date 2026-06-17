"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/config";
import { api, buildQueryParams } from "@/lib/api-client";
import { getStaffUser } from "@/lib/staff-user";
import Link from "next/link";

function MetricCard({ label, value, helper, icon, iconClass, helperClass }) {
  return (
    <article className="staff-glass-card rounded-2xl p-5 transition-colors hover:border-cyan-300/30">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClass}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${helperClass}`}>{helper}</span>
      </div>
      <div className="mb-1 font-headline text-2xl font-bold text-slate-100">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
    </article>
  );
}

export default function StaffPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ attendance: 0, punctuality: 0, overtime: "0:00", avgHours: "0h", present: 0, absent: 0, late: 0, leave: 0, total: 0 });
  const [insights, setInsights] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = await getStaffUser();
        const params = await buildQueryParams({});
        const sysUserId = u.system_user_id || u.employee_id;

        // Fetch stats from /staff-stats
        try {
          const { data } = await api.get("/staff-stats", {
            params: { ...params, system_user_id: sysUserId, user_id: u.id },
          });
          {
            const present = data.present || 0;
            const absent = data.absent || 0;
            const late = data.late || 0;
            const leave = data.leave || 0;
            const ot = data.overtime || "0:00";
            const total = present + absent + leave;
            const attendance = total > 0 ? Math.round((present / total) * 100) : 0;
            const punctuality = present > 0 ? Math.round(((present - late) / present) * 100) : 0;

            setMetrics({ attendance, punctuality, overtime: ot, present, absent, late, leave, total, avgHours: data.total_work_hours ? `${data.total_work_hours}h` : "---" });

            // Generate insights
            const newInsights = [];
            if (attendance >= 90) newInsights.push(`Excellent attendance rate of ${attendance}%! You're in the top performers for consistent presence.`);
            else if (attendance >= 70) newInsights.push(`Your attendance is at ${attendance}%. Consider reducing absences to improve your score.`);
            else newInsights.push(`Your attendance of ${attendance}% needs attention. Please review your schedule.`);

            if (punctuality >= 95) newInsights.push(`Outstanding punctuality at ${punctuality}%. Your reliability is excellent.`);
            else if (late > 0) newInsights.push(`You had ${late} late arrival(s) this month. Try to arrive before shift start to improve your punctuality score.`);

            if (present > 0) newInsights.push(`You've been present for ${present} days this month. ${absent > 0 ? `${absent} day(s) were marked absent.` : "Perfect month so far!"}`);

            setInsights(newInsights);
          }
        } catch (e) { console.warn("Stats error", e); }

        // Fetch last 6 months trend (single lightweight API call)
        try {
          const { data: trend } = await api.get("/staff-monthly-trend", {
            params: { ...params, system_user_id: sysUserId, months: 6 },
          });
          if (Array.isArray(trend)) {
            setMonthlyData(trend);
          }
        } catch (e) {}

      } catch (err) {
        console.error("Performance error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const metricCards = [
    {
      label: "Attendance Score", value: `${metrics.attendance}%`,
      helper: metrics.attendance >= 90 ? "Excellent" : metrics.attendance >= 70 ? "Good" : "Needs Work",
      icon: "how_to_reg", iconClass: "bg-purple-300/10 text-purple-300 border-purple-300/20",
      helperClass: metrics.attendance >= 90 ? "bg-emerald-300/10 text-emerald-300" : metrics.attendance >= 70 ? "bg-amber-300/10 text-amber-300" : "bg-red-300/10 text-red-300",
    },
    {
      label: "Punctuality Score", value: `${metrics.punctuality}%`,
      helper: metrics.punctuality >= 95 ? "Top 5%" : metrics.late > 0 ? `${metrics.late} Late` : "On Time",
      icon: "schedule", iconClass: "bg-cyan-300/10 text-cyan-300 border-cyan-300/20",
      helperClass: metrics.punctuality >= 95 ? "bg-emerald-300/10 text-emerald-300" : "bg-amber-300/10 text-amber-300",
    },
    {
      label: "Total Overtime", value: metrics.overtime,
      helper: "This Month", icon: "history",
      iconClass: "bg-red-300/10 text-red-300 border-red-300/20",
      helperClass: "bg-slate-800 text-slate-400",
    },
    {
      label: "Consistency", value: metrics.attendance >= 90 ? "High" : metrics.attendance >= 70 ? "Medium" : "Low",
      helper: metrics.attendance >= 80 ? "Stable" : "Improve",
      icon: "trending_up", iconClass: "bg-emerald-300/10 text-emerald-300 border-emerald-300/20",
      helperClass: metrics.attendance >= 80 ? "bg-emerald-300/10 text-emerald-300" : "bg-red-300/10 text-red-300",
    },
  ];

  const achievements = [];
  if (metrics.late === 0 && metrics.present > 0) achievements.push({ label: "Early Bird", icon: "wb_sunny", className: "border-cyan-300/40 bg-cyan-300/10 text-cyan-300 shadow-[0_0_20px_rgba(129,236,255,0.15)]" });
  if (metrics.attendance === 100) achievements.push({ label: "Perfect 100", icon: "shield", className: "border-purple-300/40 bg-purple-300/10 text-purple-300 shadow-[0_0_20px_rgba(175,136,255,0.15)]" });
  if (metrics.present >= 20) achievements.push({ label: "Warrior", icon: "emoji_events", className: "border-emerald-300/40 bg-emerald-300/10 text-emerald-300 shadow-[0_0_20px_rgba(161,255,239,0.15)]" });
  if (achievements.length === 0) achievements.push({ label: "Keep Going", icon: "rocket_launch", className: "border-slate-300/40 bg-slate-300/10 text-slate-300" });

  const avgAttendance = monthlyData.length > 0
    ? Math.round(monthlyData.reduce((sum, m) => sum + (m.total > 0 ? (m.present / m.total) * 100 : 0), 0) / monthlyData.length)
    : 0;

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-slate-400 text-sm">Loading performance...</div></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div>
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tight text-slate-100">Performance Report</h1>
            <p className="mt-1 text-sm text-slate-500">Analysis of your attendance metrics and trends.</p>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="staff-glass-card relative overflow-hidden rounded-2xl p-5 xl:col-span-8">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-300/5 blur-[100px]"></div>
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-cyan-300">auto_awesome</span>
                <h2 className="font-headline text-sm font-bold text-slate-100">Smart Insights</h2>
              </div>
              <div className="space-y-4">
                {insights.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/10">
                      <span className="material-symbols-outlined text-xs text-cyan-300">colors_spark</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-400">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="staff-glass-card flex flex-col justify-between rounded-2xl p-5 xl:col-span-4">
            <h2 className="mb-5 font-headline text-sm font-bold text-slate-100">Achievements</h2>
            <div className="flex justify-around gap-4">
              {achievements.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 text-center">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${item.className}`}>
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Monthly Trend */}
          <div className="staff-glass-card rounded-2xl p-5 xl:col-span-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-headline text-sm font-bold text-slate-100">Monthly Attendance Trend</h2>
              <div className="text-right">
                <div className="font-headline text-xl font-bold text-cyan-300">Avg: {avgAttendance}%</div>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Last 6 Months</div>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 h-40 px-2">
              {monthlyData.map((m, i) => {
                const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
                    <div className="w-full rounded-t-md bg-cyan-300/20" style={{ height: `${Math.max(4, pct * 1.2)}px` }}></div>
                    <span className="text-[9px] font-bold text-slate-500">{m.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown */}
          <div className="staff-glass-card rounded-2xl p-5 xl:col-span-5">
            <h2 className="mb-5 font-headline text-sm font-bold text-slate-100">Monthly Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: "Present", value: metrics.present, color: "bg-emerald-300", textColor: "text-emerald-300" },
                { label: "Absent", value: metrics.absent, color: "bg-red-300", textColor: "text-red-300" },
                { label: "Late", value: metrics.late, color: "bg-amber-300", textColor: "text-amber-300" },
                { label: "Leave", value: metrics.leave, color: "bg-purple-300", textColor: "text-purple-300" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${item.color}`}></div>
                  <span className="text-xs text-slate-400 flex-1">{item.label}</span>
                  <span className={`text-sm font-bold ${item.textColor}`}>{item.value}</span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full ${item.color}`} style={{ width: `${metrics.total > 0 ? (item.value / metrics.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="staff-glass-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-headline text-sm font-bold text-slate-100">Monthly Summary</span>
            <p className="text-[10px] text-slate-500">Data for the current month cycle.</p>
          </div>
          <Link href="/staff/attendance" className="group inline-flex items-center gap-2 text-xs font-bold text-cyan-300 transition">
            View Detailed History
            <span className="material-symbols-outlined text-xs transition-transform group-hover:translate-x-1">arrow_forward_ios</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}
