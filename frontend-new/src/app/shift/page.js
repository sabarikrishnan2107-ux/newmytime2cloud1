"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, MoreVertical, QrCode, Fingerprint, ChevronLeft, ChevronRight, Loader2, RefreshCw, Download, Upload, Pencil, Edit, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

import Columns from "./columns";

import Input from '@/components/Theme/Input';
import { getShifts, removeShift } from '@/lib/api';
import Pagination from '@/lib/Pagination';
import DataTable from '@/components/ui/DataTable';
import IconButton from '@/components/Theme/IconButton';
import { parseApiError } from '@/lib/utils';

export default function ShiftPage() {

    const { t } = useTranslation();

    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10); // Default to 10 for a cleaner table, even if the API suggests 100
    const [total, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');


    const fetchShifts = useCallback(async (page, perPage) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {
                page: page,
                per_page: perPage,
                sortDesc: 'false',
                search: searchTerm || null, // Only include search if it's not empty
            };
            const result = await getShifts(params);

            // Check if result has expected structure before setting state
            if (result && Array.isArray(result.data)) {
                setRecords(result.data);
                setCurrentPage(result.current_page || 1);
                setTotalPages(result.last_page || 1);
                setIsLoading(false);
                return; // Success, exit
            } else {
                // If the API returned a 2xx status but the data structure is wrong
                throw new Error('Invalid data structure received from API.');
            }

        } catch (err) {
            setError(parseApiError(err))
            setIsLoading(false);
        }
    }, [perPage, searchTerm]);

    const router = useRouter();


    useEffect(() => {
        fetchShifts(currentPage, perPage);
    }, [currentPage, perPage, fetchShifts]); // Re-fetch when page or perPage changes

    const handleRefresh = () => {
        fetchShifts(currentPage, perPage);
    }

    const onDelete = async (id) => {
        if (confirm(t('shift.confirmDelete'))) {
            try {
                await removeShift(id);
                fetchShifts(currentPage, perPage);
            } catch (error) {
                console.error("Error deleting shift:", error);
            }
        }
    }

    const onEdit = async (id) => {
        router.push(`/shift/create?id=${id}`)
    }

    const handleRowClick = (shift) => {
        localStorage.setItem("selectedShift", JSON.stringify(shift));
        router.push('/shift/short-list');
    }

    return (
        <div className='p-10'>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
                <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
                    {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
                    {t('shift.pageTitle')}
                </h1>
                <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
                    <div className="relative">
                        <Input
                            placeholder={t('shift.searchPlaceholder')}
                            icon="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}

                        />
                    </div>

                    <IconButton
                        icon={RefreshCw}
                        onClick={handleRefresh}
                        isLoading={isLoading}
                        title={t('shift.refreshTitle')}
                    />


                    <Link href="/shift/create">
                        <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            <span>{t('shift.newButton')}</span>
                        </button>
                    </Link>
                </div>
            </div>

            <DataTable
                columns={Columns(handleRowClick, onEdit, onDelete, t)}
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
                        pageSizeOptions={[10, 25, 50]}
                    />
                }
            />
        </div>
    );
}
