'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUser } from "@/config/index";
import { useDarkMode } from "@/context/DarkModeContext";
import LiveAttendanceNotifier from "@/components/LiveAttendanceNotifier";
import { LocateFixed, Bell, PlayCircle, Sun, Moon, X } from "lucide-react";
import useSse from "@/hooks/useSse";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const { isDark, setIsDark } = useDarkMode();

  // ✅ avoid hydration mismatch: render placeholder until mounted
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());

    // update every 30 seconds (enough for HH:MM)
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const time = useMemo(() => {
    if (!mounted || !now) return "—";
    return now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }, [mounted, now]);

  const date = useMemo(() => {
    if (!mounted || !now) return "—";
    return now
      .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      .toUpperCase();
  }, [mounted, now]);


  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Sync state with document class on mount and when changed
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  const [user, setUser] = useState(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const clientId = user?.company_id ?? null;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSseNotification = useCallback((incoming) => {
    if (!incoming || typeof incoming !== "object") return;
    if (incoming.type && incoming.type !== "notification" && incoming.type !== "leave_request" && incoming.type !== "change_request") return;

    const newNotif = {
      id: Date.now(),
      message: incoming.message ?? "New notification",
      type: incoming.type ?? "notification",
      access_url: incoming.data?.access_url ?? null,
      timestamp: incoming.data?.timestamp ?? new Date().toLocaleString(),
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setNotificationCount((prev) => prev + 1);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  }, []);

  useSse({ clientId, onMessage: handleSseNotification, storeMessages: false });

  const loadUser = async () => {
    try {
      const userData = await getUser();
      setUser(userData);
    } catch (error) {
      console.error("Failed to load user:", error);
    }
  };

  useEffect(() => {
    if (pathname?.startsWith("/visitor/host-checkin")) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    loadUser();

    const handleUserUpdate = () => loadUser();
    window.addEventListener("userUpdated", handleUserUpdate);

    return () => window.removeEventListener("userUpdated", handleUserUpdate);
  }, [router, pathname]);

  if (pathname === "/login") return null;
  if (pathname?.startsWith("/visitor/host-checkin")) return null;

  const navLinks = [
    { name: 'DASHBOARD', href: '/' },
    { name: 'EMPLOYEES', href: '/employees' },
    { name: 'ATTENDANCE', href: '/shift' },
    { name: 'ACCESS CONTROL', href: '/access_control' },
    { name: 'PAYROLL', href: '/payslips' },
    { name: 'VISITORS', href: '/visitor' },
    { name: 'REPORTS', href: '/report' },
    { name: 'SETTINGS', href: '/setup' },
  ];

  const restrictedNames = ['SETTINGS', 'PAYROLL', 'ACCESS CONTROL'];

  // const filteredLinks =
  //   user && Array.isArray(user.departments) && user.departments.length > 0
  //     ? navLinks.filter(link => !restrictedNames.includes(link.name))
  //     : navLinks;

  const filteredLinks = navLinks;

  return (
    <>
      <LiveAttendanceNotifier />
      <header className="flex items-center justify-between bg-white dark:bg-[#293548] px-4 py-3 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.9)] z-20">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <img alt="MyTime Cloud logo" className="h-32 w-auto object-contain -my-9" src="/logo22.png" />
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 lg:space-x-10 xl:space-x-14">
          {filteredLinks.map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(link.href + "/");
            const baseClasses = "text-sm font-medium transition-colors";
            const activeClasses = "text-purple-600 dark:text-purple-400 rounded-md";
            const inactiveClasses = "text-slate-600 dark:text-white hover:text-purple-600 dark:hover:text-purple-400";

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-4">
            {/* Notification Bell + Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setShowDropdown((prev) => !prev);
                  setNotificationCount(0);
                }}
                className="relative p-2 text-slate-400 hover:text-primary transition-colors"
                title="Notifications"
              >
                <Bell
                  size={22}
                  strokeWidth={1.8}
                  className={`transition-colors duration-300 ${notificationCount > 0 ? "text-primary" : ""} ${isShaking ? "bell-shake" : ""}`}
                />
                {notificationCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none shadow-sm">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Notifications</span>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <button
                          onClick={() => setNotifications([])}
                          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                      <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700">
                    {notifications.length === 0 ? (
                      <li className="px-4 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                        No notifications yet
                      </li>
                    ) : (
                      notifications.map((notif) => (
                        <li key={notif.id}>
                          {notif.access_url ? (
                            <button
                              onClick={() => {
                                setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                                setShowDropdown(false);
                                router.push(notif.access_url);
                              }}
                              className="w-full flex flex-col gap-0.5 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                            >
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{notif.message}</span>
                              <span className="text-[11px] text-gray-400 dark:text-slate-500">{notif.timestamp}</span>
                            </button>
                          ) : (
                            <div
                              onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
                              className="flex flex-col gap-0.5 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                            >
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{notif.message}</span>
                              <span className="text-[11px] text-gray-400 dark:text-slate-500">{notif.timestamp}</span>
                            </div>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

            <button onClick={() => router.push("/live-tracker")}
              className="relative p-2 text-slate-400 hover:text-primary transition-colors"
              title="Watch Tutorial"
            >
              <LocateFixed size={22} strokeWidth={1.8} />
              {/* <span className="material-symbols-outlined">smart_display</span> */}
            </button>

            <button
              className="relative p-2 text-slate-400 hover:text-red-600 transition-colors"
              title="Watch Tutorial"
            >
              <PlayCircle size={22} strokeWidth={1.8} />
            </button>

            <button
              onClick={() => setIsDark(!isDark)}
              className="relative p-2 text-slate-400 hover:text-gold-glow transition-all duration-300 active-pop"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="inline-flex transition-transform duration-500 rotate-0 dark:rotate-[360deg]">
                {isDark
                  ? <Sun size={22} strokeWidth={1.8} />
                  : <Moon size={22} strokeWidth={1.8} />
                }
              </span>
              <span
                className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-colors ${isDark ? "bg-gold-glow shadow-[0_0_8px_#fbbf24]" : "bg-transparent"}`}
              />
            </button>

            <div className="text-right hidden sm:block">
              <h2 className="text-sm font-bold text-gray-300 font-display">
                {time}
              </h2>
              <p className="text-[10px] text-gray-300">
                {date}
              </p>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}