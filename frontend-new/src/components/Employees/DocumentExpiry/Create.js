// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { notify, parseApiError } from "@/lib/utils";
import DropDown from "@/components/ui/DropDown";
import { getBranches } from "@/lib/api";
import Input from "@/components/Theme/Input";
import TimePicker from "@/components/ui/TimePicker";
import { storeReportNotification } from "@/lib/endpoint/automation";
import { getUser } from "@/config";

async function updateDeviceNotification(id, payload) {
    return { data: { status: true, message: "Updated" } };
}

const DayCircle = ({ active, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={[
            "h-8 w-8 rounded-full flex items-center justify-center text-xs shadow-sm transition-colors",
            active
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-200",
        ].join(" ")}
        title={label}
    >
        {label.charAt(0)}
    </button>
);

const ChipToggle = ({ active, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={[
            "px-3 py-2 rounded-xl text-sm font-semibold border transition-all",
            active
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10",
        ].join(" ")}
    >
        {label}
    </button>
);

export default function DeviceDialog({
    editItemPayload = null,
    onSaved = () => { },
    triggerLabel = "Add",
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const [error, setError] = useState(null);

    const daysList = useMemo(
        () => [
            { id: "1", name: "M" },
            { id: "2", name: "T" },
            { id: "3", name: "W" },
            { id: "4", name: "Th" },
            { id: "5", name: "F" },
            { id: "6", name: "Sa" },
            { id: "0", name: "Su" },
        ],
        []
    );

    const defaultForm = useMemo(
        () => ({
            branch_id: "",
            subject: "Your Subject here",
            time: "09:00",
            days: ["1"],
            mediums: ["Email", "Whatsapp"],
            managers: [
                { name: "", email: "", whatsapp_number: "" },
                { name: "", email: "", whatsapp_number: "" },
                { name: "", email: "", whatsapp_number: "" },
            ],
        }),
        []
    );

    const [form, setForm] = useState(defaultForm);

    const toggleModal = () => {
        if (loading) return;
        setOpen((v) => !v);
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && toggleModal();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, loading]);

    useEffect(() => {
        if (!open) return;

        (async () => {
            try {
                setError(null);
                setBranches((await getBranches()) || []);
            } catch (e) {
                setError(parseApiError ? parseApiError(e) : String(e));
            }
        })();

        if (editItemPayload?.id) {
            setForm({
                ...defaultForm,
                branch_id: editItemPayload?.branch_id || "",
                subject: editItemPayload?.subject || "Your Subject here",
                time: editItemPayload?.time || "09:00",
                days: editItemPayload?.days || ["1"],
                mediums: editItemPayload?.mediums || ["Email", "Whatsapp"],
                managers: [
                    {
                        name: editItemPayload?.managers?.[0]?.name || "",
                        email: editItemPayload?.managers?.[0]?.email || "",
                        whatsapp_number: editItemPayload?.managers?.[0]?.whatsapp_number || "",
                    },
                    {
                        name: editItemPayload?.managers?.[1]?.name || "",
                        email: editItemPayload?.managers?.[1]?.email || "",
                        whatsapp_number: editItemPayload?.managers?.[1]?.whatsapp_number || "",
                    },
                    {
                        name: editItemPayload?.managers?.[2]?.name || "",
                        email: editItemPayload?.managers?.[2]?.email || "",
                        whatsapp_number: editItemPayload?.managers?.[2]?.whatsapp_number || "",
                    },
                ],
            });
        } else {
            setForm(defaultForm);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    const toggleDay = (id) => {
        setForm((p) => ({
            ...p,
            days: p.days.includes(id) ? p.days.filter((d) => d !== id) : [...p.days, id],
        }));
    };

    const toggleMedium = (m) => {
        setForm((p) => ({
            ...p,
            mediums: p.mediums.includes(m) ? p.mediums.filter((x) => x !== m) : [...p.mediums, m],
        }));
    };

    const setManagerField = (index, key, value) => {
        setForm((p) => {
            const next = [...p.managers];
            next[index] = { ...next[index], [key]: value };
            return { ...p, managers: next };
        });
    };

    const onSubmit = async () => {

        setLoading(true);

        const user = await getUser();

        try {
            const payload = {
                company_id: user.company_id,
                type: "device",
                branch_id: form.branch_id || null,
                subject: form.subject,
                time: form.time,
                days: form.days,
                mediums: form.mediums,
                managers: form.managers.map(e => ({ ...e, company_id: user.company_id, branch_id: form.branch_id })).filter((m) => m.name || m.email || m.whatsapp_number),
                frequency: "Daily",
            };

            console.log(payload);

            const data = editItemPayload?.id
                ? await updateDeviceNotification(editItemPayload.id, payload)
                : await storeReportNotification(payload);

            if (data?.status === false) {
                const firstKey = Object.keys(data.errors || {})[0];
                const firstError =
                    data.errors?.[firstKey]?.[0] || data.message || "Validation error";
                notify ? notify("Error", firstError, "error") : alert(firstError);
                return;
            }

            notify ? notify("Success", data?.message || "Saved", "success") : alert("Saved");
            setOpen(false);
            onSaved?.(data);
        } catch (e) {
            const err = parseApiError ? parseApiError(e) : String(e);
            notify ? notify("Error", err, "error") : alert(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
            >
                <span className="material-symbols-outlined text-[18px]">add</span>
                {triggerLabel}
            </button>

            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={toggleModal}
                    />

                    {/* ✅ Responsive width (NOT full width) */}
                    <div
                        className={[
                            "relative w-[92vw] sm:w-[90vw] lg:w-[980px] xl:w-[1100px] 2xl:w-[1200px]",
                            "max-h-[calc(100vh-96px)] overflow-hidden",
                            "bg-white dark:bg-slate-800 rounded-2xl shadow-2xl",
                            "border border-gray-100 dark:border-white/10",
                            "transform transition-all animate-in fade-in zoom-in duration-200",
                            "flex flex-col",
                        ].join(" ")}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
                                    {editItemPayload?.id ? "Edit Device Automation" : "Add Device Automation"}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Create notification rule for device events
                                </p>
                                {error ? <p className="mt-2 text-xs text-red-500">{String(error)}</p> : null}
                            </div>

                            <button
                                onClick={toggleModal}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                                aria-label="Close"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-surface-variant/30 dark:bg-black/20">
                            <div className="flex flex-col gap-6">
                                <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-gray-600 dark:text-white">
                                            Rule Configuration
                                        </h2>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">
                                                Branch
                                            </label>

                                            <DropDown value={form.branch_id} items={branches} onChange={(e) => setField("branch_id", e)} />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">
                                                Subject
                                            </label>
                                            <Input
                                                value={form.subject}
                                                onChange={(e) => setField("subject", e.target.value)}
                                                placeholder="E.g. Notify Managers about today's device events"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">
                                                Time
                                            </label>

                                            <TimePicker inputClassName="h-11" defaultValue={form.time} onChange={(e) => setField("time", e)} />
                                        </div>
                                    </div>

                                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">
                                                Medium
                                            </label>
                                            <div className="flex flex-wrap gap-3">
                                                <ChipToggle
                                                    label="Email"
                                                    active={form.mediums.includes("Email")}
                                                    onClick={() => toggleMedium("Email")}
                                                />
                                                <ChipToggle
                                                    label="Whatsapp"
                                                    active={form.mediums.includes("Whatsapp")}
                                                    onClick={() => toggleMedium("Whatsapp")}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">
                                                Days
                                            </label>
                                            <div className="flex gap-2">
                                                {daysList.map((d) => (
                                                    <DayCircle
                                                        key={d.id}
                                                        label={d.name}
                                                        active={form.days.includes(d.id)}
                                                        onClick={() => toggleDay(d.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-gray-600 dark:text-white">
                                            Managers
                                        </h2>
                                        <p className="text-xs text-slate-400">Up to 3 recipients</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4"
                                            >
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                                                    Manager {i + 1}
                                                </div>

                                                <div className="space-y-3">
                                                    <input
                                                        value={form.managers[i].name}
                                                        onChange={(e) => setManagerField(i, "name", e.target.value)}
                                                        placeholder="Name"
                                                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                    <input
                                                        value={form.managers[i].email}
                                                        onChange={(e) => setManagerField(i, "email", e.target.value)}
                                                        placeholder="Email"
                                                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                    <input
                                                        value={form.managers[i].whatsapp_number}
                                                        onChange={(e) =>
                                                            setManagerField(i, "whatsapp_number", e.target.value)
                                                        }
                                                        placeholder="Whatsapp Number"
                                                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={toggleModal}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-white hover:bg-background-dark transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? "Saving..." : editItemPayload?.id ? "Update" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}