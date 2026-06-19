"use client";

import React, { useState } from 'react';
import AutomationAttendance from '@/components/Automation/Attendance/page';
import AutomationAbsent from '@/components/Automation/Absent/page';
import AutomationDevice from '@/components/Automation/Device/page';
import AutomationDocumentExpiry from '@/components/Automation/DocumentExpiry/page';
import AutomationAccessControl from '@/components/Automation/AccessControl/page';
import AITriggers from '../../components/Automation/AITriggers/page';

// Define the available tabs
const TABS = ['AI Triggers', 'Attendance', 'Absent', 'Device', 'Document Expiry', 'Access Control'];

export default function AttendancePage() {
    const [activeTab, setActiveTab] = useState('AI Triggers');

    const renderContent = () => {
        switch (activeTab) {
            case 'AI Triggers': return <AITriggers />;
            case 'Attendance': return <AutomationAttendance />;
            case 'Absent': return <AutomationAbsent />;
            case 'Device': return <AutomationDevice />;
            case 'Document Expiry': return <AutomationDocumentExpiry />;
            case 'Access Control': return <AutomationAccessControl />;

            default: return null;
        }
    };

    // return <AttendanceTable />;

    return (
        <div className="w-full p-4 pb-24 overflow-y-auto max-h-[calc(100vh)]">
            {/* Header and Tab Bar */}
            <div className="flex pt-5 flex-col md:flex-row md:items-center justify-between  mb-6">
                <h1 className="text-2xl font-extrabold text-gray-600 dark:text-slate-300 flex items-center">
                </h1>
                <div className="flex space-x-8">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 px-1 text-sm font-bold tracking-wide uppercase transition-colors border-b-[3px] ${activeTab === tab
                                ? 'border-[#7f19e6] text-[#7f19e6]'
                                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Render Component Content */}
            <div className="animate-in fade-in duration-500 overflow-y-auto max-h-[calc(100vh-100px)]">
                {renderContent()}
            </div>
        </div>
    );
}