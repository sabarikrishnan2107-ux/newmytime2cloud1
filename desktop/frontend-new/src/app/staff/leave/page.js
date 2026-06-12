"use client";

import { useCallback, useEffect, useState } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { getStaffUser } from "@/lib/staff-user";
import LeaveRequestCreate from "@/components/LeaveRequest/Create";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const defaultLeaveBalances = [
  {
    label: "Annual Leave",
    value: "12",
    total: "20",
    icon: "calendar_month",
    iconClass: "bg-cyan-400/10 text-cyan-300",
    badge: "Active",
    badgeClass: "bg-cyan-400/10 text-cyan-300",
    progress: "60%",
    progressClass: "bg-cyan-300",
    helper: "8 days remaining this year",
  },
  {
    label: "Sick Leave",
    value: "4",
    total: "10",
    icon: "medical_services",
    iconClass: "bg-purple-400/10 text-purple-300",
    badge: "Protected",
    badgeClass: "bg-purple-400/10 text-purple-300",
    progress: "40%",
    progressClass: "bg-purple-300",
    helper: "6 days available",
  },
  {
    label: "Casual Leave",
    value: "3",
    total: "5",
    icon: "beach_access",
    iconClass: "bg-emerald-400/10 text-emerald-300",
    progress: "60%",
    progressClass: "bg-emerald-300",
    helper: "2 days available",
  },
  {
    label: "Unpaid Leave",
    value: "2",
    total: "Days",
    icon: "event_busy",
    iconClass: "bg-red-400/10 text-red-300",
    progress: "15%",
    progressClass: "bg-red-300",
    helper: "Used this financial year",
  },
];

const defaultLeaveRequests = [
  {
    type: "Annual Leave",
    icon: "calendar_month",
    iconClass: "bg-cyan-400/10 text-cyan-300",
    dateRange: "Dec 20 - Dec 24, 2023",
    days: "5",
    reason: "Family winter vacation trip",
    status: "Approved",
    statusClass: "bg-emerald-400/10 text-emerald-300 shadow-[0_0_10px_rgba(161,255,239,0.08)]",
  },
  {
    type: "Sick Leave",
    icon: "medical_services",
    iconClass: "bg-purple-400/10 text-purple-300",
    dateRange: "Nov 12 - Nov 13, 2023",
    days: "2",
    reason: "Dental procedure recovery",
    status: "Pending",
    statusClass: "bg-cyan-400/10 text-cyan-300 shadow-[0_0_10px_rgba(129,236,255,0.08)]",
  },
  {
    type: "Casual Leave",
    icon: "beach_access",
    iconClass: "bg-emerald-400/10 text-emerald-300",
    dateRange: "Oct 05, 2023",
    days: "1",
    reason: "Personal errand",
    status: "Rejected",
    statusClass: "bg-red-400/10 text-red-300 shadow-[0_0_10px_rgba(255,113,108,0.08)]",
  },
];

function LeaveBalanceCard({ label, value, total, icon, iconClass, badge, badgeClass, progress, progressClass, helper }) {
  return (
    <div className="staff-glass-card relative overflow-hidden rounded-xl p-6 transition hover:bg-slate-800/45">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-white/[0.03]"></div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {badge && <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${badgeClass}`}>{badge}</span>}
      </div>

      <h3 className="mb-2 text-sm uppercase tracking-wider text-slate-500">{label}</h3>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="font-headline text-3xl font-bold text-slate-100">{value}</span>
        <span className="text-lg text-slate-500">/ {total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${progressClass}`} style={{ width: progress }}></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function LeaveStatus({ status, statusClass }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

const statusStyleMap = {
  0: { status: "Pending", statusClass: "bg-cyan-400/10 text-cyan-300 shadow-[0_0_10px_rgba(129,236,255,0.08)]" },
  1: { status: "Approved", statusClass: "bg-emerald-400/10 text-emerald-300 shadow-[0_0_10px_rgba(161,255,239,0.08)]" },
  2: { status: "Rejected", statusClass: "bg-red-400/10 text-red-300 shadow-[0_0_10px_rgba(255,113,108,0.08)]" },
};

const leaveIconMap = [
  { icon: "calendar_month", iconClass: "bg-cyan-400/10 text-cyan-300" },
  { icon: "medical_services", iconClass: "bg-purple-400/10 text-purple-300" },
  { icon: "beach_access", iconClass: "bg-emerald-400/10 text-emerald-300" },
  { icon: "event_busy", iconClass: "bg-red-400/10 text-red-300" },
  { icon: "flight", iconClass: "bg-amber-400/10 text-amber-300" },
];

export default function StaffLeavePage() {
  const [leaveBalances, setLeaveBalances] = useState(defaultLeaveBalances);
  const [leaveRequests, setLeaveRequests] = useState(defaultLeaveRequests);
  const [activeTab, setActiveTab] = useState("active");
  const [employeeId, setEmployeeId] = useState(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const u = await getStaffUser();
      const params = await buildQueryParams({});
      setEmployeeId(u.employee_id || null);

      // Fetch leave types first
      let types = [];
      try {
        const ltRes = await api.get("/leave", { params });
        types = ltRes.data?.data || (Array.isArray(ltRes.data) ? ltRes.data : []);
      } catch (e) {}

      // Fetch leave requests
      try {
        const { data } = await api.get("/employee_leaves", {
          params: { ...params, employee_id: u.employee_id, per_page: 50 },
        });
        const items = data?.data || [];

        // Build balance cards from leave types + used count
        if (types.length > 0) {
          const progressColors = ["bg-cyan-300", "bg-purple-300", "bg-emerald-300", "bg-red-300", "bg-amber-300"];
          setLeaveBalances(types.map((lt, i) => {
            const style = leaveIconMap[i % leaveIconMap.length];
            const total = lt.total || lt.days || lt.allocated || lt.count || 0;
            const used = items.filter((l) => l.leave_type_id === lt.id && (l.status === 1)).length;
            const remaining = Math.max(0, total - used);
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            return {
              label: lt.name,
              value: String(used),
              total: String(total),
              icon: style.icon,
              iconClass: style.iconClass,
              badge: remaining > 0 ? "Active" : "Used",
              badgeClass: style.iconClass,
              progress: `${pct}%`,
              progressClass: progressColors[i % progressColors.length],
              helper: `${remaining} days remaining`,
            };
          }));
        }

        if (items.length > 0) {

          setLeaveRequests(items.map((l, i) => {
            const lt = types.find((t) => t.id === l.leave_type_id);
            const iconStyle = leaveIconMap[(types.indexOf(lt) >= 0 ? types.indexOf(lt) : i) % leaveIconMap.length];
            const st = statusStyleMap[l.status] || statusStyleMap[0];
            const start = new Date(l.start_date);
            const end = new Date(l.end_date);
            const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
            return {
              type: lt?.name || "Leave",
              icon: iconStyle.icon,
              iconClass: iconStyle.iconClass,
              dateRange: `${start.toLocaleDateString("en-US", { month: "short", day: "2-digit" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`,
              days: String(days),
              reason: l.reason || "---",
              ...st,
            };
          }));
        }
      } catch (e) { console.warn("Leaves error", e); }
    } catch (e) { console.error("Leave page error", e); }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLeaveCreated = useCallback(async () => {
    setIsApplyOpen(false);
    await fetchData();
  }, [fetchData]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div>
        <section className="mb-10">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-100">Time &amp; Attendance</h1>
          <p className="mt-1 text-slate-500">Manage your leave balances and track absence history.</p>
        </section>

        <section className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {leaveBalances.map((item) => (
            <LeaveBalanceCard key={item.label} {...item} />
          ))}
        </section>

        <section className="staff-glass-card overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between xl:p-8">
            <div className="flex gap-8 border-b border-white/10 md:w-auto">
              <button onClick={() => setActiveTab("active")} className={`pb-4 font-headline font-bold transition ${activeTab === "active" ? "border-b-2 border-cyan-300 text-cyan-300" : "text-slate-400 hover:text-cyan-300"}`}>Active Requests</button>
              <button onClick={() => setActiveTab("history")} className={`pb-4 font-headline font-bold transition ${activeTab === "history" ? "border-b-2 border-cyan-300 text-cyan-300" : "text-slate-400 hover:text-cyan-300"}`}>Leave History</button>
            </div>
            <button
              type="button"
              onClick={() => setIsApplyOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-headline font-bold text-[#004d57] shadow-[0_0_20px_rgba(0,227,253,0.3)] transition hover:scale-[1.02] active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              Apply New Leave
            </button>
          </div>

          <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
            <DialogContent className="max-h-[90vh] !w-[680px] !max-w-[94vw] overflow-hidden border-white/10 bg-[#0b1324] p-0 text-slate-100">
              <DialogHeader className="border-b border-white/10 px-6 py-4">
                <DialogTitle className="font-headline text-lg font-semibold text-slate-100">Apply New Leave</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-5">
                {employeeId ? (
                  <LeaveRequestCreate
                    setOpen={setIsApplyOpen}
                    onSuccess={handleLeaveCreated}
                    staffEmployeeId={employeeId}
                  />
                ) : (
                  <div className="py-10 text-center text-sm text-slate-400">Loading leave form...</div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-4 px-4 pb-4 lg:hidden">
            {leaveRequests.filter((r) => activeTab === "history" ? r.status === "Approved" : true).map((request) => (
              <div key={`${request.type}-${request.dateRange}`} className="rounded-[1.25rem] border border-white/5 bg-slate-900/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${request.iconClass}`}>
                      <span className="material-symbols-outlined text-sm">{request.icon}</span>
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-slate-100">{request.type}</p>
                      <p className="text-xs text-slate-500">{request.dateRange}</p>
                    </div>
                  </div>
                  <LeaveStatus status={request.status} statusClass={request.statusClass} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-800/40 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Days</p>
                    <p className="mt-2 font-headline text-xl font-bold text-slate-100">{request.days}</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/40 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Reason</p>
                    <p className="mt-2 text-sm text-slate-300">{request.reason}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="text-slate-500 transition hover:text-cyan-300">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="px-8 py-5">Leave Type</th>
                  <th className="px-8 py-5">Date Range</th>
                  <th className="px-8 py-5">Days</th>
                  <th className="px-8 py-5">Reason</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaveRequests.filter((r) => activeTab === "history" ? r.status === "Approved" : true).map((request) => (
                  <tr key={`${request.type}-${request.dateRange}-desktop`} className="transition hover:bg-slate-900/20">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${request.iconClass}`}>
                          <span className="material-symbols-outlined text-sm">{request.icon}</span>
                        </div>
                        <span className="font-headline font-semibold text-slate-100">{request.type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-100">{request.dateRange}</td>
                    <td className="px-8 py-6">
                      <span className="font-headline font-bold text-slate-100">{request.days}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="max-w-[220px] truncate text-sm text-slate-500">{request.reason}</p>
                    </td>
                    <td className="px-8 py-6">
                      <LeaveStatus status={request.status} statusClass={request.statusClass} />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-slate-500 transition hover:text-cyan-300">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 px-4 py-5 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Showing {leaveRequests.filter((r) => activeTab === "history" ? r.status === "Approved" : true).length} of {leaveRequests.length} requests</p>
          </div>
        </section>

      </div>
    </div>
  );
}
