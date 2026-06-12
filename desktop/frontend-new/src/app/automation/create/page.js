"use client";

import React, { useEffect, useState } from "react";
import { SuccessDialog } from "@/components/SuccessDialog";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft, LogInIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { getBranches, storeSchedule } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DepartmentSelect from "@/components/ui/DepartmentSelect";
import EmployeeMultiSelect from "@/components/ui/EmployeeMultiSelect";
import DateRangeSelect from "@/components/ui/DateRange";
import DropDown from "@/components/ui/DropDown";
import ShiftSelect from "@/components/ui/ShiftSelect";
import { parseApiError } from "@/lib/utils";

const EmployeeProfileForm = () => {
    const router = useRouter();
    const handleGoBack = () => router.push(`/employees`);
    const handleCancel = () => router.push(`/employees`);

    // ✅ Local state instead of react-hook-form
    const [formData, setFormData] = useState({
        branch_id: "",
        department_id: "",
        shift_id: 0,
        employee_ids: [],
        schedules: [
            {
                shift_id: 188,
                shift_type_id: 6,
                from_date: "2025-11-01",
                to_date: "2025-12-31",
                is_over_time: false,
                isAutoShift: false,
            },
        ],
        replace_schedules: false,
    });

    const [open, setOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [filterEmployeesByScheduleType, setFilterEmployeesByScheduleType] = useState(0);

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

        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log(formData);

        try {
            await storeSchedule(formData);

            setOpen(true);

            await new Promise((resolve) => setTimeout(resolve, 2000));

            setOpen(false);
            router.push(`/schedule`);
        } catch (error) {
            setGlobalError(parseApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="">
            <div className="relative dark:bg-card-dark px-13 rounded-lg">
                <div className="flex justify-between items-center px-5">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Assign Employees
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
                                            Employee Schedule Details
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Branch Select */}
                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Branch</label>
                                                <DropDown
                                                    placeholder="Select Branch"
                                                    value={formData.branch_id}
                                                    items={branches}
                                                    onChange={(id) => { setFormData((prev) => ({ ...prev, branch_id: id })) }}
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Department</label>
                                                <DepartmentSelect
                                                    selectedBranchId={formData.branch_id}
                                                    value={formData.department_id}
                                                    onChange={(id) =>
                                                        setFormData((prev) => ({ ...prev, department_id: id }))
                                                    }
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Scheduled/ UnScheduled</label>
                                                <DropDown
                                                    value={filterEmployeesByScheduleType}
                                                    items={
                                                        [
                                                            { id: `2`, name: `All Employees` },
                                                            { id: `1`, name: "Scheduled Only" },
                                                            { id: `0`, name: "Un-Scheduled" },
                                                        ]}
                                                    onChange={(id) =>
                                                        setFilterEmployeesByScheduleType(id)
                                                    }
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Employee</label>
                                                <EmployeeMultiSelect
                                                    selectedBranchId={formData.branch_id}
                                                    selectedDepartmentId={formData.department_id}
                                                    filterEmployeesByScheduleType={filterEmployeesByScheduleType}
                                                    value={formData.employee_ids}
                                                    onChange={(id) =>
                                                        setFormData((prev) => ({ ...prev, employee_ids: id }))
                                                    }
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Shift</label>
                                                <ShiftSelect
                                                    selectedBranchId={formData.branch_id}
                                                    value={formData.schedules[0].shift_id}
                                                    onChange={(schedule) => {
                                                        console.log(schedule);
                                                        setFormData((prev) => ({ ...prev, schedules: [schedule] }))
                                                    }
                                                    }
                                                />
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="font-medium mb-1">Date Range</label>
                                                <DateRangeSelect
                                                    value={{ from: formData.form, to: formData.to }}
                                                    onRangeChange={({ from, to }) =>
                                                        setFormData((prev) => ({
                                                            ...prev, schedules: [
                                                                {
                                                                    ...prev.schedules[0],
                                                                    from_date: from,
                                                                    to_date: to,

                                                                }
                                                            ]
                                                        }))
                                                    } />
                                            </div>
                                        </div>
                                        <div className="">
                                            <div className="flex items-center space-x-3 mt-6">
                                                <Switch
                                                    // ✅ FIX 1: Add the necessary id for the Label's htmlFor to connect
                                                    id="over-time-switch"
                                                    checked={formData.is_over_time}
                                                    onCheckedChange={
                                                        (val) => {
                                                            setFormData((prev) => ({
                                                                ...prev, schedules: [
                                                                    {
                                                                        ...prev.schedules[0],
                                                                        is_over_time: val,

                                                                    }
                                                                ]
                                                            }))
                                                        }
                                                    }
                                                />
                                                <Label
                                                    // ✅ FIX 2: Update htmlFor to match the new id of the first Switch
                                                    htmlFor="over-time-switch"
                                                    className="text-sm font-medium text-text-light dark:text-text-dark"
                                                >
                                                    Over Time
                                                </Label>
                                            </div>

                                            <div className="flex items-center space-x-3 mt-6">
                                                <Switch
                                                    // ✅ FIX 3: Update the id to be unique and descriptive
                                                    id="auto-shift-switch"
                                                    checked={formData.isAutoShift}

                                                    onCheckedChange={
                                                        (val) => {
                                                            setFormData((prev) => ({
                                                                ...prev, schedules: [
                                                                    {
                                                                        ...prev.schedules[0],
                                                                        isAutoShift: val,

                                                                    }
                                                                ]
                                                            }))
                                                        }
                                                    }
                                                />
                                                <Label
                                                    // ✅ FIX 4: Update htmlFor to match the new unique id
                                                    htmlFor="auto-shift-switch"
                                                    className="text-sm font-medium text-text-light dark:text-text-dark"
                                                >
                                                    is Auto Shift
                                                </Label>
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
                                    title="Schedule Assigned"
                                    description="Schedule has been assinged employee profile."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeProfileForm;
