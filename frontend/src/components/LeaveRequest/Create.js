"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Send, Save, Paperclip, X } from "lucide-react";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config/index";
import { createLeave, getLeaveTypesByGroupId, uploadLeaveDocuments } from "@/lib/endpoint/leaves";
import { getEmployeesByDepartmentId } from "@/lib/api/employee";
import { api, buildQueryParams } from "@/lib/api-client";
import DropDown from "../ui/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
import DateRangeSelect from "@/components/ui/DateRange";
import { getBranches } from "@/lib/api";

const toYMD = (d) => {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date && !isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
};

const initialPayload = {
  leave_type_id: "",
  start_date: new Date().toISOString().split("T")[0],
  end_date: new Date().toISOString().split("T")[0],
  reason: "",
  alternate_employee_id: 0,
  employee_id: 0,
  day_type: "full",
};

const fieldLabel = "block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5";
const fieldInput =
  "h-10 w-full px-3 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/70 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/60";
const readOnlyInput = fieldInput + " bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed";

export default function LeaveRequestCreate({
  setOpen = () => {},
  onSuccess = () => {},
  editData = null,
  staffEmployeeId = null,
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialPayload);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [reportingManager, setReportingManager] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveAvailableCount, setLeaveAvailableCount] = useState("");
  const [canApply, setCanApply] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [errors, setErrors] = useState({});

  const isEdit = !!editData;

  useEffect(() => {
    if (editData) {
      setForm((prev) => ({
        ...prev,
        leave_type_id: editData.leave_type_id || "",
        start_date: editData.start_date || prev.start_date,
        end_date: editData.end_date || prev.end_date,
        reason: editData.reason || "",
        alternate_employee_id: editData.alternate_employee_id || 0,
        employee_id: editData.employee_id || 0,
      }));
    }
  }, [editData]);

  useEffect(() => {
    fetchDepartmentEmployees();
    (async () => {
      try { setBranches(await getBranches()); } catch (e) { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (staffEmployeeId && departmentEmployees.length > 0 && !form.employee_id) {
      setForm((prev) => ({ ...prev, employee_id: staffEmployeeId }));
    }
  }, [staffEmployeeId, departmentEmployees]);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!form.employee_id) { setEmployeeDetails(null); return; }
      try {
        const params = await buildQueryParams();
        const res = await api.get(`/employeev1`, { params: { ...params, per_page: 1, id: form.employee_id } });
        const emp = res.data?.data?.[0];
        setEmployeeDetails(emp || null);
      } catch (e) {
        console.error("Failed to fetch employee details:", e);
        setEmployeeDetails(null);
      }
    };
    fetchEmployeeDetails();
  }, [form.employee_id]);

  const selectedEmployee = useMemo(
    () => departmentEmployees.find((e) => e.id === Number(form.employee_id)),
    [departmentEmployees, form.employee_id]
  );

  // Reporting Manager isn't eager-loaded by /employeev1, but the dropdown data
  // already has reporting_manager_id. Use selectedEmployee directly (no race with
  // employeeDetails); fetch the manager's name by PK via id= (NOT employee_id=,
  // which is an ILIKE prefix match on the HR string column).
  useEffect(() => {
    const fetchManager = async () => {
      const managerId = selectedEmployee?.reporting_manager_id;
      if (!managerId) {
        setReportingManager(null);
        return;
      }
      try {
        const params = await buildQueryParams();
        const res = await api.get(`/employeev1`, {
          params: { ...params, per_page: 1, id: managerId },
        });
        setReportingManager(res.data?.data?.[0] || null);
      } catch (e) {
        setReportingManager(null);
      }
    };
    fetchManager();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee?.reporting_manager_id]);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      const selected = departmentEmployees.find((e) => e.id === Number(form.employee_id));
      if (!selected || !selected?.leave_group_id) {
        setLeaveTypes([]);
        return;
      }
      try {
        const data = await getLeaveTypesByGroupId(selected.leave_group_id, { per_page: 1000, employee_id: selected.id });
        setLeaveTypes(
          data.map((e) => ({
            id: e.leave_type_id,
            name: e.leave_type?.name || e.leave_type?.short_name || "Leave Type",
            leave_type_count: e.leave_type_count,
            employee_used: e.employee_used,
          }))
        );
      } catch (error) {
        notify("Error", parseApiError(error), "error");
      }
    };
    fetchLeaveTypes();
  }, [form.employee_id, departmentEmployees]);

  useEffect(() => {
    const f = leaveTypes.find((item) => item.id === Number(form.leave_type_id));
    if (!f) {
      setLeaveAvailableCount("");
      setCanApply(true);
      return;
    }
    const available = f.leave_type_count - f.employee_used;
    setCanApply(available > 0);
    setLeaveAvailableCount(`${f.employee_used} / ${f.leave_type_count}`);
  }, [form.leave_type_id, leaveTypes]);

  const fetchDepartmentEmployees = async () => {
    try {
      let data = await getEmployeesByDepartmentId();
      let mapped = data.map((e) => ({
        id: e.id,
        profile_picture: e.profile_picture,
        employee_id: e.employee_id,
        name: e.full_name,
        department: e?.department?.name,
        designation: e?.designation?.name,
        branch: e?.branch?.branch_name || e?.branch?.name || "",
        branch_id: e.branch_id,
        leave_group_id: e.leave_group_id,
        reporting_manager_id: e.reporting_manager_id,
        reporting_manager:
          e?.reporting_manager?.full_name ||
          (e?.reporting_manager?.first_name
            ? `${e.reporting_manager.first_name} ${e.reporting_manager.last_name || ""}`.trim()
            : ""),
      }));
      setDepartmentEmployees(mapped);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Employees shown in the dropdown, narrowed by Branch selection
  const filteredEmployees = useMemo(() => {
    if (!selectedBranchIds.length) return departmentEmployees;
    const wanted = new Set(selectedBranchIds.map(String));
    return departmentEmployees.filter((e) => wanted.has(String(e.branch_id)));
  }, [departmentEmployees, selectedBranchIds]);

  // If the currently picked employee no longer matches the Branch filter, clear it
  useEffect(() => {
    if (
      form.employee_id &&
      selectedBranchIds.length > 0 &&
      !filteredEmployees.some((e) => e.id === Number(form.employee_id))
    ) {
      setForm((prev) => ({ ...prev, employee_id: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchIds, filteredEmployees]);

  const dayDifference = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const from = new Date(form.start_date);
    const to = new Date(form.end_date);
    const base = Math.max(1, (to - from) / (1000 * 60 * 60 * 24) + 1);
    if (form.day_type === "half_first" || form.day_type === "half_second") return 0.5;
    return base;
  }, [form.start_date, form.end_date, form.day_type]);

  const onFilesPicked = (files) => {
    const arr = Array.from(files || []).filter((f) => {
      const ok = f.type === "application/pdf" || f.type.startsWith("image/");
      if (!ok) notify("Invalid file", `${f.name}: only PDF or image files are allowed`, "error");
      return ok;
    });
    setDocuments((prev) => [
      ...prev,
      ...arr.map((f) => ({ title: f.name, file: f, previewUrl: URL.createObjectURL(f) })),
    ]);
  };

  const removeDoc = (i) => setDocuments((prev) => prev.filter((_, idx) => idx !== i));

  const buildPayload = async () => {
    const user = await getUser();
    return {
      company_id: user?.company_id || 0,
      employee_id: form.employee_id,
      reporting_manager_id: selectedEmployee?.reporting_manager_id || 0,
      leave_type_id: form.leave_type_id || null,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason,
      alternate_employee_id: form.alternate_employee_id || 0,
      day_type: form.day_type,
    };
  };

  const onSaveDraft = async () => {
    if (!form.employee_id) {
      notify("Error", "Please select an employee before saving a draft.", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = await buildPayload();
      payload.is_draft = true;
      const response = await createLeave(null, payload);
      if (response?.status === false) {
        if (response.errors) {
          setErrors(response.errors);
          const firstKey = Object.keys(response.errors)[0];
          notify("Error", response.errors[firstKey][0], "error");
          return;
        }
        notify("Error", response.message, "error");
        return;
      }
      notify("Saved", "Draft saved.", "success");
      onSuccess();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const payload = await buildPayload();
      let response = isEdit ? await createLeave(editData.id, payload) : await createLeave(null, payload);

      if (response?.status === false) {
        if (response.errors) {
          setErrors(response.errors);
          const firstKey = Object.keys(response.errors)[0];
          notify("Error", response.errors[firstKey][0], "error");
          return;
        }
        notify("Error", response.message, "error");
        onSuccess();
        return;
      }

      const leaveId = response?.record?.id;
      const validDocs = documents.filter((d) => d.file);
      if (leaveId && validDocs.length > 0) {
        try {
          await uploadLeaveDocuments(leaveId, form.employee_id, validDocs);
        } catch (docError) {
          notify("Warning", "Leave created but document upload failed", "error");
        }
      }

      await notify("Success", isEdit ? "Leave Updated Successfully" : "Leave Applied Successfully", "success");
      setForm(initialPayload);
      setDocuments([]);
      onSuccess();
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col max-h-[85vh]">
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 -mx-7 -mt-7 overflow-hidden">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <h2 className="text-xl font-bold text-slate-50">Apply for Leave</h2>
          <p className="text-sm text-slate-300 mt-0.5">Submit a new leave request — your manager will be notified instantly.</p>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 pt-5 pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!staffEmployeeId && (
            <div>
              <label className={fieldLabel}>Employee <span className="text-rose-500">*</span></label>
              <DropDown width="w-full" items={filteredEmployees} value={form.employee_id || 0} onChange={(v) => handleChange("employee_id", v)} />
            </div>
          )}
          <div>
            <label className={fieldLabel}>Employee ID</label>
            <input className={readOnlyInput} value={selectedEmployee?.employee_id || employeeDetails?.employee_id || ""} readOnly placeholder="—" />
          </div>
          <div>
            <label className={fieldLabel}>Branch</label>
            <MultiDropDown
              placeholder="Select Branch"
              items={branches}
              value={selectedBranchIds}
              onChange={setSelectedBranchIds}
              badgesCount={1}
              width="w-full"
            />
          </div>
          <div>
            <label className={fieldLabel}>Reporting Manager</label>
            <input
              className={readOnlyInput}
              value={
                employeeDetails?.reporting_manager?.full_name ||
                (employeeDetails?.reporting_manager?.first_name
                  ? `${employeeDetails.reporting_manager.first_name} ${employeeDetails.reporting_manager.last_name || ""}`.trim()
                  : "") ||
                reportingManager?.full_name ||
                (reportingManager?.first_name
                  ? `${reportingManager.first_name} ${reportingManager.last_name || ""}`.trim()
                  : "") ||
                selectedEmployee?.reporting_manager ||
                ""
              }
              readOnly
              placeholder="—"
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Leave Type <span className="text-rose-500">*</span></label>
          <DropDown width="w-full" items={leaveTypes} value={form.leave_type_id || ""} onChange={(v) => handleChange("leave_type_id", v)} />
          {leaveAvailableCount && (
            <p className="mt-1 text-xs text-slate-500">Used / Total: <span className="font-medium text-slate-700 dark:text-slate-200">{leaveAvailableCount}</span></p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>From Date <span className="text-rose-500">*</span></label>
            <DateRangeSelect
              value={{ from: form.start_date, to: form.start_date }}
              single
              numberOfMonths={1}
              onChange={({ from: newFrom, to: newTo }) => {
                const picked = toYMD(newFrom || newTo);
                setForm((prev) => ({
                  ...prev,
                  start_date: picked,
                  end_date: prev.end_date && prev.end_date >= picked ? prev.end_date : picked,
                }));
              }}
            />
          </div>
          <div>
            <label className={fieldLabel}>To Date <span className="text-rose-500">*</span></label>
            <DateRangeSelect
              value={{ from: form.end_date, to: form.end_date }}
              single
              numberOfMonths={1}
              onChange={({ from: newFrom, to: newTo }) => {
                const picked = toYMD(newFrom || newTo);
                setForm((prev) => ({
                  ...prev,
                  end_date: picked < (prev.start_date || picked) ? prev.start_date : picked,
                }));
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Total Days</label>
            <input className={readOnlyInput} value={dayDifference || "Auto"} readOnly />
          </div>
          <div>
            <label className={fieldLabel}>Day Type</label>
            <div className="flex items-center gap-4 h-10">
              {[
                { id: "full", label: "Full Day" },
                { id: "half_first", label: "First Half" },
                { id: "half_second", label: "Second Half" },
              ].map((opt) => (
                <label key={opt.id} className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="day_type"
                    value={opt.id}
                    checked={form.day_type === opt.id}
                    onChange={() => handleChange("day_type", opt.id)}
                    className="accent-sky-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Reason</label>
          <textarea
            rows={3}
            value={form.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            placeholder="Briefly describe the reason for your leave..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/70 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/60 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Handover To</label>
            <DropDown
              width="w-full"
              items={departmentEmployees.filter((e) => e.id !== (staffEmployeeId || form.employee_id))}
              value={form.alternate_employee_id || ""}
              onChange={(v) => handleChange("alternate_employee_id", v)}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">Attachment</p>
          <label
            className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 px-4 py-6 text-center hover:border-sky-500 dark:hover:border-sky-500 transition-colors"
          >
            <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(e) => { onFilesPicked(e.target.files); e.target.value = ""; }} />
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Paperclip className="w-4 h-4" />
              Click to upload medical certificate or supporting docs
            </div>
          </label>
          {documents.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {documents.map((d, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 text-xs">
                  <span className="truncate text-slate-700 dark:text-slate-200">{d.title}</span>
                  <button type="button" onClick={() => removeDoc(i)} className="text-slate-500 hover:text-rose-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {errors?.reporting_manager_id && (
          <p className="text-sm text-rose-500">Reporting Manager ID is not assigned. Contact Admin.</p>
        )}
        {!canApply && (
          <p className="text-sm text-rose-500">No available leaves for the selected leave type.</p>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-white/10 -mx-7 px-6 py-3 mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={onSaveDraft} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Save className="w-4 h-4" />
          Save Draft
        </button>
        <button
          type="submit"
          disabled={loading || !canApply}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50 shadow-md shadow-sky-500/20"
        >
          <Send className="w-4 h-4" />
          {loading ? "Submitting..." : isEdit ? "Update Request" : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
