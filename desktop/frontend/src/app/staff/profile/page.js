"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/config";
import { api, buildQueryParams } from "@/lib/api-client";
import { getStaffUser } from "@/lib/staff-user";
import { svcUrl } from "@/lib/runtimeHost";
import Link from "next/link";

function ContactCard({ label, value, icon, iconClass }) {
  return (
    <article className="group flex items-start gap-4 rounded-2xl bg-slate-900/40 p-4 transition-colors hover:bg-slate-800/50">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-100">{value || "---"}</p>
      </div>
    </article>
  );
}

function WorkSummaryCard({ label, value, helper, valueClass }) {
  return (
    <article className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-center">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`font-headline text-sm font-bold ${valueClass}`}>{value || "---"}</p>
      <p className="mt-1 text-[10px] text-slate-500">{helper || ""}</p>
    </article>
  );
}

export default function StaffProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [docs, setDocs] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = await getStaffUser();
        const params = await buildQueryParams({});

        // Get profile from /me
        try {
          const { data } = await api.get("/me");
          const me = data?.user;

          let emp = null;
          if (u.employee_id) {
            try {
              const empRes = await api.get("/employees_with_schedule_count", { params: { ...params, per_page: 50 } });
              emp = (empRes.data?.data || []).find((e) => e.id === u.employee_id);
            } catch (e) {}
          }

          setProfile({
            name: me?.employee_name || (emp ? `${emp.first_name} ${emp.last_name || ""}`.trim() : me?.name) || "Employee",
            initials: ((emp?.first_name || me?.name || "E")[0] + (emp?.last_name || "")[0]).toUpperCase(),
            empCode: emp?.employee_id || u.employee_id || "---",
            designation: emp?.designation?.name || "---",
            department: emp?.department?.name || "---",
            branch: emp?.branch?.branch_name || "---",
            email: me?.email || "---",
            phone: emp?.phone_number || "---",
            joiningDate: emp?.joining_date || emp?.show_joining_date || "---",
            profilePicture: me?.employee_profile_picture || emp?.profile_picture || null,
            shift: emp?.schedule_active?.shift?.name || "---",
            shiftTime: emp?.schedule_active?.shift ? `${emp.schedule_active.shift.on_duty_time || "---"} - ${emp.schedule_active.shift.off_duty_time || "---"}` : "---",
            manager: emp?.reporting_manager ? `${emp.reporting_manager.first_name || ""} ${emp.reporting_manager.last_name || ""}`.trim() : "---",
            managerDesignation: emp?.reporting_manager?.designation?.name || "---",
            permanentAddress: (() => {
              const addr = emp?.permanent_address || emp?.home_address;
              if (!addr) return "---";
              if (typeof addr === "string") return addr;
              return [addr.building, addr.street_address, addr.landmark, addr.city, addr.state, addr.country, addr.zip_code].filter(Boolean).join(", ") || "---";
            })(),
            presentAddress: (() => {
              const addr = emp?.present_address || emp?.current_address || emp?.address;
              if (!addr) return "---";
              if (typeof addr === "string") return addr;
              return [addr.building, addr.street_address, addr.landmark, addr.city, addr.state, addr.country, addr.zip_code].filter(Boolean).join(", ") || "---";
            })(),
            emergencyName: (() => {
              const pc = emp?.primary_contact;
              if (!pc) return "---";
              if (typeof pc === "string") { try { return JSON.parse(pc)?.full_name || "---"; } catch { return "---"; } }
              return pc?.full_name || "---";
            })(),
            emergencyRelation: (() => {
              const pc = emp?.primary_contact;
              if (!pc) return "---";
              if (typeof pc === "string") { try { return JSON.parse(pc)?.relation || "---"; } catch { return "---"; } }
              return pc?.relation || "---";
            })(),
            emergencyPhone: (() => {
              const pc = emp?.primary_contact;
              if (!pc) return "---";
              if (typeof pc === "string") { try { return JSON.parse(pc)?.primary_phone || "---"; } catch { return "---"; } }
              return pc?.primary_phone || "---";
            })(),
          });
        } catch (e) { console.warn("Profile error", e); }

        // Get stats from /staff-stats
        try {
          const sysId = u.system_user_id || u.employee_id;
          const { data: statsData } = await api.get("/staff-stats", {
            params: { ...params, system_user_id: sysId, user_id: u.id },
          });
          setStats({ present: statsData.present || 0, absent: statsData.absent || 0, leave: statsData.leave || 0 });
        } catch (e) {}

        // Get documents from /documentinfo/{employee_id}
        try {
          const empId = u.employee_id;
          const { data } = await api.get(`/documentinfo/${empId}`);
          const items = Array.isArray(data) ? data : data?.data || [];

          const iconMap = {
            visa: { icon: "id_card", iconClass: "bg-slate-800 text-purple-300" },
            passport: { icon: "flight", iconClass: "bg-slate-800 text-cyan-300" },
            emirates: { icon: "badge", iconClass: "bg-slate-800 text-emerald-300" },
            pdf: { icon: "description", iconClass: "bg-slate-800 text-red-300" },
            image: { icon: "image", iconClass: "bg-slate-800 text-blue-300" },
          };

          setDocs(items.map((d) => {
            const key = (d.title || d.type || "").toLowerCase();
            const style = iconMap[key] || iconMap[d.type] || { icon: "description", iconClass: "bg-slate-800 text-amber-300" };
            return {
              title: d.title || d.type || "Document",
              detail: d.attachment || "---",
              expiry: d.expiry_date,
              issueDate: d.issue_date,
              icon: style.icon,
              iconClass: style.iconClass,
            };
          }));
        } catch (e) { console.warn("Docs error", e); }

      } catch (err) {
        console.error("Profile error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg({ type: "error", text: "Passwords don't match" });
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    if (!/[a-z]/.test(passwordForm.new) || !/[A-Z]/.test(passwordForm.new) || !/[0-9]/.test(passwordForm.new) || !/[@$!%*#?&]/.test(passwordForm.new)) {
      setPasswordMsg({ type: "error", text: "Password must contain uppercase, lowercase, number and special character (@$!%*#?&)" });
      return;
    }
    try {
      const u = getUser();
      await api.post("/new-password", {
        email: u?.email,
        password: passwordForm.new,
        password_confirmation: passwordForm.confirm,
      });
      setPasswordMsg({ type: "success", text: "Password changed successfully" });
      setPasswordForm({ current: "", new: "", confirm: "" });
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (e) {
      setPasswordMsg({ type: "error", text: e?.response?.data?.message || "Failed to change password" });
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-slate-400 text-sm">Loading profile...</div></div>;
  }

  const p = profile || {};
  const totalDays = (stats.present || 0) + (stats.absent || 0) + (stats.leave || 0);
  const attendancePercent = totalDays > 0 ? Math.round((stats.present / totalDays) * 100) : 0;
  const ringOffset = 440 - (440 * attendancePercent) / 100;

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const diff = (new Date(dateStr) - new Date()) / 86400000;
    return diff >= 0 && diff <= 30;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div>
        {/* HERO SECTION */}
        <section className="staff-glass-card relative mb-6 overflow-hidden rounded-2xl p-5">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/10 blur-[80px]"></div>
          <div className="relative flex flex-col items-center gap-5 md:flex-row md:items-end">
            <div className="relative">
              {p.profilePicture ? (
                <div className="h-24 w-24 rounded-2xl overflow-hidden ring-2 ring-cyan-300/20">
                  <img
                    src={p.profilePicture.startsWith("http") ? p.profilePicture : `${svcUrl("http", 8000)}/media/employee/profile_picture/${p.profilePicture}`}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/25 to-purple-300/20 text-3xl font-black text-slate-100 ring-2 ring-cyan-300/20">
                  {p.initials || "E"}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-300 px-2 py-0.5 text-[8px] font-bold tracking-widest text-[#005b51] shadow-lg">ACTIVE</div>
            </div>
            <div className="flex-grow text-center md:text-left">
              <div className="mb-1 flex flex-col gap-2 md:flex-row md:items-center">
                <h1 className="font-headline text-2xl font-extrabold tracking-tight text-slate-100">{p.name}</h1>
                <span className="self-center rounded-md border border-white/10 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">ID: {p.empCode}</span>
              </div>
              <p className="mb-3 font-headline text-sm font-medium tracking-wide text-cyan-300">{p.designation} - {p.department}</p>
              <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-slate-900/40 px-4 py-2">
                  <span className="material-symbols-outlined text-sm text-cyan-300">location_on</span>
                  <span className="text-sm font-medium text-slate-100">{p.branch}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-900/40 px-4 py-2">
                  <span className="material-symbols-outlined text-sm text-emerald-300">schedule</span>
                  <span className="text-sm font-medium text-slate-100">{p.shift} ({p.shiftTime})</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            {/* Contact */}
            <section className="staff-glass-card rounded-2xl p-4">
              <h2 className="mb-3 font-headline text-sm font-bold text-slate-100">Contact Information</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ContactCard label="Work Email" value={p.email} icon="work" iconClass="bg-cyan-300/10 text-cyan-300" />
                <ContactCard label="Phone Number" value={p.phone} icon="call" iconClass="bg-emerald-300/10 text-emerald-300" />
              </div>
            </section>

            {/* Address Information */}
            <section className="staff-glass-card rounded-2xl p-4">
              <h2 className="mb-3 font-headline text-sm font-bold text-slate-100">Address Information</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-base text-cyan-300">home</span>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Permanent Address</p>
                  </div>
                  <p className="text-sm text-slate-100">{p.permanentAddress || "---"}</p>
                </div>
                <div className="rounded-2xl bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-base text-purple-300">location_on</span>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Present Address</p>
                  </div>
                  <p className="text-sm text-slate-100">{p.presentAddress || "---"}</p>
                </div>
              </div>
            </section>

            {/* Emergency Contact */}
            <section className="staff-glass-card rounded-2xl p-4">
              <h2 className="mb-3 font-headline text-sm font-bold text-slate-100">Emergency Contact</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ContactCard label="Contact Name" value={p.emergencyName} icon="person" iconClass="bg-red-300/10 text-red-300" />
                <ContactCard label="Relationship" value={p.emergencyRelation} icon="group" iconClass="bg-amber-300/10 text-amber-300" />
                <ContactCard label="Phone Number" value={p.emergencyPhone} icon="phone_in_talk" iconClass="bg-red-300/10 text-red-300" />
              </div>
            </section>

            {/* Work Details */}
            <section className="staff-glass-card rounded-2xl p-4">
              <h2 className="mb-3 font-headline text-sm font-bold text-slate-100">Work Details</h2>
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <WorkSummaryCard label="Joining Date" value={p.joiningDate} valueClass="text-cyan-300" />
                <WorkSummaryCard label="Branch / Office" value={p.branch} valueClass="text-slate-100" />
                <WorkSummaryCard label="Shift" value={p.shift} helper={p.shiftTime} valueClass="text-emerald-300" />
              </div>
              {p.manager !== "---" && (
                <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-cyan-300/10 bg-slate-800/40 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300/20 to-purple-300/20 text-sm font-black text-slate-100 ring-2 ring-cyan-300/10">
                      {(p.manager || "M")[0]}
                    </div>
                    <div>
                      <p className="mb-0.5 text-[9px] uppercase tracking-widest text-slate-500">Reporting Manager</p>
                      <p className="font-headline text-sm font-bold text-slate-100">{p.manager}</p>
                      <p className="text-xs text-cyan-300">{p.managerDesignation}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Documents — CONNECTED to /passport, /visa, /emirate */}
            <section className="staff-glass-card rounded-2xl p-4">
              <h2 className="mb-3 font-headline text-sm font-bold text-slate-100">Documents</h2>
              <div className="space-y-3">
                {docs.length > 0 ? docs.map((doc, i) => (
                  <article
                    key={i}
                    className="group flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/40 p-4 transition hover:border-cyan-300/30 cursor-pointer"
                    onClick={() => {
                      if (doc.detail && doc.detail !== "---") {
                        const u = getUser();
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || svcUrl("http", 8000);
                        window.open(`${baseUrl}/documents/${u.employee_id}/${doc.detail}`, "_blank");
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${doc.iconClass}`}>
                        <span className="material-symbols-outlined">{doc.icon}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-100">{doc.title}</p>
                        <p className="text-[10px] uppercase tracking-tighter text-slate-500">{doc.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {doc.expiry && (
                        <div className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${
                          isExpired(doc.expiry) ? "bg-red-300/10 text-red-300" :
                          isExpiringSoon(doc.expiry) ? "bg-amber-300/10 text-amber-300" :
                          "bg-emerald-300/10 text-emerald-300"
                        }`}>
                          <span className="material-symbols-outlined text-xs">
                            {isExpired(doc.expiry) ? "error" : isExpiringSoon(doc.expiry) ? "warning" : "check_circle"}
                          </span>
                          {isExpired(doc.expiry) ? "EXPIRED" : isExpiringSoon(doc.expiry) ? "EXPIRING SOON" : `Exp: ${new Date(doc.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                        </div>
                      )}
                      <button className="text-slate-500 transition hover:text-cyan-300">
                        <span className="material-symbols-outlined">open_in_new</span>
                      </button>
                    </div>
                  </article>
                )) : (
                  <div className="text-center text-slate-500 text-xs py-8">No documents uploaded</div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4 lg:col-span-4">
            {/* Quick Actions — WORKING */}
            <section className="staff-glass-card rounded-2xl p-4">
              <h2 className="mb-3 font-headline text-sm font-bold text-slate-100">Quick Actions</h2>
              <div className="space-y-3">
                <button onClick={() => setShowPasswordModal(true)} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-left transition hover:bg-slate-700/60">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/5 text-cyan-300 group-hover:bg-cyan-300/20 transition-all">
                    <span className="material-symbols-outlined">lock_reset</span>
                  </div>
                  <span className="text-sm font-bold text-slate-100">Change Password</span>
                  <span className="material-symbols-outlined ml-auto text-slate-500 group-hover:text-cyan-300 transition-all">chevron_right</span>
                </button>
                <Link href="/staff/leave" className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-left transition hover:bg-slate-700/60">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-300/5 text-purple-300 group-hover:bg-purple-300/20 transition-all">
                    <span className="material-symbols-outlined">event_available</span>
                  </div>
                  <span className="text-sm font-bold text-slate-100">Apply for Leave</span>
                  <span className="material-symbols-outlined ml-auto text-slate-500 group-hover:text-purple-300 transition-all">chevron_right</span>
                </Link>
                <Link href="/staff/change-request" className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-left transition hover:bg-slate-700/60">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/5 text-amber-300 group-hover:bg-amber-300/20 transition-all">
                    <span className="material-symbols-outlined">fact_check</span>
                  </div>
                  <span className="text-sm font-bold text-slate-100">Change Request</span>
                  <span className="material-symbols-outlined ml-auto text-slate-500 group-hover:text-amber-300 transition-all">chevron_right</span>
                </Link>
                <Link href="/staff/attendance" className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-left transition hover:bg-slate-700/60">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/5 text-emerald-300 group-hover:bg-emerald-300/20 transition-all">
                    <span className="material-symbols-outlined">calendar_today</span>
                  </div>
                  <span className="text-sm font-bold text-slate-100">My Attendance</span>
                  <span className="material-symbols-outlined ml-auto text-slate-500 group-hover:text-emerald-300 transition-all">chevron_right</span>
                </Link>
              </div>
            </section>

            {/* Attendance Overview */}
            <section className="staff-glass-card relative overflow-hidden rounded-2xl p-4">
              <div className="absolute right-0 top-0 h-32 w-32 bg-purple-300/10 blur-3xl"></div>
              <h2 className="mb-3 font-headline text-sm font-bold text-slate-100">Attendance Overview</h2>
              <div className="flex flex-col items-center py-4">
                <div className="relative mb-4 h-32 w-32">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
                    <circle className="text-slate-800" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="8"></circle>
                    <circle className="text-cyan-300" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeDasharray="440" strokeDashoffset={ringOffset} strokeWidth="8"></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-headline text-2xl font-bold text-slate-100">{attendancePercent}%</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">{attendancePercent >= 80 ? "Healthy" : attendancePercent >= 50 ? "Moderate" : "At Risk"}</span>
                  </div>
                </div>
                <div className="grid w-full grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-900/40 p-4 text-center">
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Leaves Used</p>
                    <p className="text-2xl font-bold text-slate-100">{stats.leave || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/40 p-4 text-center">
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Days Present</p>
                    <p className="text-2xl font-bold text-slate-100">{stats.present || 0}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="staff-glass-card rounded-2xl p-8 w-full max-w-md">
            <h3 className="font-headline text-sm font-bold text-slate-100 mb-6">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 block">New Password</label>
                <div className="relative">
                  <input type={showNewPass ? "text" : "password"} value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 focus:outline-none focus:border-cyan-300/30" placeholder="Enter new password" />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <span className="material-symbols-outlined text-lg">{showNewPass ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 block">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPass ? "text" : "password"} value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 focus:outline-none focus:border-cyan-300/30" placeholder="Confirm new password" />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <span className="material-symbols-outlined text-lg">{showConfirmPass ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
              {passwordMsg && (
                <div className={`text-xs p-3 rounded-xl ${passwordMsg.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                  {passwordMsg.text}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={handleChangePassword} className="flex-1 rounded-xl bg-cyan-300 px-6 py-3 font-bold text-[#004d57] transition hover:scale-[1.02]">
                  Change Password
                </button>
                <button onClick={() => { setShowPasswordModal(false); setPasswordMsg(null); }} className="rounded-xl border border-white/10 bg-slate-800 px-6 py-3 text-slate-400 transition hover:bg-slate-700">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
