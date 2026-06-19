"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
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

const todayStr = () => new Date().toISOString().slice(0, 10);

const EmploymentStatusModal = ({
    open,
    onClose,
    onSaved,
    employeeId,
    initial = {},
}) => {
    const [reason, setReason] = useState(initial.inactive_reason_type || "");
    const [note, setNote] = useState(initial.inactive_reason_note || "");
    const [fromDate, setFromDate] = useState(initial.inactive_from || todayStr());
    const [toDate, setToDate] = useState(initial.inactive_to || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setReason(initial.inactive_reason_type || "");
            setNote(initial.inactive_reason_note || "");
            setFromDate(initial.inactive_from || todayStr());
            setToDate(initial.inactive_to || "");
        }
    }, [open]);

    if (!open) return null;

    const noteRequired = reason === "other";

    const onConfirm = async () => {
        if (!reason) return notify("Validation", "Reason is required.", "error");
        if (noteRequired && !note.trim()) return notify("Validation", "Note is required when reason is Other.", "error");
        if (!fromDate) return notify("Validation", "From date is required.", "error");
        if (toDate && toDate < fromDate) return notify("Validation", "To date must be on or after From date.", "error");

        setSaving(true);
        try {
            await updateAccessSettings({
                is_active: false,
                inactive_reason_type: reason,
                inactive_reason_note: note || null,
                inactive_from: fromDate,
                inactive_to: toDate || null,
            }, employeeId);
            notify("Saved", "Employee marked as Non-Active.", "success");
            onSaved && onSaved({
                is_active: false,
                inactive_reason_type: reason,
                inactive_reason_note: note || null,
                inactive_from: fromDate,
                inactive_to: toDate || null,
            });
            onClose && onClose();
        } catch (error) {
            notify("Error", parseApiError(error), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="text-slate-900 dark:text-white text-lg font-bold">
                                Mark as Non-Active
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Employee will be blocked from device punches.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Reason
                        </label>
                        <DropDown
                            width="w-full"
                            items={REASONS}
                            value={reason}
                            onChange={(id) => setReason(id || "")}
                            placeholder="Select a reason"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Note {noteRequired && <span className="text-red-500 text-xs">(required)</span>}
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={noteRequired ? "Describe the reason" : "Optional context"}
                            className="focus:ring-2 focus:ring-primary/20 focus:border-primary/50 block w-full sm:text-sm dark:border-white/10 dark:text-slate-300 dark:placeholder:text-slate-600 rounded-lg bg-white/50 dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-white resize-none border border-slate-200"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                From Date
                            </label>
                            <DatePicker value={fromDate} onChange={(d) => setFromDate(d)} placeholder="Start date" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                To Date
                            </label>
                            <DatePicker value={toDate} onChange={(d) => setToDate(d || "")} placeholder="Optional" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Leave blank for indefinite (e.g. termination).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>
                            Non-active employees cannot punch on devices and appear as <b>Non-Active</b> with the reason on daily, weekly and monthly reports.
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Confirm Non-Active"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmploymentStatusModal;
