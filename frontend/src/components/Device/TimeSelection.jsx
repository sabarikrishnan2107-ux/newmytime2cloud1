"use client";

import React, { useState, useMemo } from "react";
import { X, Calendar, Settings } from "lucide-react";
import { notify } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// 48 half-hour slots — 00:00, 00:30, 01:00 ... 23:30
const SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const fmtToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TimeSelectionModal = ({ open, onClose, device, onUpdate = () => {} }) => {
  const today = fmtToday();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  // selected[dayIndex] = Set of slot indices
  const [selected, setSelected] = useState(() => DAYS.map(() => new Set()));
  const [dragMode, setDragMode] = useState(null); // 'add' | 'remove' | null
  const [rangePickerDay, setRangePickerDay] = useState(null); // day index for the hour-range picker
  const [rangeFrom, setRangeFrom] = useState(0);
  const [rangeTo, setRangeTo] = useState(23);

  const totalSlotsSelected = useMemo(() => selected.reduce((s, x) => s + x.size, 0), [selected]);

  if (!open) return null;

  const toggle = (dayIdx, slotIdx, mode) => {
    setSelected((prev) => {
      const next = prev.map((s) => new Set(s));
      const set = next[dayIdx];
      if (mode === "add") set.add(slotIdx);
      else if (mode === "remove") set.delete(slotIdx);
      else set.has(slotIdx) ? set.delete(slotIdx) : set.add(slotIdx);
      return next;
    });
  };

  const handleMouseDown = (dayIdx, slotIdx) => {
    const isSelected = selected[dayIdx].has(slotIdx);
    const mode = isSelected ? "remove" : "add";
    setDragMode(mode);
    toggle(dayIdx, slotIdx, mode);
  };

  const handleMouseEnter = (dayIdx, slotIdx) => {
    if (!dragMode) return;
    toggle(dayIdx, slotIdx, dragMode);
  };

  const handleMouseUp = () => setDragMode(null);

  const openRangePicker = (dayIdx) => {
    setRangePickerDay(dayIdx);
    setRangeFrom(0);
    setRangeTo(23);
  };

  const applyRange = () => {
    if (rangePickerDay === null) return;
    const from = Math.min(rangeFrom, rangeTo);
    const to = Math.max(rangeFrom, rangeTo);
    setSelected((prev) => {
      const next = prev.map((s) => new Set(s));
      const day = next[rangePickerDay];
      // Slot i covers half-hour at hour=floor(i/2). Include slots whose hour is between from and to (inclusive).
      for (let i = 0; i < SLOTS.length; i++) {
        const h = Math.floor(i / 2);
        if (h >= from && h <= to) day.add(i);
      }
      return next;
    });
    setRangePickerDay(null);
  };

  const clearDay = () => {
    if (rangePickerDay === null) return;
    setSelected((prev) => {
      const next = prev.map((s) => new Set(s));
      next[rangePickerDay].clear();
      return next;
    });
    setRangePickerDay(null);
  };

  const handleUpdate = () => {
    // Build a serializable schedule: per day, a list of { from, to } merged ranges
    const schedule = selected.map((daySet, dayIdx) => {
      const slots = [...daySet].sort((a, b) => a - b);
      const ranges = [];
      let curStart = null;
      let curEnd = null;
      for (const s of slots) {
        if (curStart === null) {
          curStart = s; curEnd = s;
        } else if (s === curEnd + 1) {
          curEnd = s;
        } else {
          ranges.push({ from: SLOTS[curStart], to: SLOTS[Math.min(curEnd + 1, 47)] || "23:30" });
          curStart = s; curEnd = s;
        }
      }
      if (curStart !== null) {
        ranges.push({ from: SLOTS[curStart], to: SLOTS[Math.min(curEnd + 1, 47)] || "23:30" });
      }
      return { day: DAYS[dayIdx], ranges };
    });

    onUpdate({
      device_id: device?.device_id,
      from_date: fromDate,
      to_date: toDate,
      schedule,
      total_slots: totalSlotsSelected,
    });
    notify("Always Open", `Saved ${totalSlotsSelected} time slot${totalSlotsSelected === 1 ? "" : "s"}.`, "success");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4"
      onClick={onClose}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="relative w-full max-w-[1200px] max-h-[90vh] overflow-hidden rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3 bg-violet-600 text-white flex items-center justify-between">
          <h2 className="text-base font-bold">Time Selection {device?.name ? `· ${device.name}` : ""}</h2>
          <button
            onClick={onClose}
            className="size-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {/* Top bar: counts + date range */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{totalSlotsSelected}</span> slot{totalSlotsSelected === 1 ? "" : "s"} selected
              {totalSlotsSelected > 0 && <span className="text-slate-500"> · {Math.round(totalSlotsSelected * 0.5 * 10) / 10}h total</span>}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-white dark:bg-slate-800">
              <Calendar size={14} className="text-slate-500" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              />
              <span className="text-slate-500">~</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Time grid */}
          <div className="overflow-x-auto select-none border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10 p-2 border-r border-slate-200 dark:border-slate-700 min-w-[110px]"></th>
                  {SLOTS.map((s, i) => (
                    <th
                      key={s}
                      className={`text-[9px] font-semibold p-1 ${i % 2 === 0 ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}
                    >
                      {s}
                    </th>
                  ))}
                  <th className="sticky right-0 bg-slate-50 dark:bg-slate-800/60 z-10 p-2 border-l border-slate-200 dark:border-slate-700 min-w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dIdx) => (
                  <tr key={day} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 p-2 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                      {day}
                    </td>
                    {SLOTS.map((_, sIdx) => {
                      const sel = selected[dIdx].has(sIdx);
                      return (
                        <td
                          key={sIdx}
                          onMouseDown={() => handleMouseDown(dIdx, sIdx)}
                          onMouseEnter={() => handleMouseEnter(dIdx, sIdx)}
                          className={`p-0 h-6 cursor-pointer transition-colors border-l border-slate-100 dark:border-slate-800 ${
                            sel
                              ? "bg-violet-500 hover:bg-violet-600"
                              : "bg-slate-100 dark:bg-slate-800/40 hover:bg-violet-200 dark:hover:bg-violet-500/30"
                          }`}
                          title={`${day} ${SLOTS[sIdx]}`}
                        />
                      );
                    })}
                    <td className="sticky right-0 bg-white dark:bg-slate-900 z-10 p-2 border-l border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => openRangePicker(dIdx)}
                        title="Set hour range"
                        className="size-7 rounded-full bg-orange-500/15 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center transition"
                      >
                        <Settings size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 bg-slate-50/60 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 transition"
          >
            Update
          </button>
        </div>

        {/* Hour Range sub-modal */}
        {rangePickerDay !== null && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"
            onClick={() => setRangePickerDay(null)}
          >
            <div
              className="w-[420px] max-w-[92vw] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3 bg-violet-600 text-white flex items-center justify-between">
                <h3 className="text-sm font-bold">Select Hour Range · {DAYS[rangePickerDay]}</h3>
                <button
                  onClick={() => setRangePickerDay(null)}
                  className="size-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">From</label>
                  <select
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">To</label>
                  <select
                    value={rangeTo}
                    onChange={(e) => setRangeTo(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:59</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-5 pb-4 text-[11px] text-slate-500 dark:text-slate-400">
                Selecting <span className="font-bold text-slate-700 dark:text-slate-200">{String(Math.min(rangeFrom, rangeTo)).padStart(2, "0")}:00 – {String(Math.max(rangeFrom, rangeTo)).padStart(2, "0")}:59</span> ·
                <span className="ml-1">{(Math.max(rangeFrom, rangeTo) - Math.min(rangeFrom, rangeTo) + 1)} hour{(Math.max(rangeFrom, rangeTo) - Math.min(rangeFrom, rangeTo) + 1) === 1 ? "" : "s"}</span>
              </div>
              <div className="px-5 pb-5 flex justify-between gap-2">
                <button
                  onClick={clearDay}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  Clear day
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRangePickerDay(null)}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyRange}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSelectionModal;
