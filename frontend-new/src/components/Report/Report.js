"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, File, Printer, RefreshCw, RefreshCcw, Pencil, MoreVertical, DownloadCloudIcon, Download, Paperclip, FileText, MessageSquare, Sheet } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAttendanceReports, getBranches, getDepartmentsByBranchIds, getScheduledEmployeeList, getStatuses } from '@/lib/api';

import DropDown from '@/components/ui/DropDown';
import DateRangeSelect from "@/components/ui/DateRange";
import Pagination from '@/lib/Pagination';
import DataTable from '@/components/ui/DataTable';
import Columns from "./columns";
import MultiDropDown from '@/components/ui/MultiDropDown';
import { formatDateDubai, notify, parseApiError } from '@/lib/utils';
import RegenerateReport from '@/components/Report/Regenerate';
import { getAttendanceTabs } from '@/lib/endpoint/attendance';
import LoadingProgressDialog from './LoadingProgressDialog';
import { API_BASE_URL } from '@/config';
import { getUser } from "@/config/index";
import ManualAttendanceCorrectionModal from '../Attendance/ManualAttendanceCorrectionModal';
import MissingLogsModal from './MissingLogsModal';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { downloadDailyPDF, downloadMonthlyDetailPDF, downloadMonthlyGridPDF, downloadReport } from '@/lib/endpoint/report';
import PDFProgressOverlay from './PDFProgressOverlay';

const reportTemplates = [
  { id: 'Template5', name: 'Monthly Report Format A' },
  { id: 'TemplateB', name: 'Monthly Report Format B' },
  { id: `Template3`, name: `Daily` },
];

function AttendanceTableInner() {

  const searchParams = useSearchParams();
  const activeType = searchParams.get('type') || '';
  const isAbsentTab = activeType === 'absent';

  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedLogRow, setSelectedLogRow] = useState(null);
  const [logDetails, setLogDetails] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isMissingLogsOpen, setIsMissingLogsOpen] = useState(false);

  // filters
  const [shiftTypeId, setShiftTypeId] = useState(`0`);
  const [selectedStatusIds, setSelectedStatusIds] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartment] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedEmployeeTypes, setSelectedEmployeeTypes] = useState([]);

  const employeeTypeOptions = [
    { id: "Full Time", name: "Full Time" },
    { id: "Part Time", name: "Part Time" },
    { id: "Contractor", name: "Contractor" },
    { id: "Trainee", name: "Trainee" },
  ];
  const [selectedReportTemplate, setSelectedReportTemplate] = useState("Template1");
  const [absentMode, setAbsentMode] = useState("monthly");
  const absentTemplates = [
    { id: "daily", name: "Daily" },
    { id: "monthly", name: "Monthly" },
  ];

  // No default range — the user picks the date range manually.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [records, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotalAttendance] = useState(0);


  const [statusses, setStatusses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [scheduledEmployees, setScheduledEmployees] = useState([]);

  // Normalize employee_type strings so "Full Time", "full-time", "FULL_TIME"
  // all match each other when filtering / auto-selecting.
  const normalizeType = (s) => String(s || "").toLowerCase().replace(/[\s_-]+/g, "");
  const matchesSelectedType = (e) => {
    if (!selectedEmployeeTypes?.length) return true;
    const target = normalizeType(e.employee_type);
    return selectedEmployeeTypes.some((t) => normalizeType(t) === target);
  };

  // When the user picks employee type(s), auto-select all matching employees
  // so a click on Submit immediately produces the filtered report.
  useEffect(() => {
    if (!selectedEmployeeTypes?.length) return;
    const matching = scheduledEmployees
      .filter(matchesSelectedType)
      .map((e) => e.id);
    setSelectedEmployeeIds(matching);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeTypes, scheduledEmployees]);

  const [isButtonclicked, setIsButtonclicked] = useState(false);

  const [tabs, setTabs] = useState([]);
  const [orginalTabSet, setOriginalTabSet] = useState({ single: true, double: true, multi: true });


  const fetchStatuses = async () => {
    try {
      setStatusses(await getStatuses());
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const fetchAttendanceTabs = async () => {
    try {
      const response = await getAttendanceTabs(); // e.g., { single: true, double: true, multi: false }

      // Define the mapping between JSON keys and your numeric IDs
      const shiftMapping = [
        { key: 'single', id: "0", name: 'Single Shift' },
        { key: 'double', id: "5", name: 'Double Shift' },
        { key: 'multi', id: "2", name: 'Multi Shift' }
      ];

      // Filter based on the API response
      const activeTabs = shiftMapping
        .filter(item => response[item.key] === true)
        .map(({ id, name }) => ({ id, name }));

      setTabs(activeTabs);

      setOriginalTabSet(response)

      // Optional: Auto-select the first available tab if current selection is empty
      if (activeTabs.length > 0) {
        setShiftTypeId(activeTabs[0].id);
      }
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const fetchDepartments = async () => {
    try {
      setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const fetchScheduledEmployees = async () => {
    try {

      let result = await getScheduledEmployeeList(selectedDepartmentIds);

      let data = result.map(e => ({ ...e, name: e.full_name + " " + (e.id ? `(${e.id})` : "") }));

      setScheduledEmployees(data);
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const handleViewLogs = useCallback(async (item) => {
    try {
      setSelectedLogRow(item);
      setLogDetails([]);
      setIsLogsOpen(true);
      setIsLogsLoading(true);

      const user = getUser();
      const companyId = user?.company_id ?? 0;

      const query = new URLSearchParams({
        per_page: "500",
        UserID: String(item.employee_id ?? ""),
        LogTime: String(item.edit_date ?? ""),
        company_id: String(companyId),
      });

      const res = await fetch(`${API_BASE_URL}/attendance_single_list?${query.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch log details");
      }


      const data = await res.json();
      setLogDetails(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error(error);
      notify("Error", parseApiError(error), "error");
    } finally {
      setIsLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceTabs();
    fetchStatuses();
    fetchBranches();
  }, []);


  useEffect(() => {
    fetchDepartments();
  }, [selectedBranchIds]);

  useEffect(() => {
    fetchScheduledEmployees();
  }, [selectedDepartmentIds]);

  useEffect(() => {
  }, [selectedEmployeeIds]);

  const [params, setParams] = useState(null);

  const fetchRecords = async (shiftTypeId, forceRefresh = false) => {

    if (!shiftTypeId || (!isButtonclicked && !forceRefresh)) return;

    if (
      !selectedEmployeeIds?.length
    ) {
      notify("Warning", "Employee not selected", "warning");
      return;
    }

    if (!from || !to) {
      notify("Warning", "Date range must be selected", "warning");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Match Vue frontend payload exactly
      const params = {
        page: currentPage,
        per_page: perPage,
        report_type: 'Monthly',  // CRITICAL: Backend uses this to determine date filtering
        shift_type_id: shiftTypeId,
        report_template: selectedReportTemplate,
        overtime: 0,
        from_date: formatDateDubai(from),
        to_date: formatDateDubai(to),
        employee_id: selectedEmployeeIds,
        statuses: isAbsentTab ? ['A'] : selectedStatusIds,
        department_ids: selectedDepartmentIds,
        employee_types: selectedEmployeeTypes,
        showTabs: JSON.stringify(orginalTabSet),
      };


      setParams(params);

      const result = await getAttendanceReports(params);

      if (result && Array.isArray(result.data)) {
        setAttendance(result.data);
        setTotalAttendance(result.total || 0);
      } else {
        throw new Error("Invalid data structure received from API.");
      }

    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setIsLoading(false); // Always turn off loading
    }
  };

  // --- NEW DIALOG STATE ---
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [queryStringUrl] = useState("");

  const process_file_in_child_comp = async (type, actionType) => {
    if (selectedEmployeeIds.length === 0 && !isAbsentTab) {
      notify("Warning", "Employee not selected", "warning");
      return;
    }

    if (!selectedReportTemplate && !isAbsentTab) {
      notify("Warning", "Template not selected", "warning");
      return;
    }

    // Validate date range
    if (!from || !to) {
      notify("Warning", "Date range must be selected", "warning");
      return;
    }

    try {

      // --- Absent tab branch (Daily/Monthly auto-selected by date range) ---
      if (isAbsentTab && actionType === 'PDF') {
        const PDF_SERVICE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || 'http://localhost:3002';
        const SUMMARY_BASE = process.env.NEXT_PUBLIC_SUMMARY_REPORT_URL || PDF_SERVICE;
        const userAbs = getUser();
        const fromDateAbs = formatDateDubai(from);
        const toDateAbs = absentMode === 'daily' ? fromDateAbs : formatDateDubai(to);
        const mode = absentMode;
        const templatePath = `absent-report/${mode}.html`;

        const paramsObj = {
          mode,
          from_date: fromDateAbs,
          to_date: toDateAbs,
          company_id: userAbs?.company_id ?? 0,
          api_base: API_BASE_URL,
          company_name: userAbs?.company_name || userAbs?.company?.name || 'Company',
        };
        if (selectedBranchIds?.length)     paramsObj.branch_ids     = selectedBranchIds.join(',');
        if (selectedDepartmentIds?.length) paramsObj.department_ids = selectedDepartmentIds.join(',');
        if (selectedEmployeeIds?.length)   paramsObj.employee_ids   = selectedEmployeeIds.join(',');
        if (selectedEmployeeTypes?.length) paramsObj.employee_types = selectedEmployeeTypes.join(',');

        const templateUrl = `${SUMMARY_BASE}/${templatePath}?${new URLSearchParams(paramsObj).toString()}`;

        const filename = mode === 'daily'
          ? `Daily-Absent-Report-${fromDateAbs}.pdf`
          : `Monthly-Absent-Report-${fromDateAbs}-to-${toDateAbs}.pdf`;

        setIsPdfDownloading(true);
        setPdfProgress(0);
        try {
          await downloadReport(templateUrl, filename, (p) => setPdfProgress(p));
        } catch (err) {
          await notify("Error", `Download failed: ${err.message}`, "error");
        } finally {
          setTimeout(() => { setIsPdfDownloading(false); setPdfProgress(0); }, 1000);
        }
        return;
      }

      const isMultiShift = [2, 5].includes(Number(shiftTypeId));
      const endpointPrefix = isMultiShift ? "multi_in_out_" : "";
      const baseUrl = `${API_BASE_URL}/${endpointPrefix}${type}`;

      const user = getUser();

      let company_id = user?.company_id ?? 0;
      let branch_id = user?.branch_id ?? null;

      const fromDate = formatDateDubai(from);
      const toDate = formatDateDubai(to);

      // Common parameters used in most logic branches (matching Vue exactly)
      const commonParams = {
        report_template: selectedReportTemplate,
        main_shift_type: shiftTypeId,
        shift_type_id: shiftTypeId,
        company_id: company_id,
        report_type: 'Monthly',
        from_date: fromDate,
        to_date: toDate,
        showTabs: JSON.stringify(orginalTabSet),  // Use actual tab set from API, not hardcoded
      };

      // Add branch_id if user has one (matching buildQueryParams behavior)
      if (branch_id && branch_id !== 0) {
        commonParams.branch_id = branch_id;
      }

      // if (selectedReportTemplate == 'Template3' && actionType == 'PDF') {
      //   setIsMenuOpen(true);
      //   return;
      // }

      // When the user hasn't picked a real template from the dropdown
      // (only Template5/TemplateB/Template3 are selectable), default PDF
      // downloads to Format A ("Monthly Report Format A" = Template5).
      const DROPDOWN_TEMPLATES = ["Template5", "TemplateB", "Template3"];
      const effectiveTemplate = DROPDOWN_TEMPLATES.includes(selectedReportTemplate)
        ? selectedReportTemplate
        : "Template5";

      // 1. Handle Template4 (Format A), Template5 (Format C), TemplateB (Format B), and Template3 (Daily) - Puppeteer PDF
      if ((effectiveTemplate === "Template4" || effectiveTemplate === "Template5" || effectiveTemplate === "TemplateB" || effectiveTemplate === "Template3") && actionType !== "EXCEL") {
        const PDF_SERVICE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || 'http://localhost:3002';
        const user = getUser();

        // Daily report uses a single date and passes branch/department filters too
        const isDaily = effectiveTemplate === "Template3";
        const paramsObj = {
          employee_ids: selectedEmployeeIds.join(","),
          company_id: company_id,
          from_date: isDaily ? fromDate : fromDate,
          to_date: isDaily ? fromDate : toDate,
          shift_type_id: shiftTypeId,
          api_base: API_BASE_URL,
          company_name: user?.company_name || user?.company?.name || 'Company',
        };
        if (isDaily) {
          if (selectedBranchIds?.length)     paramsObj.branch_ids     = selectedBranchIds.join(",");
          if (selectedDepartmentIds?.length) paramsObj.department_ids = selectedDepartmentIds.join(",");
        }
        const t4Params = new URLSearchParams(paramsObj);

        const SUMMARY_BASE = process.env.NEXT_PUBLIC_SUMMARY_REPORT_URL || PDF_SERVICE;
        let templatePath;
        if (effectiveTemplate === "Template5")      templatePath = "attendance-report/format-c.html";
        else if (effectiveTemplate === "TemplateB") templatePath = "attendance-report/format-b.html";
        else if (effectiveTemplate === "Template3") templatePath = "daily-report/";
        else                                        templatePath = "attendance-report/";
        let templateUrl = `${SUMMARY_BASE}/${templatePath}?${t4Params.toString()}`;

        setIsPdfDownloading(true);
        setPdfProgress(0);
        try {
          const filename = isDaily
            ? `Daily-Attendance-Report-${fromDate}.pdf`
            : `Attendance-Report-${fromDate}-to-${toDate}.pdf`;
          await downloadReport(templateUrl, filename, (p) => setPdfProgress(p));
        } catch (err) {
          await notify("Error", `Download failed: ${err.message}`, "error");
        } finally {
          setTimeout(() => { setIsPdfDownloading(false); setPdfProgress(0); }, 1000);
        }
        return;
      }

      // 2. Prepare the Query String for other actions (matching Vue frontend format)
      const queryObj = new URLSearchParams(commonParams);

      if (selectedDepartmentIds?.length > 0) {
        queryObj.append("department_ids", selectedDepartmentIds.join(","));
      }

      // Pass employee_id as comma-separated string (same as Vue frontend)
      queryObj.append("employee_id", selectedEmployeeIds.join(","));
      queryObj.append("employee_ids", selectedEmployeeIds.join(","));

      // Status filter: Vue defaults to "-1" when nothing selected (backend skips filter for "-1")
      queryObj.append("status", selectedStatusIds.length > 0 ? selectedStatusIds.join(",") : "-1");
      if (selectedStatusIds.length > 0) {
        queryObj.append("statuses", selectedStatusIds.join(","));
      }

      const fullQsUrl = `${baseUrl}?${queryObj.toString()}`;

      // 3. Handle PDF Download (Direct DOMPDF)
      if (actionType !== "EXCEL") {
        const pdfParams = {
          from_date: fromDate,
          to_date: toDate,
          branch_ids: selectedBranchIds,
          department_ids: selectedDepartmentIds,
          employee_ids: selectedEmployeeIds,
          shift_type_id: shiftTypeId,
          onProgress: (p) => setPdfProgress(p),
        };

        setIsPdfDownloading(true);
        setPdfProgress(0);

        try {
          if (selectedReportTemplate === 'Template2') {
            await downloadMonthlyDetailPDF(pdfParams);
          } else {
            await downloadMonthlyGridPDF(pdfParams);
          }
        } catch (err) {
          await notify("Error", `Download failed: ${err.message}`, "error");
        } finally {
          setTimeout(() => { setIsPdfDownloading(false); setPdfProgress(0); }, 1000);
        }
        return;
      }

      // 4. Handle Excel Download
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = fullQsUrl;
      downloadAnchor.target = "_blank";
      downloadAnchor.click();

    } catch (error) {
      console.error("Report Generation Error:", error);
    }
  };

  const handleSubmit = () => {
    setIsButtonclicked(true);
    fetchRecords(shiftTypeId, true);
  }

  useEffect(() => {
    fetchRecords(shiftTypeId)
  }, [shiftTypeId])

  useEffect(() => {
    if (isButtonclicked) {
      fetchRecords(shiftTypeId);
    }
  }, [currentPage, perPage])



  return (
    <div className='pt-2 pb-4 px-3 md:pt-2 md:pb-6 md:px-6 lg:pt-2 lg:pb-8 lg:px-10 xl:px-12 2xl:px-16 overflow-x-hidden'>
      <PDFProgressOverlay isOpen={isPdfDownloading} progress={pdfProgress} />
      <h3 className="text-2xl font-extrabold text-gray-600 dark:text-slate-300 flex items-center">
        {isAbsentTab ? 'Absent Report' : 'Attendance Report'}
      </h3>


      <div className='flex flex-wrap items-center gap-2 my-2'>
        <div className="flex-1 min-w-[160px]">
          <MultiDropDown
            placeholder={'Status'}
            items={statusses}
            value={selectedStatusIds}
            onChange={setSelectedStatusIds}
            badgesCount={1}
          />
        </div>

        <div className="flex-1 min-w-[160px]">
          <MultiDropDown
            placeholder={'Branch'}
            items={branches}
            value={selectedBranchIds}
            onChange={setSelectedBranchIds}
            badgesCount={1}
          />
        </div>

        <div className="flex-1 min-w-[160px]">
          <MultiDropDown
            placeholder={'Department'}
            items={departments}
            value={selectedDepartmentIds}
            onChange={setSelectedDepartment}
            badgesCount={1}
          />
        </div>

        <div className="flex-1 min-w-[160px]">
          <MultiDropDown
            placeholder={'Employee Type'}
            items={employeeTypeOptions}
            value={selectedEmployeeTypes}
            onChange={setSelectedEmployeeTypes}
            badgesCount={1}
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <MultiDropDown
            placeholder={'Employees'}
            items={
              selectedEmployeeTypes?.length
                ? scheduledEmployees.filter(matchesSelectedType)
                : scheduledEmployees
            }
            value={selectedEmployeeIds}
            onChange={setSelectedEmployeeIds}
            badgesCount={1}
          />
        </div>

        {!isAbsentTab && (
          <div className="flex-1 min-w-[180px]">
            <DropDown
              placeholder={'Report Template'}
              onChange={(val) => {
                setSelectedReportTemplate(val);
                // Format B: if the existing range spans multiple months, clamp `to`
                // back into the same month as `from` so it stays single-month.
                if (val === "TemplateB" && from && to) {
                  const f = new Date(from);
                  const t = new Date(to);
                  if (f.getFullYear() !== t.getFullYear() || f.getMonth() !== t.getMonth()) {
                    const monthEnd = new Date(f.getFullYear(), f.getMonth() + 1, 0);
                    setTo(monthEnd);
                  }
                }
              }}
              value={selectedReportTemplate}
              items={reportTemplates}
            />
          </div>
        )}

        {isAbsentTab && (
          <div className="flex-1 min-w-[180px]">
            <DropDown
              placeholder={'Format'}
              onChange={(val) => {
                setAbsentMode(val);
                // When switching to Daily, collapse range to single date
                if (val === "daily" && from && to) {
                  setTo(from);
                }
              }}
              value={absentMode}
              items={absentTemplates}
            />
          </div>
        )}

        <div className="flex-1 min-w-[220px]">
          <DateRangeSelect
            value={{ from, to }}
            single={selectedReportTemplate === "Template3" || (isAbsentTab && absentMode === "daily")}
            numberOfMonths={selectedReportTemplate === "Template3" || selectedReportTemplate === "TemplateB" || (isAbsentTab && absentMode === "daily") ? 1 : 2}
            onChange={({ from: newFrom, to: newTo }) => {
              if (selectedReportTemplate === "Template3" || (isAbsentTab && absentMode === "daily")) {
                const single = newFrom || newTo;
                setFrom(single);
                setTo(single);
              } else {
                setFrom(newFrom);
                setTo(newTo);
              }
            }} />
        </div>

        {/* Action buttons — kept together so they don't split across rows */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button onClick={handleSubmit} className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Submit
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap focus:outline-none focus:ring-0"
              >
                <Download className="w-4 h-4" /> Download
              </button>

            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
            >
              <DropdownMenuItem
                onClick={() => { process_file_in_child_comp('monthly_download_pdf', 'PDF'); setIsMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <img src="/icons/pdf.png" alt="PDF Icon" className="w-4 h-4" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">PDF</span>
              </DropdownMenuItem>

              {!isAbsentTab && (
                <DropdownMenuItem
                  onClick={() => { process_file_in_child_comp('monthly_download_csv', 'EXCEL'); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <img src="/icons/excel.png" alt="Excel Icon" className="w-4 h-4" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Excel</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      <div className='w-full'>
        <Tabs
          value={shiftTypeId || '0'}
          onValueChange={(value) => setShiftTypeId(value)}
          className="w-full"
        >
          {/* --- Tabs Header --- */}
          <div className="">
            {
              tabs.length > 0 && <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-2 bg-white dark:bg-slate-800 w-full rounded-lg shadow">
                <TabsList className="flex flex-wrap bg-white dark:bg-slate-700 p-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200"
                    >
                      {tab.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className='flex flex-wrap gap-2'>

                  <div className="relative">
                    <button
                      onClick={() => setIsOpen(true)}
                      className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
                    >
                      <Pencil size={15} />
                      Manual Log
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsMissingLogsOpen(true)}
                      className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
                    >
                      <DownloadCloudIcon size={15} />
                      Missing Logs
                    </button>
                  </div>

                  <RegenerateReport shift_type_id={shiftTypeId} />

                </div>

              </div>
            }

          </div>

          {/* --- Tabs Content --- */}
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-2 rounded-lg">
              <DataTable
                columns={Columns(tab.id, {
                  onViewLogs: handleViewLogs,
                })}
                data={records}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => console.log("Clicked:", item)}
                pagination={
                  <Pagination
                    page={currentPage}
                    perPage={perPage}
                    total={total}
                    isLoading={isLoading}
                    onPageChange={setCurrentPage}
                    onPerPageChange={(n) => {
                      setPerPage(n);
                      setCurrentPage(1);
                    }}
                    pageSizeOptions={[10, 25, 50]}
                  />
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>


      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="min-w-[900px] max-w-[900px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-primary text-white">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-semibold">
                Log Details
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-sm">
            <div className="text-slate-600 dark:text-slate-300">
              Employee Id:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedLogRow?.employee?.system_user_id ||
                  selectedLogRow?.employee_id ||
                  "---"}
              </span>
            </div>

            <div className="ml-auto text-slate-600 dark:text-slate-300">
              Total logs:{" "}
              <span className="font-semibold text-primary">
                ({logDetails.length})
              </span>
            </div>
          </div>

          <div className="px-6 py-5">
            {isLogsLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-300">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading log details...
              </div>
            ) : logDetails.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No logs found for this date.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                        Log Time
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                        Device
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                        Log Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                        Note
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">
                        Attachment
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {logDetails.map((log, index) => (
                      <tr
                        key={`${log?.LogTime || "log"}-${index}`}
                        className="border-t border-slate-200 dark:border-slate-800"
                      >
                        <td
                          className={`px-4 py-3 ${log?.device?.name === "Manual"
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-slate-700 dark:text-slate-200"
                            }`}
                        >
                          {log?.LogTime || "---"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                          {log?.device?.name || "---"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/10 text-white">
                            {log?.log_type || "Device"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[150px]">
                          {log?.reason ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {log.reason}
                            </span>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[150px]">
                          {log?.note ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {log.note}
                            </span>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log?.attachment ? (
                            <a
                              href={`${API_BASE_URL.replace('/api', '')}/ManualLog/attachments/${log.attachment}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- ADD THE DIALOG COMPONENT HERE --- */}
      <LoadingProgressDialog
        isOpen={isProgressOpen}
        queryStringUrl={queryStringUrl}
        onClose={() => setIsProgressOpen(false)}
      />

      <ManualAttendanceCorrectionModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          setIsButtonclicked(true);
          fetchRecords(shiftTypeId, true);
        }}
        initialData={{
          date: from || "",
        }}
      />

      <MissingLogsModal
        open={isMissingLogsOpen}
        onClose={() => setIsMissingLogsOpen(false)}
      />


    </div>
  );
}

export default function AttendanceTable() {
  return (
    <Suspense fallback={null}>
      <AttendanceTableInner />
    </Suspense>
  );
}
