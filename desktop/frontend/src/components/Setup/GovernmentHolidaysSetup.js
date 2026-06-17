"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config";
import {
  getEmployeeGovernmentHolidays,
  saveEmployeeGovernmentHolidays,
  resetEmployeeGovernmentHolidays,
} from "@/lib/endpoint/holidays";
import { Checkbox } from "../ui/checkbox";
import { Globe, Save, Loader2, Search, Users, CalendarDays, CheckCheck, RotateCcw, Pencil, Trash2 } from "lucide-react";

export default function GovernmentHolidaysSetup() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customStatus, setCustomStatus] = useState({});

  // Edit mode: when editing a single employee's custom holidays
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [year, setYear] = useState(new Date().getFullYear());
  const [countryCode, setCountryCode] = useState("AE");

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const params = await buildQueryParams({});
        const { data } = await api.get("/branch-list", { params });
        setBranches(data || []);
      } catch (e) {}
    };
    fetchBranches();
  }, []);

  // Fetch employees when branch changes
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const params = await buildQueryParams({
          per_page: 1000,
          branch_ids: selectedBranch ? [selectedBranch] : undefined,
        });
        const { data } = await api.get("/employees_with_schedule_count", { params });
        setEmployees(data?.data || []);
      } catch (e) {}
    };
    fetchEmployees();
  }, [selectedBranch]);

  // Fetch custom status for all employees
  const fetchCustomStatus = useCallback(async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/employees/government-holidays-status", {
        params: { ...params, year },
      });
      if (data?.success) {
        setCustomStatus(data.data || {});
      }
    } catch (e) {}
  }, [year]);

  useEffect(() => {
    fetchCustomStatus();
  }, [fetchCustomStatus]);

  // Fetch default government holidays (for bulk assign mode)
  const fetchDefaultHolidays = useCallback(async () => {
    if (editingEmployee) return; // Don't fetch defaults when editing
    let code = "AE";
    if (selectedBranch) {
      const branch = branches.find((b) => String(b.id) === String(selectedBranch));
      if (branch?.country) code = branch.country;
    }
    setCountryCode(code);
    setLoading(true);
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/government-holidays", {
        params: { ...params, country_code: code, year },
      });
      if (data?.success && data?.data) {
        setHolidays(
          data.data.map((h) => ({
            holiday_id: h.id,
            name: h.name,
            start_date: h.start_date,
            end_date: h.end_date,
            total_days: h.total_days || 1,
            is_enabled: true,
          }))
        );
      }
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, branches, year, editingEmployee]);

  useEffect(() => {
    if (!editingEmployee) fetchDefaultHolidays();
  }, [fetchDefaultHolidays, editingEmployee]);

  // Load a single employee's custom holidays for editing
  const loadEmployeeHolidays = async (emp) => {
    setEditingEmployee(emp);
    setSelectedEmployeeIds([]);
    const code = emp.branch?.country || "AE";
    setCountryCode(code);
    setLoading(true);
    try {
      const { company_id } = await getUser();
      const res = await getEmployeeGovernmentHolidays(emp.id, {
        company_id,
        country_code: code,
        year,
      });
      if (res.success) {
        setHolidays(
          (res.data || []).map((h) => ({
            holiday_id: h.holiday_id || h.id,
            name: h.name,
            start_date: h.start_date,
            end_date: h.end_date,
            total_days: h.total_days || 1,
            is_enabled: h.is_enabled ?? true,
          }))
        );
      }
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  };

  // Exit edit mode, go back to bulk assign
  const exitEditMode = () => {
    setEditingEmployee(null);
  };

  const toggleHoliday = (index) => {
    setHolidays((prev) =>
      prev.map((h, i) => (i === index ? { ...h, is_enabled: !h.is_enabled } : h))
    );
  };

  const toggleEmployee = (empId) => {
    if (editingEmployee) return;
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const selectAllEmployees = () => {
    if (editingEmployee) return;
    const allIds = filteredEmployees.map((e) => e.id);
    const allSelected = allIds.every((id) => selectedEmployeeIds.includes(id));
    if (allSelected) {
      setSelectedEmployeeIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedEmployeeIds((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  // Save: bulk assign OR single employee edit
  const handleSave = async () => {
    const targetIds = editingEmployee ? [editingEmployee.id] : selectedEmployeeIds;
    if (targetIds.length === 0) {
      notify("Error", "Select at least one employee", "error");
      return;
    }
    setSaving(true);
    setSaveProgress({ current: 0, total: targetIds.length });
    try {
      const { company_id } = await getUser();
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < targetIds.length; i++) {
        const empId = targetIds[i];
        setSaveProgress({ current: i + 1, total: targetIds.length });
        try {
          await saveEmployeeGovernmentHolidays(empId, {
            company_id,
            country_code: countryCode,
            year,
            holidays,
          });
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (failCount === 0) {
        notify("Success", `Government holidays saved for ${successCount} employee${successCount > 1 ? "s" : ""}`, "success");
      } else {
        notify("Warning", `Saved: ${successCount}, Failed: ${failCount}`, "error");
      }
      setSelectedEmployeeIds([]);
      if (editingEmployee) setEditingEmployee(null);
      fetchCustomStatus();
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setSaving(false);
      setSaveProgress({ current: 0, total: 0 });
    }
  };

  // Delete/reset custom holidays for an employee
  const handleDelete = async (emp) => {
    const code = emp.branch?.country || "AE";
    try {
      const { company_id } = await getUser();
      await resetEmployeeGovernmentHolidays(emp.id, {
        company_id,
        country_code: code,
        year,
      });
      notify("Success", `Reset ${emp.first_name} to default holidays`, "success");
      if (editingEmployee?.id === emp.id) setEditingEmployee(null);
      fetchCustomStatus();
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const name = `${e.first_name || ""} ${e.last_name || ""}`.toLowerCase();
    const empId = (e.employee_id || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || empId.includes(term);
  });

  const enabledCount = holidays.filter((h) => h.is_enabled).length;
  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id));

  return (
    <div className="h-[calc(100vh-140px)] flex overflow-hidden rounded-2xl border border-gray-200 dark:border-white/5">
      {/* LEFT: Employee List */}
      <div className="w-[320px] shrink-0 border-r border-gray-200 dark:border-white/5 bg-white dark:bg-[#0b1326] flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-primary" />
            Employees
          </h2>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
            {editingEmployee
              ? "Editing custom holidays"
              : "Select employees to assign government holidays"}
          </p>
        </div>

        {/* Branch Filter */}
        <div className="px-5 pb-3">
          <select
            value={selectedBranch || ""}
            onChange={(e) => {
              setSelectedBranch(e.target.value || null);
              setSelectedEmployeeIds([]);
              setEditingEmployee(null);
            }}
            className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || b.branch_name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="px-5 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employees..."
              className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
        </div>

        {/* Select All / Back to bulk */}
        <div className="px-5 py-2 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          {editingEmployee ? (
            <button
              onClick={exitEditMode}
              className="flex items-center gap-2 text-xs font-medium text-primary hover:text-indigo-700 transition"
            >
              <RotateCcw size={14} />
              Back to Bulk Assign
            </button>
          ) : (
            <button
              onClick={selectAllEmployees}
              className="flex items-center gap-2 text-xs font-medium text-primary hover:text-indigo-700 transition"
            >
              <CheckCheck size={14} />
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </button>
          )}
          {selectedEmployeeIds.length > 0 && !editingEmployee && (
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
              {selectedEmployeeIds.length} selected
            </span>
          )}
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">No employees found</div>
          ) : (
            <div className="space-y-1">
              {filteredEmployees.map((emp) => {
                const isSelected = editingEmployee
                  ? editingEmployee.id === emp.id
                  : selectedEmployeeIds.includes(emp.id);
                const empCustom = customStatus[emp.id];
                const hasCustom = !!empCustom;

                return (
                  <div
                    key={emp.id}
                    className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    {/* Checkbox for bulk mode */}
                    {!editingEmployee && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                    )}

                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (editingEmployee) {
                          loadEmployeeHolidays(emp);
                        } else {
                          toggleEmployee(emp.id);
                        }
                      }}
                    >
                      <img
                        className="w-8 h-8 rounded-full shrink-0"
                        src={
                          emp.profile_picture ||
                          `https://placehold.co/32x32/6946dd/ffffff?text=${(emp.first_name || "?").charAt(0)}`
                        }
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://placehold.co/32x32/6946dd/ffffff?text=${(emp.first_name || "?").charAt(0)}`;
                        }}
                        alt=""
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-white"}`}>
                            {emp.first_name} {emp.last_name || ""}
                          </span>
                          {hasCustom && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] font-bold">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-2">
                          <span>{emp.employee_id || "N/A"}</span>
                          {hasCustom && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {empCustom.enabled_count}/{empCustom.total} holidays
                            </span>
                          )}
                          {!hasCustom && emp.branch?.country && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold">
                              {emp.branch.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Edit / Delete buttons for custom employees */}
                    {hasCustom && !editingEmployee && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadEmployeeHolidays(emp);
                          }}
                          className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/10 text-indigo-500 transition"
                          title="Edit custom holidays"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(emp);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-red-500 transition"
                          title="Reset to default"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Holiday List */}
      <div className="flex-1 bg-gray-50 dark:bg-[#0a1128] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0b1326]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays size={18} className="text-primary" />
                Government Holidays
                <span className="text-xs font-normal text-gray-400 dark:text-slate-500">
                  ({countryCode})
                </span>
              </h2>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                {editingEmployee ? (
                  <>
                    Editing: <span className="font-medium text-indigo-500">{editingEmployee.first_name} {editingEmployee.last_name || ""}</span>
                  </>
                ) : (
                  <>Uncheck holidays to exclude</>
                )}
                {" "}&middot; {enabledCount} of {holidays.length} enabled
              </p>
            </div>
            <select
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                if (editingEmployee) setEditingEmployee(null);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Holiday List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="ml-2 text-sm text-gray-400">Loading holidays...</span>
            </div>
          ) : holidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Globe size={48} className="mb-4 opacity-30" />
              <p className="text-sm">No government holidays found for {countryCode} in {year}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {holidays.map((holiday, index) => (
                <div
                  key={holiday.holiday_id}
                  className={`flex items-center p-3.5 rounded-xl transition-colors cursor-pointer hover:bg-white dark:hover:bg-white/[0.03] border border-transparent hover:border-gray-200 dark:hover:border-white/5 ${
                    !holiday.is_enabled ? "opacity-40" : ""
                  }`}
                  onClick={() => toggleHoliday(index)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={holiday.is_enabled}
                      onCheckedChange={() => toggleHoliday(index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        {holiday.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {holiday.start_date}
                        {holiday.end_date !== holiday.start_date && ` to ${holiday.end_date}`}
                        {holiday.total_days > 1 && ` (${holiday.total_days} days)`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 bg-white dark:bg-[#0b1326] flex items-center justify-between">
          <div className="text-xs text-gray-400 dark:text-slate-500">
            {editingEmployee
              ? `Editing ${editingEmployee.first_name}'s holidays`
              : selectedEmployeeIds.length > 0
                ? `${selectedEmployeeIds.length} employee${selectedEmployeeIds.length > 1 ? "s" : ""} selected`
                : "Select employees from the left panel"}
          </div>
          <div className="flex items-center gap-2">
            {editingEmployee && (
              <button
                onClick={() => handleDelete(editingEmployee)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors"
              >
                <Trash2 size={14} />
                Reset to Default
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || (!editingEmployee && selectedEmployeeIds.length === 0) || holidays.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-primary/20"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Saving {saveProgress.current}/{saveProgress.total}...
                </>
              ) : editingEmployee ? (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              ) : (
                <>
                  <Save size={14} />
                  Assign to {selectedEmployeeIds.length || 0} Employee{selectedEmployeeIds.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
