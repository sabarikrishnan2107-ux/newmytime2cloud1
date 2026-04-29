"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, Eye, Edit, X } from "lucide-react";
import ProfilePicture from "@/components/ProfilePicture";

const emptyForm = {
  employee_id: "", effective_from: "", effective_to: "", salary_mode: "gross_based",
  basic_salary: "", house_allowance: "", transport_allowance: "", food_allowance: "",
  medical_allowance: "", other_allowance: "", overtime_eligible: false, loan_deduction: false, advance_deduction: false,
};

export default function SalaryStructures() {
  const [search, setSearch] = useState("");
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

  const filtered = structures.filter(s =>
    s.employeeName.toLowerCase().includes(search.toLowerCase()) || s.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Salary Structures</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Define employee-wise salary components and allowances</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Add Structure
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Basic</th>
                <th className="px-3 py-3">Gross</th>
                <th className="px-3 py-3">Allowances</th>
                <th className="px-3 py-3">OT Eligible</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(s => {
                const totalAllowances = s.houseAllowance + s.transportAllowance + s.foodAllowance + s.medicalAllowance + s.otherAllowance;
                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 min-w-[36px] rounded-full overflow-hidden border border-gray-200 dark:border-white/10 flex items-center justify-center">
                          <ProfilePicture src={s.profilePicture} />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{s.employeeName}</div>
                          <div className="text-[10px] text-gray-400">ID: {s.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[11px]">{s.department}</td>
                    <td className="px-3 py-3">{s.basicSalary.toLocaleString()}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800 dark:text-gray-100">{s.grossSalary.toLocaleString()}</td>
                    <td className="px-3 py-3">{totalAllowances.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.overtimeEligible ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {s.overtimeEligible ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button title="View" onClick={() => setViewItem(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition"><Eye className="h-3.5 w-3.5" /></button>
                        <button title="Edit" onClick={() => {
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
                        }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition"><Edit className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400 text-xs">No salary structures found. Click "Add Structure" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Structure Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{editingId ? "Edit Salary Structure" : "New Salary Structure"}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Branch</label>
                <select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedDept(""); setForm({ ...form, employee_id: "" }); }}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Department</label>
                <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setForm({ ...form, employee_id: "" }); }}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="">All Departments</option>
                  {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Employee</label>
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
                  <option value="">Select employee</option>
                  {filteredEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ""}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Salary Mode</label>
                <select value={form.salary_mode} onChange={e => setForm({ ...form, salary_mode: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="gross_based">Gross Based</option>
                  <option value="basic_based">Basic Based</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Effective From</label>
                <input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
              </div>
              {[
                { label: "Basic Salary", key: "basic_salary" },
                { label: "House Allowance", key: "house_allowance" },
                { label: "Transport Allowance", key: "transport_allowance" },
                { label: "Food Allowance", key: "food_allowance" },
                { label: "Medical Allowance", key: "medical_allowance" },
                { label: "Other Allowance", key: "other_allowance" },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{label}</label>
                  <input type="number" placeholder="0" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-6 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10">
                {[
                  { label: "Overtime Eligible", key: "overtime_eligible" },
                  { label: "Loan Deduction", key: "loan_deduction" },
                  { label: "Advance Deduction", key: "advance_deduction" },
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
                Cancel
              </button>
              <button disabled={saving} onClick={async () => {
                if (!form.employee_id || !form.basic_salary) { alert("Employee and Basic Salary are required"); return; }
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
                } catch (e) { alert(e?.response?.data?.message || "Save failed"); }
                finally { setSaving(false); }
              }}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Update" : "Save Structure"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Drawer */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewItem(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{viewItem.employeeName}</h3>
                <p className="text-[10px] text-gray-500">{viewItem.department} &middot; ID: {viewItem.employeeId}</p>
              </div>
              <button onClick={() => setViewItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                ["Basic Salary", viewItem.basicSalary],
                ["House Allowance", viewItem.houseAllowance],
                ["Transport Allowance", viewItem.transportAllowance],
                ["Food Allowance", viewItem.foodAllowance],
                ["Medical Allowance", viewItem.medicalAllowance],
                ["Other Allowance", viewItem.otherAllowance],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{val.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs border-t border-gray-100 dark:border-white/10 pt-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Gross Salary</span>
                <span className="font-bold text-gray-800 dark:text-gray-100">{viewItem.grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-2">
                <span className="text-gray-500">OT Eligible</span>
                <span className={`font-bold ${viewItem.overtimeEligible ? "text-blue-500" : "text-gray-400"}`}>{viewItem.overtimeEligible ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Status</span>
                <span className={`font-bold ${viewItem.status === "active" ? "text-emerald-500" : "text-gray-400"}`}>{viewItem.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
