"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getLeavesRequest } from "@/lib/endpoint/leaves";
import { getBranches, getDepartmentsByBranchIds, getScheduledEmployeeList } from "@/lib/api";
import { api, API_BASE } from "@/lib/api-client";
import { getUser } from "@/config";
import MultiDropDown from "@/components/ui/MultiDropDown";
import ProfilePicture from "@/components/ProfilePicture";

const employeeTypeOptions = [
  { id: "Full Time",  name: "Full Time" },
  { id: "Part Time",  name: "Part Time" },
  { id: "Contractor", name: "Contractor" },
  { id: "Trainee",    name: "Trainee" },
];

const statusOptions = [
  { id: 0, name: "Pending" },
  { id: 1, name: "Approved" },
  { id: 2, name: "Rejected" },
];

const statusConfig = {
  0: { label: "Pending", text: "text-yellow-400" },
  1: { label: "Approved", text: "text-emerald-400" },
  2: { label: "Rejected", text: "text-red-400" },
};

// Calculate days from leave record
const calcDays = (lr) => {
  if (lr.total_days && lr.total_days > 0) return lr.total_days;
  if (lr.days && lr.days > 0) return lr.days;
  try {
    return differenceInDays(parseISO(lr.end_date), parseISO(lr.start_date)) + 1;
  } catch {
    return 1;
  }
};

// Get leave type name from record
const getLeaveTypeName = (lr) => {
  return lr.leave_type?.name || lr.leave_group_type?.leave_type?.name || "General Leave";
};

export default function LeaveReportsPage() {
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Staged selections (live with the dropdowns)
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedEmployeeTypes, setSelectedEmployeeTypes] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedLeaveTypeIds, setSelectedLeaveTypeIds] = useState([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState([]);
  // Applied filters (only update on Submit) — these drive fetching + filtering
  const [appliedBranchIds, setAppliedBranchIds] = useState([]);
  const [appliedDepartmentIds, setAppliedDepartmentIds] = useState([]);
  const [appliedEmployeeTypes, setAppliedEmployeeTypes] = useState([]);
  const [appliedEmployeeIds, setAppliedEmployeeIds] = useState([]);
  const [appliedLeaveTypeIds, setAppliedLeaveTypeIds] = useState([]);
  const [appliedStatusIds, setAppliedStatusIds] = useState([]);
  const [employees, setEmployees] = useState([]);

  const normalizeType = (s) => String(s || "").toLowerCase().replace(/[\s_-]+/g, "");
  const matchesSelectedType = (e) => {
    if (!selectedEmployeeTypes?.length) return true;
    const target = normalizeType(e.employee_type);
    return selectedEmployeeTypes.some((t) => normalizeType(t) === target);
  };

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    (async () => {
      try { setDepartments(await getDepartmentsByBranchIds(selectedBranchIds)); } catch (e) { /* ignore */ }
    })();
  }, [selectedBranchIds]);

  useEffect(() => {
    (async () => {
      try {
        const result = await getScheduledEmployeeList(selectedDepartmentIds);
        setEmployees((result || []).map(e => ({ ...e, name: e.full_name + (e.id ? ` (${e.id})` : "") })));
      } catch (e) { /* ignore */ }
    })();
  }, [selectedDepartmentIds]);

  // Fetch whenever applied filters change (Submit click) and on initial mount
  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedBranchIds, appliedDepartmentIds, appliedEmployeeIds, appliedEmployeeTypes, appliedLeaveTypeIds, appliedStatusIds]);

  const handleSubmit = () => {
    setAppliedBranchIds(selectedBranchIds);
    setAppliedDepartmentIds(selectedDepartmentIds);
    setAppliedEmployeeTypes(selectedEmployeeTypes);
    setAppliedEmployeeIds(selectedEmployeeIds);
    setAppliedLeaveTypeIds(selectedLeaveTypeIds);
    setAppliedStatusIds(selectedStatusIds);
  };

  const fetchLeaveTypes = async () => {
    try {
      const user = await getUser();
      const { data } = await api.get(`${API_BASE}/leave_type`, {
        params: { company_id: user?.company_id || 0, per_page: 100 },
      });
      setLeaveTypes(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to fetch leave types:", e);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const params = {
        per_page: 2000,
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        branch_ids: appliedBranchIds.length > 0 ? appliedBranchIds : undefined,
        department_ids: appliedDepartmentIds.length > 0 ? appliedDepartmentIds : undefined,
        employee_ids: appliedEmployeeIds.length > 0 ? appliedEmployeeIds : undefined,
        employee_types: appliedEmployeeTypes.length > 0 ? appliedEmployeeTypes : undefined,
        leave_type_id: appliedLeaveTypeIds.length === 1 ? appliedLeaveTypeIds[0] : undefined,
        leave_type_ids: appliedLeaveTypeIds.length > 0 ? appliedLeaveTypeIds : undefined,
        status_ids: appliedStatusIds.length > 0 ? appliedStatusIds.map(String) : undefined,
      };
      const result = await getLeavesRequest(params);
      setLeaveData(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.error("Failed to fetch leaves:", e);
      setLeaveData([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side fallback filtering for fields the backend doesn't narrow on.
  // Reads from applied state (only updates on Submit), NOT the live dropdown state.
  const filteredLeaveData = useMemo(() => {
    let data = leaveData;

    if (appliedEmployeeIds.length > 0) {
      const wanted = new Set(appliedEmployeeIds.map(String));
      data = data.filter((lr) => {
        const candidates = [
          lr.employee_id,
          lr.employee?.id,
          lr.employee?.employee_id,
          lr.employee?.system_user_id,
        ]
          .filter((v) => v !== undefined && v !== null)
          .map(String);
        return candidates.some((c) => wanted.has(c));
      });
    }

    if (appliedEmployeeTypes.length > 0) {
      const normTypes = new Set(appliedEmployeeTypes.map(normalizeType));
      data = data.filter((lr) => normTypes.has(normalizeType(lr.employee?.employee_type)));
    }

    if (appliedLeaveTypeIds.length > 1) {
      const wanted = new Set(appliedLeaveTypeIds.map(String));
      data = data.filter((lr) => {
        const ltId = lr.leave_type_id ?? lr.leave_type?.id ?? lr.leave_group_type?.leave_type?.id;
        return ltId !== undefined && ltId !== null && wanted.has(String(ltId));
      });
    }

    return data;
  }, [leaveData, appliedEmployeeIds, appliedEmployeeTypes, appliedLeaveTypeIds]);

  // Table rows
  const tableRows = useMemo(() => {
    return filteredLeaveData.map((lr) => ({
      id: lr.id,
      employee: lr.employee?.first_name || "Unknown",
      profile_picture: lr.employee?.profile_picture,
      department: lr.employee?.department?.name || "Unknown",
      leaveType: getLeaveTypeName(lr),
      days: calcDays(lr),
      status: lr.status,
      startDate: lr.start_date,
      endDate: lr.end_date,
    }));
  }, [filteredLeaveData]);

  // Stats
  const totalDays = tableRows.reduce((s, r) => s + r.days, 0);
  const approvedDays = tableRows.filter((r) => r.status === 1).reduce((s, r) => s + r.days, 0);
  const pendingCount = tableRows.filter((r) => r.status === 0).length;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Employee", "Department", "Leave Type", "Start Date", "End Date", "Days", "Status"];
    const csvRows = [
      headers.join(","),
      ...tableRows.map((row) =>
        [row.employee, row.department, row.leaveType, row.startDate, row.endDate, row.days, statusConfig[row.status]?.label || "Unknown"].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leave_report_${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF
  const handleExportPDF = () => {
    const today = format(new Date(), "dd MMM yyyy");
    const year = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html><head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #333; padding: 30px; }
          .header { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; padding: 25px 30px; border-radius: 12px; margin-bottom: 25px; }
          .header h1 { font-size: 22px; font-weight: 800; }
          .header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
          .stats { display: flex; gap: 15px; margin-bottom: 25px; }
          .stat-card { flex: 1; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 15px; text-align: center; }
          .stat-card .label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px; }
          .stat-card .value { font-size: 28px; font-weight: 800; color: #1f2937; margin-top: 4px; }
          .stat-card.approved .value { color: #059669; }
          .stat-card.pending .value { color: #d97706; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          thead { background: #f1f5f9; }
          th { text-align: left; padding: 10px 12px; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
          tr:nth-child(even) { background: #fafafa; }
          .status-approved { color: #059669; font-weight: 700; }
          .status-pending { color: #d97706; font-weight: 700; }
          .status-rejected { color: #dc2626; font-weight: 700; }
          .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #9ca3af; padding-top: 15px; border-top: 1px solid #e5e7eb; }
        </style>
      </head><body>
        <div class="header">
          <h1>MyTime2Cloud - Leave Report</h1>
          <p>Generated on ${today} | Year: ${year}</p>
        </div>
        <div class="stats">
          <div class="stat-card"><div class="label">Total Requests</div><div class="value">${tableRows.length}</div></div>
          <div class="stat-card"><div class="label">Total Days</div><div class="value">${totalDays}</div></div>
          <div class="stat-card approved"><div class="label">Approved Days</div><div class="value">${approvedDays}</div></div>
          <div class="stat-card pending"><div class="label">Pending</div><div class="value">${pendingCount}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>Employee</th><th>Department</th><th>Leave Type</th><th>Start Date</th><th>End Date</th><th>Days</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${tableRows.map((row, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${row.employee}</strong></td>
                <td>${row.department}</td>
                <td>${row.leaveType}</td>
                <td>${row.startDate}</td>
                <td>${row.endDate}</td>
                <td><strong>${row.days}</strong></td>
                <td class="status-${(statusConfig[row.status]?.label || "").toLowerCase()}">${statusConfig[row.status]?.label || "Unknown"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="footer">MyTime2Cloud - Leave Management Report | ${today}</div>
      </body></html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const leaveTypeItems = useMemo(
    () => leaveTypes.map((lt) => ({ id: lt.id, name: lt.name })),
    [leaveTypes]
  );

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-white">Leave Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Analyze leave usage across your organization</p>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Branch"
            items={branches}
            value={selectedBranchIds}
            onChange={setSelectedBranchIds}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Department"
            items={departments}
            value={selectedDepartmentIds}
            onChange={setSelectedDepartmentIds}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Employee Type"
            items={employeeTypeOptions}
            value={selectedEmployeeTypes}
            onChange={setSelectedEmployeeTypes}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[220px]">
          <MultiDropDown
            placeholder="Employees"
            items={selectedEmployeeTypes?.length ? employees.filter(matchesSelectedType) : employees}
            value={selectedEmployeeIds}
            onChange={setSelectedEmployeeIds}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Leave Type"
            items={leaveTypeItems}
            value={selectedLeaveTypeIds}
            onChange={setSelectedLeaveTypeIds}
            badgesCount={1}
          />
        </div>
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Status"
            items={statusOptions}
            value={selectedStatusIds}
            onChange={setSelectedStatusIds}
            badgesCount={1}
          />
        </div>

        <button
          onClick={handleSubmit}
          className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Submit
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap focus:outline-none focus:ring-0">
              <Download className="w-4 h-4" /> Download
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1">
            <DropdownMenuItem
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <img src="/icons/pdf.png" alt="PDF Icon" className="w-4 h-4" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <img src="/icons/excel.png" alt="Excel Icon" className="w-4 h-4" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Excel</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl">
        <div className="p-5 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Leave Details</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {tableRows.length} record{tableRows.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Employee</th>
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Department</th>
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Leave Type</th>
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Duration</th>
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Days</th>
                <th className="text-left font-medium text-slate-600 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">Loading...</td></tr>
              ) : tableRows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">No leave records found</td></tr>
              ) : (
                tableRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-200 dark:border-white/5 last:border-0 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <ProfilePicture src={row.profile_picture} className="w-7 h-7" />
                        <span className="font-medium text-white">{row.employee}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{row.department}</td>
                    <td className="px-5 py-3 text-slate-300">{row.leaveType}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{row.startDate} → {row.endDate}</td>
                    <td className="px-5 py-3 font-medium text-white">{row.days}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${statusConfig[row.status]?.text || "text-slate-400"}`}>
                        {statusConfig[row.status]?.label || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
