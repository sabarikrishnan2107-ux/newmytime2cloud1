"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import DropDown from "@/components/ui/DropDown";
import {
    createHost,
    updateHost,
    getHostEmployees,
    getBranches,
    getVisitorZones,
} from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const HostModal = ({ open, onClose, onSaved, host = null }) => {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [zones, setZones] = useState([]);
    const [employeeId, setEmployeeId] = useState("");
    const [branchId, setBranchId] = useState("");
    const [zoneId, setZoneId] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const [emps, brs, zns] = await Promise.all([
                    getHostEmployees(),
                    getBranches(),
                    getVisitorZones(),
                ]);
                setEmployees(emps || []);
                setBranches(brs || []);
                setZones(zns || []);
            } catch (e) {
                notify(t("visitor.hostModal.errorTitle"), parseApiError(e), "error");
            }
        })();

        if (host) {
            setEmployeeId(host.employee_id || "");
            setBranchId(host.branch_id || "");
            setZoneId(host.zone_id || "");
            setNotes(host.notes || "");
        } else {
            setEmployeeId("");
            setBranchId("");
            setZoneId("");
            setNotes("");
        }
    }, [open, host]);

    if (!open) return null;

    const empItems = employees.map((e) => ({
        id: e.id,
        name:
            `${e.first_name || ""} ${e.last_name || ""}`.trim() +
            (e.employee_id ? ` (${e.employee_id})` : ""),
    }));
    const branchItems = branches.map((b) => ({ id: b.id, name: b.name }));
    const zoneItems = zones.map((z) => ({ id: z.id, name: z.name }));

    const onSave = async () => {
        if (!employeeId) return notify(t("visitor.hostModal.validationTitle"), t("visitor.hostModal.validation"), "error");

        setSaving(true);
        try {
            const payload = {
                employee_id: employeeId,
                branch_id: branchId || null,
                zone_id: zoneId || null,
                notes: notes || null,
            };
            const result = host?.id
                ? await updateHost(host.id, payload)
                : await createHost(payload);
            notify(t("visitor.hostModal.savedTitle"), host?.id ? t("visitor.hostModal.hostUpdated") : t("visitor.hostModal.hostAdded"), "success");
            onSaved && onSaved(result);
            onClose && onClose();
        } catch (e) {
            notify(t("visitor.hostModal.errorTitle"), parseApiError(e), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold">
                        {host?.id ? t("visitor.hostModal.editHost") : t("visitor.hosts.addHost")}
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            {t("visitor.common.employee")}
                        </label>
                        <DropDown
                            width="w-full"
                            items={empItems}
                            value={employeeId}
                            onChange={(id) => setEmployeeId(id || "")}
                            placeholder={t("visitor.hostModal.selectEmployee")}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t("visitor.reports.branch")}
                            </label>
                            <DropDown
                                width="w-full"
                                items={branchItems}
                                value={branchId}
                                onChange={(id) => setBranchId(id || "")}
                                placeholder={t("visitor.hostModal.optional")}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t("visitor.dash.zone")}
                            </label>
                            <DropDown
                                width="w-full"
                                items={zoneItems}
                                value={zoneId}
                                onChange={(id) => setZoneId(id || "")}
                                placeholder={t("visitor.hostModal.optional")}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            {t("visitor.hostModal.notes")}
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("visitor.hostModal.optionalContext")}
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                    >
                        {t("visitor.common.cancel")}
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-700 text-white font-bold text-sm shadow-md disabled:opacity-50"
                    >
                        {saving ? t("visitor.common.saving") : host?.id ? t("visitor.hostModal.updateHost") : t("visitor.hosts.addHost")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HostModal;
