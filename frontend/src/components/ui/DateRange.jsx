"use client";

import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, Check, X, ChevronLeft, ChevronRight } from "lucide-react";

import { cn, formatDateLocal, parseDateLocal } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useMemo, useState } from "react";
import DropDown from "@/components/ui/DropDown";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function RangeMonth({ month, onChange, draftDate, onSelect, showOutsideDays }) {
  const [view, setView] = useState("calendar"); // "calendar" | "year" | "month"
  const [yearPage, setYearPage] = useState(month.getFullYear());

  const yearGrid = useMemo(() => {
    const start = yearPage - 6;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [yearPage]);

  return (
    <div className="w-[280px]">
      <div className="flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onClick={() => {
            if (view === "calendar") onChange(subMonths(month, 1));
            else if (view === "year") setYearPage(yearPage - 12);
          }}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (view === "calendar") {
              setYearPage(month.getFullYear());
              setView("year");
            } else if (view === "year" || view === "month") {
              setView("calendar");
            }
          }}
          className="px-3 h-8 rounded-md text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {view === "calendar" && format(month, "LLLL yyyy")}
          {view === "year" && `${yearGrid[0]} – ${yearGrid[yearGrid.length - 1]}`}
          {view === "month" && month.getFullYear()}
        </button>
        <button
          type="button"
          onClick={() => {
            if (view === "calendar") onChange(addMonths(month, 1));
            else if (view === "year") setYearPage(yearPage + 12);
          }}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {view === "calendar" && (
        <Calendar
          mode="range"
          month={month}
          onMonthChange={onChange}
          selected={
            draftDate?.from || draftDate?.to
              ? { from: draftDate.from || undefined, to: draftDate.to || undefined }
              : undefined
          }
          onSelect={onSelect}
          numberOfMonths={1}
          showOutsideDays={showOutsideDays}
          classNames={{ month_caption: "hidden", nav: "hidden" }}
        />
      )}

      {view === "year" && (
        <div className="grid grid-cols-3 gap-2 p-3">
          {yearGrid.map((y) => {
            const sel = y === month.getFullYear();
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onChange(new Date(y, month.getMonth(), 1));
                  setView("month");
                }}
                className={cn(
                  "h-10 rounded-lg text-sm font-medium transition-colors",
                  sel
                    ? "bg-primary text-white"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <div className="grid grid-cols-3 gap-2 p-3">
          {MONTH_LABELS.map((m, i) => {
            const sel = i === month.getMonth();
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(new Date(month.getFullYear(), i, 1));
                  setView("calendar");
                }}
                className={cn(
                  "h-10 rounded-lg text-sm font-medium transition-colors",
                  sel
                    ? "bg-primary text-white"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const monthItems = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((name, idx) => ({ id: idx, name }));

export default function DateRangeSelect({
  value,
  className,
  onChange = () => {},
  numberOfMonths = 2,
  showOutsideDays = false,
  single = false,
}) {
  const [date, setDate] = useState({ from: null, to: null });
  const [draftDate, setDraftDate] = useState(date);
  // The first-clicked day of an in-progress range selection. Kept SEPARATE from
  // draftDate so background re-renders (e.g. live WebSocket/MQTT updates) that
  // re-sync draftDate from `value` can't wipe the in-progress anchor and cause
  // the 2nd click to be misread as a 1st click.
  const [anchor, setAnchor] = useState(null);
  const [open, setOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [leftMonth, setLeftMonth] = useState(startOfMonth(new Date()));
  const [rightMonth, setRightMonth] = useState(addMonths(startOfMonth(new Date()), 1));

  const yearGridPage = useMemo(() => {
    const centerYear = viewMonth.getFullYear();
    const startYear = centerYear - (centerYear % 10) - 1;
    return Array.from({ length: 12 }, (_, i) => startYear + i);
  }, [viewMonth]);

  useEffect(() => {
    if (value?.from || value?.to) {
      const newRange = {
        from: value.from ? parseDateLocal(value.from) : null,
        to: value.to ? parseDateLocal(value.to) : null,
      };
      setDate(newRange);
      // Only mirror the committed value into the draft when the picker is
      // CLOSED. While it's open the user may be mid-selection (anchor set,
      // waiting for the 2nd click); re-syncing here would clobber that.
      if (!open) setDraftDate(newRange);
    }
    // `value` is often a fresh object literal each parent render, so depend on
    // the actual date strings — not the object identity — to avoid needless runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.from, value?.to, open]);

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (newOpen) {
      // Fresh selection session — start with no anchor so the first click
      // always sets the anchor, regardless of any pre-seeded committed range.
      setAnchor(null);
      setDraftDate(date);
    } else {
      setAnchor(null);
      setDraftDate(date);
      setYearPickerOpen(false);
    }
  };

  const commitRange = (range) => {
    setDate(range);
    setOpen(false);
    setYearPickerOpen(false);
    onChange({
      from: formatDateLocal(range.from),
      to: formatDateLocal(range.to),
    });
  };

  // Drive the two-click range selection ourselves off the clicked day
  // (react-day-picker v9 passes it as the 2nd onSelect arg) and an explicit
  // `anchor` state. This stays deterministic regardless of any pre-seeded
  // committed range or background re-render: first click sets the anchor and
  // keeps the popover open, second click completes the range and closes it.
  const handleRangeSelect = (range, selectedDay) => {
    const clicked = selectedDay || range?.to || range?.from;
    if (!clicked) return;

    if (!anchor) {
      // First click — set the anchor, stay open, wait for the second date.
      setAnchor(clicked);
      setDraftDate({ from: clicked, to: null });
      return;
    }

    // Second click — complete the range (ordering the two dates) and close.
    const finalRange =
      clicked.getTime() < anchor.getTime()
        ? { from: clicked, to: anchor }
        : { from: anchor, to: clicked };
    setAnchor(null);
    setDraftDate(finalRange);
    commitRange(finalRange);
  };

  const handleSingleSelect = (d) => {
    const range = { from: d || null, to: d || null };
    setAnchor(null);
    setDraftDate(range);
    if (d) commitRange(range);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal border border-border text-gray-600 dark:text-slate-300",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {single ? (
              date?.from ? (
                format(date.from, "LLL dd, y")
              ) : (
                <span>Pick a date</span>
              )
            ) : date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/20"
          align="start"
          side="bottom"
        >
          {/* Header with month/year controls — single mode only (range mode uses per-calendar nav) */}
          {single && (
            <div className="flex items-center justify-between gap-2 p-3 pb-0">
              <div className="flex gap-2 items-center">
                <div className="w-28">
                  <DropDown
                    items={monthItems}
                    value={viewMonth.getMonth()}
                    onChange={(id) => setViewMonth(new Date(viewMonth.getFullYear(), Number(id), 1))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setYearPickerOpen(!yearPickerOpen)}
                  className="px-3 h-9 rounded-md border border-border text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {viewMonth.getFullYear()}
                  <span className="material-icons ml-1 text-base align-middle">expand_more</span>
                </button>
              </div>
            </div>
          )}

          {yearPickerOpen ? (
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {yearGridPage.map((year) => {
                  const isSelected = year === viewMonth.getFullYear();
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setViewMonth(new Date(year, viewMonth.getMonth(), 1));
                        setLeftMonth(new Date(year, viewMonth.getMonth(), 1));
                        setRightMonth(addMonths(new Date(year, viewMonth.getMonth(), 1), 1));
                        setYearPickerOpen(false);
                      }}
                      className={cn(
                        "h-10 rounded-xl text-sm font-medium transition-all",
                        isSelected
                          ? "bg-primary text-white"
                          : "text-slate-600 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      )}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            single ? (
              <Calendar
                initialFocus
                mode="single"
                month={viewMonth}
                onMonthChange={setViewMonth}
                selected={draftDate?.from || undefined}
                onSelect={handleSingleSelect}
                numberOfMonths={numberOfMonths}
                showOutsideDays={showOutsideDays}
                classNames={{ month_caption: "hidden", nav: "hidden" }}
              />
            ) : (
              <div className="flex flex-col sm:flex-row p-2 sm:p-3 sm:divide-x divide-y sm:divide-y-0 divide-slate-200 dark:divide-white/10">
                <div className={numberOfMonths > 1 ? "sm:pr-4" : ""}>
                  <RangeMonth
                    month={leftMonth}
                    onChange={setLeftMonth}
                    draftDate={draftDate}
                    onSelect={handleRangeSelect}
                    showOutsideDays={showOutsideDays}
                  />
                </div>
                {numberOfMonths > 1 && (
                  <div className="sm:pl-4 pt-3 sm:pt-0">
                    <RangeMonth
                      month={rightMonth}
                      onChange={setRightMonth}
                      draftDate={draftDate}
                      onSelect={handleRangeSelect}
                      showOutsideDays={showOutsideDays}
                    />
                  </div>
                )}
              </div>
            )
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
