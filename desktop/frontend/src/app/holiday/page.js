"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getBranches } from '@/lib/api';
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { parseApiError } from '@/lib/utils';
import MultiDropDown from '@/components/ui/MultiDropDown';
import Input from '@/components/Theme/Input';
import IconButton from '@/components/Theme/IconButton';
import { useDebounce } from '@/hooks/useDebounce';
import HolidaysCreate from '@/components/Holidays/Create';
import HolidaysEdit from '@/components/Holidays/Edit';
import { deleteHolidays, getHolidays } from '@/lib/endpoint/holidays';
import SyncWithGoogle from '@/components/Holidays/SyncWithGoogle';
import DateRangeSelect from '@/components/ui/DateRange';

export default function EmployeeDataTable() {

    // Manager permission flags for the Holiday feature. Non-managers => all true.
    const user = getUser();
    const canCreate = can(user, "settings", "holiday", "create");
    const canEdit = can(user, "settings", "holiday", "edit");
    const canDelete = can(user, "settings", "holiday", "delete");
    const canView = can(user, "settings", "holiday", "view");

    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);

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
                start_date: from,
                end_date: to,
                search: searchTerm || null, // Only include search if it's not empty
            };

            const result = await getHolidays(params);

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
    }, [perPage, selectedBranch, selectedDepartments, selectedStatusses, searchTerm, from, to]);

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


    useEffect(() => {
        fetchEmployees(currentPage, perPage);
    }, [currentPage, perPage, fetchEmployees]); // Re-fetch when page or perPage changes

    const handleRefresh = () => {
        setSelectedBranch([]);
        setSelectedDepartments([]);
        setFrom(null);
        setTo(null);
        fetchEmployees(currentPage, perPage);
    }

    const [editedItem, setEditedItem] = useState(null);
    const [open, setOpen] = useState(false);

    const editItem = async (item) => {
        setEditedItem(item);
        setOpen(true)
    }

    const deleteItem = async (id) => {
        await deleteHolidays(id);
        handleRefresh();
    }

    return (
        <div className='p-5'>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
                <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
                    {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
                    Holidays
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

                    <div className="grid grid-cols-1 gap-4">
                        <DateRangeSelect
                            value={{ from, to }}
                            onChange={({ from, to }) => {
                                setFrom(from);
                                setTo(to);
                            }}
                        />
                    </div>

                    {/* <div className="relative">
                        <MultiDropDown
                            items={[
                                { id: "P", name: "Past" },
                                { id: "A", name: "Active" },
                            ]}
                            value={selectedStatusses}
                            onChange={(item) => {
                                setSelectedStatusses(item);
                                setCurrentPage(1); // Any extra logic goes here
                            }}
                            placeholder="Select a Status"
                            width="w-[320px]"
                        />
                    </div> */}

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

                    {canCreate && <SyncWithGoogle onSuccess={handleRefresh} />}

                    {canCreate && <HolidaysCreate onSuccess={handleRefresh} />}
                </div>
            </div>

            {
                editedItem && <HolidaysEdit editedItem={editedItem} open={open} setOpen={setOpen} onSuccess={handleRefresh} />
            }

            <DataTable
                columns={Columns(deleteItem, editItem, { canEdit, canDelete })}
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
