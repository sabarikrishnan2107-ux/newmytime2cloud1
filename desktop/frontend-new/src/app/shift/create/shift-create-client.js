"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { notify, parseApiError } from "@/lib/utils";
import { shiftDetails, storeShift, updateShift } from "@/lib/api";

import { Loader } from "@/components/Loader";
import AttendanceRules from "@/components/Shift/AttendanceRules";
import ShiftHeader from "@/components/Shift/Header";
import ShiftIdentity from "@/components/Shift/ShiftIdentity";
import LiveInsightSidebar from "@/components/Shift/LiveInsightSidebar";
import MultiAndFlexible from "@/components/Shift/MultiAndFlexible";
import Dual from "@/components/Shift/Dual";
import SingleAndNight from "@/components/Shift/SingleAndNight";

import PAYLOAD from "./payload";

export default function ShiftCreateClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");

    const handleGoBack = () => router.push("/shift");

    const [shift, setshift] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (key, value) => {
        console.log(key, value);
        setshift((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const renderShiftTypeComponent = () => {
        const typeId = Number(shift.shift_type_id);

        switch (typeId) {
            case 1:
            case 2:
                return <MultiAndFlexible shift={shift} handleChange={handleChange} />;
            case 4:
            case 6:
                return <SingleAndNight shift={shift} handleChange={handleChange} />;
            case 5:
                return <Dual shift={shift} handleChange={handleChange} />;
            default:
                return null;
        }
    };

    const onSubmit = async () => {
        setIsSubmitting(true);

        try {
            const action = shift?.id ? updateShift(shift, shift.id) : storeShift(shift);
            const response = await action;

            if (!response.status) {
                const firstError = response.errors
                    ? Object.values(response.errors).flat()[0]
                    : "An unknown validation error occurred.";

                notify("Error", firstError, "error");
                setIsSubmitting(false);
                return;
            }

            await notify("Success", "Shift information saved successfully.", "success");
            router.push("/shift");
        } catch (error) {
            console.error("Submission failed:", error);
            notify("Error", parseApiError(error), "error");
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchShift = async (shiftId) => {
            try {
                const response = await shiftDetails(shiftId);
                const shiftData = response.data || response;
                setshift(shiftData);
            } catch (error) {
                console.error(error);
                notify("Error", "Failed to load shift details", "error");
            }
        };

        if (id) {
            fetchShift(id);
        } else {
            setshift(PAYLOAD);
        }
    }, [id]);

    if (!shift) return <Loader />;

    return (
        <div className="p-5 overflow-y-auto max-h-[calc(100vh-100px)]">
            <ShiftHeader />
            <div className="flex flex-col lg:flex-row">
                <div className="w-full lg:w-[70%] p-6 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]">
                    <div className="mx-auto lg:mx-0 space-y-8">
                        <ShiftIdentity shift={shift} handleChange={handleChange} />

                        {renderShiftTypeComponent()}

                        <AttendanceRules shift={shift} handleChange={handleChange} />

                        <div className="w-full flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleGoBack}
                                className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                className="px-6 py-2.5 rounded-lg bg-indigo-600 text-gray-600 dark:text-slate-300 font-medium shadow-lg hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
                            >
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-[30%] bg-white dark:bg-slate-900 border-l border-gray-200 dark:dark:border-white/10 p-6 flex flex-col gap-6 lg:min-h-full backdrop-blur-sm">
                    <LiveInsightSidebar shift={shift} />
                </div>
            </div>
        </div>
    );
}
