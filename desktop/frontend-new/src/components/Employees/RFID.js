"use client";

import { updateAccessSettings } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";

const RFID = ({
    id,
    rfid_card_number = "",
    rfid_card_password = "",
}) => {


    const [loading, setLoading] = useState(false);

    const [cardNumber, setCardNumber] = useState(rfid_card_number || "");
    const [password, setPassword] = useState(rfid_card_password || "");
    const [showPassword, setShowPassword] = useState(false);

    // Sync with props when payload updates
    useEffect(() => {
        setCardNumber(rfid_card_number || "");
    }, [rfid_card_number]);
    useEffect(() => {
        setPassword(rfid_card_password || "");
    }, [rfid_card_password]);

    // 2. Update state when user actually types
    const handleCardChange = (e) => {
        setCardNumber(e.target.value);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    const onSubmit = async () => {

        setLoading(true);

        try {
            await updateAccessSettings({
                rfid_card_number: cardNumber,
                rfid_card_password: password
            }, id);
            notify(`Success`, "Record Updated", 'success');
        } catch (error) {
            notify(`Error`, parseApiError(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <section
            className="glass-card bg-card-light dark:bg-card-dark border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 md:p-8 scroll-mt-28"
            id="hardware"
        >
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <span className="material-icons text-primary bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">
                    badge
                </span>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                    Hardware Access
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* RFID Card Number */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        RFID Card Number
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-icons text-slate-400 text-lg">nfc</span>
                        </div>
                        <input
                            className="focus:ring-2 focus:ring-primary/20 focus:border-primary/50 block w-full pl-10 sm:text-sm dark:border-white/10 dark:text-slate-300 dark:placeholder:text-slate-600 rounded-lg bg-white/50 dark:bg-slate-900 py-2.5 text-slate-900 dark:text-white tracking-widest"
                            placeholder="XXXX-XXXX-XXXX"
                            type="text"
                            value={cardNumber}
                            onChange={handleCardChange}
                        />
                    </div>
                </div>

                {/* Door Access PIN */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Door Access PIN
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-icons text-slate-400 text-lg">dialpad</span>
                        </div>
                        <input
                            className="focus:ring-2 focus:ring-primary/20 focus:border-primary/50 block w-full pl-10 sm:text-sm dark:border-white/10 dark:text-slate-300 dark:placeholder:text-slate-600 rounded-lg bg-white/50 dark:bg-slate-900 py-2.5 text-slate-900 dark:text-white tracking-widest"
                            placeholder="****"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={handlePasswordChange}
                        />
                        <button
                            onClick={toggleVisibility}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            type="button"
                        >
                            <span className="material-icons text-lg">
                                {showPassword ? "visibility" : "visibility_off"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <button onClick={onSubmit}
                className="px-4 py-2 mt-5 bg-primary hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2 
             disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none transition-all"
            >
                {loading ? 'Submitting...' : 'Submit'}
            </button>
        </section>
    );
};

export default RFID;