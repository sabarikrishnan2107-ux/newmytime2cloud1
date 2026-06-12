"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getCompanyStats, getCompanyStatsDailyAttendance, getCompanyStatsDayTrends, getCompanyStatsDepartmentBreakdown, getCompanyStatsHourlyTrends, getCompanyStatsPunctuality, getCompanyStatsSummaryPayload } from '@/lib/endpoint/dashboard';
import MonthPicker from '@/components/ui/MonthPicker';
import MultiDropDown from '@/components/ui/MultiDropDown';
import { getBranches, getDepartmentsByBranchIds } from '@/lib/api';

import ProfilePicture from '../ProfilePicture';
import { Download, Eye, RefreshCw } from 'lucide-react';
import { API_BASE_URL, getUser } from '@/config/index';
import DatePicker from '../ui/DatePicker';
import DropDown from '../ui/DropDown';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { formatDateLocal, getBgColor, getMonthBounds, getSelectedMonthLabel, setStatusLabel } from '@/lib/utils';
import { downloadSummaryPDF } from '@/lib/endpoint/report';
import PDFProgressOverlay from './PDFProgressOverlay';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAttendanceTabs } from '@/lib/endpoint/attendance';
import LogDetails from '../Logs/Details';
import KPISection from './SummarySections/KPI';
import PeakHours from './SummarySections/PeakHours';

export default function ExecutiveAttendanceDashboardPage() {


  const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'

  const [selectedDate, setSelectedDate] = useState(formatDateLocal());

  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedLogRow, setSelectedLogRow] = useState(null);
  const [logDetails, setLogDetails] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [punctualityData, setPunctualityData] = useState([]);
  const [dailyAttendanceRows, setDailyAttendanceRows] = useState([]);
  const [attendanceSearchInput, setAttendanceSearchInput] = useState('');
  const [attendanceSearchText, setAttendanceSearchText] = useState('');
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceMeta, setAttendanceMeta] = useState({ total: 0, page: 1, per_page: 10, last_page: 1, from: 0, to: 0 });
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [selectedMonthRange, setSelectedMonthRange] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${now.getFullYear()}-${month}`;

    return {
      from: currentMonth,
      to: currentMonth,
    };
  });

  useEffect(() => {
    let isMounted = true;

    const fetchBranches = async () => {
      try {
        const branchList = await getBranches();
        if (isMounted) {
          setBranches(Array.isArray(branchList) ? branchList : []);
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        if (isMounted) {
          setBranches([]);
        }
      }
    };

    fetchBranches();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchDepartments = async () => {
      if (!selectedBranchIds.length) {
        if (isMounted) {
          setDepartments([]);
          setSelectedDepartmentIds([]);
        }
        return;
      }

      try {
        const departmentList = await getDepartmentsByBranchIds(selectedBranchIds);
        if (isMounted) {
          const normalizedDepartments = Array.isArray(departmentList) ? departmentList : [];
          setDepartments(normalizedDepartments);

          const validDepartmentIds = new Set(normalizedDepartments.map((department) => department.id));
          setSelectedDepartmentIds((currentSelectedIds) => currentSelectedIds.filter((id) => validDepartmentIds.has(id)));
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        if (isMounted) {
          setDepartments([]);
          setSelectedDepartmentIds([]);
        }
      }
    };

    fetchDepartments();

    return () => {
      isMounted = false;
    };
  }, [selectedBranchIds]);

  // Data is fetched only when user clicks Submit button via fetchAllData()

  // Daily attendance data is fetched only when user clicks Submit button via fetchAllData()

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setAttendancePage(1);
      setAttendanceSearchText(attendanceSearchInput.trim());
    }, 350);

    return () => clearTimeout(debounceTimer);
  }, [attendanceSearchInput]);

  const handleMonthChange = (monthRangeValue) => {
    if (!monthRangeValue?.from) {
      return;
    }

    setSelectedMonthRange({
      from: monthRangeValue.from,
      to: monthRangeValue.to || monthRangeValue.from,
    });
  };

  const fetchAllData = async () => {

    const user = await getUser();

    try {
      let isDaily = reportType === 'daily';

      let dateRange = getMonthBounds(selectedMonthRange?.from, selectedMonthRange?.to || selectedMonthRange?.from);

      if (isDaily) {

        dateRange = {
          from_date: selectedDate,
          to_date: selectedDate,
        }

      }

      const payload = {
        ...dateRange,
        branch_ids: selectedBranchIds,
        shift_type_id: shiftTypeId,
        department_ids: selectedDepartmentIds,
        company_id: user?.company_id || 0,
      };

      setIsLoading(true);

      const trendFetcher = isDaily ? getCompanyStatsHourlyTrends : getCompanyStatsDayTrends;

      const [statsResponse, hourlyTrendResponse, departmentResponse, punctualityResponse] = await Promise.all([
        getCompanyStats(payload),
        trendFetcher(payload),
        getCompanyStatsDepartmentBreakdown(payload),
        getCompanyStatsPunctuality(payload),
      ]);

      setStats(Array.isArray(statsResponse?.stats) && statsResponse.stats.length > 0 ? statsResponse.stats : []);

      const normalizedChartData = Array.isArray(hourlyTrendResponse?.data)
        ? hourlyTrendResponse.data.map((item) => (isDaily
          ? { label: item?.label, punches: Number(item?.punches || 0) }
          : { label: item?.label, present: Number(item?.present || 0), absent: Number(item?.absent || 0) }
        ))
        : [];

      const normalizedDepartmentData = Array.isArray(departmentResponse?.data)
        ? departmentResponse.data.map((item) => ({
          name: item?.name || 'Unknown',
          count: Number(item?.count || 0),
          percentage: Number(item?.percentage || 0),
        }))
        : [];

      const normalizedPunctualityData = Array.isArray(punctualityResponse?.data)
        ? punctualityResponse.data.map((item) => {
          const displayName = item?.name || 'Unknown';
          const initials = displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || 'NA';

          return {
            name: displayName,
            dept: item?.dept || '---',
            score: item?.score || '0%',
            img: item?.img || null,
            initial: initials,
          };
        })
        : [];

      setChartData(normalizedChartData);
      setDepartmentBreakdown(normalizedDepartmentData);
      setPunctualityData(normalizedPunctualityData);

      // Also fetch daily attendance
      const dailyPayload = {
        ...dateRange,
        branch_ids: selectedBranchIds,
        department_ids: selectedDepartmentIds,
        search: attendanceSearchText.trim(),
        page: attendancePage,
        shift_type_id: shiftTypeId,
        per_page: attendanceMeta.per_page || 10,
      };

      const dailyAttendanceResponse = await getCompanyStatsDailyAttendance(dailyPayload);

      const resolvedAttendanceReportType =
        dailyAttendanceResponse?.report_type === 'daily' ? 'daily' : 'range';

      const normalizedDailyAttendanceRows = Array.isArray(dailyAttendanceResponse?.data)
        ? dailyAttendanceResponse.data.map((item) => {
          const baseRow = {
            id: item?.system_user_id,
            employeeCode: item?.employee_code || '---',
            date: item?.date || '---',
            name: item?.name || 'Unknown',
            department: item?.department || '---',
            shift_type_id: item?.shift_type_id || '---',
            logs: item?.logs || '---',
            img: item?.img || null,
            duty_time: (item?.on_duty_time || '') + " - " + (item?.off_duty_time || ''),
            device_in: item.device_in || '---',
            device_out: item.device_out || '---',
          };

          if (resolvedAttendanceReportType === 'daily') {
            return {
              ...baseRow,
              date: item?.date || '---',
              in: item?.in || '---',
              out: item?.out || '---',
              lateIn: item?.late_in || '---',
              earlyOut: item?.early_out || '---',
              ot: item?.ot || '---',
              totalHrs: item?.total_hrs || '---',
              status: item?.status || '---',
            };
          }

          return {
            ...baseRow,
            daysPresent: Number(item?.days_present ?? 0),
            daysWeekOff: Number(item?.days_weekoff ?? 0),
            daysMissing: Number(item?.days_missing ?? 0),
            daysPresent: Number(item?.days_present ?? 0),
            daysAbsent: Number(item?.days_absent ?? 0),
            daysLeave: Number(item?.days_leave ?? 0),
            manualLogs: Number(item?.manual_logs ?? 0),
            totalDays: Number(item?.total_days ?? 0),

            avgIn: item?.avg_checkin ?? '---',
            avgOut: item?.avg_checkout ?? '---',
            lateIn: item?.late_in_hours ?? '---',
            earlyOut: item?.early_out_hours ?? '---',
            avgHrs: item?.avg_working_hrs ?? '---',
            totalHrs: item?.total_hours ?? '---',
            expectedHrs: item?.required_hours ?? '---',

            rate: Number(item?.rate || 0),
            trend: Number(item?.trend || 0),
            status: item?.status,
          };
        })
        : [];


      setDailyAttendanceRows(normalizedDailyAttendanceRows);
      setAttendancePage(1);
      setAttendanceMeta({
        total: Number(dailyAttendanceResponse?.meta?.total || 0),
        page: selectedDate,
        per_page: 100,
        last_page: Number(dailyAttendanceResponse?.meta?.last_page || 1),
        from: Number(dailyAttendanceResponse?.meta?.from || 0),
        to: Number(dailyAttendanceResponse?.meta?.to || 0),
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [shiftTypeId, setShiftTypeId] = useState(`0`);
  const [tabs, setTabs] = useState([]);
  const [orginalTabSet, setOriginalTabSet] = useState({ single: true, double: true, multi: true });
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

  useEffect(() => {
    fetchAttendanceTabs();
  }, []);


  useEffect(() => {
    fetchAllData();
  }, [attendancePage, shiftTypeId]);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setPdfProgress(0);

      let isDaily = reportType === 'daily';
      let dateRange = getMonthBounds(selectedMonthRange?.from, selectedMonthRange?.to || selectedMonthRange?.from);

      if (isDaily) {
        dateRange = {
          from_date: selectedDate,
          to_date: selectedDate,
        };
      }

      await downloadSummaryPDF({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
        branch_ids: selectedBranchIds,
        department_ids: selectedDepartmentIds,
        shift_type_id: shiftTypeId,
        report_type: reportType,
        onProgress: (p) => setPdfProgress(p),
      });

    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setTimeout(() => { setIsExporting(false); setPdfProgress(0); }, 1000);
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
        UserID: item.employeeCode,
        LogTime: new Date(selectedDate).toISOString().split('T')[0],
        company_id: companyId,
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


  const getRateUi = (rate) => {
    if (rate >= 90) return 'text-emerald-500';
    if (rate >= 75) return 'text-amber-500';
    return 'text-red-500';
  };

  const currentAttendancePage = attendanceMeta.page || attendancePage;
  const canGoPrevAttendancePage = currentAttendancePage > 1;
  const canGoNextAttendancePage = currentAttendancePage < attendanceMeta.last_page;


  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-white  min-h-screen flex flex-col antialiased selection:bg-accent/20 overflow-y-auto ">
      <PDFProgressOverlay isOpen={isExporting} progress={pdfProgress} />
      <main className="relative z-10 flex-1 w-full  mx-auto px-6 py-8 flex flex-col gap-8 max-h-[calc(100vh-100px)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {getSelectedMonthLabel(selectedMonthRange)}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">
              {reportType === 'daily'
                ? 'Daily attendance performance overview.'
                : 'Monthly attendance performance overview.'}
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <MultiDropDown
              placeholder={'Select Branch'}
              items={branches}
              value={selectedBranchIds}
              onChange={setSelectedBranchIds}
              width="w-[250px]"
              badgesCount={1}
            />

            <MultiDropDown
              placeholder={'Select Department'}
              items={departments}
              value={selectedDepartmentIds}
              onChange={setSelectedDepartmentIds}
              width="w-[250px]"
              badgesCount={1}
            />

            <div>
              <DropDown
                value={reportType}
                items={[
                  { name: 'Daily', id: 'daily' },
                  { name: 'Monthly', id: 'monthly' },
                ]}
                onChange={setReportType}
                placeholder="Pick a Report type"
              />
            </div>

            {
              /* For daily report, we show date picker. For monthly report, we show month picker */
              reportType === 'daily' ? (
                <div className=''>
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Pick a date"
                    className="w-[250px]"
                  />
                </div>
              ) : <MonthPicker
                value={selectedMonthRange}
                onChange={handleMonthChange}
                className="min-w-[240px]"
              />
            }

            <button onClick={fetchAllData} className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Submit
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                /* This prevents the dropdown trigger itself from triggering the row click */
                onClick={(e) => e.stopPropagation()}
              >


                <button
                  className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap focus:outline-none focus:ring-0"
                >
                  {isExporting ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}

                  Download
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
              /* This prevents clicking inside the menu from triggering the row click */
              >
                <DropdownMenuItem
                  onClick={handleExportPdf}
                  className="flex items-center border border-border gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <img src="/icons/pdf.png" alt="PDF Icon" className="w-4 h-4" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        {/* KPIs */}
        <KPISection stats={stats} />

        <PeakHours reportType={reportType} chartData={chartData} departmentDonutData={departmentBreakdown.slice(0, 4)} punctualityData={punctualityData} />

        {/* Table */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">

            <Tabs
              value={shiftTypeId || '0'}
              onValueChange={(value) => setShiftTypeId(value)}
              className="w-full"
            >
              {/* --- Tabs Header --- */}
              <div className="">
                {
                  tabs.length > 0 && <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-2 w-full  ">
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
                  </div>
                }

              </div>
            </Tabs>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  search
                </span>
                <input
                  value={attendanceSearchInput}
                  onChange={(event) => setAttendanceSearchInput(event.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all outline-none"
                  placeholder="Search employee..."
                  type="text"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                {reportType === 'daily' ? (
                  <tr className="bg-slate-100 dark:bg-slate-800  border-y border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 w-[20%] text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Employee </th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Schedule</th>
                    {
                      shiftTypeId != 2 && shiftTypeId != 5 ?
                        <>
                          <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Clock In</th>
                          <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Clock Out</th>
                          <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Late (mins)</th>
                          <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Early Go (mins)</th>
                        </>
                        :
                        <>
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <th
                              key={idx}
                              className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center"
                            >
                              Log {idx + 1}
                            </th>
                          ))}
                        </>
                    }

                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Overtime</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Total Hrs</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Status</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Action</th>
                  </tr>
                ) : (
                  <tr className="bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Employee</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">P</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">A</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">L</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">WO</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">M</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Avg CI</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Avg CO</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">LI</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">EO</th>
                    <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Avg WH</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-right">WH</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-right">Perf</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">Action</th>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {dailyAttendanceRows.length > 0 ? (
                  dailyAttendanceRows.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group relative">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <ProfilePicture src={row.img} />
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">

                              {row.department}
                            </p>
                          </div>
                        </div>
                      </td>

                      {reportType === 'daily' ? (
                        <>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.duty_time}
                          </td>
                          {
                            row.shift_type_id != 2 && row.shift_type_id != 5 ? (
                              <>
                                <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {row.in || '--'}  <br /> <span className='text-[11px]'>{row.device_in}</span>
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {row.out || '--'} <br /> <span className='text-[11px]'>{row.device_out}</span>
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {row.lateIn || '--'}
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {row.earlyOut || '--'}
                                </td>
                              </>
                            ) : (
                              <>
                                {Array.from({ length: 5 }).map((_, idx) => {
                                  const log = row.logs?.[idx];
                                  return (
                                    <td
                                      key={idx}
                                      className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200"
                                    >
                                      <div className="flex flex-wrap justify-center gap-1 text-xs">
                                        <span className="font-semibold">
                                          {log?.in || "--"} <br />
                                        </span>
                                        <span className="font-semibold">
                                          {" "}
                                        </span>
                                        <span className="font-semibold">
                                          {log?.out || "--"}
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                              </>
                            )
                          }


                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.ot || "--"}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.totalHrs}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {
                              row.status
                                ?
                                <span className={`text-sm ${getBgColor(row.status)}`}
                                  style={{
                                    padding: "2px 10px",
                                    borderRadius: "50px",
                                  }}
                                >
                                  {setStatusLabel(row?.status)}
                                </span>
                                : "---"
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                            <button
                              type="button"
                              onClick={() => handleViewLogs?.(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md   text-primary  hover:bg-primary/5"
                              title="View Logs"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.daysPresent}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.daysAbsent}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.daysLeave}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.daysWeekOff}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.daysMissing}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.avgIn}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.avgOut}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.lateIn}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.earlyOut}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.avgHrs}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.totalHrs} / {row.expectedHrs}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {row.rate} %
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                            <button
                              type="button"
                              onClick={() => handleViewLogs?.(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md   text-primary  hover:bg-primary/5"
                              title="View Logs"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={reportType === 'daily' ? 9 : 12}
                      className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300"
                    >
                      No attendance detail found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {attendanceMeta.from}-{attendanceMeta.to}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {attendanceMeta.total}
              </span>{" "}
              employees
            </p>

            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-50"
                onClick={() => setAttendancePage((current) => Math.max(1, current - 1))}
                disabled={!canGoPrevAttendancePage}
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm font-medium rounded-md bg-white border border-slate-200 dark:border-slate-700 dark:bg-white/10 dark:text-white shadow-sm">
                Page {currentAttendancePage} of {attendanceMeta.last_page}
              </span>
              <button
                className="px-3 py-1 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 dark:hover:text-white disabled:opacity-50"
                onClick={() => setAttendancePage((current) => Math.min(attendanceMeta.last_page, current + 1))}
                disabled={!canGoNextAttendancePage}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <LogDetails isLogsOpen={isLogsOpen} setIsLogsOpen={setIsLogsOpen} logDetails={logDetails} isLogsLoading={isLogsLoading} selectedLogRow={selectedLogRow} />

      </main>
    </div>
  );
}
