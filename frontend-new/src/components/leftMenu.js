'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { leftNavLinks } from '../lib/menuData';
import { LogOut } from "lucide-react";
import { getUser } from "@/config";
import { getCompanyLogo } from "@/lib/endpoint/company";

export default function LeftMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [companyLogo, setCompanyLogo] = useState(null);

  useEffect(() => {
    const load = () => {
      try { setUser(getUser()); } catch (_) { setUser(null); }
    };
    load();
    window.addEventListener("userUpdated", load);
    return () => window.removeEventListener("userUpdated", load);
  }, []);

  useEffect(() => {
    if (!user?.company_id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getCompanyLogo();
        if (cancelled) return;
        const logo = data?.logo || data?.url || data?.path || (typeof data === "string" ? data : null);
        if (logo) setCompanyLogo(logo);
      } catch (_) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user?.company_id]);

  if (pathname === "/login") return null;
  if (pathname?.startsWith("/visitor/host-checkin")) return null;

  const primaryPath = '/' + pathname.split('/')[1];
  const links = leftNavLinks[primaryPath] || leftNavLinks['/'];

  const displayName =
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.user_name ||
    user?.company?.name ||
    user?.company_name ||
    user?.email ||
    "User";
  const subline = user?.email || user?.company?.name || user?.company_name || "";
  const avatar =
    companyLogo ||
    user?.company?.logo ||
    user?.company_logo ||
    user?.logo ||
    user?.profile_picture ||
    user?.profile_picture_raw ||
    user?.avatar ||
    user?.employee?.profile_picture ||
    null;
  const initials = (() => {
    const src = displayName || "U";
    const parts = String(src).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event("userUpdated"));
      window.location.href = '/login';
      return;
    }
    router.push('/login');
  };

  return (
    <aside
      className="group relative w-20 hover:w-60 border-r border-gray-200 dark:border-slate-800
                 bg-white dark:bg-slate-900
                 flex flex-col py-4 transition-all duration-300 ease-in-out overflow-y-auto max-h-[calc(100vh-50px)]
                 shadow-[1px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-none"
    >
      <nav className="flex flex-col items-center gap-1.5 px-2.5">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              title={link.label}
              className={`relative flex items-center w-14 group-hover:w-full rounded-xl px-0 group-hover:px-3.5 py-3.5
                transition-all duration-300 ease-in-out overflow-hidden
                ${isActive
                  ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/20"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-white"
                }`}
            >
              {isActive && (
                <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full bg-white/80" />
              )}

              <div className="flex justify-center w-14 group-hover:w-8 group-hover:justify-start shrink-0 transition-all duration-300">
                <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              <span className="overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100
                transition-all duration-300 whitespace-nowrap text-[15px] font-medium ml-0 group-hover:ml-2.5">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logo + Logout at bottom */}
      <div className="mt-auto px-2.5 pb-2">
        <div
          onClick={handleLogout}
          title="Click to logout"
          className="flex items-center w-14 group-hover:w-full rounded-xl px-0 group-hover:px-3 py-2.5 cursor-pointer transition-all duration-300 ease-in-out hover:bg-red-500/10"
        >
          <div className="flex justify-center w-14 group-hover:w-10 shrink-0 transition-all duration-300">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 bg-white"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-purple-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-200 dark:ring-slate-700 ${avatar ? 'hidden' : ''}`}
            >
              {initials}
            </div>
          </div>
          <span className="overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100
            transition-all duration-300 whitespace-nowrap text-[15px] font-medium text-slate-600 dark:text-slate-200 ml-0 group-hover:ml-2.5">
            Logout
          </span>
        </div>
      </div>

    </aside>
  );
}
