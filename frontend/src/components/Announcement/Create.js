// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";

import { getBranches, getDepartments, getCompanyId } from "@/lib/api";
import { getUser } from "@/config/index";
import {
    storeAnnouncement,
    updateAnnouncement,
    getAnnouncementCategories,
    getEmployeesByDepartmentForAnnouncements,
} from "@/lib/endpoint/announcements";
import { SuccessDialog } from "@/components/SuccessDialog";
import { parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";
import Dropdown from "../Theme/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
import DatePicker from "../ui/DatePicker";

import {
    X,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Link2,
    Image as ImageIcon,
    UploadCloud,
    FileText,
    Trash2,
} from 'lucide-react';

const ToolbarButton = ({ icon, title }) => (
    <button
        type="button"
        className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
        title={title}
    >
        {icon}
    </button>
);

const defaultFormState = {
    title: "",
    description: "",
    departments: [],
    employees: [],
    start_date: null,
    end_date: null,
    category_id: null,
    branch_id: "",
};

const Create = ({ onSuccess = () => { }, editData = null, onClose = null }) => {

    const isEditMode = !!editData;

    const [open, setOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Form state
    const [form, setForm] = useState({ ...defaultFormState });

    // Dropdown data
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Selected values
    const [selectedBranch, setSelectedBranch] = useState({ name: "Select Branch", id: "" });
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState({ name: "Select Category", id: "" });

    const toggleModal = () => {
        if (open) {
            resetForm();
        }
        setOpen(!open);
    };

    const resetForm = () => {
        setForm({ ...defaultFormState });
        setSelectedBranch({ name: "Select Branch", id: "" });
        setSelectedDepartmentIds([]);
        setSelectedEmployeeIds([]);
        setSelectedCategory({ name: "Select Category", id: "" });
        setGlobalError(null);
        setFieldErrors({});
        setEmployees([]);
    };

    // Fetch branches and categories on mount
    const fetchDropdowns = async () => {
        try {
            const [branchesData, categoriesData] = await Promise.all([
                getBranches(),
                getAnnouncementCategories({ per_page: 1000 }),
            ]);
            setBranches([{ name: "Select Branch", id: "" }, ...branchesData]);

            const catList = categoriesData?.data || categoriesData || [];
            setCategories([{ name: "Select Category", id: "" }, ...catList]);
        } catch (error) {
            console.error("Error fetching dropdowns:", error);
        }
    };

    // Fetch departments when branch changes
    const fetchDepartments = async (branchId) => {
        try {
            const deptData = await getDepartments(branchId || null);
            setDepartments(deptData || []);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    // Fetch employees when departments change
    const fetchEmployeesByDepartment = useCallback(async (departmentIds) => {
        if (!departmentIds || departmentIds.length === 0) {
            setEmployees([]);
            return;
        }
        setLoadingEmployees(true);
        try {
            const data = await getEmployeesByDepartmentForAnnouncements({
                department_ids: departmentIds,
                per_page: 1000,
            });
            const empList = data?.data || data || [];
            // Map to MultiDropDown format { id, name }
            const formatted = empList.map(emp => ({
                id: emp.id,
                name: emp.name_with_user_id || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee #${emp.id}`,
            }));
            setEmployees(formatted);
        } catch (error) {
            console.error("Error fetching employees:", error);
            setEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    }, []);

    useEffect(() => {
        fetchDropdowns();
        fetchDepartments(null);
    }, []);

    // When branch changes, re-fetch departments
    useEffect(() => {
        if (selectedBranch.id !== undefined) {
            fetchDepartments(selectedBranch.id || null);
            // Reset department & employee selections when branch changes
            setSelectedDepartmentIds([]);
            setSelectedEmployeeIds([]);
            setEmployees([]);
        }
    }, [selectedBranch.id]);

    // When departments change, re-fetch employees
    useEffect(() => {
        fetchEmployeesByDepartment(selectedDepartmentIds);
        setSelectedEmployeeIds([]);
    }, [selectedDepartmentIds, fetchEmployeesByDepartment]);

    // Populate form when editing
    useEffect(() => {
        if (editData && open) {
            setForm({
                title: editData.title || "",
                description: editData.description || "",
                departments: editData.departments?.map(d => d.id) || [],
                employees: editData.employees?.map(e => e.id) || [],
                start_date: editData.start_date || null,
                end_date: editData.end_date || null,
                category_id: editData.category_id || null,
                branch_id: editData.branch_id || "",
            });

            // Set branch
            if (editData.branch_id) {
                const br = branches.find(b => b.id === editData.branch_id);
                if (br) setSelectedBranch(br);
            }

            // Set category
            if (editData.category_id) {
                const cat = categories.find(c => c.id === editData.category_id);
                if (cat) setSelectedCategory(cat);
            }

            // Set department and employee IDs
            setSelectedDepartmentIds(editData.departments?.map(d => d.id) || []);
            setSelectedEmployeeIds(editData.employees?.map(e => e.id) || []);
        }
    }, [editData, open]);

    // Open modal externally for edit
    useEffect(() => {
        if (editData) {
            setOpen(true);
        }
    }, [editData]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        // Clear field error when user changes value
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const onSubmit = async () => {
        setGlobalError(null);
        setFieldErrors({});
        setLoading(true);

        try {
            const user = getUser();

            const payload = {
                title: form.title,
                description: form.description,
                start_date: form.start_date,
                end_date: form.end_date,
                category_id: selectedCategory.id || form.category_id,
                branch_id: selectedBranch.id || form.branch_id || null,
                departments: selectedDepartmentIds,
                employees: selectedEmployeeIds,
                company_id: user?.company_id || await getCompanyId(),
                user_id: user?.id,
            };

            let result;
            if (isEditMode) {
                result = await updateAnnouncement(editData.id, payload);
            } else {
                result = await storeAnnouncement(payload);
            }

            // Check for validation errors
            if (result?.status === false) {
                if (result.errors) {
                    setFieldErrors(result.errors);
                    const firstKey = Object.keys(result.errors)[0];
                    const firstError = result.errors[firstKey]?.[0];
                    setGlobalError(firstError || "Validation failed.");
                } else {
                    setGlobalError(result.message || "Something went wrong.");
                }
                return;
            }

            // Success
            onSuccess();
            setSuccessOpen(true);
            setOpen(false);
            resetForm();

            if (onClose) onClose();
        } catch (error) {
            const errMsg = parseApiError(error);
            setGlobalError(errMsg);

            // Try to extract field errors from 422
            if (error?.response?.status === 422 && error?.response?.data?.errors) {
                setFieldErrors(error.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Only show the Add button if NOT in edit mode (edit mode is triggered externally) */}
            {!isEditMode && (
                <button onClick={() => setOpen(true)}
                    className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add
                </button>
            )}

            {/* Modal */}
            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center"
                >
                    {/* Backdrop/Overlay */}
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={toggleModal}
                    ></div>

                    {/* Modal Card */}
                    <div className="relative w-[900px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
                                    {isEditMode ? "Edit Announcement" : "Create New Announcement"}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {isEditMode
                                        ? "Update your announcement details."
                                        : "Create your announcement and share it with the team."
                                    }
                                </p>
                            </div>
                            <button
                                onClick={toggleModal}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Global Error */}
                        {globalError && (
                            <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                {globalError}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto max-h-[calc(90vh-130px)] p-0 custom-scrollbar bg-surface-variant/30 dark:bg-black/20">
                            <div className="flex flex-col gap-2 pb-24">
                                <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1">

                                    {/* Title */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Announcement Title <span className="text-red-400">*</span>
                                        </label>
                                        <Input
                                            required
                                            placeholder="Enter announcement title"
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => handleChange('title', e.target.value)}
                                        />
                                        {fieldErrors.title && (
                                            <p className="text-red-400 text-xs mt-1">{fieldErrors.title[0]}</p>
                                        )}
                                    </div>

                                    {/* Branch, Department, Employee Row */}
                                    <div className="flex w-full gap-6 mt-5">
                                        <div className="space-y-1.5 flex-1">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Select Branch
                                            </label>
                                            <Dropdown
                                                items={branches}
                                                selectedItem={selectedBranch}
                                                onSelect={(item) => setSelectedBranch(item)}
                                                placeholder="Select Branch"
                                                width="w-full"
                                            />
                                            {fieldErrors.branch_id && (
                                                <p className="text-red-400 text-xs mt-1">{fieldErrors.branch_id[0]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 flex-1">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Select Department <span className="text-red-400">*</span>
                                            </label>
                                            <MultiDropDown
                                                placeholder={'Select Department'}
                                                items={departments}
                                                value={selectedDepartmentIds}
                                                onChange={setSelectedDepartmentIds}
                                                badgesCount={1}
                                            />
                                            {fieldErrors.departments && (
                                                <p className="text-red-400 text-xs mt-1">{fieldErrors.departments[0]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 flex-1">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Select Employee <span className="text-red-400">*</span>
                                            </label>
                                            <MultiDropDown
                                                placeholder={loadingEmployees ? 'Loading...' : 'Select Employee'}
                                                items={employees}
                                                value={selectedEmployeeIds}
                                                onChange={setSelectedEmployeeIds}
                                                badgesCount={1}
                                            />
                                            {fieldErrors.employees && (
                                                <p className="text-red-400 text-xs mt-1">{fieldErrors.employees[0]}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Start Date, End Date, Category Row */}
                                    <div className="flex w-full gap-6 mt-5">
                                        <div className="space-y-1.5 flex-1">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Start Date <span className="text-red-400">*</span>
                                            </label>
                                            <DatePicker
                                                value={form.start_date}
                                                onChange={(date) => handleChange('start_date', date)}
                                            />
                                            {fieldErrors.start_date && (
                                                <p className="text-red-400 text-xs mt-1">{fieldErrors.start_date[0]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 flex-1">
                                            <label className="block text-sm font-medium text-slate-400">
                                                End Date <span className="text-red-400">*</span>
                                            </label>
                                            <DatePicker
                                                value={form.end_date}
                                                onChange={(date) => handleChange('end_date', date)}
                                            />
                                            {fieldErrors.end_date && (
                                                <p className="text-red-400 text-xs mt-1">{fieldErrors.end_date[0]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 flex-1">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Category <span className="text-red-400">*</span>
                                            </label>
                                            <Dropdown
                                                items={categories}
                                                selectedItem={selectedCategory}
                                                onSelect={(item) => setSelectedCategory(item)}
                                                placeholder="Select Category"
                                                width="w-full"
                                            />
                                            {fieldErrors.category_id && (
                                                <p className="text-red-400 text-xs mt-1">{fieldErrors.category_id[0]}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description / Content */}
                                    <div className="space-y-1.5 mt-5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Description <span className="text-red-400">*</span>
                                        </label>
                                        <div className="border border-border rounded-lg overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all shadow-inner">
                                            <div className="flex items-center gap-1 p-2 border-b border-border">
                                                <ToolbarButton icon={<Bold size={18} />} title="Bold" />
                                                <ToolbarButton icon={<Italic size={18} />} title="Italic" />
                                                <ToolbarButton icon={<Underline size={18} />} title="Underline" />
                                                <div className="w-px h-5 bg-gray-700 mx-1"></div>
                                                <ToolbarButton icon={<List size={18} />} title="Bullet List" />
                                                <ToolbarButton icon={<ListOrdered size={18} />} title="Numbered List" />
                                                <div className="w-px h-5 bg-gray-700 mx-1"></div>
                                                <ToolbarButton icon={<Link2 size={18} />} title="Link" />
                                                <ToolbarButton icon={<ImageIcon size={18} />} title="Image" />
                                            </div>
                                            <textarea
                                                value={form.description}
                                                onChange={(e) => handleChange('description', e.target.value)}
                                                className="w-full h-64 p-4 border-none focus:ring-0 bg-transparent text-white resize-none text-base leading-relaxed placeholder:text-gray-600 outline-none"
                                                placeholder="Write your announcement details here..."
                                            />
                                        </div>
                                        {fieldErrors.description && (
                                            <p className="text-red-400 text-xs mt-1">{fieldErrors.description[0]}</p>
                                        )}
                                    </div>

                                    {/* Attachments (UI placeholder - kept for design consistency) */}
                                    <div className="space-y-1.5 mt-5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Attachments
                                        </label>
                                        <div className="border-2 border-dashed dark:border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center gap-3 text-center hover:border-indigo-500/50 transition-all cursor-pointer group">
                                            <div className="bg-obsidian p-3 rounded-full shadow-lg group-hover:scale-110 group-hover:shadow-indigo-500/20 group-hover:shadow-xl transition-all border border-border">
                                                <UploadCloud className="text-indigo-500" size={30} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <p className="text-gray-600 dark:text-slate-300 font-medium group-hover:text-indigo-400 transition-colors">
                                                    Click to upload or drag and drop
                                                </p>
                                                <p className="text-gray-500 text-sm">SVG, PNG, JPG or PDF (max. 10MB)</p>
                                            </div>
                                        </div>
                                    </div>

                                </section>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
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
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading
                                    ? "Saving..."
                                    : isEditMode
                                        ? "Update Announcement"
                                        : "Save Announcement"
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SuccessDialog
                successOpen={successOpen}
                onOpenChange={setSuccessOpen}
                title={isEditMode ? "Announcement Updated" : "Announcement Created"}
                description={isEditMode ? "Announcement updated successfully." : "Announcement created successfully."}
            />
        </>
    );
};

export default Create;
