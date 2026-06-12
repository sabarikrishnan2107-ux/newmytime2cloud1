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
import { RefreshCcw } from "lucide-react";
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

const RegenerateReport = ({ shift_type_id, onSuccess = () => { } }) => {

    const [open, setOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
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
            setResponse([]);
            setSearchTerm('');
        }
    }, [open]);

    useEffect(() => {

        const fetchEmployees = async (selectedDepartmentIds) => {
            try {
                console.log(`await getScheduledEmployeeList()`);
                let emp = await getScheduledEmployeeList(selectedDepartmentIds);
                let data = emp.map(e => ({
                    ...e,
                    name: e.full_name || e.name
                }));
                setEmployees(data || []);
                setFilteredEmployees(data || []);
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
            return;
        }

        if (!from || !to) {
            notify("Error", "Date range must be selected", "error");
            return;
        }

        setResponse(["Regenerating..."]);
        setLoading(true);

        try {
            const fromDate = new Date(from).toISOString().split('T')[0];
            const toDate = new Date(to).toISOString().split('T')[0];

            let json = {
                "dates": [fromDate, toDate],
                "reason": "",
                "employee_ids": selectedIds,
                "shift_type_id": shift_type_id,
            };

            const result = await regenerateReport(json);

            if (Array.isArray(result)) {
                setResponse(result);
            } else {
                setResponse(["Report regenerated successfully."]);
            }
        } catch (error) {
            console.log(error);

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
            e.name.toLowerCase().includes(searchTerm) || e.employee_id.toLowerCase().includes(searchTerm)
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
                <RefreshCcw size={15} />
                Regenerate
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



                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-surface-variant/30 dark:bg-black/20">
                            <div className="flex flex-col gap-3">

                                <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 shadow-elevation-1 border border-gray-200 dark:border-white/5">

                                    <div className="flex flex-col gap-3">

                                        {/* Filters */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

                                            <MultiDropDown
                                                placeholder={'Select Employee'}
                                                items={employees.map(emp => ({ id: emp.id, name: emp.name }))}
                                                value={selectedIds}
                                                onChange={setSelectedIds}
                                                badgesCount={1}
                                            />

                                            <DateRangeSelect
                                                showOutsideDays={false}
                                                value={{ from, to }}
                                                onChange={({ from, to }) => {
                                                    setFrom(from);
                                                    setTo(to);
                                                }
                                                } />
                                        </div>

                                        {/* Selected Employee Table */}
                                        {selectedIds.length > 0 && (
                                        <div className="overflow-y-auto max-h-[350px] rounded-xl border border-stone-200 dark:border-white/10 shadow-elevation-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-[#efece5] dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-semibold border-b border-stone-200 dark:border-white/5">
                                                        <th className="pl-6 py-3 font-bold">Employee Name</th>
                                                        <th className="px-6 py-3 font-bold">Employee ID</th>
                                                        <th className="px-6 py-3 font-bold">Department</th>
                                                        <th className="px-6 py-3 font-bold">Designation</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100 dark:divide-white/5 bg-surface-light dark:bg-surface-dark">
                                                    {employees.filter(emp => selectedIds.includes(emp.id)).map((emp) => (
                                                        <tr key={emp.id} className="transition-colors hover:bg-[#f8f6f1] dark:hover:bg-white/5">
                                                            <td className="pl-6 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <ProfilePicture src={emp.profile_picture} />
                                                                    <div>
                                                                        <div className="text-slate-800 dark:text-white text-sm" style={{ fontWeight: 500 }}>{emp.name}</div>
                                                                        <div className="text-xs text-slate-400" style={{ fontWeight: 500 }}>{emp.branch?.branch_name || ''}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400" style={{ fontWeight: 500 }}>{emp.employee_id}</td>
                                                            <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400" style={{ fontWeight: 500 }}>{emp.department?.name}</td>
                                                            <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400" style={{ fontWeight: 500 }}>{emp.designation?.name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        )}
                                    </div>
                                </section>

                                {response.length > 0 && (
                                    <div className="fixed inset-x-0 bottom-0 top-[72px] z-[100] flex items-center justify-center">
                                        <div className="absolute inset-0 bg-black/50" />
                                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-white/10 min-w-[350px] text-center">
                                            {loading ? (
                                                <>
                                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                                    <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-3">Processing...</p>
                                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                        <div className="h-2 rounded-full bg-primary animate-pulse" style={{ width: "60%" }} />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-base font-semibold text-green-700 dark:text-green-400 mb-2">Completed</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Report regenerated successfully</p>
                                                    <button
                                                        onClick={() => { setResponse([]); setOpen(false); onSuccess(); }}
                                                        className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-semibold"
                                                    >
                                                        Done
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

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

export default RegenerateReport;
