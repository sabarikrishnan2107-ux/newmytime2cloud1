"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, Trash2, X } from "lucide-react";
import MonthPicker from "@/components/ui/MonthPicker";

const typeColors = {
  bonus: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  incentive: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  arrears: "bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400",
  reimbursement: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  fine: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  other_addition: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  other_deduction: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
};

const emptyAdjForm = { employee_id: "", type: "bonus", amount: "", payroll_month: "", remarks: "" };

export default function Adjustments() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [adjForm, setAdjForm] = useState(emptyAdjForm);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selBranch, setSelBranch] = useState("");
  const [selDept, setSelDept] = useState("");

  const fetchAdjustments = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/payroll-management/adjustments", { params: { ...params, per_page: 100 } });
      const items = (data?.data || []).map(a => ({
        ...a,
        employeeName: a.employee ? `${a.employee.first_name} ${a.employee.last_name || ""}`.trim() : `Emp ${a.employee_id}`,
        employeeId: String(a.employee?.employee_id || a.employee_id),
        payrollMonth: a.payroll_month,
        createdBy: a.created_by || "Admin",
        createdAt: a.created_at ? new Date(a.created_at).toLocaleDateString() : "---",
        remarks: a.remarks || "---",
        amount: parseFloat(a.amount) || 0,
      }));
      setAdjustments(items);
    } catch (e) {}
  };

  useEffect(() => {
    fetchAdjustments();
    const fetchEmployees = async () => {
      try {
        const params = await buildQueryParams({});
        const { data } = await api.get("/payroll-management/employees", { params });
        setEmployees(data || []);
        const bMap = {}, dMap = {};
        (data || []).forEach(e => {
          if (e.branch) bMap[e.branch.id] = e.branch.branch_name;
          if (e.department) dMap[e.department.id] = { name: e.department.name, branchId: e.branch_id };
        });
        setBranches(Object.entries(bMap).map(([id, name]) => ({ id, name })));
        setDepartments(Object.entries(dMap).map(([id, v]) => ({ id, name: v.name, branchId: v.branchId })));
      } catch (e) {}
    };
    fetchEmployees();
  }, []);

  const filtDepts = selBranch ? departments.filter(d => String(d.branchId) === String(selBranch)) : departments;
  const filtEmps = employees.filter(e => {
    if (selBranch && String(e.branch_id) !== String(selBranch)) return false;
    if (selDept && String(e.department_id) !== String(selDept)) return false;
    return true;
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this adjustment?")) return;
    try {
      const params = await buildQueryParams({});
      await api.delete(`/payroll-management/adjustments/${id}`, { params });
      fetchAdjustments();
    } catch (e) { alert("Delete failed"); }
  };

  const filtered = adjustments.filter(a =>
    (a.employeeName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Payroll Adjustments</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage bonus, incentive, arrears, fines, and other payroll adjustments</p>
        </div>
        <button onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Add Adjustment
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3">Month</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Remarks</th>
                <th className="px-3 py-3">Created By</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300">
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{a.employeeName}</div>
                    <div className="text-[10px] text-gray-400">ID: {a.employeeId}</div>
                  </td>
                  <td className="px-3 py-3">{a.payrollMonth}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${typeColors[a.type] || typeColors.other_addition}`}>
                      {a.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-800 dark:text-gray-100">{a.amount.toLocaleString()}</td>
                  <td className="px-3 py-3 max-w-[200px] truncate text-gray-500">{a.remarks}</td>
                  <td className="px-3 py-3">{a.createdBy}</td>
                  <td className="px-3 py-3 text-[11px]">{a.createdAt}</td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400 text-xs">No adjustments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Adjustment Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">New Adjustment</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Branch</label>
                  <select value={selBranch} onChange={e => { setSelBranch(e.target.value); setSelDept(""); setAdjForm({ ...adjForm, employee_id: "" }); }}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Department</label>
                  <select value={selDept} onChange={e => { setSelDept(e.target.value); setAdjForm({ ...adjForm, employee_id: "" }); }}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="">All Depts</option>
                    {filtDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Employee</label>
                  <select value={adjForm.employee_id} onChange={e => {
                    const empId = e.target.value;
                    setAdjForm({ ...adjForm, employee_id: empId });
                    if (empId) {
                      const picked = employees.find(emp => String(emp.id) === String(empId));
                      if (picked) {
                        if (picked.branch_id) setSelBranch(String(picked.branch_id));
                        if (picked.department_id) setSelDept(String(picked.department_id));
                      }
                    }
                  }}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="">Select employee</option>
                    {filtEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ""}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Type</label>
                  <select value={adjForm.type} onChange={e => setAdjForm({ ...adjForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="bonus">Bonus</option>
                    <option value="incentive">Incentive</option>
                    <option value="arrears">Arrears</option>
                    <option value="fine">Fine</option>
                    <option value="reimbursement">Reimbursement</option>
                    <option value="other_addition">Other Addition</option>
                    <option value="other_deduction">Other Deduction</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Amount</label>
                  <input type="number" placeholder="0" value={adjForm.amount} onChange={e => setAdjForm({ ...adjForm, amount: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Payroll Month</label>
                <MonthPicker
                  value={adjForm.payroll_month}
                  onChange={v => setAdjForm({ ...adjForm, payroll_month: v })}
                  placeholder="Select payroll month"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Remarks</label>
                <textarea placeholder="Reason..." rows={3} value={adjForm.remarks} onChange={e => setAdjForm({ ...adjForm, remarks: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
              <button disabled={saving} onClick={async () => {
                if (!adjForm.employee_id || !adjForm.amount || !adjForm.payroll_month) { alert("Employee, Amount, and Payroll Month are required"); return; }
                setSaving(true);
                try {
                  const params = await buildQueryParams({});
                  await api.post("/payroll-management/adjustments", { ...params, ...adjForm });
                  setDialogOpen(false);
                  setAdjForm(emptyAdjForm);
                  fetchAdjustments();
                } catch (e) { alert(e?.response?.data?.message || "Save failed"); }
                finally { setSaving(false); }
              }}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
