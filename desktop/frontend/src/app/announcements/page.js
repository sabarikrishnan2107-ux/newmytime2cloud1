"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

import Input from '@/components/Theme/Input';
import { getBranches, getDepartments } from '@/lib/api';
import { getAnnouncements, deleteAnnouncement } from '@/lib/endpoint/announcements';
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";

import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';

import Columns from "./columns";
import { parseApiError } from '@/lib/utils';
import Dropdown from '@/components/Theme/DropDown';
import IconButton from '@/components/Theme/IconButton';
import Create from '@/components/Announcement/Create';

export default function List() {

    // Manager permission flags for the Announcements feature. Non-managers => all true.
    const user = getUser();
    const canCreate = can(user, "settings", "announcements", "create");
    const canEdit = can(user, "settings", "announcements", "edit");
    const canDelete = can(user, "settings", "announcements", "delete");
    const canView = can(user, "settings", "announcements", "view");

    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedBranch, setSelectedBranch] = useState({ name: "Select Branch", id: "" });
    const [selectedDepartment, setSelectedDepartment] = useState({ name: "Select Department", id: "" });

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Edit state
    const [editData, setEditData] = useState(null);

    // Detail view popup state
    const [viewItem, setViewItem] = useState(null);

    const fetchDropdowns = async () => {
        try {
            setBranches([{ name: "Select All", id: "" }, ...await getBranches()]);
            setDepartments([{ name: "Select All", id: "" }, ...await getDepartments()]);
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    useEffect(() => {
        fetchDropdowns();
    }, []);

    const fetchRecords = useCallback(async (page, perPage) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {
                page: page,
                per_page: perPage,
                sortDesc: 'true',
            };

            if (selectedBranch.id) params.branch_id = selectedBranch.id;
            if (selectedDepartment.id) params.department_id = selectedDepartment.id;
            if (searchTerm) params.search = searchTerm;

            const result = await getAnnouncements(params);

            if (result && Array.isArray(result.data)) {
                setRecords(result.data);
                setCurrentPage(result.current_page || 1);
                setTotalPages(result.last_page || 1);

            } else {
                throw new Error('Invalid data structure received from API.');
            }

        } catch (error) {
            setError(parseApiError(error));
        } finally {
            setIsLoading(false);
        }
    }, [perPage, selectedBranch, selectedDepartment, searchTerm]);


    useEffect(() => {
        fetchRecords(currentPage, perPage);
    }, [currentPage, perPage, fetchRecords]);

    const handleRefresh = () => {
        fetchRecords(currentPage, perPage);
    };

    const handleRowClick = (item) => {
        setViewItem(item);
    };

    const handleView = (item) => {
        setViewItem(item);
    };

    const handleEdit = (item) => {
        setEditData(item);
    };

    const handleEditClose = () => {
        setEditData(null);
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;

        try {
            const result = await deleteAnnouncement(item.id);
            if (result?.status !== false) {
                fetchRecords(currentPage, perPage);
                if (viewItem?.id === item.id) {
                    setViewItem(null);
                }
            }
        } catch (error) {
            alert(parseApiError(error));
        }
    };

    const handleCreateSuccess = () => {
        fetchRecords(1, perPage);
        setEditData(null);
    };

    return (
        <div className='p-10'>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:space-y-0">
                <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
                    Announcements
                </h1>
                <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
                    <div className="relative">
                        <Dropdown
                            items={branches}
                            selectedItem={selectedBranch}
                            onSelect={(item) => {
                                setSelectedBranch(item);
                                setCurrentPage(1);
                            }}
                            placeholder="Select Branch"
                            width="w-[250px]"
                        />
                    </div>

                    <div className="relative">
                        <Dropdown
                            items={departments}
                            selectedItem={selectedDepartment}
                            onSelect={(item) => {
                                setSelectedDepartment(item);
                                setCurrentPage(1);
                            }}
                            placeholder="Select Department"
                            width="w-[250px]"
                        />
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Input
                            placeholder="Search announcements..."
                            icon="search"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <IconButton
                        icon={RefreshCw}
                        onClick={handleRefresh}
                        isLoading={isLoading}
                        title="Refresh Data"
                    />

                    {/* Create Button */}
                    {canCreate && <Create onSuccess={handleCreateSuccess} />}
                </div>
            </div>

            <DataTable
                columns={Columns(handleRowClick, handleEdit, handleDelete, handleView, { canEdit, canDelete })}
                data={records}
                isLoading={isLoading}
                error={error}
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
                        pageSizeOptions={[10, 25, 50, 100]}
                    />
                }
            />

            {/* View Detail Popup Modal */}
            {viewItem && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={() => setViewItem(null)}
                    ></div>

                    {/* Modal Card */}
                    <div className="relative w-[700px] max-h-[85vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-primary/5 dark:bg-primary/10 shrink-0">
                            <div className="flex-1 min-w-0 mr-4">
                                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 truncate">{viewItem.title}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Posted: {viewItem.updated_at || viewItem.created_at}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {viewItem.category && (
                                    <span className="text-sm font-semibold" style={{
                                        color: viewItem.category.name === "Urgent" ? "#F44336"
                                            : viewItem.category.name === "Informational" ? "#3F51B5"
                                                : viewItem.category.name === "Meeting" ? "#FF5722"
                                                    : viewItem.category.name === "Priority" ? "#4CAF50"
                                                        : "#64748b"
                                    }}>
                                        {viewItem.category.name}
                                    </span>
                                )}
                                <button
                                    onClick={() => setViewItem(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {/* Description */}
                            <div
                                className="text-sm text-slate-600 dark:text-slate-300 prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: viewItem.description }}
                            />

                            {/* Dates */}
                            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-white/10 flex gap-6">
                                <div className="text-sm">
                                    <span className="text-green-600 font-medium">Start Date:</span>
                                    <span className="text-slate-500 ml-2">{viewItem.start_date || "N/A"}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-red-500 font-medium">End Date:</span>
                                    <span className="text-slate-500 ml-2">{viewItem.end_date || "N/A"}</span>
                                </div>
                            </div>

                            {/* Departments */}
                            {viewItem.departments?.length > 0 && (
                                <div className="mt-4 flex items-start gap-2 flex-wrap">
                                    <span className="text-xs text-slate-400 font-medium mt-0.5">Departments:</span>
                                    {viewItem.departments.map(dept => (
                                        <span key={dept.id} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                                            {dept.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Employees */}
                            {viewItem.employees?.length > 0 && (
                                <div className="mt-3 flex items-start gap-2 flex-wrap">
                                    <span className="text-xs text-slate-400 font-medium mt-0.5">Employees:</span>
                                    {viewItem.employees.slice(0, 20).map(emp => (
                                        <span key={emp.id} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-300 border border-green-100 dark:border-green-500/20">
                                            {emp.first_name} {emp.last_name}
                                        </span>
                                    ))}
                                    {viewItem.employees.length > 20 && (
                                        <span className="text-xs text-slate-400 mt-0.5">+{viewItem.employees.length - 20} more</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewItem(null)}
                                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal - renders Create component in edit mode */}
            {editData && (
                <Create
                    editData={editData}
                    onSuccess={handleCreateSuccess}
                    onClose={handleEditClose}
                />
            )}
        </div>
    );
}
