"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, buildQueryParams } from "@/lib/api-client";
import { getStaffUser } from "@/lib/staff-user";

const leaveColors = [
  { icon: "beach_access", iconClass: "bg-cyan-300/10 text-cyan-300", tagClass: "bg-cyan-300/20 text-cyan-300", barClass: "bg-cyan-300", changeClass: "text-cyan-300" },
  { icon: "medical_services", iconClass: "bg-purple-300/10 text-purple-300", tagClass: "bg-purple-300/20 text-purple-300", barClass: "bg-purple-300", changeClass: "text-purple-300" },
  { icon: "coffee", iconClass: "bg-emerald-300/10 text-emerald-300", tagClass: "bg-emerald-300/20 text-emerald-300", barClass: "bg-emerald-300", changeClass: "text-emerald-300" },
  { icon: "credit_card_off", iconClass: "bg-red-300/10 text-red-300", tagClass: "bg-red-300/20 text-red-300", barClass: "bg-red-300", changeClass: "text-red-300" },
  { icon: "event", iconClass: "bg-amber-300/10 text-amber-300", tagClass: "bg-amber-300/20 text-amber-300", barClass: "bg-amber-300", changeClass: "text-amber-300" },
  { icon: "child_care", iconClass: "bg-pink-300/10 text-pink-300", tagClass: "bg-pink-300/20 text-pink-300", barClass: "bg-pink-300", changeClass: "text-pink-300" },
];

const statusLabel = { 0: "Pending", 1: "Approved", 2: "Rejected" };

export default function StaffLeaveBalancePage() {
  const [loading, setLoading] = useState(true);
  const [balanceCards, setBalanceCards] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [totalEntitled, setTotalEntitled] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const u = await getStaffUser();
      const params = await buildQueryParams();

      // Fetch leave types
      const ltRes = await api.get("/leave", { params: { ...params, per_page: 100 } });
      const types = Array.isArray(ltRes.data?.data) ? ltRes.data.data : [];

      // Fetch employee's leave requests this year
      const year = new Date().getFullYear();
      const { data: leavesData } = await api.get("/employee_leaves", {
        params: { ...params, employee_id: u.employee_id, per_page: 500, start_date: `${year}-01-01`, end_date: `${year}-12-31` },
      });
      const leaves = Array.isArray(leavesData?.data) ? leavesData.data : [];

      // Fetch leave group entitlements if employee has a group
      let entitlements = {};
      if (u.employee_id) {
        try {
          const empRes = await api.get(`/employeev1`, { params: { ...params, per_page: 1, employee_id: u.employee_id } });
          const emp = empRes.data?.data?.[0];
          if (emp?.leave_group_id) {
            const groupRes = await api.get(`/leave_groups`, { params: { ...params, per_page: 100 } });
            const groups = Array.isArray(groupRes.data?.data) ? groupRes.data.data : [];
            const group = groups.find((g) => g.id === emp.leave_group_id);
            if (group?.leave_count) {
              group.leave_count.forEach((lc) => {
                entitlements[lc.leave_type_id] = lc.leave_type_count || 0;
              });
            }
          }
        } catch (e) {
          console.error("Failed to fetch entitlements:", e);
        }
      }

      // Build balance cards
      let tEntitled = 0, tUsed = 0, tRemaining = 0;
      const cards = types.map((lt, i) => {
        const style = leaveColors[i % leaveColors.length];
        const typeLeaves = leaves.filter((l) => l.leave_type_id === lt.id);
        const used = typeLeaves.filter((l) => l.status === 1).reduce((s, l) => s + (l.total_days || l.days || 0), 0);
        const pending = typeLeaves.filter((l) => l.status === 0).reduce((s, l) => s + (l.total_days || l.days || 0), 0);
        const entitled = entitlements[lt.id] || 0;
        const remaining = Math.max(0, entitled - used);
        const progress = entitled > 0 ? Math.round(((entitled - used) / entitled) * 100) : 0;

        tEntitled += entitled;
        tUsed += used;
        tRemaining += remaining;

        return {
          label: lt.name,
          entitled,
          used,
          pending,
          remaining,
          progress: `${progress}%`,
          ...style,
        };
      });

      setBalanceCards(cards);
      setTotalEntitled(tEntitled);
      setTotalUsed(tUsed);
      setTotalRemaining(tRemaining);

      // Build leave history
      setLeaveHistory(
        leaves.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10).map((l) => {
          const lt = types.find((t) => t.id === l.leave_type_id);
          return {
            id: l.id,
            title: lt?.name || "Leave",
            date: l.start_date,
            endDate: l.end_date,
            days: l.total_days || l.days || 0,
            status: l.status,
            reason: l.reason,
          };
        })
      );
    } catch (e) {
      console.error("Failed to fetch balance data:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <span className="text-slate-500 animate-pulse">Loading balance data...</span>
      </div>
    );
  }

  const totalDays = totalEntitled || 1;
  const usedPct = Math.round((totalUsed / totalDays) * 100);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (((totalDays - totalUsed) / totalDays) * circumference);

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-[8%] top-0 h-[420px] w-[420px] rounded-full bg-cyan-300/5 blur-[120px]"></div>
        <div className="absolute -left-[10%] bottom-0 h-[360px] w-[360px] rounded-full bg-purple-300/5 blur-[120px]"></div>
      </div>

      <div>
        {/* Header */}
        <section className="mb-8 rounded-2xl border border-cyan-300/10 bg-slate-950/60 px-6 py-5 backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Link href="/staff/leave" className="transition hover:text-cyan-300">Leave Management</Link>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="text-cyan-300">Leave Balance</span>
              </div>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-slate-100">
                Leave <span className="text-cyan-300 drop-shadow-[0_0_10px_rgba(0,227,253,0.35)]">Balance</span>
              </h1>
              <p className="mt-2 font-medium text-slate-500">Your leave entitlements and usage for {new Date().getFullYear()}</p>
            </div>
          </div>
        </section>

        {/* Balance Cards */}
        <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {balanceCards.filter((c) => c.entitled > 0 || c.used > 0).length === 0 ? (
            <div className="col-span-4 text-center py-10 text-slate-500">
              No leave entitlements found. Please contact HR if this is incorrect.
            </div>
          ) : (
            balanceCards.filter((c) => c.entitled > 0 || c.used > 0).map((card) => (
              <article key={card.label} className="staff-glass-card flex flex-col justify-between rounded-xl p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconClass}`}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  {card.pending > 0 && (
                    <span className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-300/20 text-yellow-300">
                      {card.pending} Pending
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">{card.label}</h3>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="font-headline text-3xl font-bold text-slate-100">{card.remaining}</span>
                    <span className="text-xs text-slate-500 uppercase">/ {card.entitled} Days</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Used: {card.used}</span>
                    <span>Remaining: {card.remaining}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full ${card.barClass}`} style={{ width: card.progress }}></div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Leave History */}
          <div className="lg:col-span-8">
            <section className="staff-glass-card overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-cyan-300/10 px-8 py-6">
                <h2 className="font-headline text-xl font-bold text-slate-100">Leave History</h2>
                <span className="text-xs text-slate-500">{leaveHistory.length} records</span>
              </div>
              <div className="divide-y divide-cyan-300/5">
                {leaveHistory.length === 0 ? (
                  <div className="px-8 py-10 text-center text-sm text-slate-500">No leave records found</div>
                ) : (
                  leaveHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 px-8 py-4 transition hover:bg-slate-800/30">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.status === 1 ? "bg-emerald-300/10 text-emerald-300" : item.status === 0 ? "bg-yellow-300/10 text-yellow-300" : "bg-red-300/10 text-red-300"}`}>
                          <span className="material-symbols-outlined">
                            {item.status === 1 ? "check_circle" : item.status === 0 ? "schedule" : "cancel"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.date} → {item.endDate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-300">{item.days} day(s)</p>
                        <p className={`text-[10px] uppercase font-bold ${item.status === 1 ? "text-emerald-300" : item.status === 0 ? "text-yellow-300" : "text-red-300"}`}>
                          {statusLabel[item.status]}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Annual Distribution */}
          <div className="lg:col-span-4 space-y-8">
            <section className="staff-glass-card flex flex-col items-center rounded-2xl p-8">
              <h2 className="mb-8 self-start text-xs font-bold uppercase tracking-widest text-slate-500">Annual Summary</h2>
              <div className="relative mb-8 h-48 w-48">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle className="text-slate-800" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
                  <circle
                    className="text-cyan-300 drop-shadow-[0_0_8px_rgba(0,227,253,0.4)]"
                    cx="50" cy="50" fill="transparent" r="40" stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline text-3xl font-bold text-slate-100">{totalEntitled}</span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Days</span>
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-cyan-300" />
                    <span className="text-slate-500">Remaining</span>
                  </div>
                  <span className="font-bold text-slate-100">{totalRemaining} Days</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-700" />
                    <span className="text-slate-500">Used</span>
                  </div>
                  <span className="font-bold text-slate-100">{totalUsed} Days</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* FAB */}
        <Link
          href="/staff/leave/apply"
          aria-label="Create leave request"
          className="fixed bottom-8 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300 text-[#004d57] shadow-[0_0_20px_rgba(0,227,253,0.4)] transition hover:scale-105 active:scale-90 sm:bottom-10 sm:right-8"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </Link>
      </div>
    </div>
  );
}
