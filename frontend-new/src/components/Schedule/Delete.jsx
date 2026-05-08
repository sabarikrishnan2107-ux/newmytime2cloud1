// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
    getBranches,
    getDepartmentsByBranchIds,
    getScheduledEmployeeList,
    removeEmployeeSchedule,
} from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

import Input from "../Theme/Input";
import MultiDropDown from "../ui/MultiDropDown";
import DropDown from "../ui/DropDown";
import { Checkbox } from "../ui/checkbox";
import ProfilePicture from "../ProfilePicture";

const Delete = ({ onSuccess = () => {} }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [scheduleFilter, setScheduleFilter] = useState("all"); // "all" | "scheduled" | "unscheduled"

    const filteredEmployees = useMemo(() => {
        let list = employees;
        if (searchTerm) {
            const t = searchTerm.toLowerCase();
            list = list.filter((e) =>
                (e.name || "").toLowerCase().includes(t) ||
                String(e.employee_id || "").toLowerCase().includes(t)
            );
        }
        if (scheduleFilter === "scheduled") {
            list = list.filter((e) => Array.isArray(e.schedule) && e.schedule.length > 0);
        } else if (scheduleFilter === "unscheduled") {
            list = list.filter((e) => !Array.isArray(e.schedule) || e.schedule.length === 0);
        }
        return list;
    }, [employees, searchTerm, scheduleFilter]);

    const toggleModal = () => setOpen((v) => !v);

    useEffect(() => {
        if (!open) return;
        setSelectedBranchIds([]);
        setSelectedDepartmentIds([]);
        setSearchTerm("");
        setSelectedIds([]);
        setEmployees([]);
        setScheduleFilter("all");
        (async () => {
            try {
                setBranches(await getBranches());
            } catch (error) {
                notify("Error", parseApiError(error), "error");
            }
        })();
    }, [open]);

    useEffect(() => {
        (async () => {
            try {
                setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
            } catch (error) {
                notify("Error", parseApiError(error), "error");
            }
        })();
    }, [selectedBranchIds]);

    useEffect(() => {
        (async () => {
            try {
                const emp = await getScheduledEmployeeList(selectedDepartmentIds);
                const list = (emp || []).map((e) => ({
                    ...e,
                    name: e.full_name || e.name,
                }));
                setEmployees(list);
            } catch (error) {
                notify("Error", parseApiError(error), "error");
            }
        })();
    }, [selectedDepartmentIds]);

    const handleSearch = (e) => setSearchTerm(e.target.value);

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === filteredEmployees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEmployees.map((e) => e.id));
        }
    };

    const onConfirm = async () => {
        if (!selectedIds.length) {
            notify("Error", "Select at least one employee", "error");
            return;
        }
        setLoading(true);
        try {
            const idToEmployeeId = new Map(
                employees.map((e) => [e.id, e.employee_id])
            );
            const targets = selectedIds
                .map((id) => idToEmployeeId.get(id))
                .filter(Boolean);

            const results = await Promise.allSettled(
                targets.map((empId) => removeEmployeeSchedule(empId))
            );
            const failures = results.filter((r) => r.status === "rejected");

            if (failures.length === 0) {
                notify("Success", "Schedules deleted", "success");
            } else if (failures.length === targets.length) {
                notify(
                    "Error",
                    parseApiError(failures[0].reason) || "Failed to delete",
                    "error"
                );
            } else {
                notify(
                    "Partial",
                    `${failures.length} of ${targets.length} failed`,
                    "error"
                );
            }
            setOpen(false);
            onSuccess();
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 h-10 px-4 rounded-lg font-semibold text-sm bg-rose-500 text-white hover:bg-rose-600 shadow transition-all"
            >
                <Plus size={14} />
                Delete
            </button>

            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 pb-6"
                >
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={toggleModal}
                    ></div>

                    <div className="relative min-w-[1100px] overflow-y-auto max-h-[calc(100vh-140px)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
                                    Delete Schedules
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Remove schedules from selected employees
                                </p>
                            </div>
                            <button
                                onClick={toggleModal}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-surface-variant/30 dark:bg-black/20">
                            <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-bold text-gray-600 dark:text-white flex items-center gap-3">
                                        Select Employees
                                    </h2>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <MultiDropDown
                                            placeholder={"Select Branch"}
                                            items={branches}
                                            value={selectedBranchIds}
                                            onChange={setSelectedBranchIds}
                                            badgesCount={1}
                                        />
                                        <MultiDropDown
                                            placeholder={"Select Department"}
                                            items={departments}
                                            value={selectedDepartmentIds}
                                            onChange={setSelectedDepartmentIds}
                                            badgesCount={1}
                                        />
                                        <DropDown
                                            placeholder="All"
                                            width="w-full"
                                            value={scheduleFilter}
                                            onChange={(v) => setScheduleFilter(v || "all")}
                                            items={[
                                                { id: "all", name: "All" },
                                                { id: "scheduled", name: "Scheduled" },
                                                { id: "unscheduled", name: "Unscheduled" },
                                            ]}
                                        />
                                        <Input
                                            placeholder="Search by name or ID"
                                            icon="search"
                                            value={searchTerm}
                                            onChange={handleSearch}
                                        />
                                    </div>

                                    <div className="overflow-y-auto max-h-[400px] rounded-3xl border border-stone-200 dark:border-white/10 shadow-elevation-1">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[#efece5] dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-semibold border-b border-stone-200 dark:border-white/5">
                                                    <th className="pl-6 py-4">
                                                        <Checkbox
                                                            checked={
                                                                filteredEmployees.length > 0 &&
                                                                selectedIds.length === filteredEmployees.length
                                                            }
                                                            onCheckedChange={toggleAll}
                                                        />
                                                    </th>
                                                    <th className="pr-6 py-4 font-bold">Employee Name</th>
                                                    <th className="px-6 py-4 font-bold">Employee ID</th>
                                                    <th className="px-6 py-4 font-bold">Department</th>
                                                    <th className="px-6 py-4 font-bold">Designation</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100 dark:divide-white/5 bg-surface-light dark:bg-surface-dark">
                                                {filteredEmployees.map((emp) => (
                                                    <tr
                                                        key={emp.id}
                                                        className={`transition-colors group hover:bg-[#f8f6f1] dark:hover:bg-white/5 ${
                                                            selectedIds.includes(emp.id)
                                                                ? "bg-[#fcfaf6] dark:bg-white/[0.02]"
                                                                : ""
                                                        }`}
                                                    >
                                                        <td className="pl-6 py-4">
                                                            <Checkbox
                                                                checked={selectedIds.includes(emp.id)}
                                                                onCheckedChange={() => toggleSelect(emp.id)}
                                                            />
                                                        </td>
                                                        <td className="pr-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <ProfilePicture src={emp.profile_picture} />
                                                                <div>
                                                                    <div className="font-bold text-slate-800 dark:text-white">
                                                                        {emp.full_name}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500">
                                                                        {emp.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                            {emp.employee_id}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                            {emp.department?.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                            {emp.designation?.name}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredEmployees.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                                                            No employees to show
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={toggleModal}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-white hover:bg-background-dark transition-all text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={loading || selectedIds.length === 0}
                                className={`px-4 py-2 rounded-lg text-white transition-all text-sm font-bold shadow-lg ${
                                    loading || selectedIds.length === 0
                                        ? "bg-rose-500/40 cursor-not-allowed"
                                        : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                                }`}
                            >
                                {loading
                                    ? "Deleting..."
                                    : selectedIds.length > 0
                                    ? `Delete Schedules (${selectedIds.length})`
                                    : "Delete Schedules"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Delete;
