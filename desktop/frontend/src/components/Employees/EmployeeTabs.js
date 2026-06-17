import React, { useEffect, useState } from "react";
// import Performance from '@/components/Performance';

import EmergencyContact from './EmergencyContact';
import Profile from './Profile';
import Document from './Edit/Document';
import Payroll from './Payroll';
import Leaves from './Leaves';
import Attendance from './Attendance';

const EmployeeTabs = ({ selectedEmployee }) => {

    const [payload, setPayload] = useState(null);

    useEffect(() => {
        setPayload(selectedEmployee);
    }, [selectedEmployee])

    const [activeTab, setActiveTab] = useState('profile');

    // Data structure for the tabs
    const TABS = [
        { id: 'profile', name: 'Personal' },
        { id: 'attendance', name: 'Attendance' },
        { id: 'contact', name: 'Contact' },
        { id: 'payroll', name: 'Payroll' },
        { id: 'documents', name: 'Documents' },
        { id: 'leaves', name: 'Leaves' },
        // { id: 'performance', name: 'Performance', icon: Briefcase },
    ];
    // Function to render tab content
    const renderTabContent = () => {
        if (!selectedEmployee) return;

        let {
            id, bank, payroll } = selectedEmployee;

        switch (activeTab) {
            case 'profile':
                return <Profile payload={payload} />;
            case 'contact':
                return <EmergencyContact payload={payload} />;
            case 'payroll':
                return (
                    <Payroll employee_id={id} bank={bank} payroll={payroll} />
                );
            case 'leaves':
                return (
                    <Leaves employee_id={id} payload={payload} />
                );
            case 'documents':
                return <Document employee_id={id} />;
            case 'attendance':
                return <Attendance payload={payload} />;
            // case 'performance':
            //   return <Performance payload={employee} />;
            default:
                return null;
        }
    };

    if (!selectedEmployee) return;
    if (!payload) return;

    return (

        <>
            <div className="mx-auto flex flex-col gap-8">
                <div className="w-full">
                    <div className="w-full p-1.5 rounded-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-1 backdrop-blur-sm shadow-sm">
                        {TABS.map((tab) => {
                            const isCurrent = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 px-6 py-2.5 rounded-full text-sm transition-all whitespace-nowrap ${
                                        isCurrent
                                            ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold shadow-lg shadow-violet-500/30"
                                            : "text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    {tab.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="min-h-[250px]">{renderTabContent()}</div>

            </div>
        </>


    );
};

export default EmployeeTabs;