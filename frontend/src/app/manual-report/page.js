"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Download } from "lucide-react";

import {
  getDeviceLogs,
  getBranches,
  getScheduledEmployeeList,
  getDepartmentsByBranchIds,
} from "@/lib/api";

import DropDown from "@/components/ui/DropDown";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DateRangeSelect from "@/components/ui/DateRange";
import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import TimePicker from "@/components/ui/TimePicker";
import { parseApiError } from "@/lib/utils";

const logTypes = [
  { id: "Manual", name: "Manual" },
  { id: "Device", name: "Device" },
  { id: "Mobile", name: "Mobile" },
];

const columns = [
  {
    key: "name",
    header: "Name",
    render: ({ employee }) => {
      const full = `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();
      return (
        <div className="flex items-center gap-3">
          <img
            alt={full}
            className="w-9 h-9 rounded-full object-cover shadow-sm"
            src={employee?.profile_picture || `https://placehold.co/40x40/6946dd/ffffff?text=${(full || "?").charAt(0)}`}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://placehold.co/40x40/6946dd/ffffff?text=${(full || "?").charAt(0)}`;
            }}
          />
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">{full || "—"}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employee?.designation?.name || employee?.department?.name || ""}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "emp_device",
    header: "Emp ID / Device ID",
    render: ({ employee, DeviceID }) => (
      <div>
        <p className="text-gray-800 dark:text-gray-100">{employee?.employee_id || "—"}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Device ID: {DeviceID || "—"}</p>
      </div>
    ),
  },
  {
    key: "branch",
    header: "Branch",
    render: ({ employee }) => <span className="text-gray-800 dark:text-gray-100">{employee?.branch?.branch_name || employee?.department?.branch?.branch_name || "—"}</span>,
  },
  {
    key: "department",
    header: "Department",
    render: ({ employee }) => <span className="text-gray-800 dark:text-gray-100">{employee?.department?.name || "—"}</span>,
  },
  {
    key: "date",
    header: "Date / Time",
    render: (log) => <span className="text-gray-800 dark:text-gray-100">{log?.date} {log?.time}</span>,
  },
  {
    key: "device",
    header: "Device",
    render: (log) => <span className="text-gray-800 dark:text-gray-100">{log?.device?.name || log?.DeviceID || "—"}</span>,
  },
  {
    key: "log_type",
    header: "Log Type",
    render: (log) => {
      const t = String(log?.log_type || "").toLowerCase();
      const label = t === "out" ? "Out" : t === "in" ? "In" : (log?.log_type || "—");
      const cls = t === "out" ? "text-rose-500" : t === "in" ? "text-emerald-500" : "text-slate-400";
      return <span className={`font-medium ${cls}`}>{label}</span>;
    },
  },
  {
    key: "reason",
    header: "Reason / Mode",
    render: (log) => <span className="text-gray-800 dark:text-gray-100">{log?.reason || log?.mode || "—"}</span>,
  },
];

export default function ManualReportPage() {
  const getDefaultDateRange = () => {
    const dt = new Date();
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const mm = m < 10 ? `0${m}` : m;
    return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${lastDay < 10 ? "0" + lastDay : lastDay}` };
  };
  const defaultDates = getDefaultDateRange();

  const [selectedLogType, setSelectedLogType] = useState("Manual");
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [scheduledEmployees, setScheduledEmployees] = useState([]);

  useEffect(() => { (async () => { try { setBranches(await getBranches()); } catch (e) { setError(parseApiError(e)); } })(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await getScheduledEmployeeList(null);
        setScheduledEmployees(result.map((e) => ({ ...e, name: e.full_name || `${e.first_name || ""} ${e.last_name || ""}`.trim() })));
      } catch (e) { setError(parseApiError(e)); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const branchArg = selectedBranchIds?.length ? selectedBranchIds : [];
        setDepartments(await getDepartmentsByBranchIds(branchArg));
      } catch (e) { setError(parseApiError(e)); }
    })();
  }, [selectedBranchIds]);

  const filteredEmployees = useMemo(() => {
    const branchSet = new Set((selectedBranchIds || []).map(String));
    const deptSet = new Set((selectedDepartmentIds || []).map(String));
    return scheduledEmployees.filter((e) => {
      const branchOk = branchSet.size === 0 || branchSet.has(String(e.branch_id));
      const deptOk = deptSet.size === 0 || deptSet.has(String(e.department_id));
      return branchOk && deptOk;
    });
  }, [scheduledEmployees, selectedBranchIds, selectedDepartmentIds]);

  useEffect(() => {
    if (!selectedEmployeeIds?.length) return;
    const allowed = new Set(filteredEmployees.map((e) => String(e.id)));
    const next = selectedEmployeeIds.filter((id) => allowed.has(String(id)));
    if (next.length !== selectedEmployeeIds.length) setSelectedEmployeeIds(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEmployees]);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page: currentPage,
        per_page: perPage,
        sortDesc: "true",
        from_date: from || undefined,
        to_date: to || undefined,
      };
      // Log type → translates to DeviceID style filter
      if (selectedLogType === "Manual") params.DeviceID = "Manual";
      else if (selectedLogType === "Mobile") params.device = "Mobile";
      // "Device" → no DeviceID filter, but exclude Manual/Mobile rows server-side if needed

      const isAllSelected = (sel, items) => Array.isArray(sel) && sel.length > 0 && items.length > 0 && sel.length >= items.length;
      if (selectedBranchIds?.length === 1) params.branch_id = selectedBranchIds[0];
      else if (selectedBranchIds?.length > 1 && !isAllSelected(selectedBranchIds, branches)) params.branch_ids = selectedBranchIds;
      if (selectedDepartmentIds?.length && !isAllSelected(selectedDepartmentIds, departments)) params.department_ids = selectedDepartmentIds;
      if (selectedEmployeeIds?.length === 1) params.UserID = selectedEmployeeIds[0];
      else if (selectedEmployeeIds?.length > 1 && selectedEmployeeIds.length < filteredEmployees.length) {
        params.user_ids = selectedEmployeeIds;
      }

      const result = await getDeviceLogs(params);
      if (result && Array.isArray(result.data)) {
        setRecords(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      } else if (Array.isArray(result)) {
        setRecords(result);
        setTotal(result.length);
      } else {
        throw new Error("Invalid data structure received from API.");
      }
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage, perPage, from, to,
    selectedLogType, selectedBranchIds, selectedDepartmentIds, selectedEmployeeIds,
  ]);

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitTick, setSubmitTick] = useState(0);

  useEffect(() => {
    if (!hasSubmitted) return;
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage, submitTick]);

  // Client-side time-of-day filter.
  const trimToHHMM = (t) => {
    if (!t) return "";
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : String(t).slice(0, 5);
  };
  const displayedRecords = useMemo(() => {
    if (!timeFrom && !timeTo) return records;
    const lo = timeFrom || "00:00";
    const hi = timeTo || "23:59";
    return records.filter((l) => {
      const t = trimToHHMM(l?.time);
      if (!t) return false;
      return t >= lo && t <= hi;
    });
  }, [records, timeFrom, timeTo]);

  return (
    <div className="pt-8 pb-4 px-3 md:pt-10 md:pb-6 md:px-6 lg:pt-12 lg:pb-8 lg:px-10 overflow-x-hidden">
      <h3 className="text-4xl font-extrabold text-gray-600 dark:text-slate-300 flex items-center mb-3">
        Manual Report
      </h3>

      <div className="flex flex-wrap items-center gap-2 my-2">
        <div className="flex flex-col min-w-[160px]">
          <DropDown placeholder="Log Type" value={selectedLogType} onChange={setSelectedLogType} items={logTypes} />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown placeholder="Branch" items={branches} value={selectedBranchIds} onChange={setSelectedBranchIds} badgesCount={1} />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown placeholder="Department" items={departments} value={selectedDepartmentIds} onChange={setSelectedDepartmentIds} badgesCount={1} />
        </div>

        <div className="flex flex-col min-w-[220px]">
          <MultiDropDown placeholder="Employees" items={filteredEmployees} value={selectedEmployeeIds} onChange={setSelectedEmployeeIds} badgesCount={1} />
        </div>

        <div className="flex flex-col min-w-[240px]">
          <DateRangeSelect value={{ from, to }} onChange={({ from: nf, to: nt }) => { setFrom(nf); setTo(nt); }} />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-[110px]">
            <TimePicker value={timeFrom} onChange={(v) => setTimeFrom(v)} placeholder="From" inputClassName="h-[38px]" />
          </div>
          <span className="text-slate-400">–</span>
          <div className="w-[110px]">
            <TimePicker value={timeTo} onChange={(v) => setTimeTo(v)} placeholder="To" inputClassName="h-[38px]" />
          </div>
          {(timeFrom || timeTo) && (
            <button type="button" onClick={() => { setTimeFrom(""); setTimeTo(""); }} className="text-xs text-slate-500 hover:text-rose-500 px-1" title="Clear time filter">
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setHasSubmitted(true);
            setCurrentPage(1);
            setSubmitTick((t) => t + 1);
          }}
          className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Submit
        </button>

        <button
          onClick={() => {
            const headers = ["Name", "Employee ID", "Branch", "Department", "Date", "Time", "Device", "Log Type", "Reason"];
            const rows = displayedRecords.map((log) => [
              `${log?.employee?.first_name || ""} ${log?.employee?.last_name || ""}`.trim(),
              log?.employee?.employee_id || "",
              log?.employee?.branch?.branch_name || "",
              log?.employee?.department?.name || "",
              log?.date || "",
              log?.time || "",
              log?.device?.name || log?.DeviceID || "",
              log?.log_type || "",
              log?.reason || "",
            ]);
            const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `manual-report-${from}-to-${to}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="bg-violet-600 text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-violet-700 transition-all flex items-center space-x-2 whitespace-nowrap"
        >
          <Download className="w-4 h-4 mr-1" /> Download
        </button>
      </div>

      <DataTable
        columns={columns}
        data={displayedRecords}
        isLoading={isLoading}
        error={error}
        pagination={
          <Pagination
            page={currentPage}
            perPage={perPage}
            total={total}
            onPageChange={setCurrentPage}
            onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        }
      />
    </div>
  );
}
