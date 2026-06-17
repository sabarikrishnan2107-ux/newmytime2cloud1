import Link from "next/link";

const metricCards = [
  {
    value: "12",
    label: "Upcoming Visitors",
    helper: "+3 from yesterday",
    icon: "group",
    iconClass: "bg-cyan-300/10 text-cyan-300",
    helperClass: "bg-emerald-300/10 text-emerald-300",
  },
  {
    value: "5",
    label: "Pending Invites",
    helper: "Awaiting confirmation",
    icon: "pending_actions",
    iconClass: "bg-purple-300/10 text-purple-300",
    helperClass: "bg-purple-300/10 text-purple-200",
  },
  {
    value: "3",
    label: "Currently Checked-in",
    helper: "On-site right now",
    icon: "sensor_occupied",
    iconClass: "bg-emerald-300/10 text-emerald-300",
    helperClass: "bg-emerald-300/10 text-emerald-200",
  },
  {
    value: "48",
    label: "Total Monthly Visits",
    helper: "Month of October",
    icon: "calendar_month",
    iconClass: "bg-slate-500/10 text-slate-400",
    helperClass: "bg-slate-800 text-slate-400",
  },
];

const visitors = [
  {
    name: "Sarah Miller",
    email: "sarah.m@designco.com",
    initials: "SM",
    company: "Design Co.",
    purpose: "Quarterly Review",
    date: "Oct 24, 2024",
    time: "10:00 AM",
    status: "Upcoming",
    statusClass: "bg-cyan-300/10 text-cyan-300 border-cyan-300/20",
    avatarClass: "bg-cyan-300/15 text-cyan-300",
    actions: ["qr_code", "send", "cancel"],
  },
  {
    name: "David Wilson",
    email: "d.wilson@techcorp.io",
    initials: "DW",
    company: "TechCorp",
    purpose: "Security Audit",
    date: "Oct 24, 2024",
    time: "02:30 PM",
    status: "Checked-in",
    statusClass: "bg-emerald-300/10 text-emerald-300 border-emerald-300/20",
    avatarClass: "bg-purple-300/15 text-purple-300",
    actions: ["qr_code", "send", "cancel"],
  },
  {
    name: "James White",
    email: "j.white@swiftlogs.com",
    initials: "JW",
    company: "Swift Logistics",
    purpose: "Delivery Inspection",
    date: "Oct 23, 2024",
    time: "09:15 AM",
    status: "Completed",
    statusClass: "bg-slate-800 text-slate-400 border-white/10",
    avatarClass: "bg-slate-700 text-slate-100",
    actions: ["history", "refresh"],
  },
  {
    name: "Elena Castro",
    email: "elena@creativehub.design",
    initials: "EC",
    company: "Creative Hub",
    purpose: "Project Kickoff",
    date: "Oct 25, 2024",
    time: "11:00 AM",
    status: "Pending",
    statusClass: "bg-purple-300/10 text-purple-300 border-purple-300/20",
    avatarClass: "bg-emerald-300/15 text-emerald-300",
    actions: ["qr_code", "send", "cancel"],
  },
];

const statusTabs = ["Upcoming", "Checked-in", "Completed", "Cancelled"];

function MetricCard({ value, label, helper, icon, iconClass, helperClass }) {
  return (
    <div className="staff-glass-card relative overflow-hidden rounded-xl p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"></div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`rounded-full px-2 py-1 text-[0.65rem] font-bold ${helperClass}`}>{helper}</span>
      </div>
      <div className="flex flex-col">
        <span className="font-headline text-4xl font-bold text-slate-100">{value}</span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function StatusPill({ status, statusClass }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider ${statusClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

export default function StaffVisitorPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-cyan-300/5 blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-purple-300/5 blur-[120px]"></div>
      </div>

      <div>
        <main>
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-1 font-headline text-2xl font-bold tracking-tight text-slate-100">Visitor Invites</h1>
              <p className="text-slate-500">Manage your upcoming guests and visitor logs</p>
            </div>
            <Link
              href="/staff/visitor/new"
              className="inline-flex items-center gap-2 self-start rounded-xl bg-cyan-300 px-6 py-3 font-headline font-bold text-[#004d57] shadow-[0_0_20px_rgba(0,227,253,0.3)] transition hover:scale-[1.02] active:scale-95 md:self-auto"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Invite New Visitor
            </Link>
          </div>

          <section className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </section>

          <section className="staff-glass-card overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-6 bg-slate-950/20 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-800/50 py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/40"
                  placeholder="Search visitors by name, email or company..."
                  type="text"
                />
              </div>

              <div className="flex flex-wrap items-center rounded-xl bg-slate-800/40 p-1">
                {statusTabs.map((tab, index) => (
                  <button
                    key={tab}
                    className={`rounded-lg px-5 py-2 text-sm transition ${
                      index === 0
                        ? "bg-cyan-300/10 font-semibold text-cyan-300"
                        : "font-medium text-slate-500 hover:text-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4 lg:hidden">
              {visitors.map((visitor) => (
                <article key={visitor.email} className="rounded-[1.25rem] border border-white/5 bg-slate-900/20 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${visitor.avatarClass}`}>
                        {visitor.initials}
                      </div>
                      <div>
                        <p className="font-headline font-semibold text-slate-100">{visitor.name}</p>
                        <p className="text-xs text-slate-500">{visitor.email}</p>
                      </div>
                    </div>
                    <StatusPill status={visitor.status} statusClass={visitor.statusClass} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-800/40 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">Company</p>
                      <p className="mt-2 text-sm text-slate-100">{visitor.company}</p>
                    </div>
                    <div className="rounded-xl bg-slate-800/40 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">Purpose</p>
                      <p className="mt-2 text-sm text-slate-100">{visitor.purpose}</p>
                    </div>
                    <div className="rounded-xl bg-slate-800/40 p-3 sm:col-span-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">Date and Time</p>
                      <p className="mt-2 text-sm font-medium text-slate-100">
                        {visitor.date} <span className="text-cyan-300">{visitor.time}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    {visitor.actions.map((action) => (
                      <button
                        key={`${visitor.email}-${action}`}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-cyan-300/10 hover:text-cyan-300"
                      >
                        <span className="material-symbols-outlined text-lg">{action}</span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900/10">
                    <th className="px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Visitor</th>
                    <th className="px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Company</th>
                    <th className="px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Purpose</th>
                    <th className="px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Date and Time</th>
                    <th className="px-6 py-4 text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-6 py-4 text-right text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visitors.map((visitor) => (
                    <tr key={`${visitor.email}-desktop`} className="transition hover:bg-slate-900/20">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${visitor.avatarClass}`}>
                            {visitor.initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-headline font-semibold text-slate-100">{visitor.name}</span>
                            <span className="text-xs text-slate-500">{visitor.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">{visitor.company}</td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-100">{visitor.purpose}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-100">{visitor.date}</span>
                          <span className={`text-xs font-semibold ${visitor.status === "Completed" ? "text-slate-500" : "text-cyan-300"}`}>
                            {visitor.time}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusPill status={visitor.status} statusClass={visitor.statusClass} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          {visitor.actions.map((action) => (
                            <button
                              key={`${visitor.email}-${action}-desktop`}
                              className={`rounded-lg p-2 transition ${
                                action === "cancel"
                                  ? "text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                                  : "text-slate-500 hover:bg-cyan-300/10 hover:text-cyan-300"
                              }`}
                            >
                              <span className="material-symbols-outlined text-lg">{action}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/5 bg-slate-950/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-100">1-4</span> of 12 visitors
              </span>
              <div className="flex items-center gap-2">
                <button className="cursor-not-allowed rounded-lg bg-slate-800/60 p-2 text-slate-600">
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button className="h-8 w-8 rounded-lg bg-cyan-300 text-xs font-bold text-[#004d57]">1</button>
                <button className="h-8 w-8 rounded-lg text-xs font-medium text-slate-100 transition hover:bg-slate-800/70">2</button>
                <button className="h-8 w-8 rounded-lg text-xs font-medium text-slate-100 transition hover:bg-slate-800/70">3</button>
                <button className="rounded-lg p-2 text-slate-100 transition hover:bg-slate-800/70">
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
