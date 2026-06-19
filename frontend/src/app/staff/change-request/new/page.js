import Link from "next/link";

const correctionTypes = [
  "Missed Punch (In/Out)",
  "Wrong Entry Time",
  "System Failure",
  "Work from Home / Off-site",
];

const approvalSteps = [
  {
    title: "Request Submitted",
    subtitle: "Awaiting your confirmation",
    active: true,
    completed: true,
  },
  {
    title: "Reviewer 1 (Department Head)",
    subtitle: "Pending approval",
  },
  {
    title: "Final Verification (HR)",
    subtitle: "Upcoming",
    muted: true,
  },
];

const policyItems = [
  "Correction requests must be submitted within 72 hours of the discrepancy date.",
  "Medical certificates are required for absences exceeding 4 hours of the shift.",
  "Intentional falsification of time records is a violation of the Nexus Conduct Code.",
];

function FieldLabel({ children }) {
  return <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</label>;
}

export default function StaffChangeRequestNewPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div>
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Link href="/staff/change-request" className="transition hover:text-cyan-300">
              Change Request
            </Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-cyan-300">New Change Request</span>
          </div>
          <h1 className="mb-1 text-lg font-bold tracking-tight text-slate-100">
            Attendance Change Request
          </h1>
          <p className="max-w-2xl text-xs text-slate-500">
            Submit a request to fix discrepancies in your punch records. All requests are subject to approval by your direct manager.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="flex flex-col gap-5 lg:col-span-8">
            <div className="staff-glass-card rounded-2xl p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-cyan-300">
                <span className="material-symbols-outlined text-base">edit_calendar</span>
                Request Details
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Correction Type</FieldLabel>
                  <select className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50">
                    {correctionTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Date of Discrepancy</FieldLabel>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 pr-12 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                      type="date"
                      defaultValue="2023-10-24"
                    />
                    <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      calendar_today
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Corrected Start Time</FieldLabel>
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                    type="time"
                    defaultValue="09:00"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Corrected End Time</FieldLabel>
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                    type="time"
                    defaultValue="18:00"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2">
                <FieldLabel>Reason for Correction</FieldLabel>
                <textarea
                  className="min-h-[80px] resize-none rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                  placeholder="Describe why this correction is needed..."
                />
              </div>
            </div>

            <div className="staff-glass-card rounded-2xl p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-purple-300">
                <span className="material-symbols-outlined text-base">attachment</span>
                Supporting Evidence
              </h2>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Proof of Attendance (Optional)</FieldLabel>
                  <div className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-slate-950/30 p-5 text-center transition hover:border-purple-300/30 hover:bg-slate-800/40">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-400/15 text-purple-300 transition group-hover:scale-110">
                      <span className="material-symbols-outlined text-lg">cloud_upload</span>
                    </div>
                    <p className="text-xs font-medium text-slate-100">Click to upload or drag and drop</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">PNG, JPG or PDF (max. 5MB)</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Note for Approver (Optional)</FieldLabel>
                  <textarea
                    className="min-h-[88px] resize-none rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-purple-300/60 focus:ring-1 focus:ring-purple-300/40"
                    placeholder="Add a short message for the reviewer..."
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse items-stretch justify-end gap-3 pb-8 sm:flex-row sm:items-center">
              <Link
                href="/staff/change-request"
                className="rounded-xl px-5 py-2 text-center text-xs font-bold text-slate-100 transition hover:bg-slate-800/40"
              >
                Cancel
              </Link>
              <button
                type="button"
                className="rounded-xl bg-gradient-to-br from-cyan-300 to-cyan-400 px-6 py-2 text-xs font-bold uppercase tracking-wider text-[#004d57] shadow-[0_0_15px_rgba(129,236,255,0.2)] transition hover:scale-[1.02] active:scale-95"
              >
                Submit Request
              </button>
            </div>
          </section>

          <aside className="flex flex-col gap-5 lg:col-span-4">
            <div className="staff-glass-card overflow-hidden rounded-2xl border-t-2 border-red-300/50">
              <div className="bg-red-400/10 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-400/15 text-red-300">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <span className="rounded-full bg-red-400 px-3 py-1 text-[10px] font-black uppercase text-[#490006]">
                    Discrepancy Detected
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">Original Punch Data</h3>
                <p className="text-xs text-slate-500">System records for Oct 24, 2023</p>
              </div>

              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between border-b border-white/10 py-2">
                  <span className="text-xs text-slate-500">System In</span>
                  <span className="text-sm font-bold text-slate-100">09:12 AM</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 py-2">
                  <span className="text-xs text-slate-500">System Out</span>
                  <span className="text-sm font-bold text-red-300">--:--</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-500">Total Duration</span>
                  <span className="text-sm font-bold text-slate-100">N/A</span>
                </div>
              </div>
            </div>

            <div className="staff-glass-card rounded-2xl p-4">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-100">Approval Workflow</h3>
              <div className="relative flex flex-col gap-8 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-[2px] before:bg-white/10">
                {approvalSteps.map((step) => (
                  <div key={step.title} className="relative pl-10">
                    <div
                      className={`absolute left-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full ${
                        step.active
                          ? "bg-cyan-300 shadow-[0_0_15px_rgba(129,236,255,0.2)]"
                          : "border-2 border-white/10 bg-slate-800"
                      }`}
                    >
                      {step.completed ? (
                        <span className="material-symbols-outlined text-[14px] text-[#005762]">check</span>
                      ) : step.muted ? null : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-500"></div>
                      )}
                    </div>
                    <h4 className={`text-xs font-bold ${step.active ? "text-cyan-300" : step.muted ? "text-slate-500" : "text-slate-100"}`}>
                      {step.title}
                    </h4>
                    <p className="text-[10px] text-slate-500">{step.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="staff-glass-card relative overflow-hidden rounded-2xl p-6">
              <div className="absolute right-0 top-0 p-2 opacity-10">
                <span className="material-symbols-outlined text-6xl">policy</span>
              </div>
              <h3 className="mb-4 flex items-center gap-2 font-headline text-sm font-bold text-slate-100">
                <span className="material-symbols-outlined text-purple-300">info</span>
                Request Policy
              </h3>
              <ul className="flex flex-col gap-3">
                {policyItems.map((item) => (
                  <li key={item} className="flex gap-3 text-xs leading-relaxed">
                    <span className="mt-1 text-[10px] text-purple-300">*</span>
                    <span className="text-slate-500">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="staff-glass-card rounded-2xl bg-gradient-to-br from-purple-400/10 to-transparent p-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-tighter text-purple-300">Your Correction Health</span>
                <span className="text-xs font-bold text-slate-100">98%</span>
              </div>
              <div className="mb-4 h-1.5 w-full rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-purple-300" style={{ width: "98%" }}></div>
              </div>
              <p className="text-[10px] italic text-slate-500">
                You have only had 2 correction requests in the last 6 months. Excellent reporting hygiene!
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
