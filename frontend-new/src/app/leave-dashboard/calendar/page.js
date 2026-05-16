"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutList,
  X,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  differenceInDays,
  isWeekend,
} from "date-fns";
import { getLeavesRequest } from "@/lib/endpoint/leaves";
import { getBranches, getDepartments } from "@/lib/api";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DropDown from "@/components/ui/DropDown";
import ProfilePicture from "@/components/ProfilePicture";

// --- Status config ---
const statusConfig = {
  0: {
    label: "Pending", key: "pending",
    bg: "bg-yellow-500/20", text: "text-yellow-400",
    border: "border-yellow-500/30", dot: "bg-yellow-400", icon: Clock,
  },
  1: {
    label: "Approved", key: "approved",
    bg: "bg-emerald-500/20", text: "text-emerald-400",
    border: "border-emerald-500/30", dot: "bg-emerald-400", icon: CheckCircle2,
  },
  2: {
    label: "Rejected", key: "rejected",
    bg: "bg-red-500/20", text: "text-red-400",
    border: "border-red-500/30", dot: "bg-red-400", icon: XCircle,
  },
};

const leaveTypeColors = [
  "#40ab63", "#e74c3c", "#f39c12", "#8e44ad", "#3498db",
  "#1abc9c", "#e67e22", "#2ecc71", "#9b59b6", "#34495e",
];

// --- Status badge ---
function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig[0];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// --- Drawer Panel ---
function DrawerPanel({ open, onClose, title, children }) {
  return (
    <>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] bg-black/50 z-40 transition-opacity" onClick={onClose} />
      )}
      <div className={`fixed top-[72px] right-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">{children}</div>
      </div>
    </>
  );
}

// --- Main Page ---
export default function TeamCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState("calendar");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [leaveData, setLeaveData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  // Fetch branches & departments on mount
  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
    getDepartments().then(setDepartments).catch(console.error);
  }, []);

  // Fetch leave data when filters or month changes
  useEffect(() => {
    fetchLeaves();
  }, [currentMonth, selectedBranchIds, selectedDepartmentIds, selectedStatus]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const params = {
        per_page: 500,
        start_date: monthStart,
        end_date: monthEnd,
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
        status_ids: selectedStatus !== null ? [String(selectedStatus)] : undefined,
      };

      const result = await getLeavesRequest(params);
      const records = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      setLeaveData(records);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
      setLeaveData([]);
    } finally {
      setLoading(false);
    }
  };

  // Map leave data to calendar events
  const allEvents = useMemo(() => {
    const colorMap = {};
    let colorIdx = 0;

    return leaveData.map((lr) => {
      const leaveTypeName = lr.leave_type?.name || lr.leave_group_type?.leave_type?.name || "Leave";
      if (!colorMap[leaveTypeName]) {
        colorMap[leaveTypeName] = leaveTypeColors[colorIdx % leaveTypeColors.length];
        colorIdx++;
      }

      return {
        id: lr.id,
        status: lr.status,
        start: parseISO(lr.start_date || lr.from_date),
        end: parseISO(lr.end_date || lr.to_date),
        days: lr.total_days || lr.days || differenceInDays(parseISO(lr.end_date || lr.to_date), parseISO(lr.start_date || lr.from_date)) + 1,
        reason: lr.reason || lr.description || "",
        appliedOn: lr.created_at?.split("T")[0] || "",
        employee: {
          id: lr.employee?.id,
          name: lr.employee?.first_name || "Unknown",
          department: lr.employee?.department?.name || "",
          branch: lr.employee?.department?.branch?.name || "",
          profile_picture: lr.employee?.profile_picture,
          avatar: (lr.employee?.first_name || "U").charAt(0).toUpperCase(),
        },
        leaveType: {
          name: leaveTypeName,
          color: colorMap[leaveTypeName],
        },
        raw: lr,
      };
    });
  }, [leaveData]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Events for a specific day
  const getEventsForDay = useCallback(
    (day) => {
      return allEvents.filter((ev) =>
        isWithinInterval(day, { start: ev.start, end: ev.end })
      );
    },
    [allEvents]
  );

  // Navigation
  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Open event detail
  const handleEventClick = (e, ev) => {
    e.stopPropagation();
    setSelectedEvent(ev);
    setDrawerOpen(true);
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedEvent(null);
  };

  // Unique employees for timeline
  const timelineEmployees = useMemo(() => {
    const empMap = {};
    allEvents.forEach((ev) => {
      if (ev.employee?.id && !empMap[ev.employee.id]) {
        empMap[ev.employee.id] = ev.employee;
      }
    });
    return Object.values(empMap);
  }, [allEvents]);

  // Timeline dates (full month)
  const timelineDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  // Unique leave types for legend
  const uniqueLeaveTypes = useMemo(() => {
    const map = {};
    allEvents.forEach((ev) => {
      if (ev.leaveType?.name && !map[ev.leaveType.name]) {
        map[ev.leaveType.name] = ev.leaveType.color;
      }
    });
    return Object.entries(map).map(([name, color]) => ({ name, color }));
  }, [allEvents]);

  const weekDayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // KPI counts
  const pendingCount = allEvents.filter((e) => e.status === 0).length;
  const approvedCount = allEvents.filter((e) => e.status === 1).length;
  const onLeaveToday = allEvents.filter(
    (ev) => isWithinInterval(new Date(), { start: ev.start, end: ev.end }) && ev.status === 1
  );

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-600 dark:text-white">Team Calendar</h1>
            <p className="text-sm text-slate-500 mt-0.5">View team leave schedules across the organization</p>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showFilters
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-white dark:bg-slate-900 border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filters Row */}
        {showFilters && (
          <div className="grid grid-cols-3 gap-3">
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
            <DropDown
              placeholder="All Status"
              items={[
                { id: -1, name: "All Status" },
                { id: 0, name: "Pending" },
                { id: 1, name: "Approved" },
                { id: 2, name: "Rejected" },
              ]}
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val === -1 ? null : val)}
              portalled={false}
            />
          </div>
        )}
      </div>

      {/* Month Navigation + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-white/10">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-white min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-white/10">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToToday} className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
            Today
          </button>
          {loading && (
            <span className="ml-3 text-xs text-slate-500 animate-pulse">Loading...</span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-1">
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-primary text-primary-foreground"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "timeline"
                ? "bg-primary text-primary-foreground"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Timeline
          </button>
        </div>
      </div>

      {/* Calendar Grid View */}
      {viewMode === "calendar" && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden select-none">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10">
            {weekDayHeaders.map((d) => (
              <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const weekend = isWeekend(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r border-slate-200 dark:border-white/5 p-1.5 transition-colors ${
                    !isCurrentMonth ? "opacity-40" : ""
                  } ${weekend ? "bg-slate-100 dark:bg-white/[0.02]" : ""} hover:bg-slate-100 dark:hover:bg-white/5`}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium leading-none ${
                        isToday
                          ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold"
                          : isCurrentMonth
                          ? "text-slate-300"
                          : "text-slate-600"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-500 font-medium">{dayEvents.length}</span>
                    )}
                  </div>

                  {/* Event Pills */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => handleEventClick(e, ev)}
                        className="group flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: ev.leaveType?.color ? `${ev.leaveType.color}33` : "rgba(100,100,100,0.2)",
                          color: ev.leaveType?.color || "#94a3b8",
                          borderLeft: `2px solid ${ev.leaveType?.color || "#64748b"}`,
                        }}
                        title={`${ev.employee?.name} - ${ev.leaveType?.name}`}
                      >
                        <span className="truncate">{ev.employee?.name}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-500 px-1.5 font-medium">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]" style={{ minWidth: `${200 + timelineDays.length * 32}px` }}>
              {/* Timeline Header - Dates */}
              <div className="flex border-b border-slate-200 dark:border-white/10 sticky top-0 bg-white dark:bg-slate-800/90 backdrop-blur-sm z-10">
                <div className="w-[200px] shrink-0 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-white/10">
                  Employee
                </div>
                <div className="flex flex-1">
                  {timelineDays.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const weekend = isWeekend(day);
                    return (
                      <div
                        key={idx}
                        className={`flex-1 min-w-[32px] text-center py-2.5 text-[10px] font-medium border-r border-white/5 ${
                          isToday ? "bg-primary/20 text-primary font-bold" : weekend ? "text-slate-600 bg-slate-100 dark:bg-white/[0.02]" : "text-slate-500"
                        }`}
                      >
                        <div>{format(day, "EEE")[0]}</div>
                        <div className="font-bold">{format(day, "d")}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employee Rows */}
              {timelineEmployees.map((emp) => {
                const empEvents = allEvents.filter((ev) => ev.employee?.id === emp.id);

                return (
                  <div key={emp.id} className="flex border-b border-white/5 hover:bg-slate-100 dark:bg-white/[0.02] transition-colors">
                    {/* Employee Info */}
                    <div className="w-[200px] shrink-0 px-3 py-2.5 border-r border-slate-200 dark:border-white/10 flex items-center gap-2">
                      <ProfilePicture src={emp.profile_picture} className="w-7 h-7" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{emp.department}</div>
                      </div>
                    </div>

                    {/* Timeline Cells */}
                    <div className="flex flex-1 relative">
                      {timelineDays.map((day, idx) => {
                        const weekend = isWeekend(day);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={idx}
                            className={`flex-1 min-w-[32px] border-r border-white/5 ${weekend ? "bg-slate-100 dark:bg-white/[0.02]" : ""} ${isToday ? "bg-primary/5" : ""}`}
                          />
                        );
                      })}

                      {/* Leave Bars */}
                      {empEvents.map((ev) => {
                        const monthStart = startOfMonth(currentMonth);
                        const monthEnd = endOfMonth(currentMonth);
                        const barStart = ev.start < monthStart ? monthStart : ev.start;
                        const barEnd = ev.end > monthEnd ? monthEnd : ev.end;

                        if (barStart > monthEnd || barEnd < monthStart) return null;

                        const startIdx = differenceInDays(barStart, monthStart);
                        const spanDays = differenceInDays(barEnd, barStart) + 1;
                        const totalDays = timelineDays.length;
                        const leftPct = (startIdx / totalDays) * 100;
                        const widthPct = (spanDays / totalDays) * 100;
                        const cfg = statusConfig[ev.status] || statusConfig[0];

                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => handleEventClick(e, ev)}
                            className="absolute top-1 cursor-pointer group"
                            style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: "calc(100% - 8px)" }}
                          >
                            <div
                              className={`h-full rounded-md border flex items-center px-1.5 text-[10px] font-medium truncate transition-opacity hover:opacity-90 ${cfg.border}`}
                              style={{
                                backgroundColor: ev.leaveType?.color ? `${ev.leaveType.color}40` : "rgba(100,100,100,0.25)",
                                borderLeftWidth: "3px",
                                borderLeftColor: ev.leaveType?.color || "#64748b",
                              }}
                            >
                              <span className="truncate" style={{ color: ev.leaveType?.color || "#94a3b8" }}>
                                {ev.leaveType?.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {timelineEmployees.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-500">
                  {loading ? "Loading..." : "No leave requests found for this month."}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          {uniqueLeaveTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Leave Types:</span>
              {uniqueLeaveTypes.map((lt) => (
                <div key={lt.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: lt.color }} />
                  <span className="text-[10px] text-slate-400">{lt.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards below calendar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upcoming Leaves */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            Upcoming Leaves
          </h3>
          <div className="space-y-2">
            {allEvents
              .filter((ev) => ev.start >= new Date() && ev.status !== 2)
              .sort((a, b) => a.start - b.start)
              .slice(0, 5)
              .map((ev) => (
                <div
                  key={ev.id}
                  onClick={(e) => handleEventClick(e, ev)}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: ev.leaveType?.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-white truncate">{ev.employee?.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {format(ev.start, "MMM d")}
                      {!isSameDay(ev.start, ev.end) && ` - ${format(ev.end, "MMM d")}`}
                    </div>
                  </div>
                  <StatusBadge status={ev.status} />
                </div>
              ))}
            {allEvents.filter((ev) => ev.start >= new Date() && ev.status !== 2).length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No upcoming leaves</p>
            )}
          </div>
        </div>

        {/* On Leave Today */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            On Leave Today ({onLeaveToday.length})
          </h3>
          <div className="space-y-2">
            {onLeaveToday.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                onClick={(e) => handleEventClick(e, ev)}
              >
                <ProfilePicture src={ev.employee?.profile_picture} className="w-7 h-7" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white truncate">{ev.employee?.name}</div>
                  <div className="text-[10px] text-slate-500">{ev.leaveType?.name}</div>
                </div>
              </div>
            ))}
            {onLeaveToday.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No one is on leave today</p>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            Pending Approvals ({pendingCount})
          </h3>
          <div className="space-y-2">
            {allEvents
              .filter((ev) => ev.status === 0)
              .slice(0, 5)
              .map((ev) => (
                <div
                  key={ev.id}
                  onClick={(e) => handleEventClick(e, ev)}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <ProfilePicture src={ev.employee?.profile_picture} className="w-7 h-7" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-white truncate">{ev.employee?.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {format(ev.start, "MMM d")} - {ev.days} day{ev.days !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <span className="text-[10px] text-yellow-400 font-medium">Review</span>
                </div>
              ))}
            {pendingCount === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No pending approvals</p>
            )}
          </div>
        </div>
      </div>

      {/* Drawer - Event Detail */}
      <DrawerPanel open={drawerOpen} onClose={handleCloseDrawer} title="Leave Details">
        {selectedEvent && (
          <div className="space-y-5">
            {/* Employee Info */}
            <div className="flex items-center gap-3">
              <ProfilePicture src={selectedEvent.employee?.profile_picture} className="w-10 h-10" />
              <div>
                <div className="text-sm font-semibold text-white">{selectedEvent.employee?.name}</div>
                <div className="text-xs text-slate-500">{selectedEvent.employee?.department}</div>
              </div>
            </div>

            {/* Leave Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400">Leave Type</span>
                <span className="text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedEvent.leaveType?.color }} />
                  <span className="text-white">{selectedEvent.leaveType?.name}</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400">Duration</span>
                <span className="text-sm font-medium text-white">
                  {format(selectedEvent.start, "MMM d, yyyy")}
                  {!isSameDay(selectedEvent.start, selectedEvent.end) && ` - ${format(selectedEvent.end, "MMM d, yyyy")}`}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400">Days</span>
                <span className="text-sm font-medium text-white">{selectedEvent.days}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400">Status</span>
                <StatusBadge status={selectedEvent.status} />
              </div>
              {selectedEvent.reason && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400 block mb-1">Reason</span>
                  <p className="text-sm text-white">{selectedEvent.reason}</p>
                </div>
              )}
              {selectedEvent.appliedOn && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Applied On</span>
                  <span className="text-sm text-white">{selectedEvent.appliedOn}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerPanel>
    </div>
  );
}
