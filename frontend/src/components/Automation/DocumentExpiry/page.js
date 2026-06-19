"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

import Input from '@/components/Theme/Input';
import { getBranches, getDepartmentsByBranchIds, getScheduleEmployees, getScheduleStats, removeEmployeeSchedule } from '@/lib/api';

import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';

import Columns from "./columns";
import { parseApiError } from '@/lib/utils';
import IconButton from '@/components/Theme/IconButton';
import Create from '@/components/Automation/DocumentExpiry/Create';
import MultiDropDown from '@/components/ui/MultiDropDown';
import { SCHEDULE_STATS } from '@/lib/dropdowns';
import { deleteReportNotification, getReportNotifications } from '@/lib/endpoint/automation';

export default function AutomationDocumentExpiry() {

    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);

    const [stats, setStats] = useState(SCHEDULE_STATS);

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    const fetchDropdowns = async () => {
        try {
            setBranches(await getBranches());
            setStats(await getScheduleStats());
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
                search: searchTerm || null, // Only include search if it's not empty
                types: ["document_expiry"] // Only fetch document expiry type notifications for this page
            };
            const result = await getReportNotifications(params);

            // Check if result has expected structure before setting state
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
    }, [perPage, selectedBranchIds, searchTerm]);


    useEffect(() => {
        fetchRecords(currentPage, perPage);
    }, [currentPage, perPage, fetchRecords]); // Re-fetch when page or perPage changes

    const handleRefresh = async () => {
        setStats(await getScheduleStats());
        fetchRecords(currentPage, perPage);
    }

    const [idEditOpen, setIdEditOpen] = useState(false);
    const [editItemPayload, setEditItemPayload] = useState(null);

    const editItem = async (item) => {
        setEditItemPayload(item);
        setIdEditOpen(false); // force close first to ensure re-open
        setTimeout(() => setIdEditOpen(true), 0);
    }


    const deleteItem = async (id) => {
        if (confirm("Are you sure you want to delete this document expiry notification?")) {
            try {
                await deleteReportNotification(id);
                handleRefresh();
            } catch (error) {
                console.error("Error deleting document expiry notification:", error);
            }
        }
    }

    return (
        <div className='p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]'>
            <div className='space-y-5'>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
                    <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
                        {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
                        Document Expiry Notifications
                    </h1>
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

                        <button
                            onClick={() => {
                                setEditItemPayload(null);
                                setIdEditOpen(true);
                            }}
                            className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Add
                        </button>
                        <Create idEditOpen={idEditOpen} setIdEditOpen={setIdEditOpen} editItemPayload={editItemPayload} onSaved={handleRefresh} />

                    </div>
                </div>

                <DataTable
                    columns={Columns(deleteItem, editItem)}
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
