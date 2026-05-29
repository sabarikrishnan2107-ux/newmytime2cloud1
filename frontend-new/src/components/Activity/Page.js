"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    getActivity,
    getActivityTypes,
    getActivityActions,
    getActivityPdf,
    getBranches,
    getDepartments,
} from "@/lib/api";

import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import Columns from "./columns";
import Toolbar from "./Toolbar";
import { parseApiError } from "@/lib/utils";

export default function Activity() {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("");
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [type, setType] = useState("");
    const [action, setAction] = useState("");
    const [userType, setUserType] = useState("");
    const [branchId, setBranchId] = useState("");
    const [departmentId, setDepartmentId] = useState("");

    const [types, setTypes] = useState([]);
    const [actions, setActions] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [total, setTotal] = useState(0);

    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        (async () => {
            try {
                const [t, a, b, d] = await Promise.all([
                    getActivityTypes().catch(() => []),
                    getActivityActions().catch(() => []),
                    getBranches().catch(() => []),
                    getDepartments().catch(() => []),
                ]);
                setTypes(Array.isArray(t) ? t : []);
                setActions(Array.isArray(a) ? a : []);
                setBranches(Array.isArray(b) ? b : (b?.data ?? []));
                setDepartments(Array.isArray(d) ? d : (d?.data ?? []));
            } catch (_) {
            }
        })();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchDebounced, from, to, type, action, userType, branchId, departmentId]);

    useEffect(() => {
        fetchRecords();
    }, [currentPage, perPage, searchDebounced, from, to, type, action, userType, branchId, departmentId]);

    const fetchRecords = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await getActivity({
                page: currentPage,
                per_page: perPage,
                q: searchDebounced || undefined,
                from: from || undefined,
                to: to || undefined,
                type: type || undefined,
                action: action || undefined,
                user_type: userType || undefined,
                branch_id: branchId || undefined,
                department_id: departmentId || undefined,
            });

            if (result && Array.isArray(result.data)) {
                setRecords(result.data);
                setCurrentPage(result.current_page || 1);
                setTotal(result.total || 0);
            } else {
                throw new Error("Invalid data structure from API.");
            }
        } catch (err) {
            setError(parseApiError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            setError(null);
            const blob = await getActivityPdf({
                q: searchDebounced || undefined,
                from: from || undefined,
                to: to || undefined,
                type: type || undefined,
                action: action || undefined,
                user_type: userType || undefined,
                branch_id: branchId || undefined,
                department_id: departmentId || undefined,
            });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (err) {
            if (err?.response?.status === 422 && err.response.data) {
                const data = err.response.data;
                let msg = null;
                if (data instanceof Blob) {
                    try { msg = JSON.parse(await data.text())?.message; } catch (_) { msg = null; }
                } else {
                    msg = data?.message;
                }
                setError(msg || "PDF export failed.");
            } else {
                setError(parseApiError(err));
            }
        } finally {
            setIsExporting(false);
        }
    };

    const handleClear = () => {
        setSearch("");
        setFrom(null);
        setTo(null);
        setType("");
        setAction("");
        setUserType("");
        setBranchId("");
        setDepartmentId("");
    };

    const hasActiveFilters = useMemo(() => {
        return Boolean(search || from || to || type || action || userType || branchId || departmentId);
    }, [search, from, to, type, action, userType, branchId, departmentId]);

    const columns = Columns({ pageTitle: "Activity" });

    return (
        <>
            <div className="flex flex-wrap items-center justify-between mb-6">
                <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center">
                        Activity
                    </h2>
                </div>
            </div>

            <Toolbar
                search={search} onSearchChange={setSearch}
                from={from} to={to}
                onDateChange={({ from, to }) => { setFrom(from); setTo(to); }}
                type={type} onTypeChange={setType}
                action={action} onActionChange={setAction}
                userType={userType} onUserTypeChange={setUserType}
                branchId={branchId} onBranchChange={setBranchId}
                departmentId={departmentId} onDepartmentChange={setDepartmentId}
                types={types}
                actions={actions}
                branches={branches}
                departments={departments}
                onPrint={handleExport}
                isExporting={isExporting}
                hasActiveFilters={hasActiveFilters}
                onClear={handleClear}
            />

            {error && (
                <div className="mb-3 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-200">
                    {String(error)}
                </div>
            )}

            <DataTable
                className="bg-slate-50 dark:bg-slate-900 overflow-hidden min-h-[700px]"
                columns={columns}
                data={records}
                isLoading={isLoading}
                error={null}
                pagination={
                    <Pagination
                        page={currentPage}
                        perPage={perPage}
                        total={total}
                        onPageChange={setCurrentPage}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                        pageSizeOptions={[10, 25, 50]}
                    />
                }
            />
        </>
    );
}
