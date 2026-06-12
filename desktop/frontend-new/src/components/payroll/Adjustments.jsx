"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, Trash2, X, Paperclip } from "lucide-react";
import MonthPicker from "@/components/ui/MonthPicker";
import { useTranslation } from "react-i18next";

const typeColors = {
  bonus: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  incentive: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  arrears: "bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400",
  reimbursement: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  fine: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  other_addition: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  other_deduction: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
};

const emptyAdjForm = { employee_id: "", type: "bonus", amount: "", payroll_month: "", remarks: "", attachment: null };

export default function Adjustments() {
  const { t } = useTranslation();
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
        attachmentUrl: a.attachment_url || null,
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
    if (!confirm(t("payroll.adjustments.confirmDelete"))) return;
    try {
      const params = await buildQueryParams({});
      await api.delete(`/payroll-management/adjustments/${id}`, { params });
      fetchAdjustments();
    } catch (e) { alert(t("payroll.common.deleteFailed")); }
  };

  const filtered = adjustments.filter(a =>
    (a.employeeName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("payroll.adjustments.title")}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("payroll.adjustments.subtitle")}</p>
        </div>
        <button onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> {t("payroll.adjustments.addAdjustment")}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder={t("payroll.common.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">{t("payroll.common.employee")}</th>
                <th className="px-3 py-3">{t("payroll.common.month")}</th>
                <th className="px-3 py-3">{t("payroll.common.type")}</th>
                <th className="px-3 py-3">{t("payroll.common.amount")}</th>
                <th className="px-3 py-3">{t("payroll.common.remarks")}</th>
                <th className="px-3 py-3">{t("payroll.adjustments.attach")}</th>
                <th className="px-3 py-3">{t("payroll.adjustments.createdBy")}</th>
                <th className="px-3 py-3">{t("payroll.adjustments.date")}</th>
                <th className="px-3 py-3">{t("payroll.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300">
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{a.employeeName}</div>
                    <div className="text-[10px] text-gray-400">{t("payroll.adjustments.idShort")}: {a.employeeId}</div>
                  </td>
                  <td className="px-3 py-3">{a.payrollMonth}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${typeColors[a.type] || typeColors.other_addition}`}>
                      {t(`payroll.adjustments.types.${a.type}`, { defaultValue: a.type.replace("_", " ") })}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-800 dark:text-gray-100">{a.amount.toLocaleString()}</td>
                  <td className="px-3 py-3 max-w-[200px] truncate text-gray-500">{a.remarks}</td>
                  <td className="px-3 py-3">
                    {a.attachmentUrl ? (
                      <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:text-blue-600">
                        <Paperclip className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
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
                <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400 text-xs">{t("payroll.adjustments.empty")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Adjustment Dialog */}
      {dialogOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("payroll.adjustments.dialogTitle")}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.common.branch")}</label>
                  <select value={selBranch} onChange={e => { setSelBranch(e.target.value); setSelDept(""); setAdjForm({ ...adjForm, employee_id: "" }); }}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="">{t("payroll.common.allBranches")}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.common.department")}</label>
                  <select value={selDept} onChange={e => { setSelDept(e.target.value); setAdjForm({ ...adjForm, employee_id: "" }); }}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="">{t("payroll.common.allDepartments")}</option>
                    {filtDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.common.employee")}</label>
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
                    <option value="">{t("payroll.common.selectEmployee")}</option>
                    {filtEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ""}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.common.type")}</label>
                  <select value={adjForm.type} onChange={e => setAdjForm({ ...adjForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="bonus">{t("payroll.adjustments.types.bonus")}</option>
                    <option value="incentive">{t("payroll.adjustments.types.incentive")}</option>
                    <option value="arrears">{t("payroll.adjustments.types.arrears")}</option>
                    <option value="fine">{t("payroll.adjustments.types.fine")}</option>
                    <option value="reimbursement">{t("payroll.adjustments.types.reimbursement")}</option>
                    <option value="other_addition">{t("payroll.adjustments.types.other_addition")}</option>
                    <option value="other_deduction">{t("payroll.adjustments.types.other_deduction")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.common.amount")}</label>
                  <input type="number" placeholder="0" value={adjForm.amount} onChange={e => setAdjForm({ ...adjForm, amount: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.adjustments.payrollMonth")}</label>
                <MonthPicker
                  value={adjForm.payroll_month}
                  onChange={v => setAdjForm({ ...adjForm, payroll_month: v })}
                  placeholder={t("payroll.adjustments.selectPayrollMonth")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.common.remarks")}</label>
                <textarea placeholder={t("payroll.adjustments.reasonPlaceholder")} rows={3} value={adjForm.remarks} onChange={e => setAdjForm({ ...adjForm, remarks: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.adjustments.attachmentLabel")}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 5 * 1024 * 1024) {
                        alert(t("payroll.adjustments.fileTooLarge"));
                        e.target.value = "";
                        return;
                      }
                      setAdjForm({ ...adjForm, attachment: f });
                    }}
                    className="flex-1 text-xs text-gray-700 dark:text-gray-300 file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-blue-600"
                  />
                  {adjForm.attachment && (
                    <button type="button" onClick={() => setAdjForm({ ...adjForm, attachment: null })}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400" aria-label={t("payroll.adjustments.clearFile")}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                {t("payroll.common.cancel")}
              </button>
              <button disabled={saving} onClick={async () => {
                if (!adjForm.employee_id || !adjForm.amount || !adjForm.payroll_month) { alert(t("payroll.adjustments.validationRequired")); return; }
                setSaving(true);
                try {
                  const params = await buildQueryParams({});
                  const { attachment, ...rest } = adjForm;
                  if (attachment) {
                    const fd = new FormData();
                    Object.entries({ ...params, ...rest }).forEach(([k, v]) => {
                      if (v !== null && v !== undefined && v !== "") fd.append(k, v);
                    });
                    fd.append("attachment", attachment);
                    await api.post("/payroll-management/adjustments", fd, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                  } else {
                    await api.post("/payroll-management/adjustments", { ...params, ...rest });
                  }
                  setDialogOpen(false);
                  setAdjForm(emptyAdjForm);
                  fetchAdjustments();
                } catch (e) { alert(e?.response?.data?.message || t("payroll.common.saveFailed")); }
                finally { setSaving(false); }
              }}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? t("payroll.common.saving") : t("payroll.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
