"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import Branch from "@/components/Branch/Page";
import Department from "@/components/Department/Page";
import Device from "@/components/Device/Page";
import ShiftPage from "@/app/shift/page";
import SchedulePage from "@/app/schedule/page";
import EmployeesPage from "@/app/employees/page";
import GeoFencingSetup from "@/components/Setup/GeoFencingSetup";
import GovernmentHolidaysSetup from "@/components/Setup/GovernmentHolidaysSetup";
import AutoRegenerateSetup from "@/components/Setup/AutoRegenerateSetup";

export default function Index() {
    const [stepIndex, setStepIndex] = useState(0);

    const steps = [
        {
            id: 1,
            label: "Step 1",
            sidebarTitle: "Branch Info",
            title: "Branch Information",
            subtitle: "Create branch Info",
            content: (
                <Branch />
            ),
        },
        {
            id: 2,
            label: "Step 2",
            sidebarTitle: "Department Info",
            title: "Department Information",
            subtitle: "Now, add your departments.",
            content: (
                <Department />),
        },
        {
            id: 3,
            label: "Step 3",
            sidebarTitle: "Device Info",
            title: "Department Information",
            subtitle: "Now, add your departments.",
            content: (
                <Device />),
        },
        {
            id: 4,
            label: "Step 4",
            sidebarTitle: "Shift Info",
            title: "Department Information",
            subtitle: "Now, add your departments.",
            content: <ShiftPage />,
        },
        {
            id: 5,
            label: "Step 5",
            sidebarTitle: "Employee Info",
            title: "Department Information",
            subtitle: "Now, add your departments.",
            content: <EmployeesPage />,
        },
        {
            id: 6,
            label: "Step 6",
            sidebarTitle: "Assign Schedule",
            title: "Schedule Assignment",
            subtitle: "Assign shifts to employees.",
            content: <SchedulePage />,
        },
        {
            id: 7,
            label: "Step 7",
            sidebarTitle: "Geo-Fencing",
            title: "Employee Geo-Fencing",
            subtitle: "Set custom locations for employees.",
            content: <GeoFencingSetup />,
        },
        {
            id: 8,
            label: "Step 8",
            sidebarTitle: "Gov. Holidays",
            title: "Government Holidays",
            subtitle: "Customize holidays per employee.",
            content: <GovernmentHolidaysSetup />,
        },
        {
            id: 9,
            label: "Step 9",
            sidebarTitle: "Auto Regenerate",
            title: "Auto Regenerate Attendance",
            subtitle: "Schedule automatic regeneration.",
            content: <AutoRegenerateSetup />,
        },
    ];

    const currentStep = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;


    const handleNext = async () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            setOpen(false); // close dialog on finish
        }
    };

    const handleBack = async () => {
        setStepIndex(stepIndex - 1);
    };

    return (
        <Card className="flex flex-col border-none shadow-none rounded-none h-[calc(100vh-64px)] bg-transparent dark:bg-[#0b1326]">
            {/* Top nav — same style as the Automation page tabs (underline on active) */}
            <CardContent className="shrink-0 px-4 pt-3 bg-transparent">
                <div className="flex space-x-5 overflow-x-auto whitespace-nowrap scrollbar-none">
                    {steps.map((step, index) => {
                        const isActive = index === stepIndex;
                        return (
                            <button
                                key={step.id}
                                onClick={() => setStepIndex(index)}
                                title={step.sidebarTitle}
                                className={`pb-2 px-0.5 font-sans text-[11px] font-medium tracking-wide uppercase transition-colors border-b-2 ${isActive
                                    ? 'border-[#7f19e6] text-[#7f19e6]'
                                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {step.sidebarTitle}
                            </button>
                        );
                    })}
                </div>
            </CardContent>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto bg-gray-100/50 dark:bg-[#0b1326]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stepIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="p-8"
                    >
                        {currentStep.content}
                    </motion.div>
                </AnimatePresence>
            </div>
        </Card>
    );
}
