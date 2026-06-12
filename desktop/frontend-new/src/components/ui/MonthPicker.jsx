"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthPicker({ value, onChange, placeholder = "Select month" }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const parsed = (() => {
    if (!value || !/^\d{4}-\d{2}/.test(value)) return null;
    const [y, m] = value.split("-").map(Number);
    return { year: y, month: m - 1 };
  })();

  useEffect(() => {
    if (parsed) setViewYear(parsed.year);
  }, [value]);

  const handleSelect = (monthIdx) => {
    const mm = String(monthIdx + 1).padStart(2, "0");
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  };

  const display = parsed
    ? `${MONTH_FULL[parsed.month]} ${parsed.year}`
    : placeholder;

  const isCurrent = (monthIdx) =>
    today.getFullYear() === viewYear && today.getMonth() === monthIdx;
  const isSelected = (monthIdx) =>
    parsed && parsed.year === viewYear && parsed.month === monthIdx;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm hover:border-gray-400 dark:hover:border-white/20 transition cursor-pointer"
        >
          <span className={parsed ? "font-medium text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}>
            {display}
          </span>
          <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl rounded-xl overflow-hidden" align="start">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={() => setViewYear(y => y - 1)}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition"
            title="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{viewYear}</span>
          <button
            type="button"
            onClick={() => setViewYear(y => y + 1)}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition"
            title="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-3">
          {MONTHS.map((m, idx) => {
            const selected = isSelected(idx);
            const current = isCurrent(idx);
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelect(idx)}
                className={[
                  "py-2.5 rounded-lg text-sm font-medium transition relative",
                  selected
                    ? "bg-primary text-white shadow-sm"
                    : current
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5",
                ].join(" ")}
              >
                {m}
                {current && !selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500"></span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/30">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="text-xs font-medium text-gray-500 hover:text-red-500 transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const mm = String(today.getMonth() + 1).padStart(2, "0");
              onChange(`${today.getFullYear()}-${mm}`);
              setViewYear(today.getFullYear());
              setOpen(false);
            }}
            className="text-xs font-medium text-primary hover:text-blue-600 transition"
          >
            This Month
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
