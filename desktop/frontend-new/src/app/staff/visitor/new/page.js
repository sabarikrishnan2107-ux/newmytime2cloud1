import Link from "next/link";

const purposeOptions = [
  "Business Meeting",
  "Service Maintenance",
  "Personal Visit",
  "Interview",
];

const locationOptions = [
  "Main Conference Room",
  "Innovation Lab",
  "HR Department",
  "Executive Suite",
];

const durationOptions = ["1 Hour", "2 Hours", "Half Day", "Full Day"];

function FieldLabel({ children }) {
  return <label className="text-xs uppercase tracking-widest text-slate-500">{children}</label>;
}

export default function StaffVisitorInvitePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-cyan-300/10 blur-[150px]"></div>
        <div className="absolute -bottom-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-purple-300/10 blur-[120px]"></div>
      </div>

      <div>
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Link href="/staff/visitor" className="transition hover:text-cyan-300">
              Visitor
            </Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-cyan-300">New Invite</span>
          </div>
          <h1 className="mb-2 font-headline text-4xl font-bold tracking-tight text-slate-100">Create Visitor Invite</h1>
          <p className="text-slate-500">Issue a secure digital pass for upcoming guests and meetings.</p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          <div className="space-y-8 lg:col-span-7">
            <section className="staff-glass-card rounded-xl border border-white/5 p-8 shadow-[inset_0_0_10px_rgba(129,236,255,0.1),0_0_20px_rgba(129,236,255,0.05)]">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-300">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <h2 className="font-headline text-xl font-semibold text-slate-100">Visitor Details</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Full Name</FieldLabel>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-1 focus:ring-cyan-300/40"
                    placeholder="e.g. Jonathan Wick"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Company</FieldLabel>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-1 focus:ring-cyan-300/40"
                    placeholder="e.g. Continental Corp"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Email Address</FieldLabel>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-1 focus:ring-cyan-300/40"
                    placeholder="visitor@example.com"
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Phone Number</FieldLabel>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-1 focus:ring-cyan-300/40"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                  />
                </div>
              </div>
            </section>

            <section className="staff-glass-card rounded-xl border border-white/5 p-8">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-300/10 text-purple-300">
                  <span className="material-symbols-outlined">event_available</span>
                </div>
                <h2 className="font-headline text-xl font-semibold text-slate-100">Visit Schedule</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Purpose of Visit</FieldLabel>
                  <select className="w-full appearance-none rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition focus:border-purple-300/50 focus:ring-1 focus:ring-purple-300/40">
                    {purposeOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Meeting Location</FieldLabel>
                  <select className="w-full appearance-none rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition focus:border-purple-300/50 focus:ring-1 focus:ring-purple-300/40">
                    {locationOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Date and Time</FieldLabel>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition focus:border-purple-300/50 focus:ring-1 focus:ring-purple-300/40"
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Expected Duration</FieldLabel>
                  <select className="w-full appearance-none rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition focus:border-purple-300/50 focus:ring-1 focus:ring-purple-300/40">
                    {durationOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
              <button className="flex-1 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 py-4 font-headline font-bold text-[#004d57] shadow-[0_0_20px_rgba(0,227,253,0.3)] transition hover:brightness-110 active:scale-[0.98]">
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">send</span>
                  Send Digital Invite
                </span>
              </button>
              <button className="rounded-xl border border-white/10 bg-slate-800/60 px-8 py-4 font-headline font-semibold text-slate-100 transition hover:bg-slate-700/70">
                Save as Draft
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-cyan-300/5 blur-[100px]"></div>

              <div className="staff-glass-card relative overflow-hidden rounded-3xl border border-white/5 shadow-2xl">
                <div className="border-b border-white/5 bg-gradient-to-br from-cyan-300/20 to-purple-300/10 p-8 text-center">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-cyan-300">Secure Access Token</p>
                  <h3 className="font-headline text-3xl font-extrabold tracking-tighter text-slate-100">Guest Pass</h3>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"></span>
                    <span className="text-[10px] font-bold uppercase text-cyan-300">Active for Check-in</span>
                  </div>
                </div>

                <div className="flex flex-col items-center p-8">
                  <div className="group relative h-56 w-56 rounded-2xl bg-white p-4 shadow-xl">
                    <div className="absolute inset-0 scale-105 rounded-2xl border-4 border-cyan-300/20 opacity-0 transition group-hover:opacity-100"></div>
                    <img
                      alt="Secure access QR code"
                      className="h-full w-full"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCt3LtlpAnoEShhgOLAuIrnvZxxrPePAIeZwiFfFtmLz_PQ-KA5ZlGMnru9ggF-3hsAWa3VVf8KOx2aC9DqENWhrTiE4z6ALSfNrYnu_fRT99NS7PMQFsLlH-n_nE-cKlaa7sW2dwTPObHnfM7WxApt53hNZX1xbXgNnA05-KdQkyGhHqX4ornTtFJ6zkRZ06uaHdpgkgbfHy5fU3FepsF9T9LRf3eEEGiBTqNgLmy7csFa2hj7C0yTpDlZOWewlfYnjCiY0biEU3if"
                    />
                  </div>
                  <p className="mt-6 font-headline text-sm font-bold uppercase tracking-widest text-slate-500">Secure QR Code</p>
                </div>

                <div className="space-y-6 p-8 pt-0">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Visitor</p>
                      <p className="font-headline text-sm font-semibold text-slate-100">---</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Host</p>
                      <p className="font-headline text-sm font-semibold text-slate-100">System Admin</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Date</p>
                      <p className="font-headline text-sm font-semibold text-slate-100">Oct 24, 2023</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Location</p>
                      <p className="font-headline text-sm font-semibold text-slate-100">Main Office</p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                      <span>SECURITY CLEARANCE: LEVEL 1</span>
                      <span>INVITE-ID: #CG-8842</span>
                    </div>
                  </div>
                </div>

                <div className="absolute left-0 top-[220px] h-8 w-8 -translate-x-1/2 rounded-full border-r border-white/5 bg-[#070e1b]"></div>
                <div className="absolute right-0 top-[220px] h-8 w-8 translate-x-1/2 rounded-full border-l border-white/5 bg-[#070e1b]"></div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/5 p-4">
              <span className="material-symbols-outlined text-cyan-300">info</span>
              <p className="text-xs leading-relaxed text-slate-500">
                This preview shows the digital pass as it will appear on the guest&apos;s mobile device via SMS or Email link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
