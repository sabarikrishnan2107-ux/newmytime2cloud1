"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { getLeavesRequest } from "@/lib/endpoint/leaves";
import { getEmployees, getBranches, getDepartments } from "@/lib/api";
import { api, API_BASE, buildQueryParams } from "@/lib/api-client";
import { getUser } from "@/config";
import MultiDropDown from "@/components/ui/MultiDropDown";
import ProfilePicture from "@/components/ProfilePicture";

export default function LeaveBalancesPage() {
  const [search, setSearch] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveGroups, setLeaveGroups] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
    getDepartments().then(setDepartments).catch(console.error);
    fetchLeaveTypesAndGroups();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedBranchIds, selectedDepartmentIds]);

  const fetchLeaveTypesAndGroups = async () => {
    try {
      const user = await getUser();
      const cid = user?.company_id || 0;

      const [typesRes, groupsRes] = await Promise.all([
        api.get(`${API_BASE}/leave_type`, { params: { company_id: cid, per_page: 100 } }),
        api.get(`${API_BASE}/leave_groups`, { params: { company_id: cid, per_page: 100 } }),
      ]);

      setLeaveTypes(Array.isArray(typesRes.data?.data) ? typesRes.data.data : []);
      setLeaveGroups(Array.isArray(groupsRes.data?.data) ? groupsRes.data.data : []);
    } catch (e) {
      console.error("Failed to fetch leave types/groups:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const empParams = {
        per_page: 500,
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
      };
      const empResult = await getEmployees(empParams);
      setEmployees(Array.isArray(empResult?.data) ? empResult.data : []);

      const year = new Date().getFullYear();
      const leaveParams = {
        per_page: 2000,
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
      };
      const leaveResult = await getLeavesRequest(leaveParams);
      setLeaveRequests(Array.isArray(leaveResult?.data) ? leaveResult.data : []);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days from start_date and end_date
  const calcDays = (lr) => {
    if (lr.total_days) return lr.total_days;
    if (lr.days) return lr.days;
    try {
      return differenceInDays(parseISO(lr.end_date), parseISO(lr.start_date)) + 1;
    } catch {
      return 1;
    }
  };

  // Build a map: groupId → { leaveTypeId → entitled }
  const groupEntitlements = useMemo(() => {
    const map = {};
    leaveGroups.forEach((g) => {
      map[g.id] = {};
      (g.leave_count || []).forEach((lc) => {
        map[g.id][lc.leave_type_id] = lc.leave_type_count || 0;
      });
    });
    return map;
  }, [leaveGroups]);

  // Get leave group name
  const getGroupName = (groupId) => {
    return leaveGroups.find((g) => g.id === groupId)?.group_name || "";
  };

  // Compute balances per employee
  const getEmployeeBalances = (employeeId, leaveGroupId) => {
    const empLeaves = leaveRequests.filter((lr) => lr.employee_id === employeeId);
    const entitlements = groupEntitlements[leaveGroupId] || {};

    return leaveTypes.map((lt) => {
      const typeLeaves = empLeaves.filter(
        (lr) => lr.leave_type_id === lt.id || lr.leave_group_type?.leave_type?.id === lt.id
      );
      const used = typeLeaves
        .filter((lr) => lr.status === 1)
        .reduce((sum, lr) => sum + calcDays(lr), 0);
      const pending = typeLeaves
        .filter((lr) => lr.status === 0)
        .reduce((sum, lr) => sum + calcDays(lr), 0);

      const entitled = entitlements[lt.id] || 0;
      const remaining = Math.max(0, entitled - used);

      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        entitled,
        used,
        pending,
        remaining,
      };
    });
  };

  // Filtered employees
  const filtered = useMemo(() => {
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter(
      (emp) =>
        (emp.first_name || "").toLowerCase().includes(s) ||
        (emp.last_name || "").toLowerCase().includes(s) ||
        (emp.employee_id || "").toLowerCase().includes(s) ||
        (emp.system_user_id || "").toLowerCase().includes(s)
    );
  }, [search, employees]);

  // Drawer data
  const drawerBalances = selectedEmployee
    ? getEmployeeBalances(selectedEmployee.id, selectedEmployee.leave_group_id)
    : [];
  const drawerLeaves = selectedEmployee
    ? leaveRequests
        .filter((lr) => lr.employee_id === selectedEmployee.id)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    : [];

  const statusLabel = { 0: "Pending", 1: "Approved", 2: "Rejected" };
  const statusColor = { 0: "text-yellow-400", 1: "text-emerald-400", 2: "text-red-400" };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-white">Leave Balances</h1>
        <p className="text-sm text-slate-500 mt-0.5">View employee leave balances based on their assigned leave group</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50"
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
        <div className="flex items-center text-xs text-slate-500">
          {loading ? "Loading..." : `${filtered.length} employees`}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Employee</th>
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">Leave Group</th>
                {leaveTypes.map((lt) => (
                  <th key={lt.id} className="text-center font-medium text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">
                    {lt.name}
                  </th>
                ))}
                <th className="text-center font-medium text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">Total Used</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={leaveTypes.length + 4} className="text-center py-10 text-slate-500">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={leaveTypes.length + 4} className="text-center py-10 text-slate-500">No employees found</td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const balances = getEmployeeBalances(emp.id, emp.leave_group_id);
                  const totalUsed = balances.reduce((s, b) => s + b.used, 0);
                  const groupName = getGroupName(emp.leave_group_id);

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="border-b border-slate-200 dark:border-white/5 last:border-0 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ProfilePicture src={emp.profile_picture} className="w-8 h-8" />
                          <div>
                            <p className="font-medium text-white whitespace-nowrap">
                              {emp.first_name} {emp.last_name || ""}
                            </p>
                            <p className="text-xs text-slate-500">
                              {emp.department?.name || ""} {emp.employee_id ? `· ${emp.employee_id}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {groupName ? (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold whitespace-nowrap">
                            {groupName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">Unassigned</span>
                        )}
                      </td>

                      {leaveTypes.map((lt) => {
                        const bal = balances.find((b) => b.leaveTypeId === lt.id);
                        return (
                          <td key={lt.id} className="px-4 py-3 text-center whitespace-nowrap">
                            {bal && (bal.used > 0 || bal.entitled > 0) ? (
                              <span className="text-white font-medium">
                                {bal.used}
                                {bal.entitled > 0 && (
                                  <span className="text-slate-500 font-normal">/{bal.entitled}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-white">{totalUsed || "-"}</span>
                      </td>

                      <td className="px-2 py-3">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedEmployee && (
        <>
          <div className="fixed inset-x-0 bottom-0 top-[72px] bg-black/50 z-40" onClick={() => setSelectedEmployee(null)} />
          <div className="fixed top-[72px] right-0 bottom-0 w-full max-w-lg z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <ProfilePicture src={selectedEmployee.profile_picture} className="w-10 h-10" />
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedEmployee.first_name} {selectedEmployee.last_name || ""}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedEmployee.department?.name || ""}
                    {selectedEmployee.employee_id ? ` · ${selectedEmployee.employee_id}` : ""}
                  </p>
                  {getGroupName(selectedEmployee.leave_group_id) && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold">
                      {getGroupName(selectedEmployee.leave_group_id)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Balance Cards */}
              <div>
                <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Leave Balances</h3>
                {drawerBalances.filter((b) => b.entitled > 0 || b.used > 0 || b.pending > 0).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {selectedEmployee.leave_group_id ? "No leave entitlements in this group." : "No leave group assigned to this employee."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {drawerBalances
                      .filter((b) => b.entitled > 0 || b.used > 0 || b.pending > 0)
                      .map((bal) => (
                        <div key={bal.leaveTypeId} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mb-3">{bal.leaveTypeName}</p>
                          <div className="grid grid-cols-2 gap-y-2 text-xs">
                            <div>
                              <p className="text-slate-500">Remaining</p>
                              <p className="text-lg font-bold text-emerald-400">{bal.entitled > 0 ? bal.remaining : "—"}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Entitled</p>
                              <p className="text-lg font-bold text-white">{bal.entitled || "—"}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Used</p>
                              <p className="text-sm font-semibold text-red-400">{bal.used}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Pending</p>
                              <p className="text-sm font-semibold text-yellow-400">{bal.pending}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Leave History */}
              <div>
                <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Leave History ({drawerLeaves.length})
                </h3>
                {drawerLeaves.length === 0 ? (
                  <p className="text-sm text-slate-500">No leave records found.</p>
                ) : (
                  <div className="space-y-2">
                    {drawerLeaves.map((lr) => (
                      <div key={lr.id} className="flex items-start gap-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {lr.leave_type?.name || lr.leave_group_type?.leave_type?.name || "Leave"}
                            </p>
                            <span className={`text-xs font-bold shrink-0 ${statusColor[lr.status] || "text-slate-400"}`}>
                              {statusLabel[lr.status] || "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">
                              {lr.start_date} → {lr.end_date}
                            </span>
                            <span className="text-xs text-slate-600">&middot;</span>
                            <span className="text-xs text-slate-400">
                              {calcDays(lr)} day(s)
                            </span>
                          </div>
                          {lr.reason && (
                            <p className="text-xs text-slate-500 mt-1 italic">{lr.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
