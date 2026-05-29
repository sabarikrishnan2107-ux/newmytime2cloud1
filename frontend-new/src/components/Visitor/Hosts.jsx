"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, UserCheck, Search } from "lucide-react";
import { getHosts, deleteHost } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import HostModal from "./HostModal";

const fullName = (e) =>
    [(e?.first_name || ""), (e?.last_name || "")].filter(Boolean).join(" ").trim() ||
    "Employee removed";

const Hosts = () => {
    const [hosts, setHosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchHosts = async () => {
        setLoading(true);
        try {
            const data = await getHosts();
            setHosts(Array.isArray(data) ? data : []);
        } catch (e) {
            notify("Error", parseApiError(e), "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHosts();
    }, []);

    const onAdd = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const onEdit = (host) => {
        setEditing(host);
        setModalOpen(true);
    };

    const onDelete = async (host) => {
        const name = fullName(host.employee);
        if (!window.confirm(`Remove "${name}" from the host list?`)) return;
        try {
            await deleteHost(host.id);
            notify("Removed", "Host removed.", "success");
            fetchHosts();
        } catch (e) {
            notify("Error", parseApiError(e), "error");
        }
    };

    const filtered = hosts.filter((h) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const name = fullName(h.employee).toLowerCase();
        const eid = String(h.employee?.employee_id || "").toLowerCase();
        return name.includes(q) || eid.includes(q);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hosts</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Designated employees who receive visitors.
                    </p>
                </div>
                <button
                    onClick={onAdd}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                >
                    <Plus size={16} /> Add Host
                </button>
            </div>

            <div className="relative max-w-md">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or employee ID"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                />
            </div>

            {loading ? (
                <p className="text-sm text-slate-500">Loading hosts...</p>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                    <div className="inline-flex w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-primary items-center justify-center mb-3">
                        <UserCheck size={20} />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {search
                            ? "No hosts match your search."
                            : "No hosts yet — add the first one."}
                    </p>
                    {!search && (
                        <button
                            onClick={onAdd}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-700 text-white text-sm font-bold rounded-lg"
                        >
                            <Plus size={14} /> Add Host
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((host) => {
                        const name = fullName(host.employee);
                        const initial = (host.employee?.first_name || "?")
                            .charAt(0)
                            .toUpperCase();
                        return (
                            <div
                                key={host.id}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-primary font-bold flex items-center justify-center shrink-0">
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">
                                            {name}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {host.employee?.employee_id
                                                ? `ID ${host.employee.employee_id}`
                                                : "—"}
                                            {host.employee?.department?.name
                                                ? ` · ${host.employee.department.name}`
                                                : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px]">
                                    {host.branch?.name && (
                                        <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {host.branch.name}
                                        </span>
                                    )}
                                    {host.zone?.name && (
                                        <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                            {host.zone.name}
                                        </span>
                                    )}
                                </div>
                                {host.notes && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {host.notes}
                                    </p>
                                )}
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => onEdit(host)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                    >
                                        <Pencil size={13} /> Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(host)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    >
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <HostModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchHosts}
                host={editing}
            />
        </div>
    );
};

export default Hosts;
