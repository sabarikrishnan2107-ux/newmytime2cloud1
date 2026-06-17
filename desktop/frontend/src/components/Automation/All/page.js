"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getReportNotifications } from '@/lib/endpoint/automation';


export default function ExecutiveAttendanceDashboardPage() {
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
            const result = await getReportNotifications(params);

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
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Type</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Subject</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Time</th>
                            {/* <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Medium</th> */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {dailyAttendanceRows.length > 0 ? dailyAttendanceRows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => router.push('/automation')}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group relative cursor-pointer"
                                title="Go to Automation"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.branch?.branch_name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.type || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.subject || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.time || row?.from_time + " - " + row?.to_time || 'N/A'}</td>
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
