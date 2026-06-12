"use client";

import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

import Bank from './Bank';
import Payroll from './Payroll';

// Data structure for the tabs
const TABS = [
    { id: 'bank', name: 'Bank', icon: MapPin },
    { id: 'payroll', name: 'Payroll', icon: MapPin },
];


export default function BANKPAYROLL({ employee_id, bank, payroll }) {

    const [activeTab, setActiveTab] = useState('bank');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'bank':
                return <Bank employee_id={employee_id} bank={bank} />;
            case 'payroll':
                return <Payroll employee_id={employee_id} payroll={payroll} />;
            default:
                return null;
        }
    };

    return (
        <>
            <div className="bg-surface-light dark:bg-surface-dark px-6 py-4 rounded-lg flex shadow-sm">
                {/* Left Tabs */}
                <div className="flex flex-col w-48 border-r border-border">
                    {TABS.map((tab) => {
                        const isCurrent = activeTab === tab.id;
                        const classes = isCurrent
                            ? 'border-l-2 border-primary bg-surface-light dark:bg-surface-dark text-primary font-medium'
                            : 'border-l-4 border-transparent text-subtext-light dark:text-subtext-dark  hover:text-text-light dark:hover:text-text-dark';

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${classes} py-3 px-4 text-left transition-colors duration-200 focus:outline-none`}
                            >
                                {tab.name}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 pl-6 min-h-[250px]">
                    {renderTabContent()}
                </div>
            </div>
        </>
    );
}
