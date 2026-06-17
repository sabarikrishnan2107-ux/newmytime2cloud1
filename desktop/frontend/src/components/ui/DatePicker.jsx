"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom"; // 👈 Import this
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import DropDown from "@/components/ui/DropDown";

// ✅ Helpers (Keep your existing ones)
function formatDate(date) {
  if (!(date instanceof Date)) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(input) {
  if (!input) return null;
  if (input instanceof Date)
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const parts = input.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

export default function DatePicker({
  value = null,
  onChange = () => {},
  placeholder = "Pick a date",
  className = "",
  disabled = false,
  maxDate = null,
}) {
  const maxDateNorm = maxDate
    ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    : null;
  const isAfterMax = (d) => maxDateNorm && d > maxDateNorm;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    isAbove: false,
  });

  const containerRef = useRef(null);
  const displayDate = normalizeDate(value);
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // 1. Logic to calculate where the button is on the screen
  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 360; // min-width of calendar popover + padding
      const popoverHeight = 380;

      const overflowBottom = rect.bottom + popoverHeight > window.innerHeight;
      const overflowRight = rect.left + popoverWidth > window.innerWidth;

      // If the popover would overflow off the right edge, right-align it to the trigger
      const left = overflowRight
        ? Math.max(8, rect.right - popoverWidth) + window.scrollX
        : rect.left + window.scrollX;

      setCoords({
        top: overflowBottom
          ? rect.top + window.scrollY - 10
          : rect.bottom + window.scrollY + 10,
        left,
        width: rect.width,
        isAbove: overflowBottom,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords);
      window.addEventListener("resize", updateCoords);
      const initialView =
        displayDate && (!maxDateNorm || displayDate <= maxDateNorm)
          ? displayDate
          : maxDateNorm || new Date();
      setViewDate(initialView);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        // We also check if the click was inside the portal (optional but safer)
        if (!event.target.closest(".datepicker-portal")) {
          setOpen(false);
        }
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Dropdown Data & Grid Logic
  const monthItems = useMemo(
    () =>
      [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ].map((name, idx) => ({ id: idx, name })),
    [],
  );

  const yearGridPage = useMemo(() => {
    const centerYear = viewDate.getFullYear();
    const startYear = centerYear - (centerYear % 10) - 1;
    const all = Array.from({ length: 12 }, (_, i) => startYear + i);
    if (maxDateNorm) {
      return all.filter((y) => y <= maxDateNorm.getFullYear());
    }
    return all;
  }, [viewDate, maxDateNorm]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate));
    const end = endOfWeek(endOfMonth(viewDate));
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const handleDateSelect = (date) => {
    if (isAfterMax(date)) return;
    onChange(formatDate(date));
    setOpen(false);
    setYearPickerOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`h-11 flex items-center justify-between w-full p-5 text-left border rounded-xl shadow-sm bg-white dark:bg-slate-900 transition-all
          ${open ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200 dark:border-white/10"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-300"}
        `}
      >
        <span
          className={
            !displayDate
              ? "text-slate-400"
              : "text-slate-700 dark:text-slate-200"
          }
        >
          {displayDate ? `${String(displayDate.getDate()).padStart(2, "0")}-${String(displayDate.getMonth() + 1).padStart(2, "0")}-${displayDate.getFullYear()}` : placeholder}
        </span>
        <CalendarIcon className="w-5 h-5 text-slate-400" />
      </button>

      {/* ⚡️ THE PORTAL ⚡️ */}
      {open &&
        createPortal(
          <div
            className={`datepicker-portal fixed p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-in fade-in duration-200 ${
              coords.isAbove
                ? "slide-in-from-bottom-2"
                : "zoom-in-95 slide-in-from-top-2"
            }`}
            style={{
              zIndex: 9999,
              // If it's above, we need to translate it up by its own height
              transform: coords.isAbove ? "translateY(-100%)" : "none",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              minWidth: "350px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2 flex-1">
                  <div className="w-32">
                    <DropDown
                      items={monthItems}
                      value={viewDate.getMonth()}
                      onChange={(id) =>
                        setViewDate(new Date(viewDate.setMonth(Number(id))))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setYearPickerOpen(!yearPickerOpen)}
                    className="px-3 h-9 rounded-md border border-border text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {viewDate.getFullYear()}
                    <span className="material-icons ml-1 text-base align-middle">expand_more</span>
                  </button>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      yearPickerOpen
                        ? setViewDate(new Date(viewDate.getFullYear() - 10, viewDate.getMonth(), 1))
                        : setViewDate(subMonths(viewDate, 1))
                    }
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    disabled={
                      maxDateNorm &&
                      (yearPickerOpen
                        ? viewDate.getFullYear() + 10 > maxDateNorm.getFullYear()
                        : viewDate.getFullYear() > maxDateNorm.getFullYear() ||
                          (viewDate.getFullYear() === maxDateNorm.getFullYear() &&
                            viewDate.getMonth() >= maxDateNorm.getMonth()))
                    }
                    onClick={() =>
                      yearPickerOpen
                        ? setViewDate(new Date(viewDate.getFullYear() + 10, viewDate.getMonth(), 1))
                        : setViewDate(addMonths(viewDate, 1))
                    }
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {yearPickerOpen ? (
                <div className="grid grid-cols-4 gap-2">
                  {yearGridPage.map((year) => {
                    const isSelected = year === viewDate.getFullYear();
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          const month =
                            maxDateNorm && year === maxDateNorm.getFullYear() && viewDate.getMonth() > maxDateNorm.getMonth()
                              ? maxDateNorm.getMonth()
                              : viewDate.getMonth();
                          setViewDate(new Date(year, month, 1));
                          setYearPickerOpen(false);
                        }}
                        className={`h-10 rounded-xl text-sm font-medium transition-all
                          ${isSelected ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"}
                        `}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/5 pb-2 text-center text-[10px] font-bold text-slate-400 uppercase">
                    {daysOfWeek.map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, idx) => {
                      const isSelected = displayDate && isSameDay(day, displayDate);
                      const isCurrentMonth = isSameMonth(day, viewDate);
                      const isDisabled = isAfterMax(day);
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleDateSelect(day)}
                          className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all
                            ${!isCurrentMonth ? "text-slate-300 dark:text-slate-700 opacity-30" : "text-slate-600 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"}
                            ${isSelected ? "!bg-blue-600 !text-white" : ""}
                            ${isDisabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""}
                          `}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body, // 👈 Teleports to the end of the body
        )}
    </div>
  );
}
