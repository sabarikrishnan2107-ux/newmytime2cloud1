'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_BASE_URL, getUser } from "@/config/index";
import { useDarkMode } from "@/context/DarkModeContext";
import LiveAttendanceNotifier from "@/components/LiveAttendanceNotifier";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SupportContact from "@/components/SupportContact";
import { Bell, PlayCircle, Sun, Moon, X, Wand2 } from "lucide-react";
import useSse from "@/hooks/useSse";
import { NAV_MODULES, allowedModulesForUser } from "@/lib/moduleAccess";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

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


  // === Wizard Mode ===
  // Stored per-company on the backend (companies.wizard_mode) so the toggle is
  // shared across every browser/device logged into that company. Refetched on
  // window focus to pick up changes made on another machine.
  const [wizardMode, setWizardMode] = useState(false);
  const [wizardReady, setWizardReady] = useState(false);

  const getCompanyId = useCallback(() => {
    try {
      const u = getUser();
      return u?.company_id || u?.company?.id || null;
    } catch {
      return null;
    }
  }, []);

  const fetchWizardMode = useCallback(async () => {
    const companyId = getCompanyId();
    if (!companyId) {
      setWizardReady(true);
      return;
    }
    try {
      const { data } = await axios.get(`${API_BASE_URL}/company/${companyId}/wizard-mode`);
      setWizardMode(Boolean(data?.wizard_mode));
    } catch (e) {
      // On error, leave current state untouched but mark ready so UI unblocks
    } finally {
      setWizardReady(true);
    }
  }, [getCompanyId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetchWizardMode();
    const onFocus = () => fetchWizardMode();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchWizardMode]);

  const toggleWizard = useCallback(async () => {
    const companyId = getCompanyId();
    if (!companyId) return;
    const next = !wizardMode;
    setWizardMode(next); // optimistic
    try {
      await axios.post(`${API_BASE_URL}/company/${companyId}/wizard-mode`, { wizard_mode: next });
    } catch (e) {
      setWizardMode(!next); // revert on failure
    }
  }, [wizardMode, getCompanyId]);

  // Redirect logic: when wizard is on, force the user to /setup
  useEffect(() => {
    if (!wizardReady || !wizardMode || !pathname) return;
    // Allow setup, login pages, and any auth-related routes
    const allow = pathname.startsWith("/setup") || pathname.startsWith("/login") || pathname === "/";
    if (!allow) router.replace("/setup");
  }, [wizardReady, wizardMode, pathname, router]);

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
    { name: 'DASHBOARD', labelKey: 'header.nav.dashboard', href: '/' },
    { name: 'EMPLOYEES', labelKey: 'header.nav.employees', href: '/employees' },
    { name: 'ATTENDANCE', labelKey: 'header.nav.attendance', href: '/shift' },
    { name: 'LEAVE', labelKey: 'header.nav.leave', href: '/leave-dashboard' },
    { name: 'LIVE TRACKER', labelKey: 'header.nav.liveTracker', href: '/live-tracker' },
    { name: 'ACCESS CONTROL', labelKey: 'header.nav.accessControl', href: '/access_control' },
    { name: 'PAYROLL', labelKey: 'header.nav.payroll', href: '/payslips' },
    { name: 'VISITORS', labelKey: 'header.nav.visitors', href: '/visitor' },
    { name: 'REPORTS', labelKey: 'header.nav.reports', href: '/report' },
    { name: 'SETTINGS', labelKey: 'header.nav.settings', href: '/setup' },
  ];

  // Filter nav by the user's allowed modules. Non-managers get everything
  // (allowedModulesForUser returns all-true for them).
  const allowedModules = allowedModulesForUser(user);
  const moduleByNav = Object.fromEntries(NAV_MODULES.map((e) => [e.navName, e.module]));
  const filteredLinks = navLinks.filter((link) => {
    const mod = moduleByNav[link.name];
    return mod ? allowedModules[mod] : true;
  });

  return (
    <>
      <LiveAttendanceNotifier />
      <header className="relative flex items-center justify-between bg-white dark:bg-[#293548] px-4 py-3 h-[72px] shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] dark:shadow-none z-[55]">
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
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-4">
            {/* Support & Contact */}
            <SupportContact />

            {/* Notification Bell + Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setShowDropdown((prev) => !prev);
                  setNotificationCount(0);
                }}
                className="relative p-2 text-slate-400 hover:text-primary transition-colors"
                title={t('header.tooltips.notifications')}
              >
                <Bell
                  size={22}
                  strokeWidth={1.8}
                  className={`transition-colors duration-300 ${notificationCount > 0 ? "text-primary" : ""} ${isShaking ? "bell-shake" : ""}`}
                />
                {notificationCount > 0 && (
                  <span className="absolute top-0.5 end-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none shadow-sm">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              {showDropdown && (
                <div className="absolute end-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('header.notifications.title')}</span>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <button
                          onClick={() => setNotifications([])}
                          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                        >
                          {t('header.notifications.clearAll')}
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
                        {t('header.notifications.empty')}
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
                              className="w-full flex flex-col gap-0.5 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors text-start cursor-pointer"
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

            <button
              className="relative p-2 text-slate-400 hover:text-red-600 transition-colors"
              title={t('header.tooltips.watchTutorial')}
            >
              <PlayCircle size={22} strokeWidth={1.8} />
            </button>

            <button
              onClick={toggleWizard}
              className={`relative p-2 transition-colors ${wizardMode ? "text-violet-500 hover:text-violet-400" : "text-slate-400 hover:text-violet-400"}`}
              title={wizardMode ? t('header.tooltips.wizardOn') : t('header.tooltips.wizardOff')}
            >
              <Wand2 size={22} strokeWidth={1.8} />
              <span
                className={`absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full transition-colors ${wizardMode ? "bg-violet-500 shadow-[0_0_8px_#8b5cf6]" : "bg-transparent"}`}
              />
            </button>

            <button
              onClick={() => setIsDark(!isDark)}
              className="relative p-2 text-slate-400 hover:text-gold-glow transition-all duration-300 active-pop"
              title={isDark ? t('header.tooltips.lightMode') : t('header.tooltips.darkMode')}
            >
              <span className="inline-flex transition-transform duration-500 rotate-0 dark:rotate-[360deg]">
                {isDark
                  ? <Sun size={22} strokeWidth={1.8} />
                  : <Moon size={22} strokeWidth={1.8} />
                }
              </span>
              <span
                className={`absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full transition-colors ${isDark ? "bg-gold-glow shadow-[0_0_8px_#fbbf24]" : "bg-transparent"}`}
              />
            </button>

            <div className="text-end hidden sm:block">
              <h2 className="text-sm font-bold text-gray-300 font-display">
                {time}
              </h2>
              <p className="text-[10px] text-gray-300">
                {date}
              </p>
            </div>

            <LanguageSwitcher />
          </div>
        </div>
      </header>
    </>
  );
}