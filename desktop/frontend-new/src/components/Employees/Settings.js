"use client";

import React, { useEffect, useRef, useState } from "react";
import { updateGeneralSettings } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

const Settings = ({ id, user_id, status, web_login_access, mobile_app_login_access, tracking_status, mobile_punch, onMobileAccessChange }) => {
    // 1. Refs for Lifecycle Management
    const isInitialMount = useRef(true);
    const isUpdating = useRef(false);

    const [loading, setLoading] = useState(false);

    // 2. Local State — initialized from props, kept in sync when props change
    const [employeeStatus, setEmployeeStatus] = useState(!!status);
    const [webAccess, setWebAccess] = useState(!!web_login_access);
    const [mobileAccess, setMobileAccess] = useState(!!mobile_app_login_access);
    const [location, setLocation] = useState(!!tracking_status);
    const [mobilePunch, setMobilePunch] = useState(!!mobile_punch);

    // Sync local state whenever the employee's user record finishes loading
    // (payload.user is async — initial render often has undefined values).
    useEffect(() => {
        setEmployeeStatus(!!status);
    }, [status]);
    useEffect(() => {
        setWebAccess(!!web_login_access);
    }, [web_login_access]);
    useEffect(() => {
        setMobileAccess(!!mobile_app_login_access);
    }, [mobile_app_login_access]);
    useEffect(() => {
        setLocation(!!tracking_status);
    }, [tracking_status]);
    useEffect(() => {
        setMobilePunch(!!mobile_punch);
    }, [mobile_punch]);

    // Styling Classes
    const toggleTrackClass = "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300";
    const toggleKnobClass = "absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 ease-in-out left-0 z-10";

    const onSubmit = async () => {
        // Guard against concurrent overlapping requests
        if (isUpdating.current) return;

        try {
            const payload = {};

            if (employeeStatus !== status) payload.status = employeeStatus;
            payload.web_login_access = webAccess ? 1 : 0;
            payload.mobile_app_login_access = mobileAccess ? 1 : 0;
            payload.tracking_status = location ? 1 : 0;
            payload.mobile_punch = mobilePunch ? 1 : 0;
            payload.id = id;

            // If no fields actually changed, don't ping the server
            if (Object.keys(payload).length === 0) return;

            setLoading(true);

            isUpdating.current = true;

            await updateGeneralSettings(payload, user_id || id);
            notify(`Success`, "Settings updated successfully", 'success');
        } catch (error) {
            notify(`Error`, parseApiError(error), 'error');
        } finally {
            isUpdating.current = false;
            setLoading(false);
            }
    };

    return (
        <div className="w-full">
            <section
                className="glass-card bg-card-light dark:bg-card-dark border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 md:p-8 scroll-mt-28"
                id="general"
            >
                <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <span className="material-icons text-primary bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">
                        tune
                    </span>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                        General Preferences
                    </h3>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 pt-4">

                        {/* 1. Employee Status */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">Employee Status</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">Active account status</span>
                            </div>
                            <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <input
                                    type="checkbox"
                                    id="toggle-status"
                                    checked={employeeStatus}
                                    onChange={() => setEmployeeStatus(prev => !prev)}
                                    className={`${toggleKnobClass} ${employeeStatus ? 'translate-x-6 border-blue-600' : 'border-gray-300'}`}
                                />
                                <label
                                    htmlFor="toggle-status"
                                    className={`${toggleTrackClass} ${employeeStatus ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                                />
                            </div>
                        </div>

                        {/* 2. Location Tracking */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">Location Tracking</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">GPS tracking for mobile punch-in</span>
                            </div>
                            <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <input
                                    type="checkbox"
                                    id="toggle-location"
                                    checked={location}
                                    onChange={() => setLocation(prev => !prev)}
                                    className={`${toggleKnobClass} ${location ? 'translate-x-6 border-blue-600' : 'border-gray-300'}`}
                                />
                                <label
                                    htmlFor="toggle-location"
                                    className={`${toggleTrackClass} ${location ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                                />
                            </div>
                        </div>

                        {/* 3. Web Login Access */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">Web Login Access</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">Allow browser dashboard access</span>
                            </div>
                            <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <input
                                    type="checkbox"
                                    id="toggle-web"
                                    checked={webAccess}
                                    onChange={() => setWebAccess(prev => !prev)}
                                    className={`${toggleKnobClass} ${webAccess ? 'translate-x-6 border-blue-600' : 'border-gray-300'}`}
                                />
                                <label
                                    htmlFor="toggle-web"
                                    className={`${toggleTrackClass} ${webAccess ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                                />
                            </div>
                        </div>

                        {/* 4. Mobile App Login Access */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">Mobile App Login Access</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">Allow iOS/Android app access</span>
                            </div>
                            <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <input
                                    type="checkbox"
                                    id="toggle-mobile"
                                    checked={mobileAccess}
                                    onChange={() => { setMobileAccess(prev => { const next = !prev; onMobileAccessChange?.(next); return next; }); }}
                                    className={`${toggleKnobClass} ${mobileAccess ? 'translate-x-6 border-blue-600' : 'border-gray-300'}`}
                                />
                                <label
                                    htmlFor="toggle-mobile"
                                    className={`${toggleTrackClass} ${mobileAccess ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">Clock In/Out Permission</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">Set the permission for click in/out for iOS/Android app access</span>
                            </div>
                            <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <input
                                    type="checkbox"
                                    id="toggle-mobile-punch"
                                    checked={mobilePunch}
                                    onChange={() => setMobilePunch(prev => !prev)}
                                    className={`${toggleKnobClass} ${mobilePunch ? 'translate-x-6 border-blue-600' : 'border-gray-300'}`}
                                />
                                <label
                                    htmlFor="toggle-mobile-punch"
                                    className={`${toggleTrackClass} ${mobilePunch ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                                />
                            </div>
                        </div>
                      
                    </div>
                      <button onClick={onSubmit}
                            className="px-4 py-2 mt-5 bg-primary hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2 
             disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none transition-all"
                        >
                            {loading ? 'Submitting...' : 'Submit'}
                        </button>
                </div>
            </section>
        </div>
    );
};

export default Settings;