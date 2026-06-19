"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBranches, getDepartments, getDepartmentsByBranchIds, getEmployees, removeEmployee } from '@/lib/api';
import { EmployeeExtras } from '@/components/Employees/Extras';

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { parseApiError } from '@/lib/utils';
import MultiDropDown from '@/components/ui/MultiDropDown';
import Input from '@/components/Theme/Input';
import IconButton from '@/components/Theme/IconButton';
import { getLeavesRequest } from '@/lib/endpoint/leaves';
import DropDown from '@/components/ui/DropDown';
import { useDebounce } from '@/hooks/useDebounce';
import LeaveViewDialog from '@/components/Employees/LeaveRequests';
import { changeRequest } from '@/lib/endpoint/attendance';
import ChangeRequestDialog from '@/components/Attendance/ChangeRequestDialog';

export default function EmployeeDataTable() {

    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotalEmployees] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [inputValue, setInputValue] = useState('');

    const [selectedBranch, setSelectedBranch] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedStatusses, setSelectedStatusses] = useState([]);
    const [branches, setBranches] = useState([]);

    const fetchBranches = async () => {
        try {
            setBranches(await getBranches());
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);


    const fetchEmployees = useCallback(async (page, perPage) => {
        // setIsLoading(true);
        setError(null);

        try {
            const params = {
                page: page,
                per_page: perPage,
                sortDesc: 'false',
                branch_ids: selectedBranch,
                department_ids: selectedDepartments,
                status_ids: selectedStatusses,
                search: searchTerm || null, // Only include search if it's not empty
            };

            console.log(params);

            const result = await changeRequest(params);

            // console.log(result.data);return;
            

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
    }, [perPage, selectedBranch, selectedDepartments, selectedStatusses, searchTerm]);

    const debouncedSetSearch = useDebounce((value) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to page 1 on new search
    }, 500);

    // 4. Update the handler
    const handleSearch = (e) => {
        const value = e.target.value;
        setInputValue(value);        // Update UI immediately (no lag)
        debouncedSetSearch(value);   // Request the update to searchTerm (delayed)
    };

    const [departments, setDepartments] = useState([]);

    const fetchDepartments = async () => {
        try {
            setDepartments(await getDepartmentsByBranchIds(selectedBranch));
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
        setSelectedBranch([]);
        setSelectedDepartments([]);
        fetchEmployees(currentPage, perPage);
    }

    const [editedItem, setEditedItem] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const editItem = async (item) => {
        console.log(item);
        setEditedItem(item);
        setIsOpen(true)
    }

    return (
        <div className='p-5'>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
                <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
                    {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
                    Change Request
                </h1>
                <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
                    <div className="relative">
                        <MultiDropDown
                            items={branches}
                            value={selectedBranch}
                            onChange={(item) => {
                                setSelectedBranch(item);
                                setCurrentPage(1); // Any extra logic goes here
                            }}
                            placeholder="Select a Branch"
                            width="w-[320px]"
                        />
                    </div>
                    <div className="relative">
                        <MultiDropDown
                            items={departments}
                            value={selectedDepartments}
                            onChange={(item) => {
                                setSelectedDepartments(item);
                                setCurrentPage(1); // Any extra logic goes here
                            }}
                            placeholder="Select a Department"
                            width="w-[320px]"
                        />
                    </div>
                    <div className="relative">
                        <MultiDropDown
                            items={[
                                { id: "P", name: "Pending" },
                                { id: "A", name: "Approved" },
                                { id: "R", name: "Rejected" },
                            ]}
                            value={selectedStatusses}
                            onChange={(item) => {
                                setSelectedStatusses(item);
                                setCurrentPage(1); // Any extra logic goes here
                            }}
                            placeholder="Select a Status"
                            width="w-[320px]"
                        />
                    </div>

                    <div className="relative">
                        <Input
                            placeholder="Search by name or ID"
                            icon="search"
                            value={inputValue}
                            onChange={handleSearch}
                        />
                    </div>


                    <IconButton
                        icon={RefreshCw}
                        onClick={handleRefresh}
                        isLoading={isLoading}
                        title="Refresh Data"
                    />
                </div>
            </div>

            {
                editedItem && <ChangeRequestDialog editedItem={editedItem} isOpen={isOpen} setIsOpen={setIsOpen} onSuccess={handleRefresh} />
            }

            <DataTable
                columns={Columns(editItem)}
                data={employees}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => { }}
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
