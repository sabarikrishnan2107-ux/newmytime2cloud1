"use client";

import React, { useEffect, useState } from 'react';
import { getBranches, getDepartmentsByBranchIds, getScheduledEmployeeList } from '@/lib/api';
import { getPerformanceReport } from '@/lib/endpoint/performance';
import MonthPicker from '@/components/ui/MonthPicker';
import MultiDropDown from '@/components/ui/MultiDropDown';
import ProfilePicture from '../ProfilePicture';
import { Star, Download, Eye, Info } from 'lucide-react';

// Star Rating Component
const StarRating = ({ rating, maxRating = 5 }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={16} className="fill-green-500 text-green-500" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star size={16} className="text-slate-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star size={16} className="fill-green-500 text-green-500" />
          </div>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={16} className="text-slate-300" />
      ))}
    </div>
  );
};

// Rating calculation utility
const getRating = (presentCount, fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;

  const start = new Date(fromDate);
  const end = new Date(toDate);
  const today = new Date();
  
  // Calculate total working days (excluding weekends - simplified)
  let totalDays = 0;
  let currentDate = new Date(start);
  const endDate = end > today ? today : end;

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
      totalDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (totalDays === 0) return 0;

  const attendanceRate = (presentCount / totalDays) * 100;

  if (attendanceRate >= 95) return 5;
  if (attendanceRate >= 90) return 4.5;
  if (attendanceRate >= 85) return 4;
  if (attendanceRate >= 80) return 3.5;
  if (attendanceRate >= 75) return 3;
  if (attendanceRate >= 70) return 2.5;
  if (attendanceRate >= 65) return 2;
  if (attendanceRate >= 60) return 1.5;
  if (attendanceRate >= 50) return 1;
  return 0.5;
};

export default function PerformanceReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showRatingInfo, setShowRatingInfo] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [selectedMonthRange, setSelectedMonthRange] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${now.getFullYear()}-${month}`;
    return { from: currentMonth, to: currentMonth };
  });

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchList = await getBranches();
        setBranches(Array.isArray(branchList) ? branchList : []);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        setBranches([]);
      }
    };
    fetchBranches();
  }, []);

  // Fetch departments when branch changes
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!selectedBranchId) {
        setDepartments([]);
        setSelectedDepartmentIds([]);
        return;
      }

      try {
        const departmentList = await getDepartmentsByBranchIds([selectedBranchId]);
        const normalizedDepartments = Array.isArray(departmentList) ? departmentList : [];
        setDepartments(normalizedDepartments);
        setSelectedDepartmentIds([]);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, [selectedBranchId]);

  // Fetch employees when departments change
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeeList = await getScheduledEmployeeList(selectedDepartmentIds, 1000);
        setEmployees(Array.isArray(employeeList) ? employeeList : []);
        setSelectedEmployeeIds([]);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, [selectedDepartmentIds]);

  const handleMonthChange = (monthRangeValue) => {
    if (!monthRangeValue?.from) return;

    setSelectedMonthRange({
      from: monthRangeValue.from,
      to: monthRangeValue.to || monthRangeValue.from,
    });

    // Calculate from_date and to_date
    const fromMonth = monthRangeValue.from;
    const toMonth = monthRangeValue.to || monthRangeValue.from;

    const [fromYear, fromMonthNum] = fromMonth.split('-').map(Number);
    const [toYear, toMonthNum] = toMonth.split('-').map(Number);

    setFromDate(`${fromYear}-${String(fromMonthNum).padStart(2, '0')}-01`);
    const lastDay = new Date(toYear, toMonthNum, 0).getDate();
    setToDate(`${toYear}-${String(toMonthNum).padStart(2, '0')}-${lastDay}`);
  };

  const selectedMonthLabel = (() => {
    const fromMonth = selectedMonthRange?.from;
    const toMonth = selectedMonthRange?.to || fromMonth;

    if (!fromMonth || !toMonth) return 'Select month range';

    const [fromYear, fromMonthValue] = fromMonth.split('-').map(Number);
    const [toYear, toMonthValue] = toMonth.split('-').map(Number);

    const fromDateObj = new Date(fromYear, (fromMonthValue || 1) - 1, 1);
    const toDateObj = new Date(toYear, (toMonthValue || 1) - 1, 1);

    const start = fromDateObj <= toDateObj ? fromDateObj : toDateObj;
    const end = fromDateObj <= toDateObj ? toDateObj : fromDateObj;

    const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  })();

  const fetchPerformanceData = async () => {
    if (!fromDate || !toDate) {
      // Set default dates if not set
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      setFromDate(`${year}-${String(month).padStart(2, '0')}-01`);
      setToDate(`${year}-${String(month).padStart(2, '0')}-${lastDay}`);
      return;
    }

    setLoading(true);
    try {
      const response = await getPerformanceReport({
        branch_id: selectedBranchId,
        department_ids: selectedDepartmentIds,
        employee_id: selectedEmployeeIds,
        from_date: fromDate,
        to_date: toDate,
        page,
        per_page: perPage,
      });

      setData(response?.data || []);
      setTotalRows(response?.total || 0);
    } catch (error) {
      console.error('Failed to fetch performance report:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const getPresentCount = (item) => {
    return [item?.p_count, item?.lc_count, item?.eg_count].reduce(
      (sum, val) => sum + (val || 0),
      0
    );
  };

  const getAbsentCount = (item) => {
    const remainingDays = getRemainingDays();
    return [item?.a_count, item?.m_count].reduce(
      (sum, val) => sum + (val || 0),
      0
    ) - remainingDays;
  };

  const getOtherCount = (item) => {
    return [item?.l_count, item?.v_count, item?.h_count].reduce(
      (sum, val) => sum + (val || 0),
      0
    );
  };

  const getRemainingDays = () => {
    if (!toDate) return 0;
    const today = new Date();
    const endDate = new Date(toDate);
    if (today >= endDate) return 0;

    let remainingDays = 0;
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        remainingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return remainingDays;
  };

  const downloadReport = (item) => {
    const employee = item?.employee;
    if (!employee?.employee_id || !employee?.company_id) {
      console.warn('Invalid employee data', item);
      return;
    }

    const params = new URLSearchParams({
      employee_id: employee.employee_id,
      company_id: employee.company_id,
      from_date: fromDate,
      to_date: toDate,
    });

    window.open(`/performance-report?${params.toString()}`, '_blank');
  };

  const totalPages = Math.ceil(totalRows / perPage);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-white min-h-screen flex flex-col antialiased">
      <main className="relative z-10 flex-1 w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Performance Reports
            </h1>
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              {selectedMonthLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Branch Dropdown */}
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value || null)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-w-[180px]"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name || branch.name}
                </option>
              ))}
            </select>

            <MultiDropDown
              placeholder="Select Department"
              items={departments}
              value={selectedDepartmentIds}
              onChange={setSelectedDepartmentIds}
              width="w-[200px]"
              badgesCount={1}
            />

            <MultiDropDown
              placeholder="Select Employees"
              items={employees.map(e => ({ id: e.system_user_id, name: e.name_with_user_id || e.name }))}
              value={selectedEmployeeIds}
              onChange={setSelectedEmployeeIds}
              width="w-[200px]"
              badgesCount={1}
            />

            <MonthPicker
              value={selectedMonthRange}
              onChange={handleMonthChange}
              className="min-w-[200px]"
            />

            <button
              onClick={fetchPerformanceData}
              className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/25 hover:bg-slate-800 transition-all"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Rating Info Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowRatingInfo(!showRatingInfo)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
          >
            <Info size={16} />
            Rating Info
          </button>
        </div>

        {/* Rating Info Panel */}
        {showRatingInfo && (
          <div className="glass-panel rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide mb-4">Rating Description</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <StarRating rating={5} />
                <span className="text-slate-600 dark:text-slate-400">95%+ Attendance</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={4} />
                <span className="text-slate-600 dark:text-slate-400">85-94% Attendance</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={3} />
                <span className="text-slate-600 dark:text-slate-400">75-84% Attendance</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={2} />
                <span className="text-slate-600 dark:text-slate-400">65-74% Attendance</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={1} />
                <span className="text-slate-600 dark:text-slate-400">&lt;65% Attendance</span>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Employee
                  </th>
                  {/* <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Join Date
                  </th> */}
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Present
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Absent
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Incomplete
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Late In
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Early Out
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Weekoff
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Leave
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center">
                    Holiday
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Rating
                  </th>
                  {/* <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-right">
                    Actions
                  </th> */}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((item, idx) => {
                    const rating = getRating(item.p_count || 0, fromDate, toDate);
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <ProfilePicture src={item?.employee?.profile_picture} />
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item?.employee?.first_name || '---'} {item?.employee?.last_name || ''}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                #{item?.employee?.employee_id || '---'}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          {item?.employee?.show_joining_date || '---'}
                        </td> */}
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-semibold text-green-600 dark:text-green-400">
                          {item?.p_count || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-semibold text-red-600 dark:text-red-400">
                          {Math.max(0, getAbsentCount(item))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-600 dark:text-slate-300">
                          {item?.m_count || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-orange-600 dark:text-orange-400">
                          {item?.lc_count || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-amber-600 dark:text-amber-400">
                          {item?.eg_count || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-600 dark:text-slate-300">
                          {item?.o_count || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-blue-600 dark:text-blue-400">
                          {item?.l_count || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-purple-600 dark:text-purple-400">
                          {item?.h_count || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <StarRating rating={rating} />
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              {rating} / 5
                            </span>
                          </div>
                        </td>
                        {/* <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => downloadReport(item)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
                              title="Download Report"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </td> */}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                      No data available. Click 'Generate' button to see the results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {((page - 1) * perPage) + 1}-{Math.min(page * perPage, totalRows)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {totalRows}
                </span>{" "}
                employees
              </p>

              <div className="flex gap-2 items-center">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>

                <button
                  className="px-3 py-1 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canGoPrev}
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-sm font-medium rounded-md bg-white border border-slate-200 dark:border-slate-700 dark:bg-white/10 dark:text-white shadow-sm">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  className="px-3 py-1 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 dark:hover:text-white disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!canGoNext}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
