"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDocumentExpiry } from '@/lib/endpoint/document_expiry';
import ProfilePicture from '@/components/ProfilePicture';


export default function DocumentExpiryAll() {

    const router = useRouter();
    const [dailyAttendanceRows, setDailyAttendanceRows] = useState([]);

    const fetchAllData = async () => {

        try {
            const params = {
                page: 1,
                per_page: 1000,
                sortDesc: 'false',
                branch_ids: [],
                search: null, // Only include search if it's not empty
                types: [] // Only fetch absent type notifications for this page
            };
            const result = await getDocumentExpiry(params);

            setDailyAttendanceRows(result.data);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);


    return (
        <>
            <div className="overflow-auto">
                <table className="w-full text-left border-collapse min-w-[200px]">
                    <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Branch</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Employee</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Title</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Issue Date</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {dailyAttendanceRows.length > 0 ? dailyAttendanceRows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => {
                                    const empId = row?.employee?.id || row?.employee_id;
                                    if (empId) router.push(`/employees/edit?id=${empId}&tab=Document`);
                                }}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group relative cursor-pointer"
                                title="Open employee documents"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.branch?.branch_name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center space-x-3">

                                        <ProfilePicture src={row?.employee?.profile_picture} />

                                        <div>
                                            <p className="font-medium text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell font-mono">{row?.employee?.first_name}</p>
                                            <p className="text-sm text-gray-500">
                                                ID: {row?.employee?.employee_id}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.title || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.issue_date || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.expiry_date || 'N/A'}</td>
                                {/* <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">  {Array.isArray(row.mediums)
                                    ? row.mediums.join(", ")
                                    : row.medium || row.mediums || "N/A"}</td> */}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">No attendance detail found for selected filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
