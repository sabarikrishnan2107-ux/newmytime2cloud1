// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";

import { createDesignations, getBranches, getDepartments, getDepartmentsByBranchIds, getEmployeeList, getScheduledEmployeeList, getScheduleEmployees, getShiftDropDownList, getShifts, storeSchedule } from "@/lib/api";
import { SuccessDialog } from "@/components/SuccessDialog";
import { notify, parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";
import TextArea from "../Theme/TextArea";
import Dropdown from "../Theme/DropDown";
import DropDown from "../ui/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
import DateRangeSelect from "../ui/DateRange";
import { Checkbox } from "../ui/checkbox";
import { id } from "date-fns/locale";
import ShiftPreview from "../Shift/ShiftPreview";
import ProfilePicture from "../ProfilePicture";

// Reusable Toggle Component
const ToggleItem = ({ title, desc, checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
        />
        {/* Track */}
        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer 
        peer-checked:bg-slate-300 dark:peer-checked:bg-slate-600 border border-transparent 
        transition-all duration-300 ease-in-out">
        </div>

        {/* Thumb (Circle) */}
        <div className="absolute left-[2px] top-[2px] w-5 h-5 rounded-full 
        shadow-md transition-all duration-300 ease-in-out 
        
        /* State-based Colors */
        bg-white peer-checked:bg-primary 
        
        peer-checked:translate-x-5">
        </div>
    </label>
);

let defaultPayload = {
    name: "",
    description: "",
};

const Create = ({ onSuccess = () => { } }) => {

    const [open, setOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    const [selectedDepartmentIds, setSelectedDepartment] = useState([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedShiftId, setSelectedShiftId] = useState(0);
    const [previewShift, setPreviewShift] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [isAutoShift, setIsAutoShift] = useState(false);

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [scheduleFilter, setScheduleFilter] = useState("all"); // "all" | "scheduled" | "unscheduled"

    const filteredEmployees = useMemo(() => {
        let list = employees;
        if (searchTerm) {
            const t = searchTerm.toLowerCase();
            list = list.filter((e) =>
                (e.name || "").toLowerCase().includes(t) ||
                String(e.employee_id || "").toLowerCase().includes(t)
            );
        }
        if (scheduleFilter === "scheduled") {
            list = list.filter((e) => Array.isArray(e.schedule) && e.schedule.length > 0);
        } else if (scheduleFilter === "unscheduled") {
            list = list.filter((e) => !Array.isArray(e.schedule) || e.schedule.length === 0);
        }
        return list;
    }, [employees, searchTerm, scheduleFilter]);

    const fetchDropdowns = async () => {
        try {
            setBranches(await getBranches());
            const list = await getShiftDropDownList();
            const withAuto = [
                { id: "auto", name: "Auto Shift" },
                ...((Array.isArray(list) ? list : []).filter((s) => s?.id !== "auto")),
            ];
            setShifts(withAuto);
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    useEffect(() => {
        const fetchDepartment = async (selectedBranchIds) => {
            setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
        }
        fetchDepartment(selectedBranchIds);
    }, [selectedBranchIds]);


    useEffect(() => {
        let foundShift = shifts.find(e => e.id == selectedShiftId);

        console.log(foundShift);

        if (foundShift) {
            setPreviewShift(foundShift);
        }
    }, [selectedShiftId]);

    const [form, setForm] = useState(defaultPayload);
    const toggleModal = () => setOpen(!open);

    useEffect(() => {
        if (open) {
            setForm(defaultPayload);
            fetchDropdowns();
            setSelectedDepartment([]);
            setSelectedBranchIds([]);
            setShifts([]);
            setSelectedShiftId(0);
            setPreviewShift(null);
            setFrom(null);
            setTo(null);
            setIsAutoShift(false);
        }
    }, [open]);

    useEffect(() => {

        const fetchEmployees = async (selectedDepartmentIds) => {
            try {
                let emp = await getScheduledEmployeeList(selectedDepartmentIds);
                setEmployees((emp || []).map(e => ({
                    ...e,
                    name: e.full_name || e.name
                })));
            } catch (error) {
                setError(parseApiError(error));
            }
        };

        fetchEmployees(selectedDepartmentIds);

    }, [selectedDepartmentIds]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const onSubmit = async () => {

        if (!selectedIds.length) {
            notify("Error", "Employee must be selected", "error");
            setLoading(false);
            return;
        }

        if (!previewShift) {
            notify("Error", "Shift must be selected", "error");
            setLoading(false);
            return;
        }

        if (!from || !to) {
            notify("Error", "Date range must be selected", "error");
            setLoading(false);
            return;
        }


        let json = {
            "employee_ids": selectedIds,
            "schedules": [
                {
                    "shift_id": previewShift?.id,
                    "shift_type_id": previewShift?.shift_type_id,
                    "from_date": from,
                    "to_date": to,
                    "is_over_time": false,
                    "isAutoShift": isAutoShift
                }
            ],
            "company_id": 0,
            "replace_schedules": false,
            "branch_id": 0
        }

        setLoading(true);

        try {
            let { data } = await storeSchedule(json);

            console.log(data);


            // FIX: Check if status is explicitly false
            if (data?.status === false) {
                const firstKey = Object.keys(data.errors)[0];
                const firstError = data.errors[firstKey][0];
                notify("Error", firstError, "error");
                return; // Stop execution if there's a validation error
            }

            await notify("Success", "Shift has been assign", "success");
            setOpen(false);
        } catch (error) {
            await notify("Error", parseApiError(error), "error");
        } finally {
            // setLoading(false);
        }
    };

    const [selectedIds, setSelectedIds] = useState([]);

    // Toggle single selection
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Toggle select all
    const toggleAll = () => {
        if (selectedIds.length === employees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(employees.map(emp => emp.id));
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);

    return (
        <>
            <button onClick={() => setOpen(true)}
                className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
            >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add
            </button>

            {/* Modal Portal Logic */}
            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 pb-6"
                >
                    {/* Backdrop/Overlay */}
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={toggleModal}
                    ></div>

                    {/* Modal Card */}
                    <div className="relative min-w-[1200px]  overflow-y-auto max-h-[calc(100vh-140px)]  bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10  overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">Add Schedule</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Assign schedule in the system
                                </p>
                            </div>
                            <button
                                onClick={toggleModal}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>



                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-surface-variant/30 dark:bg-black/20">
                            <div className="flex flex-col gap-6 pb-24">

                                <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-gray-600 dark:text-white flex items-center gap-3">
                                            Select Employees
                                        </h2>
                                    </div>

                                    <div className="flex flex-col gap-6">

                                        {/* Filters */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <MultiDropDown
                                                placeholder={'Select Branch'}
                                                items={branches}
                                                value={selectedBranchIds}
                                                onChange={setSelectedBranchIds}
                                                badgesCount={1}
                                            />

                                            <MultiDropDown
                                                placeholder={'Select Department'}
                                                items={departments}
                                                value={selectedDepartmentIds}
                                                onChange={setSelectedDepartment}
                                                badgesCount={1}
                                            />

                                            <DropDown
                                                placeholder="All"
                                                width="w-full"
                                                value={scheduleFilter}
                                                onChange={(v) => setScheduleFilter(v || "all")}
                                                items={[
                                                    { id: "all", name: "All" },
                                                    { id: "scheduled", name: "Scheduled" },
                                                    { id: "unscheduled", name: "Unscheduled" },
                                                ]}
                                            />

                                            <Input
                                                placeholder="Search by name or ID"
                                                icon="search"
                                                value={searchTerm}
                                                onChange={handleSearch}
                                            />
                                        </div>


                                        {/* Employee Table — shows ~4 rows, then scrolls */}
                                        <div className="overflow-y-auto max-h-[300px] rounded-3xl border border-stone-200 dark:border-white/10 shadow-elevation-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-[#efece5] dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-semibold border-b border-stone-200 dark:border-white/5">
                                                        {/* Checkbox Header */}
                                                        <th className="pl-6 py-4">


                                                            <Checkbox
                                                                checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length}
                                                                onCheckedChange={toggleAll}
                                                            />

                                                        </th>
                                                        <th className="pr-6 py-4 font-bold">Employee Name</th>
                                                        <th className="px-6 py-4 font-bold">Employee ID</th>
                                                        <th className="px-6 py-4 font-bold">Department</th>
                                                        <th className="px-6 py-4 font-bold">Designation</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100 dark:divide-white/5 bg-surface-light dark:bg-surface-dark">
                                                    {filteredEmployees.map((emp) => (
                                                        <tr
                                                            key={emp.id}
                                                            className={`transition-colors group hover:bg-[#f8f6f1] dark:hover:bg-white/5 ${selectedIds.includes(emp.id) ? 'bg-[#fcfaf6] dark:bg-white/[0.02]' : ''
                                                                }`}
                                                        >
                                                            {/* Checkbox Cell */}
                                                            <td className="pl-6 py-4">

                                                                <Checkbox
                                                                    checked={selectedIds.includes(emp.id)}
                                                                    onCheckedChange={() => toggleSelect(emp.id)}
                                                                />


                                                            </td>
                                                            <td className="pr-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <ProfilePicture src={emp.profile_picture} />
                                                                    <div>
                                                                        <div className="font-bold text-slate-800 dark:text-white">{emp.full_name}</div>
                                                                        <div className="text-xs text-slate-500">{emp.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.employee_id}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.department?.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.designation?.name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </section>

                                {/* BOTTOM GRID */}
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                                    {/* SECTION 2: CONFIGURATION */}
                                    <section className="xl:col-span-1 bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5 h-full flex flex-col">
                                        <h2 className="text-lg font-bold text-gray-600 dark:text-white flex items-center gap-3 mb-6">
                                            Configuration
                                        </h2>
                                        <div className="flex flex-col gap-5 flex-1">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">Shift Profile</label>
                                                <div className="relative">
                                                    <DropDown
                                                        items={shifts}
                                                        value={selectedShiftId}
                                                        onChange={(id) => {
                                                            setSelectedShiftId(id);
                                                        }}
                                                        placeholder="Select Shift"
                                                        width="w-full"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-gray-200 ml-1">Effective Range</label>
                                                <div className="flex flex-col gap-3">
                                                    <DateRangeSelect
                                                        value={{ from, to }}
                                                        onChange={({ from, to }) => {
                                                            setFrom(from);
                                                            setTo(to);
                                                        }
                                                        } />
                                                </div>
                                            </div>

                                        </div>
                                    </section>

                                    {/* SECTION 3: PATTERN PREVIEW */}
                                    <section className="xl:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl shadow-elevation-1 border border-gray-200 dark:border-white/5  flex flex-col">
                                        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4  backdrop-blur-sm">
                                            <h2 className="text-lg font-bold text-gray-600 dark:text-white flex items-center gap-3">
                                                Pattern Preview
                                            </h2>
                                        </div>
                                        <div className="p-6">
                                            {/* Timeline and Bars (Simplified for brevity, similar to your HTML) */}
                                            <ShiftPreview shift={previewShift} />
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10  flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={toggleModal}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-white hover:bg-background-dark transition-all text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20"
                            >
                                {loading ? "Saving..." : "Save Schedule"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Create;
