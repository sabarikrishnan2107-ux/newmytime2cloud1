"use client";

import React, { useState, useRef } from 'react';

import { useRouter } from 'next/navigation'; // Or 'next/navigation' for App Router

import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import LoginScene from '@/components/Login/LoginScene';
import { useDarkMode } from '@/context/DarkModeContext';
import { firstAllowedHrefForUser, isManagerUser } from '@/lib/moduleAccess';

import {
    User,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    LayoutDashboard,
    Users,
    UserCircle,
    Sun,
    Moon
} from 'lucide-react';

const isBrowser = typeof window !== 'undefined';

const savedEmail = isBrowser ? localStorage.getItem('rememberedEmail') || 'admin' : 'admin';
const savedPassword = isBrowser ? localStorage.getItem('rememberedPassword') || 'admin' : 'admin';
const rememberPref = isBrowser ? localStorage.getItem('rememberMe') === 'true' : false;

const easeOut = [0.16, 1, 0.3, 1];
const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: easeOut },
});

// Main Login Component
const Login = () => {

    const router = useRouter(); // Initialize router
    const { t } = useTranslation();
    const { isDark, setIsDark } = useDarkMode();

    const [credentials, setCredentials] = useState({
        email: savedEmail,
        password: savedPassword,
        rememberMe: rememberPref,
        source: 'admin'
    });

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [role, setRole] = useState('company');
    const [showPassword, setShowPassword] = useState(false);

    // 3D mouse-tilt for the login card
    const cardRef = useRef(null);
    const handleCardMove = (e) => {
        const el = cardRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
    };
    const handleCardLeave = () => {
        if (cardRef.current) cardRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
    };

    const validateForm = () => {
        // Require both fields. The login identifier may be an email OR a plain
        // username (e.g. "admin"), so we do NOT enforce an email format here —
        // the backend authenticates against the users.email column either way.
        if (!credentials.email || !credentials.password) {
            setMsg(t('login.errorRequired'));
            return false;
        }
        return true;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setMsg('');
        setLoading(true);

        try {
            const { source, ...rest } = credentials;
            let payload = role === 'employee'
                ? { ...rest }
                : { user_type: role, ...credentials };
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");
            let endpoint = role === 'employee'
                ? `${apiBase}/employee/login`
                : `${apiBase}/login`;

            const { data } = await axios.post(endpoint, payload);
            const token = data?.token;

            if (token) {
                // --- REMEMBER ME (WITH PASSWORD) ---
                if (credentials.rememberMe) {
                    localStorage.setItem('rememberedEmail', credentials.email);
                    localStorage.setItem('rememberedPassword', credentials.password); // Stored as plain text
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    localStorage.removeItem('rememberedEmail');
                    localStorage.removeItem('rememberedPassword');
                    localStorage.setItem('rememberMe', 'false');
                }

                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify(data?.user));

                // Redirect based on actual user type returned from server.
                // Admin / Manager → admin UI at "/" (backend enforces per-role access).
                // Staff (employee) → staff portal at "/staff/dashboard".
                const serverUser = data?.user || {};
                const userType = serverUser.user_type;
                const isAdminOrManager = serverUser.is_master === true
                    || userType === 'company'
                    || userType === 'admin'
                    || userType === 'manager'
                    || role === 'company'
                    || role === 'manager';

                if (isAdminOrManager) {
                    // Managers land on their first allowed module; AccessGuard is the backstop.
                    const managerDest = isManagerUser(serverUser)
                        ? firstAllowedHrefForUser(serverUser)
                        : null;
                    window.location.href = managerDest || "/";
                } else {
                    window.location.href = "/staff/dashboard";
                }
            }
        } catch (error) {
            const errMsg = error?.response?.data?.message
                || error?.response?.data?.errors?.email?.[0]
                || t('login.errorLoginFailed');
            setMsg(errMsg);
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleInputChange = (e) => {

        const { id, value, type, checked } = e.target;
        setCredentials(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#eef2f8] font-sans antialiased dark:bg-[#050B18]">
            {/* Full-screen animated globe */}
            <LoginScene className="fixed inset-0 z-0 block" isDark={isDark} />

            {/* Soft color halos */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-[#3713ec]/10 blur-[140px] dark:bg-[#3713ec]/25" />
                <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-[150px] dark:bg-emerald-500/15" />
            </div>

            {/* Top bar */}
            <header className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-14">
                <img src="/logo-wide.png" alt="MyTime2Cloud" className="h-11 w-auto object-contain dark:brightness-110" />
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsDark(!isDark)}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        title={isDark ? 'Light mode' : 'Dark mode'}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-800/80"
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <LanguageSwitcher />
                </div>
            </header>

            {/* Main */}
            <main className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-[88rem] flex-col items-center justify-center gap-10 px-6 lg:flex-row lg:gap-8 lg:px-14">

                {/* Left: branding over the globe */}
                <section className="hidden max-w-4xl flex-1 flex-col justify-center lg:flex">
                    <motion.div
                        {...fadeUp(0.05)}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                    >
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        {t('branding.enterpriseIntelligence')}
                    </motion.div>
                    <motion.h1
                        {...fadeUp(0.15)}
                        className="mt-6 max-w-[590px] text-5xl! font-bold! leading-[1.02]! text-slate-900 lg:text-6xl! xl:text-[4.875rem]! dark:text-white"
                    >
                        {t('branding.heroLine1')}<br />{t('branding.heroLine2')} <span className="text-emerald-600 dark:text-emerald-400">{t('branding.heroLine3Highlight')}</span><br />{t('branding.heroLine4')}
                    </motion.h1>
                    <motion.p
                        {...fadeUp(0.25)}
                        className="mt-7 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-300"
                    >
                        {t('branding.heroDescription')}
                    </motion.p>
                    <motion.div {...fadeUp(0.35)} className="mt-10 flex items-center gap-10 text-slate-500 dark:text-slate-400">
                        <div>
                            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('branding.stats.uptimeValue')}</div>
                            <div className="text-xs uppercase tracking-widest">{t('branding.stats.uptimeLabel')}</div>
                        </div>
                        <div className="h-10 w-px bg-slate-300 dark:bg-white/10" />
                        <div>
                            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('branding.stats.liveSyncValue')}</div>
                            <div className="text-xs uppercase tracking-widest">{t('branding.stats.liveSyncLabel')}</div>
                        </div>
                        <div className="h-10 w-px bg-slate-300 dark:bg-white/10" />
                        <div>
                            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('branding.stats.teamsValue')}</div>
                            <div className="text-xs uppercase tracking-widest">{t('branding.stats.teamsLabel')}</div>
                        </div>
                    </motion.div>
                </section>

                {/* Right: login card with 3D mouse-tilt */}
                <section
                    className="w-full max-w-[500px]"
                    style={{ perspective: '1400px' }}
                    onMouseMove={handleCardMove}
                    onMouseLeave={handleCardLeave}
                >
                    <motion.div
                        ref={cardRef}
                        {...fadeUp(0.15)}
                        className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-300/50 sm:p-12 dark:border-white/10 dark:bg-[#0D1626]/70 dark:shadow-2xl dark:shadow-black/40 dark:backdrop-blur-2xl"
                        style={{ transformStyle: 'preserve-3d', transition: 'transform .18s ease-out', willChange: 'transform' }}
                    >
                        {/* Mobile logo */}
                        <div className="mb-7 lg:hidden">
                            <img src="/logo-wide.png" alt="Logo" className="h-8 w-auto" />
                        </div>

                        <h2 className="text-3xl! font-bold text-slate-900 dark:text-white">{t('login.welcomeBack')}</h2>
                        <p className="mt-1.5 text-base text-slate-500 dark:text-slate-400">{t('login.signInSubtitle')}</p>

                        <form className="mt-9 flex flex-col gap-6" onSubmit={handleLogin}>
                            {/* Role Selector */}
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    {t('login.accessLevel')}
                                </label>
                                <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/5 dark:bg-slate-800/50">
                                    {[
                                        { id: 'company', label: t('login.roleAdmin'), icon: LayoutDashboard },
                                        { id: 'manager', label: t('login.roleManager'), icon: Users },
                                        { id: 'employee', label: t('login.roleStaff'), icon: UserCircle }
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setRole(item.id)}
                                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                                                role === item.id
                                                    ? 'bg-[#3713ec] text-[#fff] shadow-lg shadow-[#3713ec]/20'
                                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                            }`}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="mb-1.5 block text-base font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">
                                    {t('login.emailLabel')}
                                </label>
                                <div className="group relative">
                                    <User className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#5b3ff5] dark:text-slate-500" />
                                    <input
                                        id="email"
                                        type="text"
                                        required
                                        value={credentials.email}
                                        onChange={handleInputChange}
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 ps-11 pe-4 text-base text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#3713ec]/50 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 dark:border-white/10 dark:bg-slate-800/40 dark:text-white dark:placeholder:text-slate-500"
                                        placeholder={t('login.emailPlaceholder')}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="mb-1.5 block text-base font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
                                    {t('login.passwordLabel')}
                                </label>
                                <div className="group relative">
                                    <Lock className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#5b3ff5] dark:text-slate-500" />
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={credentials.password}
                                        onChange={handleInputChange}
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 ps-11 pe-12 text-base text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#3713ec]/50 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 dark:border-white/10 dark:bg-slate-800/40 dark:text-white dark:placeholder:text-slate-500"
                                        placeholder={t('login.passwordPlaceholder')}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            {msg && (
                                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                                    {msg}
                                </div>
                            )}

                            {/* Remember / Forgot */}
                            <div className="flex items-center justify-between">
                                <label className="group flex cursor-pointer items-center gap-2">
                                    <input
                                        id="rememberMe"
                                        type="checkbox"
                                        checked={credentials.rememberMe}
                                        onChange={handleInputChange}
                                        className="h-5 w-5 cursor-pointer rounded border-slate-300 bg-white text-[#3713ec] focus:ring-[#3713ec]/20 dark:border-slate-600 dark:bg-slate-800"
                                    />
                                    <span className="select-none text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-300">
                                        {t('login.rememberMe')}
                                    </span>
                                </label>
                                <a href="#" className="text-sm font-semibold text-[#5b3ff5] transition-colors hover:text-[#2c0fb8] dark:hover:text-white">
                                    {t('login.forgotPassword')}
                                </a>
                            </div>

                            {/* Login Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3713ec] text-base font-bold text-[#fff] shadow-lg shadow-[#3713ec]/25 transition-all duration-200 hover:bg-[#2c0fb8] hover:shadow-[#3713ec]/40 active:scale-[0.98] disabled:opacity-70"
                            >
                                {loading ? t('login.signingIn') : t('login.signIn')}
                                {!loading && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />}
                            </button>
                        </form>
                    </motion.div>
                </section>
            </main>
        </div>
    );
};

export default Login;
