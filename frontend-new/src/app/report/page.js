"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import AttendanceTable from '@/components/Report/Report';
import ExecutiveAttendanceDashboardPage from '@/components/Report/Summary';

const ATTENDANCE_TABS = [
    { type: '',               label: 'Attendance Report' },
    { type: 'absent',         label: 'Absent Report' },
    { type: 'late-early',     label: 'Late & Early' },
    { type: 'leave',          label: 'Leave Report', href: '/leave-dashboard/reports' },
    { type: 'mobile-log',     label: 'Mobile Log Report' },
    { type: 'summary-daily',  label: 'Summary' },
];

function AttendancePageInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeType = searchParams.get('type') || '';
    const isSummary = activeType.startsWith('summary');
    const REPORT_TABS = ATTENDANCE_TABS;

    const handleTabClick = (tab) => {
        if (tab.href) {
            router.push(tab.href);
            return;
        }
        const href = tab.type ? `${pathname}?type=${tab.type}` : pathname;
        router.replace(href, { scroll: false });
    };

    return (
        <div className="w-full p-4 pb-24 overflow-y-auto max-h-[calc(100vh)]">
            <div className="flex px-10 flex-col md:flex-row md:items-center justify-between mb-6">
                <h1 className="text-2xl font-extrabold text-gray-600 dark:text-slate-300 flex items-center"></h1>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {REPORT_TABS.map((tab) => {
                        const tabIsSummary = tab.type && tab.type.startsWith('summary');
                        const isActive = !tab.href && (tabIsSummary ? isSummary : activeType === tab.type);
                        return (
                            <button
                                key={tab.type || 'attendance'}
                                onClick={() => handleTabClick(tab)}
                                className={`pb-3 px-1 text-sm font-bold tracking-wide uppercase transition-colors border-b-[3px] ${
                                    isActive
                                        ? 'border-[#7f19e6] text-[#7f19e6]'
                                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="animate-in fade-in duration-500 overflow-y-auto max-h-[calc(100vh-100px)]">
                {isSummary ? <ExecutiveAttendanceDashboardPage /> : <AttendanceTable />}
            </div>
        </div>
    );
}

export default function AttendancePage() {
    return (
        <Suspense fallback={null}>
            <AttendancePageInner />
        </Suspense>
    );
}