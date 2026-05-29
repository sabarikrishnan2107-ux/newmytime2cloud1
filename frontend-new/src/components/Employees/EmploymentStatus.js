"use client";

import { useEffect, useState } from "react";
import DropDown from "@/components/ui/DropDown";
import DatePicker from "@/components/ui/DatePicker";
import { updateAccessSettings } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

const REASONS = [
    { id: "suspended", name: "Suspended" },
    { id: "terminated", name: "Terminated" },
    { id: "resigned", name: "Resigned" },
    { id: "long_leave", name: "Long Leave" },
    { id: "training", name: "Training" },
    { id: "transfer_out", name: "Transfer Out" },
    { id: "other", name: "Other" },
];

const formatDate = (d) => {
    if (!d) return "";
    const date = typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
    return date;
};

const EmploymentStatus = ({
    id,
    is_active = true,
    inactive_reason_type = null,
    inactive_reason_note = null,
    inactive_from = null,
    inactive_to = null,
    rfid_card_number = "",
    rfid_card_password = "",
}) => {
    const [isActive, setIsActive] = useState(is_active !== false);
    const [reason, setReason] = useState(inactive_reason_type || "");
    const [note, setNote] = useState(inactive_reason_note || "");
    const [fromDate, setFromDate] = useState(formatDate(inactive_from) || formatDate(new Date()));
    const [toDate, setToDate] = useState(formatDate(inactive_to));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setIsActive(is_active !== false);
        setReason(inactive_reason_type || "");
        setNote(inactive_reason_note || "");
        setFromDate(formatDate(inactive_from) || formatDate(new Date()));
        setToDate(formatDate(inactive_to));
    }, [is_active, inactive_reason_type, inactive_reason_note, inactive_from, inactive_to]);

    const noteRequired = reason === "other";

    const onSubmit = async () => {
        if (!isActive) {
            if (!reason) {
                notify("Validation", "Reason is required.", "error");
                return;
            }
            if (noteRequired && !note.trim()) {
                notify("Validation", "Note is required when reason is Other.", "error");
                return;
            }
            if (!fromDate) {
                notify("Validation", "From date is required.", "error");
                return;
            }
            if (toDate && toDate < fromDate) {
                notify("Validation", "To date must be on or after From date.", "error");
                return;
            }
        }

        setLoading(true);
        try {
            await updateAccessSettings({
                rfid_card_number: rfid_card_number || null,
                rfid_card_password: rfid_card_password || null,
                is_active: isActive,
                inactive_reason_type: isActive ? null : reason,
                inactive_reason_note: isActive ? null : (note || null),
                inactive_from: isActive ? null : fromDate,
                inactive_to: isActive ? null : (toDate || null),
            }, id);
            notify("Success", "Employment status updated.", "success");
        } catch (error) {
            notify("Error", parseApiError(error), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            className="glass-card bg-card-light dark:bg-card-dark border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 md:p-8 scroll-mt-28"
            id="employment-status"
        >
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <span className={`material-icons p-2 rounded-lg ${isActive ? "text-primary bg-indigo-50 dark:bg-indigo-900/30" : "text-red-500 bg-red-50 dark:bg-red-900/30"}`}>
                    {isActive ? "verified_user" : "block"}
                </span>
                <div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                        Employment Status
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Controls device access and report visibility.</p>
                </div>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-6">
                <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`px-5 py-2 text-sm font-bold rounded-lg transition ${isActive ? "bg-primary text-white shadow-sm" : "text-slate-600 dark:text-slate-300"}`}
                >
                    Active
                </button>
                <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`px-5 py-2 text-sm font-bold rounded-lg transition ${!isActive ? "bg-red-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300"}`}
                >
                    Non-Active
                </button>
            </div>

            {!isActive && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Reason
                        </label>
                        <DropDown
                            items={REASONS}
                            value={REASONS.find((r) => r.id === reason)?.name || ""}
                            onChange={(name) => {
                                const match = REASONS.find((r) => r.name === name);
                                setReason(match?.id || "");
                            }}
                            width="w-full"
                            placeholder="Select a reason"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Note {noteRequired && <span className="text-red-500 text-xs">(required)</span>}
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={noteRequired ? "Describe the reason" : "Optional context"}
                            className="focus:ring-2 focus:ring-primary/20 focus:border-primary/50 block w-full sm:text-sm dark:border-white/10 dark:text-slate-300 dark:placeholder:text-slate-600 rounded-lg bg-white/50 dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-white resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            From Date
                        </label>
                        <DatePicker
                            value={fromDate}
                            onChange={(d) => setFromDate(d)}
                            placeholder="Start date"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            To Date
                        </label>
                        <DatePicker
                            value={toDate}
                            onChange={(d) => setToDate(d || "")}
                            placeholder="Optional — leave blank for indefinite"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Leave blank for indefinite (e.g. termination).
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs mb-4">
                <span className="material-icons text-base mt-0.5 shrink-0">warning</span>
                <span>Non-active employees cannot punch on devices and appear as <b>Non-Active</b> with the reason on daily, weekly and monthly reports.</span>
            </div>

            <button
                onClick={onSubmit}
                disabled={loading}
                className="px-4 py-2 mt-2 bg-primary hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none transition-all"
            >
                {loading ? "Saving..." : "Save"}
            </button>
        </section>
    );
};

export default EmploymentStatus;
