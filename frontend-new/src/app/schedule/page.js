"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

import Input from '@/components/Theme/Input';
import { getBranches, getDepartmentsByBranchIds, getScheduleEmployees, removeEmployeeSchedule } from '@/lib/api';
import { getEmployeesByDepartmentIds } from '@/lib/api/employee';

import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';

import Columns from "./columns";
import { parseApiError } from '@/lib/utils';
import IconButton from '@/components/Theme/IconButton';
import Create from '@/components/Schedule/Create';
import Delete from '@/components/Schedule/Delete';
import EditScheduleModal from '@/components/Schedule/EditModal';
import MultiDropDown from '@/components/ui/MultiDropDown';
import DropDown from '@/components/ui/DropDown';
import { SCHEDULE_STATS } from '@/lib/dropdowns';

export default function SchedulePage() {
    const router = useRouter();

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editEmployee, setEditEmployee] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);

    const handleView = (employee) => {
        // Get fresh data from records
        const fresh = records.find(r => r.id === employee.id) || employee;
        setEditEmployee(fresh);
        setIsViewOnly(true);
        setEditModalOpen(true);
    };

    const handleEdit = (employee) => {
        const fresh = records.find(r => r.id === employee.id) || employee;
        console.log("handleEdit - employee:", { id: fresh.id, system_user_id: fresh.system_user_id, employee_id: fresh.employee_id, schedule_all: fresh.schedule_all });
        setEditEmployee(fresh);
        setIsViewOnly(false);
        setEditModalOpen(true);
    };

    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [scheduleFilter, setScheduleFilter] = useState('');

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);

    const fetchDropdowns = async () => {
        try {
            setBranches(await getBranches());
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    useEffect(() => {
        const fetchDepartmentIds = async (selectedBranchIds) => {
            try {
                setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
            } catch (error) {
                setError(parseApiError(error));
            }
        };

        fetchDepartmentIds(selectedBranchIds)

    }, [selectedBranchIds]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                if (selectedDepartmentIds.length > 0) {
                    const result = await getEmployeesByDepartmentIds(selectedDepartmentIds);
                    setEmployees(Array.isArray(result) ? result : []);
                } else if (selectedBranchIds.length > 0) {
                    // Fetch departments for selected branches, then fetch employees
                    const depts = await getDepartmentsByBranchIds(selectedBranchIds);
                    const deptIds = depts.map(d => d.id);
                    if (deptIds.length > 0) {
                        const result = await getEmployeesByDepartmentIds(deptIds);
                        setEmployees(Array.isArray(result) ? result : []);
                    } else {
                        setEmployees([]);
                    }
                } else {
                    setEmployees([]);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchEmployees();
    }, [selectedBranchIds, selectedDepartmentIds]);

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
                sortDesc: 'false',
                branch_ids: selectedBranchIds,
                department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
                employee_ids: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
                common_search: searchTerm || null,
                schedules_count: scheduleFilter !== '' ? scheduleFilter : undefined,
            };
            const result = await getScheduleEmployees(params);

            // Check if result has expected structure before setting state
            console.log("Fetched records:", result?.data?.slice(0, 2)?.map(r => ({ id: r.id, name: r.first_name, schedule: r.schedule })));
            if (result && Array.isArray(result.data)) {
                setRecords(result.data);
                setCurrentPage(result.current_page || 1);
                setTotalPages(result.total || 1);
                setIsLoading(false);
                return;
            } else {
                // If the API returned a 2xx status but the data structure is wrong
                throw new Error('Invalid data structure received from API.');
            }

        } catch (error) {
            setError(parseApiError(error))
            setIsLoading(false); // Make sure loading state is turned off on error
        }
    }, [perPage, selectedBranchIds, selectedDepartmentIds, selectedEmployeeIds, searchTerm, scheduleFilter]);


    useEffect(() => {
        fetchRecords(currentPage, perPage);
    }, [currentPage, perPage, fetchRecords]); // Re-fetch when page or perPage changes

    const handleRefresh = async () => {
        await fetchRecords(currentPage, perPage);
    }


    const deleteItem = async (id) => {
        if (confirm("Are you sure you want to delete this schedule?")) {
            try {
                await removeEmployeeSchedule(id);
                // Clear schedule but keep employee in list
                setRecords(prev => prev.map(r =>
                    r.employee_id === id ? { ...r, schedule: null, schedule_all: [] } : r
                ));
            } catch (error) {
                alert("Failed to delete: " + parseApiError(error));
            }
        }
    }

    return (
        <div className='p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]'>
            <EditScheduleModal
                key={editEmployee?.id + '-' + editModalOpen}
                employee={editEmployee}
                open={editModalOpen}
                onClose={() => { setEditModalOpen(false); setEditEmployee(null); }}
                onSuccess={handleRefresh}
                viewOnly={isViewOnly}
                onSwitchToView={() => setIsViewOnly(true)}
            />
            <div className='space-y-5'>


                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
                            Schedule Employees
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
                        <div className="relative">
                            <MultiDropDown
                                placeholder={'Select Branch'}
                                items={branches}
                                value={selectedBranchIds}
                                onChange={setSelectedBranchIds}
                                badgesCount={1}
                                width='w-[220px]'
                            />
                        </div>

                        <div className="relative">
                            <MultiDropDown
                                placeholder={'Select Department'}
                                items={departments}
                                value={selectedDepartmentIds}
                                onChange={setSelectedDepartmentIds}
                                badgesCount={1}
                            />
                        </div>

                        <div className="relative">
                            <MultiDropDown
                                placeholder={'Select Employee'}
                                items={employees}
                                value={selectedEmployeeIds}
                                onChange={setSelectedEmployeeIds}
                                badgesCount={1}
                            />
                        </div>

                        <div className="relative">
                            <DropDown
                                placeholder="All"
                                value={scheduleFilter}
                                onChange={(v) => { setScheduleFilter(v ?? ""); setCurrentPage(1); }}
                                items={[
                                    { id: "", name: "All" },
                                    { id: "1", name: "Scheduled" },
                                    { id: "0", name: "Unscheduled" },
                                ]}
                                width="w-[160px]"
                            />
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Input
                                placeholder="Search by name or ID"
                                icon="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <IconButton
                            icon={RefreshCw}
                            onClick={handleRefresh}
                            isLoading={isLoading}
                            title="Refresh Data"
                        />

                        <Create onSuccess={handleRefresh} />

                        <Delete onSuccess={handleRefresh} />

                    </div>
                </div>

                <DataTable
                    columns={Columns(deleteItem, handleEdit, handleView)}
                    data={records}
                    isLoading={isLoading}
                    error={error}
                    onRowClick={(item) => console.log(`${item}`)}
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
        </div>
    );
}
