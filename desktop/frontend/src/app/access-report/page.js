"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Download, FileText, Loader2 } from "lucide-react";
import { downloadReport } from "@/lib/endpoint/report";
import { API_BASE_URL, getUser } from "@/config";
import PDFProgressOverlay from "@/components/Report/PDFProgressOverlay";

import {
  getAccessControlReport,
  getBranches,
  getDeviceList,
  getScheduledEmployeeList,
  getDepartmentsByBranchIds,
} from "@/lib/api";

import DropDown from "@/components/ui/DropDown";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DateRangeSelect from "@/components/ui/DateRange";
import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import { parseApiError } from "@/lib/utils";
import Columns from "../access_control_logs/columns";
import TimePicker from "@/components/ui/TimePicker";

const reportTypes = [
  { id: null, name: "All" },
  { id: "Date Wise Access Control Report", name: "Date Wise" },
  { id: "Door Wise Access Control Report", name: "Door Wise" },
  { id: "Branch Wise Access Control Report", name: "Branch Wise" },
  { id: "Allowed", name: "Access Granted" },
  { id: "Access Denied", name: "Access Denied" },
];

const userTypes = [
  { id: "Employee", name: "Employee" },
  { id: "Visitor", name: "Visitor" },
];

export default function AccessReportPage() {
  const getDefaultDateRange = () => {
    const dt = new Date();
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const mm = m < 10 ? `0${m}` : m;
    return {
      from: `${y}-${mm}-01`,
      to: `${y}-${mm}-${lastDay < 10 ? "0" + lastDay : lastDay}`,
    };
  };
  const defaultDates = getDefaultDateRange();

  const [selectedReportType, setSelectedReportType] = useState(null);
  const [selectedUserType, setSelectedUserType] = useState(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
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
  const [devices, setDevices] = useState([]);
  const [scheduledEmployees, setScheduledEmployees] = useState([]);

  useEffect(() => {
    (async () => {
      try { setBranches(await getBranches()); } catch (e) { setError(parseApiError(e)); }
    })();
  }, []);

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
        const result = await getDeviceList(selectedBranchIds?.[0] || null);
        const seen = new Set();
        setDevices((result || []).filter((e) => e?.device_id != null && !seen.has(e.device_id) && seen.add(e.device_id)).map((e) => ({ name: e.name, id: e.device_id })));
      } catch (e) { setError(parseApiError(e)); }
    })();
  }, [selectedBranchIds]);

  useEffect(() => {
    (async () => {
      try {
        // Load all departments (no branch filter) when nothing selected, otherwise narrow by branch.
        const branchArg = selectedBranchIds?.length ? selectedBranchIds : [];
        setDepartments(await getDepartmentsByBranchIds(branchArg));
      } catch (e) { setError(parseApiError(e)); }
    })();
  }, [selectedBranchIds]);

  // Time-of-day filter (HH:MM). Applied client-side on top of the fetched rows.
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

  // Narrow the Employees list to those matching the selected Branch/Department.
  const filteredEmployees = useMemo(() => {
    const branchSet = new Set((selectedBranchIds || []).map(String));
    const deptSet = new Set((selectedDepartmentIds || []).map(String));
    return scheduledEmployees.filter((e) => {
      const branchOk = branchSet.size === 0 || branchSet.has(String(e.branch_id));
      const deptOk = deptSet.size === 0 || deptSet.has(String(e.department_id));
      return branchOk && deptOk;
    });
  }, [scheduledEmployees, selectedBranchIds, selectedDepartmentIds]);

  // Drop any previously-chosen employees that no longer match the new filter.
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
        include_device_types: ["all", "Access Control"],
      };
      // Skip a filter when every available option is selected (Select All == no narrowing).
      const isAllSelected = (sel, items) => Array.isArray(sel) && sel.length > 0 && items.length > 0 && sel.length >= items.length;
      if (selectedBranchIds?.length === 1) params.branch_id = selectedBranchIds[0];
      else if (selectedBranchIds?.length > 1 && !isAllSelected(selectedBranchIds, branches)) params.branch_ids = selectedBranchIds;
      if (selectedDepartmentIds?.length && !isAllSelected(selectedDepartmentIds, departments)) params.department_ids = selectedDepartmentIds;
      if (selectedDeviceIds?.length === 1) params.DeviceID = selectedDeviceIds[0];
      else if (selectedDeviceIds?.length > 1 && !isAllSelected(selectedDeviceIds, devices)) params.device_ids = selectedDeviceIds;
      // Only filter by user when exactly one is picked. If multiple (or Select All) is chosen,
      // skip user_ids so the branch/department filters drive the result — matching the
      // /access_control dashboard's behaviour. (The Employees dropdown is sourced from
      // scheduled-employee list, which is a strict subset of all employees, so a Select All
      // of the dropdown would otherwise hide unscheduled-but-active employees from results.)
      if (selectedEmployeeIds?.length === 1) params.UserID = selectedEmployeeIds[0];
      else if (selectedEmployeeIds?.length > 1 && selectedEmployeeIds.length < filteredEmployees.length) {
        params.user_ids = selectedEmployeeIds;
      }
      if (selectedUserType) params.user_type = selectedUserType;
      if (selectedReportType) params.report_type = selectedReportType;
      const result = await getAccessControlReport(params);
      if (result && Array.isArray(result.data)) {
        setRecords(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      } else {
        throw new Error("Invalid data structure received from API.");
      }
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    perPage,
    selectedBranchIds,
    selectedDepartmentIds,
    selectedDeviceIds,
    selectedEmployeeIds,
    from,
    to,
    selectedUserType,
    selectedReportType,
  ]);

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitTick, setSubmitTick] = useState(0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setPdfProgress(0);
    try {
      const user = await getUser();
      const PDF_SERVICE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || "http://localhost:3002";
      const SUMMARY_BASE = process.env.NEXT_PUBLIC_SUMMARY_REPORT_URL || `${PDF_SERVICE}/templates`;

      // Treat Select All (every option selected) as "no filter" — same as the table fetch.
      const isAllSelected = (sel, items) => Array.isArray(sel) && sel.length > 0 && items.length > 0 && sel.length >= items.length;
      const effectiveBranchIds = isAllSelected(selectedBranchIds, branches) ? [] : (selectedBranchIds || []);
      const effectiveDepartmentIds = isAllSelected(selectedDepartmentIds, departments) ? [] : (selectedDepartmentIds || []);
      const effectiveDeviceIds = isAllSelected(selectedDeviceIds, devices) ? [] : (selectedDeviceIds || []);
      const effectiveEmployeeIds = isAllSelected(selectedEmployeeIds, filteredEmployees) ? [] : (selectedEmployeeIds || []);

      const branchId = effectiveBranchIds[0];
      const deviceId = effectiveDeviceIds[0];
      const employeeId = effectiveEmployeeIds[0];
      const departmentId = effectiveDepartmentIds[0];

      const branchName = branchId ? (branches.find((b) => String(b.id) === String(branchId))?.branch_name || branches.find((b) => String(b.id) === String(branchId))?.name) : "";
      const deviceName = deviceId ? (devices.find((d) => String(d.id) === String(deviceId))?.name) : "";
      const employeeName = employeeId ? (scheduledEmployees.find((e) => String(e.id) === String(employeeId))?.name) : "";
      const departmentName = departmentId ? (departments.find((d) => String(d.id) === String(departmentId))?.name) : "";

      const paramsObj = {
        api_base: API_BASE_URL,
        company_id: user?.company_id ?? "",
        company_name: user?.company_name || user?.company?.name || "Company",
        from_date: from || "",
        to_date: to || "",
      };
      // Single-value params (template-supported)
      if (branchId) { paramsObj.branch_id = branchId; if (branchName) paramsObj.branch_name = branchName; }
      if (deviceId) { paramsObj.device_id = deviceId; if (deviceName) paramsObj.device_name = deviceName; }
      if (employeeId) { paramsObj.employee_id = employeeId; if (employeeName) paramsObj.employee_name = employeeName; }
      if (departmentId) { paramsObj.department_id = departmentId; if (departmentName) paramsObj.department_name = departmentName; }
      if (selectedUserType) paramsObj.user_type = selectedUserType;
      if (timeFrom) paramsObj.time_from = timeFrom;
      if (timeTo) paramsObj.time_to = timeTo;

      // URLSearchParams handles strings — append multi-value arrays manually for completeness.
      const params = new URLSearchParams(paramsObj);
      if (effectiveBranchIds.length > 1) effectiveBranchIds.forEach((id) => params.append("branch_ids[]", id));
      if (effectiveDepartmentIds.length > 1) effectiveDepartmentIds.forEach((id) => params.append("department_ids[]", id));
      if (effectiveDeviceIds.length > 1) effectiveDeviceIds.forEach((id) => params.append("device_ids[]", id));
      if (effectiveEmployeeIds.length > 1) effectiveEmployeeIds.forEach((id) => params.append("user_ids[]", id));

      const url = `${SUMMARY_BASE}/access-control-report/sample.html?${params.toString()}`;
      const fileName = `Access_Control_Report_${from || "report"}${to && to !== from ? `_to_${to}` : ""}.pdf`;

      await downloadReport(url, fileName, (p) => setPdfProgress(p));
    } catch (err) {
      console.error("Download PDF failed", err);
      alert(`Failed to download PDF: ${err?.message || "Unknown error"}`);
    } finally {
      setTimeout(() => {
        setIsDownloadingPdf(false);
        setPdfProgress(0);
      }, 600);
    }
  };

  useEffect(() => {
    if (!hasSubmitted) return;
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage, submitTick]);

  return (
    <div className="pt-8 pb-4 px-3 md:pt-10 md:pb-6 md:px-6 lg:pt-12 lg:pb-8 lg:px-10 overflow-x-hidden">
      <PDFProgressOverlay isOpen={isDownloadingPdf} progress={Math.round(pdfProgress)} />
      <h3 className="text-4xl font-extrabold text-gray-600 dark:text-slate-300 flex items-center mb-3">
        Access Report
      </h3>

      <div className="flex flex-wrap items-center gap-2 my-2">
        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown placeholder="Branch" items={branches} value={selectedBranchIds} onChange={setSelectedBranchIds} badgesCount={1} />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown placeholder="Department" items={departments} value={selectedDepartmentIds} onChange={setSelectedDepartmentIds} badgesCount={1} />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown placeholder="Device" items={devices} value={selectedDeviceIds} onChange={setSelectedDeviceIds} badgesCount={1} />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <DropDown placeholder="User Type" value={selectedUserType} onChange={setSelectedUserType} items={userTypes} />
        </div>

        <div className="flex flex-col min-w-[220px]">
          <MultiDropDown placeholder="Employees" items={filteredEmployees} value={selectedEmployeeIds} onChange={setSelectedEmployeeIds} badgesCount={1} />
        </div>

        <div className="flex flex-col min-w-[240px]">
          <DateRangeSelect value={{ from, to }} onChange={({ from: nf, to: nt }) => { setFrom(nf); setTo(nt); }} />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-[110px]">
            <TimePicker
              value={timeFrom}
              onChange={(v) => setTimeFrom(v)}
              placeholder="From"
              inputClassName="h-[38px]"
            />
          </div>
          <span className="text-slate-400">–</span>
          <div className="w-[110px]">
            <TimePicker
              value={timeTo}
              onChange={(v) => setTimeTo(v)}
              placeholder="To"
              inputClassName="h-[38px]"
            />
          </div>
          {(timeFrom || timeTo) && (
            <button
              type="button"
              onClick={() => { setTimeFrom(""); setTimeTo(""); }}
              className="text-xs text-slate-500 hover:text-rose-500 px-1"
              title="Clear time filter"
            >
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
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          className="bg-violet-600 text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-violet-700 disabled:opacity-60 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          {isDownloadingPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating {Math.round(pdfProgress)}%</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Download PDF</span>
            </>
          )}
        </button>
      </div>

      <DataTable
        columns={Columns}
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
