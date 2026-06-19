"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/config";
import { api, buildQueryParams } from "@/lib/api-client";
import { svcUrl } from "@/lib/runtimeHost";

function PayrollMetricCard({ label, value, icon, iconTint, iconGhost, meta, metaIcon, metaClass, glow }) {
  return (
    <div className={`staff-glass-card relative overflow-hidden rounded-2xl p-4 transition hover:bg-slate-800/45 ${glow ? "shadow-[0_0_20px_rgba(129,236,255,0.12)]" : ""}`}>
      <div className={`pointer-events-none absolute right-0 top-0 p-4 ${iconGhost}`}>
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <div className="relative z-10 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconTint}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</span>
      </div>
      <div className="relative z-10 mt-5">
        <div className="font-headline text-xl font-bold tracking-tight text-slate-100">{value}</div>
        <div className={`mt-2 flex items-center gap-1.5 text-xs ${metaClass}`}>
          <span className="material-symbols-outlined text-xs">{metaIcon}</span>
          <span>{meta}</span>
        </div>
      </div>
    </div>
  );
}

function PayoutStatus({ status }) {
  const isPaid = status === "Paid" || status === "paid";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-emerald-300" : "bg-amber-300"}`}></span>
      {isPaid ? "Paid" : "Pending"}
    </span>
  );
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function StaffPayrollPage() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = getUser();
        const params = await buildQueryParams({});
        const empId = u.system_user_id || u.employee_id;

        // Try new payroll system
        let payslipData = [];
        try {
          const dbEmployeeId = u.employee_id || empId;
          const { data } = await api.get("/payroll-management/staff-payslips", {
            params: { ...params, employee_id: dbEmployeeId, year: selectedYear },
          });
          payslipData = Array.isArray(data) ? data : [];
        } catch (e) {}

        // Fallback to old system
        if (payslipData.length === 0) {
          try {
            const { data } = await api.get("/get-payslip-by-employee-year", {
              params: { ...params, employee_id: empId, year: selectedYear },
            });
            payslipData = Array.isArray(data) ? data : [];
          } catch (e) {}
        }

        setPayslips(payslipData);
      } catch (e) {
        console.warn("Payroll error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  const filteredPayslips = selectedMonth !== "" ? payslips.filter(p => String(p.month) === String(selectedMonth)) : payslips;
  const latestPayslip = filteredPayslips.length > 0 ? filteredPayslips[0] : null;
  const totalYTD = filteredPayslips.reduce((sum, p) => sum + (parseFloat(p.final_salary) || 0), 0);
  const netPercent = latestPayslip && latestPayslip.basic_salary > 0 ? Math.round((latestPayslip.net_salary / latestPayslip.basic_salary) * 100) : 0;
  const netOffset = 100 - netPercent;

  const metrics = [
    {
      label: "Latest Salary",
      value: latestPayslip ? `${parseFloat(latestPayslip.final_salary || 0).toLocaleString()}` : "---",
      icon: "payments",
      iconTint: "bg-cyan-400/10 text-cyan-300",
      iconGhost: "text-cyan-300/10",
      meta: latestPayslip ? `${monthNames[latestPayslip.month] || "---"} ${latestPayslip.year}` : "---",
      metaIcon: "check_circle",
      metaClass: "text-emerald-300",
      glow: true,
    },
    {
      label: "Basic Salary",
      value: latestPayslip ? `${parseFloat(latestPayslip.basic_salary || 0).toLocaleString()}` : "---",
      icon: "account_balance_wallet",
      iconTint: "bg-purple-400/10 text-purple-300",
      iconGhost: "text-purple-300/10",
      meta: "Monthly Base",
      metaIcon: "info",
      metaClass: "text-slate-500",
    },
    {
      label: "Net Salary",
      value: latestPayslip ? `${parseFloat(latestPayslip.net_salary || 0).toLocaleString()}` : "---",
      icon: "savings",
      iconTint: "bg-emerald-400/10 text-emerald-300",
      iconGhost: "text-emerald-300/10",
      meta: "After Deductions",
      metaIcon: "info",
      metaClass: "text-slate-500",
    },
    {
      label: `Total YTD (${selectedYear})`,
      value: totalYTD > 0 ? `${totalYTD.toLocaleString()}` : "---",
      icon: "trending_up",
      iconTint: "bg-cyan-400/10 text-cyan-300",
      iconGhost: "text-cyan-300/10",
      meta: `${filteredPayslips.length} payslips`,
      metaIcon: "info",
      metaClass: "text-slate-500",
    },
  ];

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-slate-400 text-sm">Loading payroll...</div></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen relative">
      <div className="pointer-events-none fixed right-[-9rem] top-[12rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-[150px]"></div>
      <div className="pointer-events-none fixed bottom-[8rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-purple-400/10 blur-[180px]"></div>

      <div>
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-100">My Payroll</h1>
            <p className="mt-1 text-sm text-slate-500">Your compensation and payslip details.</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100"
            >
              <option value="">All Months</option>
              {monthNames.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100"
            >
              {[2026, 2025, 2024, 2023].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="mb-5 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <PayrollMetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="mb-5 grid gap-8 xl:grid-cols-12">
          {/* Pay Breakdown */}
          <div className="staff-glass-card rounded-2xl p-6 xl:col-span-4 xl:p-5">
            <h3 className="mb-8 font-headline text-sm font-bold text-slate-100">Pay Breakdown</h3>
            <div className="mb-8 flex justify-center">
              <div className="relative h-40 w-40">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(129,236,255,0.1)" strokeWidth="3"></circle>
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="url(#payroll-primary-gradient)" strokeDasharray={`${netPercent} ${netOffset}`} strokeLinecap="round" strokeWidth="4"></circle>
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#af88ff" strokeDasharray={`${netOffset} ${netPercent}`} strokeDashoffset={`-${netPercent}`} strokeLinecap="round" strokeWidth="4"></circle>
                  <defs>
                    <linearGradient id="payroll-primary-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#81ecff"></stop>
                      <stop offset="100%" stopColor="#00e3fd"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline text-2xl font-bold text-slate-100">{netPercent}%</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Net Pay</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border-l-4 border-cyan-300 bg-cyan-400/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-300"></span>
                  <span className="text-sm font-medium text-slate-100">Net Salary</span>
                </div>
                <span className="font-bold text-slate-100">{latestPayslip ? parseFloat(latestPayslip.net_salary || 0).toLocaleString() : "---"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border-l-4 border-purple-300 bg-purple-400/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-purple-300"></span>
                  <span className="text-sm font-medium text-slate-100">Basic Salary</span>
                </div>
                <span className="font-bold text-slate-100">{latestPayslip ? parseFloat(latestPayslip.basic_salary || 0).toLocaleString() : "---"}</span>
              </div>
            </div>
          </div>

          {/* Payout History */}
          <div className="staff-glass-card overflow-hidden rounded-2xl xl:col-span-8">
            <div className="flex flex-col gap-3 p-6 pb-4 sm:flex-row sm:items-center sm:justify-between xl:p-5 xl:pb-4">
              <h3 className="font-headline text-sm font-bold text-slate-100">Payslip History ({selectedYear})</h3>
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-3 font-medium">Month</th>
                    <th className="px-5 py-3 font-medium">Basic</th>
                    <th className="px-5 py-3 font-medium">Net</th>
                    <th className="px-5 py-3 font-medium">Final</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPayslips.map((p, i) => (
                    <tr key={i} className="transition hover:bg-slate-900/20">
                      <td className="px-5 py-3 text-sm font-medium text-slate-100">{monthNames[p.month] || "---"} {p.year}</td>
                      <td className="px-5 py-3 text-sm text-slate-300">{parseFloat(p.basic_salary || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-slate-300">{parseFloat(p.net_salary || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm font-bold text-slate-100">{parseFloat(p.final_salary || 0).toLocaleString()}</td>
                      <td className="px-5 py-3"><PayoutStatus status="Paid" /></td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            const baseUrl = process.env.NEXT_PUBLIC_API_URL || svcUrl("http", 8000, "/api");
                            const u = getUser();
                            window.open(`${baseUrl}/payroll-management/payslip/${p.id}?company_id=${u?.company_id || 0}`, "_blank");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-cyan-300 transition hover:bg-cyan-400/10"
                        >
                          <span className="material-symbols-outlined">receipt</span>
                          <span className="text-xs">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPayslips.length === 0 && (
                    <tr><td colSpan="6" className="px-8 py-10 text-center text-slate-500">No payslips found for {selectedYear}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-4 px-4 pb-4 sm:hidden">
              {payslips.map((p, i) => (
                <div key={i} className="rounded-[1.25rem] border border-white/5 bg-slate-900/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{monthNames[p.month] || "---"} {p.year}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Basic: {parseFloat(p.basic_salary || 0).toLocaleString()}</p>
                    </div>
                    <PayoutStatus status="Paid" />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100">{parseFloat(p.final_salary || 0).toLocaleString()}</span>
                    <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/10">
                      <span className="material-symbols-outlined text-base">receipt</span>
                      View Payslip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
