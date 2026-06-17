"use client";

import React, { useEffect, useRef, useState } from "react";
import { SuccessDialog } from "@/components/SuccessDialog";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
import { parseApiError } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    getBranches,
    getDepartments,
    getShiftDropDownList,
    storeEmployee,
} from "@/lib/api";

import DatePicker from "@/components/ui/DatePicker";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import DropDown from "../ui/DropDown";

const EmployeeScheduleEdit = () => {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const handleCancel = () => router.push(`/schedule`);

    // ----------------------------
    // Local State
    // ----------------------------
    const [formData, setFormData] = useState({
        branch_id: "",
        department_id: "",
        shift_id: "",
        from_date: null,
        to_date: null,
        over_time: false,
    });

    const [open, setOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ----------------------------
    // Fetch dropdown data
    // ----------------------------
    useEffect(() => {
        const fetchShifts = async () => {
            try {
                const r = await getShiftDropDownList();
                setShifts(r);
            } catch (error) {
                console.error("Error fetching shifts:", error);
                setShifts([]);
            }
        };
        fetchShifts();
    }, []);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                setBranches(await getBranches());
            } catch (error) {
                console.error("Error fetching branches:", error);
                setBranches([]);
            }
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                setDepartments(await getDepartments(null));
            } catch (error) {
                console.error("Error fetching departments:", error);
                setDepartments([]);
            }
        };
        fetchDepartments();
    }, []);

    // ----------------------------
    // Form Change Handlers
    // ----------------------------
    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = () => {
        setFormData((prev) => ({ ...prev, over_time: !prev.over_time }));
    };

    // ----------------------------
    // Submit
    // ----------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setGlobalError(null);
        setIsSubmitting(true);

        try {
            await storeEmployee(formData);

            setOpen(true);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            setOpen(false);

            router.push(`/employees`);
        } catch (error) {
            setGlobalError(parseApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    // ----------------------------
    // JSX
    // ----------------------------
    return (
        <div className="relative dark:bg-card-dark rounded-lg">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="lg:col-span-2 lg:pl-4">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                                    <Briefcase className="mr-3 h-6 w-6 text-primary" />
                                    Employee Schedule Details
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Branch */}
                                    <div className="flex flex-col">
                                        <label className="font-medium mb-2">Branch</label>
                                        <DropDown
                                            placeholder="Select Branch"
                                            value={formData.branch_id}
                                            items={branches}
                                            onChange={(id) => handleChange("branch_id", id)}
                                        />
                                    </div>

                                    {/* Department */}
                                    <div className="flex flex-col">
                                        <label className="font-medium mb-2">Department</label>
                                        <DropDown
                                            placeholder="Select Department"
                                            value={formData.department_id}
                                            items={departments}
                                            onChange={(id) => handleChange("department_id", id)}
                                        />
                                    </div>

                                    {/* Shift */}
                                    <div className="flex flex-col">
                                        <label className="font-medium mb-2">Shift</label>
                                        <DropDown
                                            placeholder="Select Shift"
                                            value={formData.shift_id}
                                            items={shifts}
                                            onChange={(id) => handleChange("shift_id", id)}
                                        />
                                    </div>

                                    {/* From Date */}
                                    <div className="flex flex-col">
                                        <label className="font-medium mb-2">From Date</label>
                                        <DatePicker
                                            value={formData.from_date}
                                            onChange={(date) => handleChange("from_date", date)}
                                            placeholder="From Date"
                                        />
                                    </div>

                                    {/* To Date */}
                                    <div className="flex flex-col">
                                        <label className="font-medium mb-2">To Date</label>
                                        <DatePicker
                                            value={formData.to_date}
                                            onChange={(date) => handleChange("to_date", date)}
                                            placeholder="To Date"
                                        />
                                    </div>

                                    {/* Over Time */}
                                    <div className="flex items-center space-x-3">
                                        <Switch
                                            id="auto-shift"
                                            checked={formData.over_time}
                                            onCheckedChange={handleSwitchChange}
                                        />
                                        <Label
                                            htmlFor="auto-shift"
                                            className="text-sm font-medium text-text-light dark:text-text-dark"
                                        >
                                            Over Time
                                        </Label>
                                    </div>
                                </div>
                            </section>

                            {globalError && (
                                <div
                                    className="mb-4 p-3 border border-red-500 bg-red-50 text-red-700 rounded-lg"
                                    role="alert"
                                >
                                    {globalError}
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-4 pt-4">
                                <Button type="button" variant="secondary" onClick={handleCancel}>
                                    CANCEL
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-primary hover:bg-indigo-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                                </Button>
                            </div>
                        </form>

                        <SuccessDialog
                            open={open}
                            onOpenChange={setOpen}
                            title="Profile Saved"
                            description="Your profile information has been inserted successfully."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeScheduleEdit;
