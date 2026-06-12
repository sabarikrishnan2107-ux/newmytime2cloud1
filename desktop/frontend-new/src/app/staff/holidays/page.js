"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Globe,
  Search,
} from "lucide-react";

import { api, buildQueryParams } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getStaffUser } from "@/lib/staff-user";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FILTER_CONFIG = {
  all: { label: "All Holidays" },
  assign_leave: { label: "Assign Leave" },
  government: { label: "Government Leave" },
};

function matchesEmployeeRecord(employee, identifiers) {
  const recordValues = [
    employee?.id,
    employee?.employee_id,
    employee?.system_user_id,
    employee?.user_id,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);

  return identifiers.some((identifier) => recordValues.includes(String(identifier)));
}

function parseDateValue(value) {
  if (!value) return null;

  const [year, month, day] = String(value)
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function differenceInDays(fromDate, toDate) {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function formatDateLabel(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate, endDate) {
  if (toDateKey(startDate) === toDateKey(endDate)) {
    return startDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function buildCalendarDays(year, month, holidayMap) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(new Date());
  const cells = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    cells.push({
      key: `prev-${index}`,
      label: String(previousMonthDays - index),
      muted: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);

    cells.push({
      key: dateKey,
      label: String(day),
      isToday: dateKey === todayKey,
      holiday: holidayMap.get(dateKey) || null,
    });
  }

  while (cells.length < 42) {
    const nextLabel = cells.length - (firstDay + daysInMonth) + 1;
    cells.push({
      key: `next-${nextLabel}`,
      label: String(nextLabel),
      muted: true,
    });
  }

  return cells;
}

function getHolidayCategory(item) {
  // Check if it's a government holiday (from API - no branch relationship)
  // vs assigned holiday (has branch relationship)
  if (item.type === 'government' || item.country_code) {
    return "government";
  }
  if (item.branchName || item.branch) {
    return "assign_leave";
  }
  // Default to government if no branch specified
  return "government";
}

function getHolidayTone(holiday) {
  switch (holiday.category) {
    case "assign_leave":
      return {
        badge: "border border-emerald-400/20 bg-emerald-400/15 text-emerald-200",
        dot: "bg-emerald-500",
      };
    case "government":
      return {
        badge: "border border-blue-400/20 bg-blue-400/15 text-blue-200",
        dot: "bg-blue-500",
      };
    default:
      return {
        badge: "border border-sky-400/20 bg-sky-400/15 text-sky-200",
        dot: "bg-sky-500",
      };
  }
}

function HeroStatCard({ title, value, subtitle, icon: Icon, accentClass, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      className="staff-glass-card min-h-[102px] rounded-2xl border border-white/10 p-3.5"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</span>
        <div className={cn("rounded-xl p-1.5", accentClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="font-headline text-[2rem] font-bold tracking-tight text-slate-50">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </motion.div>
  );
}

function HolidayListCard({ holidays, title, emptyMessage, className }) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const resetKey = `${title}-${holidays.map((holiday) => holiday.id).join("|") || "none"}`;

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [resetKey]);

  return (
    <div
      className={cn(
        "staff-glass-card flex flex-col rounded-2xl border border-white/10 p-4 transition-all",
        className,
        collapsed ? "min-h-0 flex-none" : "min-h-[180px]"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-headline text-base font-semibold text-slate-100">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{holidays.length} result{holidays.length === 1 ? "" : "s"}</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed ? (
      <div
        key={resetKey}
        ref={scrollRef}
        data-pdf-scroll-area="true"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 pt-1 [overflow-anchor:none]"
      >
        {holidays.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          holidays.map((holiday) => {
            const tone = getHolidayTone(holiday);

            return (
              <article
                key={holiday.id}
                className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
                      <h4 className="truncate text-sm font-semibold text-slate-100">{holiday.name}</h4>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{formatDateRange(holiday.startDate, holiday.endDate)}</p>
                    {holiday.branchName ? (
                      <p className="mt-1 text-xs text-slate-400">Branch: {holiday.branchName}</p>
                    ) : null}
                  </div>

                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold", tone.badge)}>
                    {holiday.totalDays} day{holiday.totalDays === 1 ? "" : "s"}
                  </span>
                </div>
              </article>
            );
          })
        )}
        </div>
      ) : null}
    </div>
  );
}

function HolidayCalendarCard({ year, month, onMonthChange, holidayMap }) {
  const calendarDays = useMemo(() => buildCalendarDays(year, month, holidayMap), [year, month, holidayMap]);

  const handlePreviousMonth = () => {
    if (month === 0) {
      onMonthChange(11, year - 1);
      return;
    }

    onMonthChange(month - 1, year);
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(0, year + 1);
      return;
    }

    onMonthChange(month + 1, year);
  };

  return (
    <div className="staff-glass-card flex h-full min-h-0 flex-col rounded-[24px] border border-white/10 p-4">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h3 className="font-headline text-lg font-semibold text-slate-100">
            {MONTHS[month]} {year}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">Tap a date to see where holidays fall this month.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid shrink-0 grid-cols-7 gap-2">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-2">
        {calendarDays.map((day) => {
          const holidayTone = day.holiday ? getHolidayTone(day.holiday) : null;

          return (
            <div
              key={day.key}
              title={day.holiday?.name || ""}
              className={cn(
                "relative flex h-full min-h-0 items-center justify-center rounded-2xl border text-sm transition-colors",
                day.muted
                  ? "border-transparent bg-transparent text-slate-600"
                  : "border-white/10 bg-white/[0.04] text-slate-300",
                day.isToday ? "border-cyan-400/30 bg-cyan-400/10 font-semibold text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]" : "",
                day.holiday ? "bg-white/[0.08] font-semibold text-slate-100" : ""
              )}
            >
              {day.label}
              {day.holiday ? (
                <span className={cn("absolute bottom-2 h-1.5 w-1.5 rounded-full", holidayTone?.dot)} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StaffHolidaysPage() {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const pdfContentRef = useRef(null);

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [branchCountry, setBranchCountry] = useState(null);
  const [branchId, setBranchId] = useState(null);

  // Fetch employee's branch to get country information
  useEffect(() => {
    let ignore = false;

    const fetchEmployeeBranch = async () => {
      try {
        const staffUser = await getStaffUser();

        if (!ignore && staffUser?.branch_id) {
          setBranchId(staffUser.branch_id);
          setBranchCountry(staffUser.branch?.country || "AE");
        } else if (!ignore) {
          // No branch assigned - still load default country holidays
          setBranchCountry("AE");
        }
      } catch (error) {
        console.warn("Failed to fetch employee branch", error);
      }
    };

    fetchEmployeeBranch();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const fetchHolidays = async () => {
      setLoading(true);

      try {
        const params = await buildQueryParams({});
        
        // Fetch branch-assigned holidays
        const queryParams = { ...params, per_page: 200, year: selectedYear };
        if (branchId) {
          queryParams.branch_id = branchId;
        }
        
        const { data: holidayData } = await api.get("/holidays", {
          params: queryParams,
        });

        let allHolidays = Array.isArray(holidayData?.data) ? holidayData.data : Array.isArray(holidayData) ? holidayData : [];

        // Fetch government holidays — check for employee-specific custom holidays first
        if (branchCountry) {
          try {
            const countryCode = branchCountry.toUpperCase().trim();
            const staffUser = await getStaffUser();
            const employeeId = staffUser?.employee_id || staffUser?.id;

            let govHolidays = [];
            let hasCustom = false;

            // Try employee-specific government holidays first
            if (employeeId) {
              try {
                const { data: empGovData } = await api.get(`/employee/${employeeId}/government-holidays`, {
                  params: { ...params, country_code: countryCode, year: selectedYear },
                });

                if (empGovData?.success) {
                  hasCustom = empGovData.is_custom === true;
                  if (hasCustom) {
                    // Custom holidays — show only enabled ones
                    govHolidays = (empGovData.data || [])
                      .filter((h) => h.is_enabled)
                      .map((h) => ({
                        ...h,
                        id: h.holiday_id || h.id,
                        type: "government",
                        country_code: countryCode,
                      }));
                  } else {
                    // Default holidays — show all
                    govHolidays = (empGovData.data || []).map((h) => ({
                      ...h,
                      id: h.holiday_id || h.id,
                      type: "government",
                      country_code: countryCode,
                    }));
                  }
                }
              } catch {
                // Fallback to default government holidays below
              }
            }

            // Fallback: fetch default government holidays if no employee data
            if (!hasCustom && govHolidays.length === 0) {
              const { data: govData } = await api.get("/government-holidays", {
                params: { ...params, country_code: countryCode, year: selectedYear },
              });

              if (govData?.success && govData?.data?.length > 0) {
                govHolidays = govData.data;
              }
            }

            if (govHolidays.length > 0) {
              allHolidays = [...allHolidays, ...govHolidays];
            }
          } catch (error) {
            console.error("Failed to fetch government holidays:", error.message);
          }
        }

        setHolidays(allHolidays);
      } catch (error) {
        console.warn("Failed to fetch holidays", error);
        setHolidays([]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch holidays whenever year or branch country changes
    fetchHolidays();
  }, [selectedYear, branchId, branchCountry]);

  useEffect(() => {
    setCalendarYear(selectedYear);
  }, [selectedYear]);

  const normalizedHolidays = useMemo(() => {
    return holidays
      .map((holiday) => {
        const startDate = parseDateValue(holiday.start_date);
        const endDate = parseDateValue(holiday.end_date || holiday.start_date) || startDate;

        if (!startDate) return null;

        const calculatedDays = endDate ? differenceInDays(startDate, endDate) + 1 : 1;
        const totalDays = Number(holiday.total_days) || Math.max(1, calculatedDays);
        const branchName = holiday.branch?.branch_name || "";

        return {
          id: holiday.id || `${holiday.name}-${holiday.start_date}`,
          name: holiday.name || holiday.title || "Holiday",
          startDate,
          endDate: endDate || startDate,
          date: toDateKey(startDate),
          totalDays,
          branchName,
          type: holiday.type, // Include type for government vs branch distinction
          country_code: holiday.country_code, // Include country code
          category: "",
        };
      })
      .filter(Boolean)
      .map((holiday) => ({
        ...holiday,
        category: getHolidayCategory(holiday),
      }))
      .sort((left, right) => left.startDate - right.startDate);
  }, [holidays]);

  const holidayMap = useMemo(() => {
    const map = new Map();

    normalizedHolidays.forEach((holiday) => {
      const cursor = new Date(holiday.startDate);

      while (cursor <= holiday.endDate) {
        const key = toDateKey(cursor);
        if (!map.has(key)) {
          map.set(key, holiday);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [normalizedHolidays]);

  const countsByCategory = useMemo(
    () =>
      normalizedHolidays.reduce(
        (accumulator, holiday) => {
          accumulator[holiday.category] += 1;
          return accumulator;
        },
        { assign_leave: 0, government: 0 }
      ),
    [normalizedHolidays]
  );

  const totalHolidayDays = useMemo(
    () => normalizedHolidays.reduce((sum, holiday) => sum + holiday.totalDays, 0),
    [normalizedHolidays]
  );

  // Calculate only branch-assigned holiday days (assign_leave)
  const assignBranchHolidayDays = useMemo(
    () => normalizedHolidays
      .filter(holiday => holiday.category === 'assign_leave')
      .reduce((sum, holiday) => sum + holiday.totalDays, 0),
    [normalizedHolidays]
  );

  const todayKey = useMemo(() => toDateKey(today), [today]);

  const nextHoliday = useMemo(
    () => normalizedHolidays.find((holiday) => toDateKey(holiday.endDate) >= todayKey) || null,
    [normalizedHolidays, todayKey]
  );

  const daysUntilNext = nextHoliday ? Math.max(0, differenceInDays(today, nextHoliday.startDate)) : null;

  const visibleHolidays = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return normalizedHolidays.filter((holiday) => {
      const matchesFilter = filter === "all" || holiday.category === filter;
      const haystack = `${holiday.name} ${holiday.branchName}`.toLowerCase();
      const matchesSearch = searchValue === "" || haystack.includes(searchValue);

      return matchesFilter && matchesSearch;
    });
  }, [filter, normalizedHolidays, search]);

  const monthStart = new Date(calendarYear, calendarMonth, 1);
  const monthEnd = new Date(calendarYear, calendarMonth + 1, 0);

  const monthHolidays = useMemo(() => {
    return visibleHolidays.filter((holiday) => holiday.startDate <= monthEnd && holiday.endDate >= monthStart);
  }, [monthEnd, monthStart, visibleHolidays]);

  const filterTabs = [
    { key: "all", label: FILTER_CONFIG.all.label, count: normalizedHolidays.length },
    { key: "assign_leave", label: FILTER_CONFIG.assign_leave.label, count: countsByCategory.assign_leave },
    { key: "government", label: FILTER_CONFIG.government.label, count: countsByCategory.government },
  ];

  const yearOptions = Array.from(new Set([currentYear + 1, currentYear, currentYear - 1, currentYear - 2])).sort((a, b) => b - a);

  const handleDownloadPdf = async () => {
    if (!pdfContentRef.current || isDownloadingPdf) return;

    setIsDownloadingPdf(true);

    try {
      const exportNode = pdfContentRef.current;
      const clonedElement = exportNode.cloneNode(true);
      const tempContainer = document.createElement("div");

      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.backgroundColor = "#050b18";
      tempContainer.style.padding = "24px";

      clonedElement.style.width = `${exportNode.offsetWidth}px`;
      clonedElement.style.height = "auto";
      clonedElement.style.maxHeight = "none";
      clonedElement.style.overflow = "visible";
      clonedElement.style.background = "transparent";

      clonedElement.querySelectorAll("[data-pdf-scroll-area='true']").forEach((element) => {
        element.style.maxHeight = "none";
        element.style.height = "auto";
        element.style.overflow = "visible";
      });

      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);

      const html2pdfLib = (await import("html2pdf.js")).default;
      const fileDate = new Date().toISOString().split("T")[0];

      await html2pdfLib()
        .set({
          margin: 8,
          filename: `Staff_Holiday_Calendar_${selectedYear}_${fileDate}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            logging: false,
            backgroundColor: "#050b18",
            allowTaint: true,
            useCORS: true,
          },
          jsPDF: { orientation: "landscape", unit: "mm", format: "a4" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(clonedElement)
        .save();

      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error("Failed to download holiday PDF", error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full p-3 sm:p-4">
        <div className="flex h-full w-full items-center justify-center rounded-[30px] bg-transparent p-6">
          <div className="staff-glass-card rounded-2xl border border-white/10 px-4 py-10 text-center text-sm text-slate-400">
            Loading holidays...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden p-2 sm:p-3">
      <div ref={pdfContentRef} className="flex h-full w-full min-w-0 flex-col rounded-[30px] bg-transparent p-4 sm:p-5">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="staff-glass-card shrink-0 rounded-[28px] border border-white/10 px-6 py-5 text-slate-100 sm:px-7"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-cyan-200">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="font-headline text-3xl font-bold tracking-tight">Holiday Calendar</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Fiscal Year {selectedYear} · {totalHolidayDays} holiday day{totalHolidayDays === 1 ? "" : "s"}
                    {branchCountry && (
                      <span className="ml-2 text-slate-300">
                        · Country: <span className="font-semibold text-white">{branchCountry}</span>
                      </span>
                    )}
                    {nextHoliday ? (
                      <span className="ml-2 text-slate-300">
                        · Next: <span className="font-semibold text-white">{nextHoliday.name}</span>
                        <span className="text-slate-500">
                          {" "}
                          ({daysUntilNext === 0 ? "Today!" : `${daysUntilNext}d`})
                        </span>
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(selectedYear)}
                  onValueChange={(value) => setSelectedYear(Number(value))}
                >
                  <SelectTrigger className="h-10 w-[92px] rounded-xl border-white/10 bg-white/5 font-medium text-slate-100 shadow-none hover:bg-white/10 focus:ring-cyan-400/20 data-[placeholder]:text-slate-400">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl">
                    {yearOptions.map((year) => (
                      <SelectItem
                        key={year}
                        value={String(year)}
                        className="rounded-lg text-slate-200 focus:bg-white/10 focus:text-white"
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingPdf ? "Downloading..." : "Download PDF"}
                </button>
              </div>
            </div>
          </motion.div>

          <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
            <HeroStatCard
              title="Total Holiday Days"
              value={totalHolidayDays}
              subtitle="Combined holiday days this year"
              icon={CalendarDays}
              accentClass="bg-sky-400/15 text-sky-200"
              delay={0.05}
            />
            <HeroStatCard
              title="Your Branch Holiday Days"
              value={assignBranchHolidayDays}
              subtitle="Holiday days assigned to your branch"
              icon={Globe}
              accentClass="bg-cyan-400/15 text-cyan-200"
              delay={0.1}
            />
            <HeroStatCard
              title="Government Leave"
              value={countsByCategory.government}
              subtitle="Government holidays this year"
              icon={Globe}
              accentClass="bg-blue-400/15 text-blue-200"
              delay={0.15}
            />
            <HeroStatCard
              title="Next Holiday"
              value={nextHoliday ? (daysUntilNext === 0 ? "Today!" : `${daysUntilNext}d`) : "—"}
              subtitle={nextHoliday?.name || "No upcoming holiday"}
              icon={Clock}
              accentClass="bg-emerald-400/15 text-emerald-200"
              delay={0.2}
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.25 }}
            className="staff-glass-card shrink-0 rounded-2xl border border-white/10 p-3"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search holidays..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition-shadow placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <div className="hidden h-7 w-px bg-white/10 lg:block" />

              <div className="flex flex-wrap gap-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all",
                      filter === tab.key
                        ? "bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)]"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px]",
                        filter === tab.key ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              className="min-h-0 lg:col-span-3"
            >
              <HolidayCalendarCard
                year={calendarYear}
                month={calendarMonth}
                holidayMap={holidayMap}
                onMonthChange={(month, year) => {
                  setCalendarMonth(month);
                  setCalendarYear(year);
                  setSelectedYear(year);
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.35 }}
              className="flex min-h-0 flex-col gap-3 lg:col-span-2"
            >
              <HolidayListCard
                holidays={monthHolidays}
                title={`${MONTHS[calendarMonth]} Holidays`}
                emptyMessage="No holidays for this month"
                className="min-h-[195px] flex-[0.92]"
              />
              <HolidayListCard
                holidays={visibleHolidays}
                title="All Holidays"
                emptyMessage="No holidays match your search"
                className="min-h-[220px] flex-[1.05]"
              />
              <div className="staff-glass-card shrink-0 rounded-2xl border border-white/10 p-3.5">
                <h3 className="font-headline text-base font-semibold text-slate-100">Summary</h3>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarDays className="h-4 w-4 text-sky-300" />
                      Total holiday days
                    </div>
                    <span className="font-semibold text-slate-100">{totalHolidayDays}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Your branch holiday days
                    </div>
                    <span className="font-semibold text-slate-100">{assignBranchHolidayDays}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      Government leave
                    </div>
                    <span className="font-semibold text-slate-100">{countsByCategory.government}</span>
                  </div>
                  {branchCountry && (
                    <div className="flex items-center justify-between text-sm border-t border-white/10 pt-2.5 mt-2.5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Globe className="h-4 w-4 text-cyan-300" />
                        Branch country
                      </div>
                      <span className="font-semibold text-slate-100">{branchCountry}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      Current year
                    </div>
                    <span className="font-semibold text-slate-100">{selectedYear}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
