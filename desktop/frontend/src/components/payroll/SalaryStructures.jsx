"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, Eye, Edit, X, ArrowLeft, Wallet, TrendingUp, Calendar, Award, MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ProfilePicture from "@/components/ProfilePicture";
import MonthPicker from "@/components/ui/MonthPicker";
import { useTranslation } from "react-i18next";

const emptyForm = {
  employee_id: "", effective_from: "", effective_to: "", salary_mode: "gross_based",
  basic_salary: "", house_allowance: "", transport_allowance: "", food_allowance: "",
  medical_allowance: "", other_allowance: "", overtime_eligible: false, loan_deduction: false, advance_deduction: false,
};

export default function SalaryStructures() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [openStructure, setOpenStructure] = useState(null);
  const [activeTab, setActiveTab] = useState("payroll");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");

  const fetchStructures = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/payroll-management/salary-structures", { params: { ...params, per_page: 100 } });
      const items = (data?.data || []).map(s => ({
        ...s,
        employeeName: s.employee ? `${s.employee.first_name} ${s.employee.last_name || ""}`.trim() : `Emp ${s.employee_id}`,
        employeeId: String(s.employee?.employee_id || s.employee_id),
        profilePicture: s.employee?.profile_picture || null,
        department: s.employee?.department?.name || "---",
        basicSalary: parseFloat(s.basic_salary) || 0,
        grossSalary: parseFloat(s.gross_salary) || 0,
        houseAllowance: parseFloat(s.house_allowance) || 0,
        transportAllowance: parseFloat(s.transport_allowance) || 0,
        foodAllowance: parseFloat(s.food_allowance) || 0,
        medicalAllowance: parseFloat(s.medical_allowance) || 0,
        otherAllowance: parseFloat(s.other_allowance) || 0,
        overtimeEligible: !!s.overtime_eligible,
      }));
      setStructures(items);
    } catch (e) {}
  };

  const deleteStructure = async (id) => {
    if (!confirm(t("payroll.salaryStructures.confirmDelete"))) return;
    try {
      const params = await buildQueryParams({});
      await api.delete(`/payroll-management/salary-structures/${id}`, { params });
      fetchStructures();
    } catch (e) {
      alert(e?.response?.data?.message || t("payroll.salaryStructures.deleteFailed"));
    }
  };

  useEffect(() => {
    fetchStructures();
    const fetchAll = async () => {
      try {
        const params = await buildQueryParams({});
        const { data } = await api.get("/payroll-management/employees", { params });
        setEmployees(data || []);
        // Extract unique branches and departments
        const branchMap = {};
        const deptMap = {};
        (data || []).forEach(emp => {
          if (emp.branch) branchMap[emp.branch.id] = emp.branch.branch_name;
          if (emp.department) deptMap[emp.department.id] = { name: emp.department.name, branchId: emp.branch_id };
        });
        setBranches(Object.entries(branchMap).map(([id, name]) => ({ id, name })));
        setDepartments(Object.entries(deptMap).map(([id, val]) => ({ id, name: val.name, branchId: val.branchId })));
      } catch (e) {}
    };
    fetchAll();
  }, []);

  const filteredDepts = selectedBranch ? departments.filter(d => String(d.branchId) === String(selectedBranch)) : departments;
  const filteredEmployees = employees.filter(emp => {
    if (selectedBranch && String(emp.branch_id) !== String(selectedBranch)) return false;
    if (selectedDept && String(emp.department_id) !== String(selectedDept)) return false;
    return true;
  });

  const monthOverlaps = (s) => {
    if (!selectedMonth) return true;
    const monthStart = `${selectedMonth}-01`;
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
    const from = s.effective_from || "";
    const to = s.effective_to || "";
    if (from && from > monthEnd) return false;
    if (to && to < monthStart) return false;
    return true;
  };

  const filtered = structures.filter(s => {
    const matchesSearch =
      s.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && monthOverlaps(s);
  });

  // Inline detail view (shown when a row is clicked)
  const renderDetailView = () => {
    const s = openStructure;
    const totalAllowances = s.houseAllowance + s.transportAllowance + s.foodAllowance + s.medicalAllowance + s.otherAllowance;
    return (
      <div className="space-y-5">
        {/* Top bar with back button */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setOpenStructure(null)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("payroll.register.backToList")}
          </button>
          <button
            onClick={() => {
              setEditingId(s.id);
              setForm({
                employee_id: String(s.employee_id), effective_from: s.effective_from || "", effective_to: s.effective_to || "",
                salary_mode: s.salary_mode || "gross_based",
                basic_salary: String(s.basicSalary), house_allowance: String(s.houseAllowance),
                transport_allowance: String(s.transportAllowance), food_allowance: String(s.foodAllowance),
                medical_allowance: String(s.medicalAllowance), other_allowance: String(s.otherAllowance),
                overtime_eligible: s.overtimeEligible, loan_deduction: !!s.loan_deduction, advance_deduction: !!s.advance_deduction,
              });
              const emp = employees.find(e => String(e.id) === String(s.employee_id));
              setSelectedBranch(emp?.branch_id ? String(emp.branch_id) : (s.employee?.branch?.id ? String(s.employee.branch.id) : ""));
              setSelectedDept(emp?.department_id ? String(emp.department_id) : (s.employee?.department?.id ? String(s.employee.department.id) : ""));
              setDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-blue-600 transition shadow-sm">
            <Edit className="h-3.5 w-3.5" /> {t("payroll.salaryStructures.editStructure")}
          </button>
        </div>

        {/* Two-column layout: sidebar list + detail */}
        <div className="flex gap-5">
          {/* Left sidebar — employee list */}
          <div className="w-72 shrink-0 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 flex flex-col overflow-hidden self-start max-h-[calc(100vh-200px)]">
            <div className="p-3 border-b border-gray-100 dark:border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  placeholder={t("payroll.salaryStructures.selectBranch")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(item => {
                const isSelected = openStructure && openStructure.id === item.id;
                return (
                  <li
                    key={item.id}
                    onClick={() => setOpenStructure(item)}
                    className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 dark:bg-primary/15"
                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="size-9 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                      <ProfilePicture src={item.profilePicture} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-gray-800 dark:text-gray-100"}`}>{item.employeeName}</div>
                      <div className="text-[11px] text-gray-400">{item.employeeId}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right — salary structure detail */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("payroll.salaryStructures.detailTitle")}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("payroll.salaryStructures.detailSubtitle")}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Profile + Summary card */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-6">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full overflow-hidden border-2 border-gray-200 dark:border-white/10 flex items-center justify-center">
                  <ProfilePicture src={s.profilePicture} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{s.employeeName}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("payroll.fields.dept")}: {s.department || "—"}</p>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span className="material-symbols-outlined text-[14px]">badge</span>{t("payroll.fields.id")}: {s.employeeId}</div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${s.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{s.status}</span>
              </div>

              <hr className="my-5 border-gray-100 dark:border-white/5" />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t("payroll.fields.basicSalary")}</div>
                  <div className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{s.basicSalary.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t("payroll.fields.allowances")}</div>
                  <div className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{totalAllowances.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-primary font-bold">{t("payroll.fields.grossSalary")}</div>
                  <div className="mt-1 text-xl font-bold text-primary tabular-nums">{s.grossSalary.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Side card — Salary Mode */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Wallet className="h-4 w-4 text-primary" /></div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{t("payroll.salaryStructures.mode")}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 capitalize">{t(`payroll.settings.general.salaryModeOptions.${s.salary_mode || "gross_based"}`, { defaultValue: (s.salary_mode || "gross_based").replace(/_/g, " ") })}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.overtimeEligible ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>OT {s.overtimeEligible ? t("payroll.fields.yes") : t("payroll.fields.no")}</span>
              </div>
            </div>

            {/* Allowance breakdown — full width */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-6">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">{t("payroll.salaryStructures.allowanceBreakdown")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5"><span className="text-gray-500 dark:text-gray-400">{t("payroll.fields.houseAllowance")}</span><span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{s.houseAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5"><span className="text-gray-500 dark:text-gray-400">{t("payroll.fields.transportAllowance")}</span><span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{s.transportAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5"><span className="text-gray-500 dark:text-gray-400">{t("payroll.fields.foodAllowance")}</span><span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{s.foodAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5"><span className="text-gray-500 dark:text-gray-400">{t("payroll.fields.medicalAllowance")}</span><span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{s.medicalAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5 sm:col-span-2"><span className="text-gray-500 dark:text-gray-400">{t("payroll.fields.otherAllowance")}</span><span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{s.otherAllowance.toLocaleString()}</span></div>
              </div>
            </div>

            {/* Side cards — Deductions + Period */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-amber-500" /></div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.fields.deductions")}</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400">{t("payroll.salaryStructures.loanDeduction")}</span><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.loan_deduction ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{s.loan_deduction ? t("payroll.fields.on") : t("payroll.fields.off")}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400">{t("payroll.salaryStructures.advanceDeduction")}</span><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.advance_deduction ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{s.advance_deduction ? t("payroll.fields.on") : t("payroll.fields.off")}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><Calendar className="h-4 w-4 text-blue-500" /></div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.salaryStructures.effectivePeriod")}</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400">{t("payroll.common.from")}</span><span className="font-semibold text-gray-800 dark:text-gray-100">{s.effective_from || "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400">{t("payroll.common.to")}</span><span className="font-semibold text-gray-800 dark:text-gray-100">{s.effective_to || "—"}</span></div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-5">
      {openStructure ? renderDetailView() : (<>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("payroll.salaryStructures.title")}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("payroll.salaryStructures.subtitle")}</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> {t("payroll.salaryStructures.addStructure")}
        </button>
      </div>

      {/* Filters: Search + Month */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder={t("payroll.salaryStructures.searchEmployee")} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[180px]">
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          </div>
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth("")}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              title={t("payroll.salaryStructures.showAllMonths")}
            >
              <X className="h-3.5 w-3.5" /> {t("payroll.common.all")}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">{t("payroll.common.employee")}</th>
                <th className="px-3 py-3">{t("payroll.common.department")}</th>
                <th className="px-3 py-3">{t("payroll.fields.basic")}</th>
                <th className="px-3 py-3">{t("payroll.fields.gross")}</th>
                <th className="px-3 py-3">{t("payroll.fields.allowances")}</th>
                <th className="px-3 py-3">{t("payroll.salaryStructures.otEligible")}</th>
                <th className="px-3 py-3">{t("payroll.common.status")}</th>
                <th className="px-3 py-3">{t("payroll.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(s => {
                const totalAllowances = s.houseAllowance + s.transportAllowance + s.foodAllowance + s.medicalAllowance + s.otherAllowance;
                return (
                  <tr
                    key={s.id}
                    onClick={() => { setOpenStructure(s); setActiveTab("payroll"); }}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 min-w-[36px] rounded-full overflow-hidden border border-gray-200 dark:border-white/10 flex items-center justify-center">
                          <ProfilePicture src={s.profilePicture} />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{s.employeeName}</div>
                          <div className="text-[10px] text-gray-400">{t("payroll.fields.id")}: {s.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[11px]">{s.department}</td>
                    <td className="px-3 py-3">{s.basicSalary.toLocaleString()}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800 dark:text-gray-100">{s.grossSalary.toLocaleString()}</td>
                    <td className="px-3 py-3">{totalAllowances.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.overtimeEligible ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {s.overtimeEligible ? t("payroll.fields.yes") : t("payroll.fields.no")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setViewItem(s); }}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{t("payroll.common.view")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(s.id);
                              setForm({
                                employee_id: String(s.employee_id), effective_from: s.effective_from || "", effective_to: s.effective_to || "",
                                salary_mode: s.salary_mode || "gross_based",
                                basic_salary: String(s.basicSalary), house_allowance: String(s.houseAllowance),
                                transport_allowance: String(s.transportAllowance), food_allowance: String(s.foodAllowance),
                                medical_allowance: String(s.medicalAllowance), other_allowance: String(s.otherAllowance),
                                overtime_eligible: s.overtimeEligible, loan_deduction: !!s.loan_deduction, advance_deduction: !!s.advance_deduction,
                              });
                              const emp = employees.find(e => String(e.id) === String(s.employee_id));
                              setSelectedBranch(emp?.branch_id ? String(emp.branch_id) : (s.employee?.branch?.id ? String(s.employee.branch.id) : ""));
                              setSelectedDept(emp?.department_id ? String(emp.department_id) : (s.employee?.department?.id ? String(s.employee.department.id) : ""));
                              setDialogOpen(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{t("payroll.common.edit")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); deleteStructure(s.id); }}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-red-600 dark:text-red-400 font-medium">{t("payroll.common.delete")}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400 text-xs">{t("payroll.salaryStructures.emptyList")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* Add Structure Dialog */}
      {dialogOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{editingId ? t("payroll.salaryStructures.dialogTitleEdit") : t("payroll.salaryStructures.dialogTitleNew")}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.common.branch")}</label>
                <select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedDept(""); setForm({ ...form, employee_id: "" }); }}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="">{t("payroll.common.allBranches")}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.common.department")}</label>
                <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setForm({ ...form, employee_id: "" }); }}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="">{t("payroll.common.allDepartments")}</option>
                  {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.common.employee")}</label>
                <select value={form.employee_id} onChange={e => {
                  const empId = e.target.value;
                  setForm({ ...form, employee_id: empId });
                  if (empId) {
                    const picked = employees.find(emp => String(emp.id) === String(empId));
                    if (picked) {
                      if (picked.branch_id) setSelectedBranch(String(picked.branch_id));
                      if (picked.department_id) setSelectedDept(String(picked.department_id));
                    }
                  }
                }}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="">{t("payroll.common.selectEmployee")}</option>
                  {filteredEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ""}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.salaryStructures.salaryMode")}</label>
                <select value={form.salary_mode} onChange={e => setForm({ ...form, salary_mode: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="gross_based">{t("payroll.settings.general.salaryModeOptions.gross_based")}</option>
                  <option value="basic_based">{t("payroll.settings.general.salaryModeOptions.basic_based")}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.salaryStructures.effectiveFrom")}</label>
                <input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
              </div>
              {[
                { label: t("payroll.fields.basicSalary"), key: "basic_salary" },
                { label: t("payroll.fields.houseAllowance"), key: "house_allowance" },
                { label: t("payroll.fields.transportAllowance"), key: "transport_allowance" },
                { label: t("payroll.fields.foodAllowance"), key: "food_allowance" },
                { label: t("payroll.fields.medicalAllowance"), key: "medical_allowance" },
                { label: t("payroll.fields.otherAllowance"), key: "other_allowance" },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{label}</label>
                  <input type="number" placeholder="0" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-6 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10">
                {[
                  { label: t("payroll.salaryStructures.overtimeEligible"), key: "overtime_eligible" },
                  { label: t("payroll.salaryStructures.loanDeduction"), key: "loan_deduction" },
                  { label: t("payroll.salaryStructures.advanceDeduction"), key: "advance_deduction" },
                ].map(({ label, key }) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })}
                      className="rounded border-gray-300 dark:border-white/20 text-primary focus:ring-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                {t("payroll.common.cancel")}
              </button>
              <button disabled={saving} onClick={async () => {
                if (!form.employee_id || !form.basic_salary) { alert(t("payroll.salaryStructures.validationRequired")); return; }
                setSaving(true);
                try {
                  const params = await buildQueryParams({});
                  if (editingId) {
                    await api.put(`/payroll-management/salary-structures/${editingId}`, { ...params, ...form });
                  } else {
                    await api.post("/payroll-management/salary-structures", { ...params, ...form, status: "active" });
                  }
                  setDialogOpen(false);
                  setForm(emptyForm);
                  setEditingId(null);
                  fetchStructures();
                } catch (e) { alert(e?.response?.data?.message || t("payroll.common.saveFailed")); }
                finally { setSaving(false); }
              }}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? t("payroll.common.saving") : editingId ? t("payroll.salaryStructures.update") : t("payroll.salaryStructures.saveStructure")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Drawer */}
      {viewItem && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewItem(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{viewItem.employeeName}</h3>
                <p className="text-[10px] text-gray-500">{viewItem.department} &middot; {t("payroll.fields.id")}: {viewItem.employeeId}</p>
              </div>
              <button onClick={() => setViewItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                [t("payroll.fields.basicSalary"), viewItem.basicSalary],
                [t("payroll.fields.houseAllowance"), viewItem.houseAllowance],
                [t("payroll.fields.transportAllowance"), viewItem.transportAllowance],
                [t("payroll.fields.foodAllowance"), viewItem.foodAllowance],
                [t("payroll.fields.medicalAllowance"), viewItem.medicalAllowance],
                [t("payroll.fields.otherAllowance"), viewItem.otherAllowance],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{val.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs border-t border-gray-100 dark:border-white/10 pt-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{t("payroll.fields.grossSalary")}</span>
                <span className="font-bold text-gray-800 dark:text-gray-100">{viewItem.grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-2">
                <span className="text-gray-500">{t("payroll.salaryStructures.otEligible")}</span>
                <span className={`font-bold ${viewItem.overtimeEligible ? "text-blue-500" : "text-gray-400"}`}>{viewItem.overtimeEligible ? t("payroll.fields.yes") : t("payroll.fields.no")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t("payroll.common.status")}</span>
                <span className={`font-bold ${viewItem.status === "active" ? "text-emerald-500" : "text-gray-400"}`}>{viewItem.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
