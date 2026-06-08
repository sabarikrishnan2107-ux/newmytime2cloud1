"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPaginatedRoles, removeEmployee, removeRole } from '@/lib/api';
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { parseApiError } from '@/lib/utils';
import Input from '@/components/Theme/Input';

export default function EmployeeDataTable() {

    const router = useRouter();

    // Manager permission flags for the Roles feature. Non-managers => all true.
    const user = getUser();
    const canCreate = can(user, "settings", "roles", "create");
    const canEdit = can(user, "settings", "roles", "edit");
    const canDelete = can(user, "settings", "roles", "delete");
    const canView = can(user, "settings", "roles", "view");

    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotalEmployees] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');


    const fetchEmployees = useCallback(async (page, perPage) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {
                page: page,
                per_page: perPage,
                sortDesc: 'false',
                search: searchTerm || null, // Only include search if it's not empty
            };
            const result = await getPaginatedRoles(params);

            // Check if result has expected structure before setting state
            if (result && Array.isArray(result.data)) {
                setEmployees(result.data);
                setCurrentPage(result.current_page || 1);
                setTotalEmployees(result.total || 0);
                setIsLoading(false);
                return; // Success, exit
            } else {
                // If the API returned a 2xx status but the data structure is wrong
                throw new Error('Invalid data structure received from API.');
            }

        } catch (error) {
            setError(parseApiError(error));
            setIsLoading(false);
        }
    }, [perPage, searchTerm]);

    useEffect(() => {
        fetchEmployees(currentPage, perPage);
    }, [currentPage, perPage, fetchEmployees]); // Re-fetch when page or perPage changes

    const handleRefresh = () => {
        fetchEmployees(currentPage, perPage);
    }

    const deleteItem = async (id) => {
        if (confirm("Are you sure you want to delete this role?")) {
            try {
                await removeRole(id);
                handleRefresh();
            } catch (error) {
                console.error("Error deleting role:", error);
                alert(parseApiError(error));
            }
        }
    }

    // Stash the selected role and open the form in edit mode. We pass the row
    // (which already includes modules + permissions JSON) via sessionStorage so
    // the form can prefill without a separate fetch.
    const editItem = (id) => {
        const role = employees.find((r) => r.id === id);
        if (role && typeof window !== "undefined") {
            sessionStorage.setItem("editRole", JSON.stringify(role));
        }
        router.push(`/roles/create?id=${id}`);
    }

    return (
        <div className='p-5 overflow-y-auto max-h-[calc(100vh-100px)]'>
            <div
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
            >
                <div>

                    <h1 className="text-3xl font-bold text-gray-600 dark:text-gray-300 tracking-tight mb-2">
                        Role Management
                    </h1>
                    <p className="text-slate-500 max-w-2xl text-base leading-relaxed">
                        Define user roles, configure permissions across modules, and manage
                        access levels for your organization's workforce.
                    </p>
                </div>
                {canCreate && (
                <Link href="/roles/create">
                    <button
                        className="group px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/30 transition-all duration-200 flex items-center gap-2 transform active:scale-95 whitespace-nowrap"
                    >
                        <span
                            className="material-icons-outlined text-xl group-hover:rotate-90 transition-transform"
                        >add</span
                        >
                        NEW ROLE
                    </button>
                </Link>
                )}

            </div>
            <div
                className="glass-panel rounded-xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"
            >
                <div
                    className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto"
                >
                    <div className="relative w-full md:w-80 group">
                        <Input
                            placeholder="Search by name or ID"
                            icon="search"
                            onChange={(e) => { }}
                        />
                    </div>
                </div>
            </div>

            <DataTable
                columns={Columns(deleteItem, editItem, { canEdit, canDelete })}
                data={employees}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => {}}
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
        </div>
    );
}
