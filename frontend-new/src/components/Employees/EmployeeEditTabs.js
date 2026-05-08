"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import Payroll from './Edit/Payroll';
import BankingDetails from './Edit/BankingDetails';
import EmployeeProfileTest from './Edit/Education';
import EmployeeDocuments from './Edit/Document';
import EmployeeContact from './Edit/Contact';
import Profile from './Edit/Profile';
import { useRouter, useSearchParams } from 'next/navigation';
import SETTINGRFIDLOGIN from './SETTINGRFIDLOGIN';

const EditEmployeeRecord = ({ selectedEmployee }) => {

    const router = useRouter();
    const searchParams = useSearchParams();

    const tabs = ['Personal', 'Contact', 'Payroll', 'Document', 'Banking', 'Settings'];

    const tabFromUrl = (() => {
        const t = (searchParams?.get?.("tab") || "").toLowerCase();
        const match = tabs.find((x) => x.toLowerCase() === t);
        return match || "Personal";
    })();

    const [activeTab, setActiveTab] = useState(tabFromUrl);
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        setPayload(selectedEmployee);
    }, [selectedEmployee]);

    // Re-sync if the URL tab changes (e.g., user navigates from Document Expiry feed)
    useEffect(() => {
        if (tabFromUrl && tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabFromUrl]);


    if (!selectedEmployee) return;
    if (!payload) return;

    return (
        <main className="w-full max-w-screen-2xl mx-auto p-4 sm:p-6 md:p-8 xl:p-10 overflow-y-auto max-h-[calc(100vh-100px)]">

            {/* Breadcrumbs & Header */}
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span>Employees</span>
                    <ChevronRight size={14} />
                    <span className="text-[#7f19e6] font-medium">Edit Record</span>
                </div>
                <div className='flex justify-between'>
                    <div className=''>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Edit Employee Record
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 text-base">
                            Update personal information, contact details, and identification documents.
                        </p>
                    </div>
                    <button onClick={() => router.push("/employees")} className="flex items-center h-[30px] px-4  text-xs font-bold uppercase  rounded-lg transition-all 
    bg-gray-200 text-gray-600 hover:bg-gray-300 
    dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white">
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-[#dbd0e7] dark:border-slate-700 mb-6">
                <div className="flex gap-8 ">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 px-1 text-sm font-bold tracking-wide uppercase transition-colors border-b-[3px] ${activeTab === tab
                                ? 'border-[#7f19e6] text-[#7f19e6] dark:border-[#c084fc] dark:text-white'
                                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab == "Personal" && <Profile action={'Edit'} payload={payload} />}
            {activeTab == "Contact" && <EmployeeContact action={'Edit'} payload={payload} />}
            {activeTab == "Document" && <EmployeeDocuments employee_id={payload.id} />}
            {activeTab == "Banking" && <BankingDetails action={'Edit'} payload={payload} />}
            {activeTab == "Payroll" && <Payroll action={'Edit'} employee_id={payload.id} />}
            {activeTab == "Settings" &&
                <SETTINGRFIDLOGIN
                    id={payload.id}
                    email={payload?.user?.email}
                    user_id={payload?.user?.id}
                    web_login_access={payload?.user?.web_login_access}
                    mobile_app_login_access={payload?.user?.mobile_app_login_access}
                    tracking_status={payload?.user?.tracking_status}
                    mobile_punch={payload?.user?.mobile_punch}

                    rfid_card_number={payload.rfid_card_number}
                    rfid_card_password={payload.rfid_card_password}
                    leave_group_id={payload.leave_group_id}
                    reporting_manager_id={payload.reporting_manager_id}
                    status={payload.status} />
            }
        </main>
    );
};

export default EditEmployeeRecord;