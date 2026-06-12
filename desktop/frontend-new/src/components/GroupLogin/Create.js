// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getBranches, getRoles, createManagerLogin, getDepartments, getDepartmentsByBranchIds, updateManagerLogin } from "@/lib/api";
import { generateSecurePassword, getStrength, parseApiError } from "@/lib/utils";

import {
  ShieldCheck,
  X,
  Search,
  UserSearch,
  Mail,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Verified,
  Loader2
} from 'lucide-react';
import DropDown from "../ui/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
import Input from "../Theme/Input";
import DatePicker from "../ui/DatePicker";
import { getEmployeesByDepartmentIds } from "@/lib/api/employee";
import Dropdown from "../Theme/DropDown";

const Create = ({ isEditOpen = false, defaultPayload = {}, pageTitle = "Add Item", onSuccess = (e) => { e } }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [autoPassword, setAutoPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultPayload);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email) => {
    if (!email) { setEmailError(""); return true; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setEmailError(valid ? "" : "Invalid email format");
    return valid;
  };

  const [selectedEmployee, setSelectedEmployee] = useState({ id: null, name: "Select Employee" });


  const handleEmployeeSearch = (id) => {
    if (!id || employees.length === 0) return;

    const foundEmployee = employees.find(emp => emp.id == id);
    if (foundEmployee) {
      setForm(prev => ({
        ...prev,
        employee_id: id,
        name: foundEmployee.name,
        email: foundEmployee.login_user?.email ?? prev.email
      }));
      setSelectedEmployee(id);
    }
  };
  // 3. Trigger the search ONLY when the employees list finally loads
  useEffect(() => {
    if (open && employees.length > 0 && form.employee_id) {
      handleEmployeeSearch(form.employee_id);
    }
  }, [employees, open]);

  // API Logic
  const fetchDepartments = async () => {
    setGlobalError(null);
    if (!form.branch_ids?.length) {
      setDepartments([]); // Clear departments if no branch
      return;
    }
    try {
      const response = await getDepartmentsByBranchIds(form.branch_ids);
      // Handle both direct array or { data: [] } formats
      const data = Array.isArray(response) ? response : response.data;
      setDepartments(data || []);
    } catch (error) {
      setGlobalError(parseApiError(error));
    }
  };

  const fetchEmployees = async () => {
    if (!form.department_ids?.length) {
      setEmployees([]);
      return;
    }
    try {
      console.log(form.department_ids);
      const response = await getEmployeesByDepartmentIds(form.department_ids);
      const data = Array.isArray(response) ? response : response;
      console.log(data);
      setEmployees(data || []);
    } catch (error) {
      setGlobalError(parseApiError(error));
    }
  };

  useEffect(() => { fetchEmployees(); }, [form.department_ids]);

  useEffect(() => { fetchDepartments(); }, [form.branch_ids]);

  useEffect(() => {
    if (open) {
      fetchBranches();
      fetchRoles();
      // Ensure the form has the default data immediately
      setForm(defaultPayload);
      setAutoPassword(false);
    }
  }, [open, defaultPayload]);


  useEffect(() => {
    setOpen(isEditOpen)
  }, [isEditOpen]);



  const fetchBranches = async () => {
    try { setBranches(await getBranches()); }
    catch (error) { setGlobalError(parseApiError(error)); }
  };

  const fetchRoles = async () => {
    try {
      const result = await getRoles();
      setRoles(result.data || []);
    } catch (error) { setGlobalError(parseApiError(error)); }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.email && !validateEmail(form.email)) {
      setGlobalError("Please enter a valid email address");
      return;
    }
    setGlobalError(null);
    setLoading(true);
    try {
      isEditOpen ? await updateManagerLogin(form.id, form) : await createManagerLogin(form);
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSuccess({ title: `${pageTitle} Save`, description: `${pageTitle} Save successfully` });
      setOpen(false);
    } catch (error) {
      setGlobalError(parseApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="">
        Add {pageTitle}
      </Button>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center p-4">
          {/* Backdrop with native dark support */}
          <div
            className="absolute inset-0 transition-opacity backdrop-blur-sm "
            onClick={() => setOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-xl max-h-[85vh] flex flex-col border rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200 transition-colors bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:shadow-black">

            {/* Header */}
            <div className="px-10 pt-10 pb-4 flex justify-between items-start flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl transition-colors bg-primary/20 text-primary dark:bg-primary/10 dark:text-primary-400">
                  <ShieldCheck size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
                    Manager Login
                  </h1>
                  <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-300 transition-colors">
                    {pageTitle} Configuration
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl transition-all bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {globalError && (
              <div className="mx-10 mt-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert size={14} /> {globalError}
              </div>
            )}

            <form className="p-10 pt-2 space-y-4 flex-1 min-h-0 overflow-y-auto" onSubmit={onSubmit}>

              {/* Branch & Dept */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">Branch</label>
                  <div className="relative">
                    <MultiDropDown
                      placeholder={'Select Branch'}
                      items={branches}
                      value={form.branch_ids}
                      onChange={(val) => handleChange("branch_ids", val)}
                      badgesCount={1}
                    />

                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">Department</label>
                  <div className="relative">
                    <MultiDropDown
                      placeholder={'Select Department'}
                      items={departments}
                      value={form.department_ids}
                      onChange={(val) => handleChange("department_ids", val)}
                      badgesCount={1}
                    />
                  </div>
                </div>
              </div>

              {/* Employee Name */}

              <div className="space-y-1">
                <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">Employee Name</label>
                <div className="relative flex items-center">
                  <DropDown
                    placeholder="Select Employee"
                    onChange={handleEmployeeSearch}
                    value={selectedEmployee}
                    items={employees}
                    width="max-w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">Name</label>
                  <div className="relative">
                    <Input
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Employee Name"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">Email Address</label>
                  <div className="relative">
                    <Input
                      value={form.email}
                      onChange={(e) => { handleChange("email", e.target.value); validateEmail(e.target.value); }}
                      placeholder="admin@vault.com"
                      type="email"
                      className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}
                    />
                    <Mail className="absolute right-3 top-3.5 text-slate-500 w-4 h-4" />
                  </div>
                  {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                </div>

              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">Access Role</label>
                <div className="relative">
                  <DropDown
                    placeholder="Select Role"
                    onChange={(val) => handleChange("role_id", val)}
                    value={form.role_id}
                    items={roles}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">Validity Period</label>
                <div className="grid grid-cols-2 gap-3  mt-2">
                  <div className="relative">
                    <DatePicker
                      placeholder="Pick a Start Date"
                      onChange={(val) => handleChange("start_date", val)}
                      value={form.start_date}
                    />
                  </div>
                  <div className="relative">
                    <DatePicker
                      placeholder="Pick a End Date"
                      onChange={(val) => handleChange("end_date", val)}
                      value={form.end_date}
                    />
                  </div>
                </div>
              </div>

              {/* <div className="space-y-1 my-5">
                <label className="text-sm text-gray-600 dark:text-white">Communication & Security</label>
              </div> */}

              <div className="space-y-4  mt-10">
                {/* 
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-600 dark:text-slate-300"
                    >Notify Employee  via Email</span
                    >
                    <span className="text-[11px] text-slate-500 mt-0.5"
                    >Send automated onboarding instructions and credentials</span
                    >
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange("notify", !form.notify)}
                    className={`
    relative inline-flex items-center 
    h-6 w-12 rounded-full px-1
    transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-primary/20
    ${form.notify
                        ? 'bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
                        : 'bg-slate-300 dark:bg-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]'}
  `}
                  >
                    <span
                      className={`
      inline-block h-5 w-5 rounded-full bg-white 
      shadow-[0_2px_4px_rgba(0,0,0,0.2)]
      transition-transform duration-300 ease-in-out
      ${form.notify ? 'translate-x-6' : 'translate-x-0'}
    `}
                    />

                  </button>
                </div> */}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-600 dark:text-slate-300"
                    >Auto-Generate Secure Password</span
                    >
                    <span className="text-[11px] text-slate-500 mt-0.5"
                    >Randomized password will be generated and sent privately to
                      the employee</span
                    >
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newState = !autoPassword;
                      setAutoPassword(newState);
                      if (newState) {
                        const newPass = generateSecurePassword();
                        handleChange("password", newPass);
                        handleChange("password_confirmation", newPass);
                      } else {
                        // Optional: Clear it when turning auto off to let user type
                        handleChange("password", "");
                        handleChange("password_confirmation", "");
                      }
                    }}
                    className={`
    relative inline-flex items-center 
    h-6 w-12 rounded-full px-1
    transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-primary/20
    ${autoPassword
                        ? 'bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
                        : 'bg-slate-300 dark:bg-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]'}
  `}
                  >
                    {/* The Thumb */}
                    <span
                      className={`
      inline-block h-5 w-5 rounded-full bg-white 
      shadow-[0_2px_4px_rgba(0,0,0,0.2)]
      transition-transform duration-300 ease-in-out
      ${autoPassword ? 'translate-x-6' : 'translate-x-0'}
    `}
                    />

                  </button>
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder="••••••••"
                      type={showPass ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-3.5 text-slate-500 hover:text-emerald-500 transition-colors"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black mb-1.5 ml-1 uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      value={form.password_confirmation}
                      onChange={(e) => handleChange("password_confirmation", e.target.value)}
                      placeholder="••••••••"
                      type={showPass ? "text" : "password"}
                    />
                    <div className="absolute right-3 top-3.5">
                      {form.password_confirmation && (
                        form.password === form.password_confirmation ? (
                          <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in" />
                        ) : (
                          <ShieldAlert size={16} className="text-red-500 animate-in shake-1" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Strength Meter - Always Visible & Responsive */}
              <div className="space-y-2 mt-2 px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${getStrength(form.password).text}`}>
                    Security: {getStrength(form.password).label}
                  </span>
                  {form.password !== form.password_confirmation && form.password_confirmation && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">
                      Passwords do not match
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-700 ease-out shadow-glow-emerald ${getStrength(form.password).color}`}
                      style={{ width: getStrength(form.password).width }}
                    ></div>
                  </div>
                </div>
              </div>


              {/* Footer Actions */}
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-4 px-6 rounded-2xl border font-bold transition-all uppercase text-[10px] tracking-widest border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>



                <button
                  disabled={loading}
                  className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-white font-bold shadow-glow-emerald hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  type="submit"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span>Save Login</span>}
                  {!loading && <Verified size={16} />}
                </button>


              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Create;