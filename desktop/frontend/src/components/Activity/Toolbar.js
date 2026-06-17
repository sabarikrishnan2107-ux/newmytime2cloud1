"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import DateRangeSelect from "../ui/DateRange";

const USER_TYPE_OPTIONS = [
    { value: "company", label: "Company" },
    { value: "employee", label: "Employee" },
];

const selectClass =
    "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 " +
    "rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full";

export default function Toolbar({
    search, onSearchChange,
    from, to, onDateChange,
    type, onTypeChange,
    action, onActionChange,
    userType, onUserTypeChange,
    branchId, onBranchChange,
    departmentId, onDepartmentChange,
    types = [],
    actions = [],
    branches = [],
    departments = [],
    onPrint,
    isExporting = false,
    hasActiveFilters = false,
    onClear,
    canExport = true,
}) {
    return (
        <div className="space-y-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search user or description..."
                    className={`${selectClass} flex-1 min-w-[240px]`}
                />
                <DateRangeSelect
                    value={{ from, to }}
                    onChange={({ from, to }) => onDateChange({ from, to })}
                />
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 flex items-center gap-1"
                    >
                        <X size={14} /> Clear filters
                    </button>
                )}
                {canExport && (
                <button
                    type="button"
                    onClick={onPrint}
                    disabled={isExporting}
                    className="ml-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2"
                >
                    <Printer size={16} />
                    {isExporting ? "Generating..." : "Print PDF"}
                </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <select className={selectClass} value={type} onChange={(e) => onTypeChange(e.target.value)}>
                    <option value="">All Types</option>
                    {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>

                <select className={selectClass} value={action} onChange={(e) => onActionChange(e.target.value)}>
                    <option value="">All Actions</option>
                    {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>

                <select className={selectClass} value={userType} onChange={(e) => onUserTypeChange(e.target.value)}>
                    <option value="">All User Types</option>
                    {USER_TYPE_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>

                <select className={selectClass} value={branchId} onChange={(e) => onBranchChange(e.target.value)}>
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                </select>

                <select className={selectClass} value={departmentId} onChange={(e) => onDepartmentChange(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
