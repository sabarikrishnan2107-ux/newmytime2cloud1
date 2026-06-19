"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw, Upload, Cloud, CloudUpload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBranches, getDepartments, getEmployees, removeEmployee } from '@/lib/api';
import { EmployeeExtras } from '@/components/Employees/Extras';

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { parseApiError } from '@/lib/utils';
import MultiDropDown from '@/components/ui/MultiDropDown';
import Dropdown from '@/components/Theme/DropDown';
import Input from '@/components/Theme/Input';
import IconButton from '@/components/Theme/IconButton';

export default function EmployeeDataTable() {

    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotalEmployees] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedBranch, setSelectedBranch] = useState({ name: "Select All", id: "" });
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [branches, setBranches] = useState([]);

    const fetchBranches = async () => {
        try {
            setBranches([{ name: "Select All", id: "" }, ...await getBranches()]);
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);


    const fetchEmployees = useCallback(async (page, perPage) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {
                page: page,
                per_page: perPage,
                sortDesc: 'false',
                branch_id: selectedBranch.id,
                department_ids: selectedDepartments,
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
    }, [perPage, selectedBranch, selectedDepartments, searchTerm]);

    const router = useRouter();

    const [departments, setDepartments] = useState([]);

    const fetchDepartments = async () => {
        try {
            setDepartments(await getDepartments(selectedBranch.id));
        } catch (error) {
            setError(parseApiError(error));
        }
    };


    useEffect(() => {
        fetchDepartments();
    }, [selectedBranch]);


    useEffect(() => {
        fetchEmployees(currentPage, perPage);
    }, [currentPage, perPage, fetchEmployees]); // Re-fetch when page or perPage changes

    const handleRefresh = () => {
        setSelectedBranch(null);
        setSelectedDepartments([]);
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

    return (
        <div >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
                <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
                    {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
                    Documents
                </h1>
                <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">

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


                    {/* New Employee Button */}
                    <Link href="#">
                        <div className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <CloudUpload className="w-4 h-4" />
                            <span>Upload</span>
                        </div>
                    </Link>
                </div>
            </div>

            <DataTable
                columns={Columns(deleteEmployee)}
                data={[
                    {
                        id: 1,
                        name: "Business License.pdf",
                        date: "Oct 20, 2024",
                        type: "Legal",
                        expiry: "Oct 24, 2025",
                        icon: "description",
                        iconBg: "bg-red-50",
                        iconColor: "text-red-500"
                    },
                    {
                        id: 2,
                        name: "Tax_Registration_2024.pdf",
                        date: "Jan 15, 2024",
                        type: "Financial",
                        expiry: "Dec 31, 2024",
                        icon: "description",
                        iconBg: "bg-blue-50",
                        iconColor: "text-blue-500"
                    },
                    {
                        id: 3,
                        name: "Office_Floor_Plan_v3.png",
                        date: "Sep 05, 2024",
                        type: "Assets",
                        expiry: "--",
                        icon: "image",
                        iconBg: "bg-emerald-50",
                        iconColor: "text-emerald-500"
                    }
                ]}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => router.push('/employees-short-list')}
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
