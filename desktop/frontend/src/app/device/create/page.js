"use client";

import React, { useEffect, useState } from "react";
import { SuccessDialog } from "@/components/SuccessDialog";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft, LogInIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { getBranches, createDevice } from "@/lib/api";
import DropDown from "@/components/ui/DropDown";
import { parseApiError } from "@/lib/utils";

import timezones from "@/lib/timezones";
import { MODEL_NUMBERS, FUNCTIONS, DEVICE_TYPES, STATUSSES } from "@/lib/dropdowns";
import Input from "@/components/Theme/Input";


const Create = () => {
    const router = useRouter();
    const handleGoBack = () => router.push(`/device`);
    const handleCancel = () => router.push(`/device`);

    // ✅ Local state instead of react-hook-form
    const [form, setForm] = useState({
        branch_id: "",
        device_type: "",
        name: "",
        short_name: "",
        model_number: "",
        device_id: "",
        utc_time_zone: "",
        location: "",
        function: "",
        status_id: "",
        ip: "0.0.0.0"
    });

    const [open, setOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);


    const [branches, setBranches] = useState([]);

    const fetchBranches = async () => {
        try {
            setBranches(await getBranches());
        } catch (error) {
            setGlobalError(parseApiError(error));
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const onSubmit = async (e) => {

        e.preventDefault();
        setGlobalError(null);
        setIsSubmitting(true);

        try {
            let { data } = await createDevice(form);
            if (data?.status == false) {
                const firstKey = Object.keys(data.errors)[0]; // get the first key
                const firstError = data.errors[firstKey][0]; // get its first error message
                setGlobalError(firstError);
                return;
            }
            setOpen(true);

            await new Promise((resolve) => setTimeout(resolve, 2000));

            setOpen(false);
            router.push(`/device`);
        } catch (error) {
            setGlobalError(parseApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="">
            <div className="relative dark:bg-card-dark px-13 rounded-lg">
                <div className="flex justify-between items-center px-5">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Device Create
                    </h1>
                    <Button
                        onClick={handleGoBack}
                        variant="default"
                        className="bg-primary text-white hover:bg-indigo-700 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        BACK
                    </Button>
                </div>

                <div className="relative dark:bg-card-dark p-8 pt-20 rounded-lg">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="lg:col-span-2 lg:pl-4">
                                <form onSubmit={onSubmit} className="space-y-8">
                                    <section>
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                                            <Briefcase className="mr-3 h-6 w-6 text-primary" />
                                            Create New Device
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Branch Select */}

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Branch</label>
                                                <DropDown
                                                    placeholder="Select Branch"
                                                    value={form.branch_id}
                                                    items={branches}
                                                    onChange={(val) => handleChange("branch_id", val)}
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Device Type</label>
                                                <DropDown
                                                    value={form.device_type}
                                                    items={DEVICE_TYPES}
                                                    onChange={(val) => handleChange("device_type", val)}
                                                />
                                            </div>


                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Name</label>
                                                <Input
                                                    value={form.name}
                                                    onChange={(e) => handleChange("name", e.target.value)}
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Short Name</label>
                                                <Input
                                                    value={form.short_name}
                                                    onChange={(e) => handleChange("short_name", e.target.value)}
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Model Number</label>
                                                <DropDown
                                                    value={form.model_number}
                                                    items={MODEL_NUMBERS}
                                                    onChange={(val) => handleChange("model_number", val)}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Serial Number</label>
                                                <Input
                                                    value={form.device_id}
                                                    onChange={(e) => handleChange("device_id", e.target.value)}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Timezone</label>
                                                <DropDown
                                                    value={form.utc_time_zone}
                                                    items={timezones}
                                                    onChange={(val) => handleChange("utc_time_zone", val)}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Location</label>
                                                <Input
                                                    value={form.location}
                                                    onChange={(e) => handleChange("location", e.target.value)}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Function</label>
                                                <DropDown
                                                    value={form.function}
                                                    items={FUNCTIONS}
                                                    onChange={(val) => handleChange("function", val)}
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Status</label>
                                                <DropDown
                                                    value={form.status_id}
                                                    items={STATUSSES}
                                                    onChange={(val) => handleChange("status_id", val)}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Error Display */}
                                    {globalError && (
                                        <div
                                            className="mb-4 p-3 border border-red-500 bg-red-50 text-red-700 rounded-lg"
                                            role="alert"
                                        >
                                            {globalError}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex justify-end space-x-4 pt-4">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleCancel}
                                        >
                                            CANCEL
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-primary hover:bg-indigo-700"
                                        >
                                            {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                                        </Button>
                                    </div>
                                </form>

                                <SuccessDialog
                                    open={open}
                                    onOpenChange={setOpen}
                                    title="Device Created"
                                    description="Device Created successfully."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Create;
