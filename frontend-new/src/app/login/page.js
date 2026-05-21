"use client";

import React, { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation'; // Or 'next/navigation' for App Router

import axios from 'axios';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

import {
    RefreshCw,
    User,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ShieldCheck,
    LayoutDashboard,
    Users,
    UserCircle
} from 'lucide-react';

const isBrowser = typeof window !== 'undefined';

const savedEmail = isBrowser ? localStorage.getItem('rememberedEmail') || 'demo@gmail.com' : 'demo@gmail.com';
const savedPassword = isBrowser ? localStorage.getItem('rememberedPassword') || 'demo' : 'demo';
const rememberPref = isBrowser ? localStorage.getItem('rememberMe') === 'true' : false;


// Main Login Component
const Login = () => {

    const router = useRouter(); // Initialize router
    const { t } = useTranslation();

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


    const validateForm = () => {
        // Basic validation
        if (!credentials.email || !credentials.password) {
            setMsg(t('login.errorRequired'));
            return false;
        }
        // Simple email format check
        if (!/.+@.+\..+/.test(credentials.email)) {
            setMsg(t('login.errorInvalidEmail'));
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
                    window.location.href = "/";
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
        <div className="relative min-h-screen w-full font-sans antialiased overflow-hidden">
            {/* Full-screen background */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9quZCvIjVlQL6X_XAulwnuRzVyiwbnVR0FcONLLQ8OVwVYYTVchCvz8Ly60e-BJf_M327SvaKt3bdgrlEdwXWS7oTFRCYoCUjbepAD5azOW3E8sB133d9e34HdlPfTdWUkZxjDc5WlnGdIKz0sHIM-wM1Qz8s0BNVtVaajnOpQIl2ETK0Q4xQDvw26aFuZFHxCIaen3w_tPtd_ZEHru--lGDSO1cc788CnFDRReCpwY3LW7L8kOzxqF7nISMVZMEbxZ8t4pNkqhIa"
                    alt="Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#050B18]/95 via-[#0A1628]/90 to-[#050B18]/95" />
            </div>

            {/* Language switcher */}
            <div className="absolute top-4 end-4 z-20">
                <LanguageSwitcher />
            </div>

            {/* Content */}
            <div className="relative z-10 flex min-h-screen flex-col lg:flex-row items-center justify-center gap-8 lg:gap-10 xl:gap-14 px-6 py-10 lg:px-12 xl:px-16">

                {/* Left: Branding */}
                <div className="hidden lg:flex flex-col flex-1 max-w-xl justify-center">
                    <img
                        src="https://mytime2cloud.com/logo22.png"
                        alt="MyTime Cloud Logo"
                        className="h-14 w-auto object-contain brightness-110 mb-10 self-start"
                    />
                    <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-bold tracking-[0.2em] text-emerald-400 uppercase rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                        {t('branding.enterpriseIntelligence')}
                    </div>
                    <h2 className="text-5xl xl:text-7xl font-extrabold text-white mb-7 leading-[1.05]">
                        {t('branding.heroLine1')}<br />{t('branding.heroLine2')}<br /><span className="text-emerald-400">{t('branding.heroLine3Highlight')}</span><br />{t('branding.heroLine4')}
                    </h2>
                    <p className="text-slate-300 text-xl leading-relaxed">
                        {t('branding.heroDescription')}
                    </p>
                </div>

                {/* Right: Login Card */}
                <div className="w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#0D1626]/80 backdrop-blur-xl p-10 sm:p-12 shadow-2xl shadow-black/30">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8">
                        <img src="https://mytime2cloud.com/logo22.png" alt="Logo" className="h-8 w-auto" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">{t('login.welcomeBack')}</h2>
                    <p className="text-slate-400 text-sm mb-8">{t('login.signInSubtitle')}</p>

                    <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                        {/* Role Selector */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 block">
                                {t('login.accessLevel')}
                            </label>
                            <div className="grid grid-cols-3 p-1 bg-slate-800/50 rounded-xl border border-white/5">
                                {[
                                    { id: 'company', label: t('login.roleAdmin'), icon: LayoutDashboard },
                                    { id: 'manager', label: t('login.roleManager'), icon: Users },
                                    { id: 'employee', label: t('login.roleStaff'), icon: UserCircle }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setRole(item.id)}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                            role === item.id
                                                ? 'bg-[#3713ec] text-white shadow-lg shadow-[#3713ec]/20'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <item.icon className="w-3.5 h-3.5" />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-1.5 block" htmlFor="email">
                                {t('login.emailLabel')}
                            </label>
                            <div className="relative group">
                                <User className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3713ec] transition-colors w-4 h-4" />
                                <input
                                    id="email"
                                    type="text"
                                    required
                                    value={credentials.email}
                                    onChange={handleInputChange}
                                    className="w-full h-11 ps-10 pe-4 bg-slate-800/40 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 focus:border-[#3713ec]/50 transition-all text-sm"
                                    placeholder={t('login.emailPlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-1.5 block" htmlFor="password">
                                {t('login.passwordLabel')}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3713ec] transition-colors w-4 h-4" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={credentials.password}
                                    onChange={handleInputChange}
                                    className="w-full h-11 ps-10 pe-11 bg-slate-800/40 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 focus:border-[#3713ec]/50 transition-all text-sm"
                                    placeholder={t('login.passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {msg && (
                            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                {msg}
                            </div>
                        )}

                        {/* Remember / Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    id="rememberMe"
                                    type="checkbox"
                                    checked={credentials.rememberMe}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#3713ec] focus:ring-[#3713ec]/20 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors select-none">
                                    {t('login.rememberMe')}
                                </span>
                            </label>
                            <a href="#" className="text-xs font-semibold text-[#3713ec] hover:text-[#5b3ff5] transition-colors">
                                {t('login.forgotPassword')}
                            </a>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-[#3713ec] hover:bg-[#2c0fb8] disabled:opacity-70 text-white text-sm font-bold rounded-xl shadow-lg shadow-[#3713ec]/25 hover:shadow-[#3713ec]/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
                        >
                            {loading ? t('login.signingIn') : t('login.signIn')}
                            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 absolute bottom-0 left-0 right-0 px-6 py-4 lg:px-16">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                        {t('footer.copyright')}
                    </span>
                    <div className="flex gap-6">
                        <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">{t('footer.privacy')}</a>
                        <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">{t('footer.terms')}</a>
                        <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">{t('footer.help')}</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Login;