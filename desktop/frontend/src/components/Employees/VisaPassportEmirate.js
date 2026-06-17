"use client";

import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

import Visa from '@/components/Employees/Visa';
import Emirate from '@/components/Employees/Emirate';
import Passport from './Passport';

// Data structure for the tabs
const TABS = [
    { id: 'visa', name: 'Visa', icon: MapPin },
    { id: 'passport', name: 'Passport', icon: MapPin },
    { id: 'emirate', name: 'Emirate', icon: MapPin },
];


export default function Home({ employee_id, visa, emirate, passport }) {

    const [activeTab, setActiveTab] = useState('visa');

    const renderTabContent = () => {

        switch (activeTab) {
            case 'visa':
                return <Visa employee_id={employee_id} visa={visa} />;
            case 'emirate':
                return <Emirate employee_id={employee_id} emirate={emirate} />;
            case 'passport':
                return <Passport employee_id={employee_id} passport={passport} />;
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
