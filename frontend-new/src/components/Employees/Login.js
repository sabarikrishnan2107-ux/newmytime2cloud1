"use client";

import React, { useState, useEffect, useRef } from "react";
import { updateLogin } from "@/lib/api";
import { notify, getStrength, parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";

const Login = ({ employee_id, email }) => {

    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    const validateEmail = (email) => {
        if (!email) { setEmailError(""); return true; }
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        setEmailError(valid ? "" : "Invalid email format");
        return valid;
    };

    const [form, setForm] = useState({
        email: "",
        password: "",
        password_confirmation: "",
    });

    // Reset the field whenever the employee selection changes — admin must
    // explicitly type the employee's login email rather than seeing a
    // pre-filled value (which was coming through as the admin's email).
    useEffect(() => {
        setForm((prev) => ({ ...prev, email: "" }));
    }, [employee_id]);


    // 2. Update state when user actually types
    const handleEmailChange = (e) => {
        setForm((prev) => ({ ...prev, email: e.target.value || "" }));
        validateEmail(e.target.value);
    };

    const handlePasswordChange = (e) => {
        setForm((prev) => ({ ...prev, password: e.target.value || "" }))
    };

    const handlePasswordConfirmationChange = (e) => {
        setForm((prev) => ({ ...prev, password_confirmation: e.target.value || "" }))
    };

    // Derive strength for the UI
    const strength = getStrength(form.password);

    const onSubmit = async () => {
        if (form.email && !validateEmail(form.email)) {
            notify("Error", "Please enter a valid email address", "error");
            return;
        }

        // Decide whether the password is acceptable to save.
        // If not, we still save the email — only the password is skipped.
        let passwordIsValid = false;
        let passwordWarning = "";
        if (form.password) {
            if (form.password !== form.password_confirmation) {
                passwordWarning = "Passwords do not match — email saved, password NOT changed";
            } else if (strength.score < 2) {
                passwordWarning = "Password too weak — email saved, password NOT changed";
            } else {
                passwordIsValid = true;
            }
        }

        setLoading(true);

        try {
            const finalPayload = { email: form.email };
            if (passwordIsValid) finalPayload.password = form.password;

            await updateLogin(finalPayload, employee_id);

            if (passwordWarning) {
                notify("Warning", passwordWarning, "warning");
            } else {
                notify("Success", "Login details saved", "success");
            }
        } catch (error) {
            notify("Error", parseApiError(error), "error");
        } finally {
            setLoading(false);
        }
    };


    return (
        <section
            className="glass-card bg-card-light dark:bg-card-dark border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 md:p-8 relative overflow-hidden scroll-mt-28"
            id="security"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <span className="material-icons text-8xl text-slate-400">lock</span>
            </div>

            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <span className="material-icons text-primary bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">security</span>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                    Security & Credentials
                </h3>
            </div>

            <div className="space-y-6 max-w-2xl">
                {/* Email Field */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Account Email</label>
                    <Input
                        type="email"
                        autoComplete="off"
                        name="account-email-field"
                        value={form.email}
                        onChange={handleEmailChange}
                        placeholder="email@company.com"
                        className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}
                    />
                    {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">Update Password</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                            <Input
                                placeholder="••••••••"
                                type="password"
                                autoComplete="new-password"
                                name="new-account-password"
                                value={form.password}
                                onChange={handlePasswordChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                            <Input
                                placeholder="••••••••"
                                type="password"
                                autoComplete="new-password"
                                name="confirm-account-password"
                                value={form.password_confirmation}
                                onChange={handlePasswordConfirmationChange}
                            />
                        </div>
                    </div>

                    {/* Password Strength and Validation Messaging */}
                    {form.password && (
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.text}`}>
                                    Security: {strength.label}
                                </span>
                                {form.password !== form.password_confirmation && form.password_confirmation !== "" && (
                                    <span className="text-[10px] text-red-500 font-bold uppercase">Passwords don't match</span>
                                )}
                            </div>

                            <div className="flex items-center space-x-2">
                                <div className={`h-1.5 w-16 rounded-full transition-all ${strength.score >= 1 ? 'bg-red-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                <div className={`h-1.5 w-16 rounded-full transition-all ${strength.score >= 2 ? 'bg-orange-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                <div className={`h-1.5 w-16 rounded-full transition-all ${strength.score >= 3 ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={onSubmit}
                    className="px-4 py-2 bg-primary hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2 
             disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none transition-all"
                >
                    {loading ? 'Submitting...' : 'Submit'}
                </button>
            </div>
        </section>
    );
};

export default Login;