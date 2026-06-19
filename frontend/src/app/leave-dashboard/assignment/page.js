"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, Users, CheckCircle2 } from "lucide-react";
import { getEmployees, getBranches, getDepartments } from "@/lib/api";
import { api, API_BASE } from "@/lib/api-client";
import { getUser } from "@/config";
import { notify } from "@/lib/utils";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DropDown from "@/components/ui/DropDown";
import ProfilePicture from "@/components/ProfilePicture";

export default function EmployeeAssignment() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignGroupId, setAssignGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [leaveGroups, setLeaveGroups] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
    getDepartments().then(setDepartments).catch(console.error);
    fetchLeaveGroups();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [selectedBranchIds, selectedDepartmentIds]);

  const fetchLeaveGroups = async () => {
    try {
      const user = await getUser();
      const { data } = await api.get(`${API_BASE}/leave_groups`, {
        params: { company_id: user?.company_id || 0, per_page: 100 },
      });
      setLeaveGroups(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to fetch leave groups:", e);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 500,
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
      };
      const result = await getEmployees(params);
      setEmployees(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.error("Failed to fetch employees:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter(
      (emp) =>
        (emp.first_name || "").toLowerCase().includes(s) ||
        (emp.last_name || "").toLowerCase().includes(s) ||
        (emp.employee_id || "").toLowerCase().includes(s) ||
        (emp.email || "").toLowerCase().includes(s)
    );
  }, [employees, search]);

  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.find((e) => e.id === id)));
    } else {
      const filteredIds = filtered.map((e) => e.id);
      setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getGroupName = (groupId) => {
    return leaveGroups.find((g) => g.id === groupId)?.group_name || "";
  };

  const handleBulkAssign = async () => {
    if (!assignGroupId || selectedIds.length === 0) return;
    setSaving(true);
    try {
      const user = await getUser();
      // Update each selected employee's leave_group_id
      await Promise.all(
        selectedIds.map((empId) =>
          api.put(`${API_BASE}/employee/${empId}`, {
            company_id: user?.company_id || 0,
            leave_group_id: assignGroupId,
          })
        )
      );
      notify?.("Success", `${selectedIds.length} employee(s) assigned to leave group`, "success");
      setSelectedIds([]);
      setAssignGroupId(null);
      fetchEmployees();
    } catch (e) {
      console.error("Failed to assign:", e);
      notify?.("Error", "Failed to assign leave group", "error");
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = employees.filter((e) => e.leave_group_id).length;

  // Leave group items for dropdown
  const groupItems = leaveGroups.map((g) => ({ id: g.id, name: g.group_name || g.name || `Group ${g.id}` }));

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-white">Employee Assignment</h1>
        <p className="text-sm text-slate-500 mt-0.5">Assign leave groups to employees across your organization</p>
      </div>

      {/* Filters */}
      <div className="bg-white/5 dark:bg-slate-800/50 border border-white/10 rounded-xl p-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm font-medium rounded-xl border outline-none
                bg-white border-gray-200 text-slate-600 placeholder:text-slate-400
                dark:bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:placeholder:text-slate-600
                focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
            />
          </div>
          <MultiDropDown
            placeholder="Select Branch"
            items={branches}
            value={selectedBranchIds}
            onChange={setSelectedBranchIds}
            badgesCount={1}
            portalled={false}
          />
          <MultiDropDown
            placeholder="Select Department"
            items={departments}
            value={selectedDepartmentIds}
            onChange={setSelectedDepartmentIds}
            badgesCount={1}
            portalled={false}
          />

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                {selectedIds.length} selected
              </span>
              <DropDown
                placeholder="Select Group"
                items={groupItems}
                value={assignGroupId}
                onChange={setAssignGroupId}
                portalled={false}
              />
              <button
                onClick={handleBulkAssign}
                disabled={!assignGroupId || saving}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap
                  bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Assign"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Users className="w-4 h-4" />
          <span><span className="font-semibold text-white">{filtered.length}</span> employees</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span><span className="font-semibold text-white">{assignedCount}</span> assigned</span>
        </div>
        {loading && <span className="text-xs text-slate-500 animate-pulse">Loading...</span>}
      </div>

      {/* Table */}
      <div className="bg-white/5 dark:bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                  />
                </th>
                <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Employee</th>
                <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Department</th>
                <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Branch</th>
                <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Leave Group</th>
                <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">No employees found</td></tr>
              ) : (
                filtered.map((emp) => {
                  const groupName = getGroupName(emp.leave_group_id);
                  const isSelected = selectedIds.includes(emp.id);

                  return (
                    <tr
                      key={emp.id}
                      className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                      onClick={() => toggleSelect(emp.id)}
                    >
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(emp.id)}
                          className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ProfilePicture src={emp.profile_picture} className="w-8 h-8" />
                          <div>
                            <p className="font-medium text-gray-700 dark:text-white">
                              {emp.first_name} {emp.last_name || ""}
                            </p>
                            <p className="text-xs text-slate-500">{emp.employee_id || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-slate-300">
                        {emp.department?.name || "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-slate-300">
                        {emp.branch?.name || emp.department?.branch?.name || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {groupName ? (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold">
                            {groupName}
                          </span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {emp.leave_group_id ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-500/20 text-slate-400 border-slate-500/30">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
