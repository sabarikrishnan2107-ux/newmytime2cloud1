"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, Users, Cpu, RefreshCw } from "lucide-react";
import SyncGrid from "@/components/Employees/UploadPhoto/SyncGrid";
import { useAttendanceSync } from "@/app/employees/employee_photo_upload/useAttendanceSync";
import {
  getBranches,
  getDepartments,
  getTimezoneDropdown,
  getTimezoneEmployees,
  getDevices,
  bulkAssignTimezone,
} from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

export default function BulkAssignTimezoneModal({ open, onClose, onSaved }) {
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [tzId, setTzId] = useState(""); // timezones.id
  const [empData, setEmpData] = useState([]);
  const [devData, setDevData] = useState([]);
  const [saving, setSaving] = useState(false);

  // Reuse the transfer-list hook from the photo-upload feature (same UI as SyncGrid).
  const empSync = useAttendanceSync(empData);
  const devSync = useAttendanceSync(devData);

  // Static lists + devices on open
  useEffect(() => {
    if (!open) return;
    setBranchId(""); setDeptId(""); setTzId("");
    getBranches().then((b) => setBranches(Array.isArray(b) ? b : (b?.data || []))).catch(() => {});
    getTimezoneDropdown().then((t) => setTimezones(Array.isArray(t) ? t : [])).catch((e) => notify("Error", parseApiError(e), "error"));
    getDevices({ per_page: 500 })
      .then((r) => {
        const list = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
        const seen = new Set();
        const items = list
          .filter((d) => d.device_id != null && !seen.has(d.device_id) && seen.add(d.device_id))
          .map((d) => ({
            itemId: String(d.id),
            id: d.device_id,                 // unique key + badge (serial)
            name: d.name || "Unknown",
            dept: d.branch?.branch_name || "N/A",
            deviceTableId: d.id,             // DB id for the payload
            profile_picture: null,
          }));
        setDevData(items);
      })
      .catch((e) => notify("Error", parseApiError(e), "error"));
  }, [open]);

  // Departments depend on branch
  useEffect(() => {
    if (!open) return;
    setDeptId("");
    getDepartments(branchId || null).then((d) => setDepartments(Array.isArray(d) ? d : (d?.data || []))).catch(() => setDepartments([]));
  }, [open, branchId]);

  // Employees depend on branch/department
  useEffect(() => {
    if (!open) return;
    getTimezoneEmployees({ per_page: 1000, branch_id: branchId || null, department_id: deptId || null })
      .then((r) => {
        const list = Array.isArray(r?.data) ? r.data : [];
        setEmpData(list.map((e) => {
          const name = e.display_name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || "Unknown";
          return {
            itemId: String(e.id),
            id: e.id,                        // unique key + badge (DB id, same as screenshot)
            name,
            dept: [e.branch?.branch_name, e.department?.name].filter(Boolean).join(" / ") || "N/A",
            profile_picture: e.profile_picture,
            display_name: name,
            system_user_id: e.system_user_id,
            rfid_card_number: e.rfid_card_number,
            rfid_card_password: e.rfid_card_password,
          };
        }));
      })
      .catch((e) => notify("Error", parseApiError(e), "error"));
  }, [open, branchId, deptId]);

  if (!open) return null;

  const submit = async () => {
    const tz = timezones.find((t) => String(t.id) === String(tzId));
    if (!tz) { notify("Validation", "Pick a timezone.", "error"); return; }
    const emps = empSync.selected || [];
    const devs = devSync.selected || [];
    if (emps.length === 0) { notify("Validation", "Move at least one employee to Selected Personnel.", "error"); return; }
    if (devs.length === 0) { notify("Validation", "Move at least one device to Target Hardware.", "error"); return; }

    setSaving(true);
    try {
      await bulkAssignTimezone({
        timezone_id: tz.timezone_id,
        timezone_table_id: tz.id,
        employee_id: emps.map((e) => ({
          id: e.id,
          display_name: e.display_name || e.name,
          system_user_id: e.system_user_id,
          rfid_card_number: e.rfid_card_number,
          rfid_card_password: e.rfid_card_password,
        })),
        employee_ids: emps.map((e) => e.id),
        device_id: devs.map((d) => ({ id: d.deviceTableId, device_id: d.id, name: d.name })),
        device_ids: devs.map((d) => d.deviceTableId),
        branch_id: branchId || undefined,
      });
      notify("Saved", `Assigned "${tz.timezone_name}" to ${emps.length} employee(s) on ${devs.length} device(s).`, "success");
      onSaved?.();
      onClose();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const selectCls = "border rounded px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40";

  return (
    <div className="space-y-6 pb-24">
      {/* Header: back + title on the left, filters on the right — responsive */}
      <header className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-white dark:bg-slate-900 p-3 px-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 whitespace-nowrap w-full lg:w-auto">
          <button onClick={onClose} title="Back to list" className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/5 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 leading-tight">New Timezone Mapping</h1>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">assign a timezone to employees on devices</p>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`${selectCls} flex-1 lg:flex-none`}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name || b.name}</option>)}
          </select>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className={`${selectCls} flex-1 lg:flex-none`}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name || d.department_name}</option>)}
          </select>
          <select value={tzId} onChange={(e) => setTzId(e.target.value)} className={`${selectCls} font-semibold flex-1 lg:flex-none`}>
            <option value="">Select Timezone *</option>
            {timezones.map((t) => <option key={t.id} value={t.id}>{t.timezone_name}</option>)}
          </select>
        </div>
      </header>

      {/* Transfer lists — SyncGrid is responsive (stacks on small screens) */}
      <SyncGrid sync={empSync} leftTitle="Available Employees" rightTitle="Selected Personnel" leftIcon={Users} />
      <SyncGrid sync={devSync} leftTitle="Available Devices" rightTitle="Target Hardware" leftIcon={Cpu} theme="indigo" />

      {/* Fixed bottom submit (mirrors Employee Upload) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pl-16">
        <button onClick={submit} disabled={saving}
          className="px-8 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50 flex items-center gap-3">
          <RefreshCw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
          {saving ? "Submitting…" : `Submit${empSync.selected.length || devSync.selected.length ? ` · ${empSync.selected.length} emp / ${devSync.selected.length} dev` : ""}`}
        </button>
      </div>
    </div>
  );
}
