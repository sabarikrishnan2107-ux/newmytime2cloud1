'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { leftNavLinks } from '../lib/menuData';
import { LogOut, User } from "lucide-react";
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
      } catch (_) {
        // ignore — fallback to initials
      }
    })();
    return () => { cancelled = true; };
  }, [user?.company_id]);

  if (pathname === "/login") return null;

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
      className="group relative w-20 hover:w-56 border-r border-gray-700 bg-slate-900
                 flex flex-col py-4 transition-all duration-300 ease-in-out overflow-y-auto max-h-[calc(100vh-50px)]"
    >
      <nav className="flex flex-col items-center gap-3 mt-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`flex items-center w-14 group-hover:w-[90%] rounded-xl px-0 group-hover:px-4 py-3
                transition-all duration-300 ease-in-out
                ${isActive
                  ? "bg-primary text-white rounded-xl"
                  : "text-gray-300 hover:bg-primary hover:text-white"
                }`}
            >
              <div className="flex justify-center w-full group-hover:w-8 group-hover:justify-start transition-all duration-300">
                <Icon size={22} strokeWidth={1.8} />
              </div>
              <span className="overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100
                transition-all duration-300 whitespace-nowrap text-sm font-medium ml-0 group-hover:ml-2">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: avatar + logout icon */}
      <div className="mt-auto mb-4 px-3">
        <div className="flex items-center justify-center w-14 group-hover:w-full group-hover:justify-start group-hover:gap-3 rounded-xl px-0 group-hover:px-3 py-2 transition-all duration-300 ease-in-out">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              title={`${displayName} — click to logout`}
              onClick={handleLogout}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 shrink-0 cursor-pointer hover:border-red-400 hover:opacity-80 transition"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div
            title={`${displayName} — click to logout`}
            onClick={handleLogout}
            className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-purple-600 text-white flex items-center justify-center shrink-0 text-sm font-bold cursor-pointer hover:from-red-500 hover:to-red-700 transition ${avatar ? 'hidden' : ''}`}
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="hidden group-hover:flex items-center px-3 h-9 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
