// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import { createDesignations, getBranches, getDepartments, getDepartmentsByBranchIds, getEmployeeList, getScheduledEmployeeList, getScheduleEmployees, getShiftDropDownList, getShifts, regenerateReport, storeSchedule } from "@/lib/api";
import { SuccessDialog } from "@/components/SuccessDialog";
import { notify, parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";
import TextArea from "../Theme/TextArea";
import Dropdown from "../Theme/DropDown";
import DropDown from "../ui/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
import DateRangeSelect from "../ui/DateRange";
import { Checkbox } from "../ui/checkbox";
import { useDebounce } from "@/hooks/useDebounce";
import { id } from "date-fns/locale";
import ShiftPreview from "../Shift/ShiftPreview";
import { File, Printer, RefreshCcw } from "lucide-react";
import ProfilePicture from "../ProfilePicture";


let defaultPayload = {
    name: "",
    description: "",
};

const CSVDownload = ({ onSuccess = () => { } }) => {

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

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [response, setResponse] = useState([]);

    const fetchDropdowns = async () => {
        try {
            setBranches(await getBranches());
            setShifts(await getShiftDropDownList());
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
        }
    }, [open]);

    useEffect(() => {

        const fetchEmployees = async (selectedDepartmentIds) => {
            try {
                console.log(`await getScheduledEmployeeList()`);
                let emp = await getScheduledEmployeeList(selectedDepartmentIds);
                console.log(emp);
                setEmployees(emp);
                setFilteredEmployees(emp);
                console.log(`await getScheduledEmployeeList()`);
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


        if (!from || !to) {
            notify("Error", "Date range must be selected", "error");
            setLoading(false);
            return;
        }


        let json = {
            "dates": [from, to],
            "reason": "",
            "employee_ids": selectedIds,
            "shift_type_id": 1,
        }

        // /start-report-generation&company_id=60&report_type=Monthly&shift_type_id=0&report_template=Template1&overtime=0&from_date=2026-02-16&to_date=2026-02-16&employee_id[]=2075&daily_date=2026-02-16&showTabs=%7B%22single%22:true,%22double%22:true,%22multi%22:true%7D&tabselected=0&filterType=Monthly&key=3

        setLoading(true);

        try {
            setResponse(await regenerateReport(json));
        } catch (error) {
            await notify("Error", parseApiError(error), "error");
        } finally {
            setLoading(false);
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

    // Create the debounced version of your search logic
    const debouncedSearch = useDebounce((value) => {
        // 1. If no value, show everyone
        if (!value) {
            setFilteredEmployees(employees);
            return;
        }

        // 2. Normalize search term to lowercase
        const searchTerm = value.toLowerCase();

        const filtered = employees.filter(e =>
            // 3. Normalize employee name to lowercase for the comparison
            e.name.toLowerCase().includes(searchTerm)
        );

        setFilteredEmployees(filtered);
        console.log("Searching API for:", value);
    }, 500);

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearchTerm(val);   // Updates the input instantly
        debouncedSearch(val); // Triggers the delayed action
    };

    return (
        <>
            <button onClick={() => setOpen(true)}
                className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
            >
                <File size={15} />
            </button>

            {/* Modal Portal Logic */}
            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4"
                >
                    {/* Backdrop/Overlay */}
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={toggleModal}
                    ></div>

                    {/* Modal Card */}
                    <div className="relative min-w-[1000px]  overflow-y-auto max-h-[calc(100vh-130px)]  bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10  overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">Regenerate</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Regnerate report for employee(s)
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
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



                                            <Input
                                                placeholder="Search by name or ID"
                                                icon="search"
                                                value={searchTerm}
                                                onChange={handleSearch}
                                            />

                                            <DateRangeSelect
                                                value={{ from, to }}
                                                onChange={({ from, to }) => {
                                                    setFrom(from);
                                                    setTo(to);
                                                }
                                                } />
                                        </div>


                                        {/* Employee Table */}
                                        <div className="overflow-y-auto max-h-[400px] rounded-3xl border border-stone-200 dark:border-white/10 shadow-elevation-1">
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
                                                                        <div className="font-bold text-slate-800 dark:text-white">{emp.name}</div>
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

                                <div className="grid grid-cols-1 gap-6">
                                    <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5 h-full">

                                        <div className="flex flex-col gap-3">
                                            {response.map((row, index) => {
                                                const hasNoData = row.toLowerCase().includes("no data");
                                                const isShift = row.toLowerCase().includes("shift");
                                                const isSync = row.toLowerCase().includes("sync");

                                                return (
                                                    <div
                                                        key={index}
                                                        className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-black/20 px-4 py-3 hover:shadow-md transition"
                                                    >
                                                        {/* Status Indicator */}
                                                        <div
                                                            className={`mt-1 w-2.5 h-2.5 rounded-full ${hasNoData
                                                                    ? "bg-amber-400"
                                                                    : isSync
                                                                        ? "bg-blue-400"
                                                                        : isShift
                                                                            ? "bg-green-400"
                                                                            : "bg-gray-400"
                                                                }`}
                                                        />

                                                        {/* Log Text */}
                                                        <div className="flex-1">
                                                            <p className="font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                                                {row}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
                                {loading ? "Saving..." : "Regenerate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CSVDownload;
