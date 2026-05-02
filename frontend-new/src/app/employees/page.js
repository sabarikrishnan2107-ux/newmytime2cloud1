"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBranches, getDepartmentsByBranchIds, getEmployees, removeEmployee } from '@/lib/api';
import { EmployeeExtras } from '@/components/Employees/Extras';

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { parseApiError } from '@/lib/utils';
import Input from '@/components/Theme/Input';
import IconButton from '@/components/Theme/IconButton';
import MultiDropDown from '@/components/ui/MultiDropDown';

export default function EmployeesPage() {

    const router = useRouter();

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(() => {
        if (typeof window === 'undefined') return 10;
        const rows = Math.floor((window.innerHeight - 220) / 70);
        return Math.max(10, Math.min(100, rows));
    });
    const [total, setTotalEmployees] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {

        const fetchBranches = async () => {
            try {
                setBranches(await getBranches());
            } catch (error) {
                setError(parseApiError(error));
            }
        };

        fetchBranches();
    }, []);


    useEffect(() => {
        const fetchDepartments = async (selectedBranchIds) => {
            try {
                setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
            } catch (error) {
                setError(parseApiError(error));
            }
        };
        fetchDepartments(selectedBranchIds);
    }, [selectedBranchIds]);

    const fetchEmployees = useCallback(async (page, perPage) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {
                page: page,
                per_page: perPage,
                sortDesc: 'false',
                branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : [],
                department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : [],
                search: searchTerm || null, // Only include search if it's not empty
            };
            const result = await getEmployees(params);

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
    }, [perPage, selectedBranchIds, selectedDepartmentIds, searchTerm]);


    useEffect(() => {
        fetchEmployees(currentPage, perPage);
    }, [currentPage, perPage, fetchEmployees]); // Re-fetch when page or perPage changes

    const handleRefresh = () => {
        fetchEmployees(currentPage, perPage);
    }

    const deleteEmployee = async (id) => {
        if (confirm("Are you sure you want to delete this employee?")) {
            try {
                await removeEmployee(id);
                fetchEmployees(currentPage, perPage);
            } catch (error) {
                console.error("Error deleting employee:", error);
            }
        }
    }

    const editEmployee = async (id) => {
        router.push(`/employees/edit?id=${id}`)
    }

    return (
        <div className='p-3 sm:p-4 pb-4 overflow-y-auto max-h-[calc(100vh-100px)]'>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-6">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center shrink-0">
                    Employees
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="relative w-full sm:w-auto">
                        <MultiDropDown
                            placeholder={'Select Branch'}
                            items={branches}
                            value={selectedBranchIds}
                            onChange={setSelectedBranchIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <MultiDropDown
                            placeholder={'Select Department'}
                            items={departments}
                            value={selectedDepartmentIds}
                            onChange={setSelectedDepartmentIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
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

                    <EmployeeExtras data={employees} onUploadSuccess={fetchEmployees} />

                    {/* New Employee Button */}
                    <Link href="/employees/create">
                        <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            <span>New</span>
                        </button>
                    </Link>
                </div>
            </div>

            <DataTable
                columns={Columns(deleteEmployee, editEmployee)}
                data={employees}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => router.push(`/employees/short?id=${item.id}`)}
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
        </div>
    );
}
