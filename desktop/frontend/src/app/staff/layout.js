"use client";

import "./staff.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/staff/dashboard", icon: "grid_view", label: "Dashboard" },
  { href: "/staff/announcement", icon: "campaign", label: "Announcement" },
  { href: "/staff/chat", icon: "chat_bubble", label: "Chat" },
  { href: "/staff/visitor", icon: "group", label: "Visitor" },
  { href: "/staff/attendance", icon: "calendar_today", label: "Attendance" },
  { href: "/staff/performance", icon: "query_stats", label: "Performance" },
  { href: "/staff/schedule", icon: "event_note", label: "Schedule" },
  { href: "/staff/holidays", icon: "celebration", label: "Holidays" },
  { href: "/staff/leave", icon: "event_available", label: "Leave" },
  { href: "/staff/change-request", icon: "fact_check", label: "Change Request" },
  { href: "/staff/payroll", icon: "payments", label: "Payroll" },
  { href: "/staff/profile", icon: "person", label: "Profile" },
];

export default function StaffLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="staff-portal flex min-h-screen antialiased overflow-x-hidden">
      {/* SIDEBAR */}
      <aside className="group/sidebar fixed left-0 top-0 z-50 flex h-screen w-14 hover:w-52 flex-col border-r border-white/5 bg-[#050B18]/95 backdrop-blur-xl transition-all duration-300 ease-in-out staff-sidebar-glow overflow-hidden">
        {/* Logo */}
        <div className="flex items-center px-2 py-4 shrink-0 overflow-hidden">
          <img src="/logo22.png" alt="M" className="h-8 w-8 group-hover/sidebar:h-8 group-hover/sidebar:w-auto object-contain shrink-0 transition-all duration-300" onError={(e) => { e.target.src = "https://mytime2cloud.com/logo22.png"; }} />
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-2.5 px-2 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 h-10 px-2 rounded-xl transition-colors whitespace-nowrap ${isActive
                    ? "bg-[#7c3aed] text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <span className="material-symbols-outlined text-xl shrink-0">{item.icon}</span>
                <span className="text-sm font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="shrink-0 px-2 pb-4">
          <button onClick={handleLogout} className="flex items-center gap-3 h-10 px-2 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all whitespace-nowrap">
            <span className="material-symbols-outlined text-xl shrink-0">logout</span>
            <span className="text-sm font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="h-screen min-h-screen flex-1 overflow-y-auto ml-14">{children}</main>
    </div>
  );
}
