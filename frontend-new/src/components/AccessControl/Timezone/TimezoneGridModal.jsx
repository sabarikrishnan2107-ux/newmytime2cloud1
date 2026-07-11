"use client";
import React, { useState, useMemo, useEffect } from "react";
import { X, Settings } from "lucide-react";
import { notify } from "@/lib/utils";
import { DAY_LABELS, SLOT_LABELS, buildTimezonePayload, rawDataToSlots } from "@/lib/timezoneSlots";

// End-time label for a half-hour boundary b (1..48): 1 → "00:30" … 48 → "24:00".
const halfHourEnd = (b) => {
  const t = b * 30;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${t % 60 === 0 ? "00" : "30"}`;
};

// Human duration from a count of 30-min cells: 4 → "2h", 3 → "1h 30m", 1 → "30m".
const fmtDur = (cells) => {
  const m = cells * 30;
  const h = Math.floor(m / 60), mm = m % 60;
  if (h && mm) return `${h}h ${mm}m`;
  if (h) return `${h}h`;
  return `${mm}m`;
};

// Merge a day's blocks into "HH:MM–HH:MM" windows (block i spans SLOT_LABELS[i] → halfHourEnd(i+1)).
const dayWindows = (set) => {
  const idx = [...set].sort((a, b) => a - b);
  if (!idx.length) return [];
  const out = [];
  let start = idx[0], prev = idx[0];
  for (let k = 1; k < idx.length; k++) {
    if (idx[k] === prev + 1) { prev = idx[k]; continue; }
    out.push(`${SLOT_LABELS[start]}–${halfHourEnd(prev + 1)}`);
    start = idx[k]; prev = idx[k];
  }
  out.push(`${SLOT_LABELS[start]}–${halfHourEnd(prev + 1)}`);
  return out;
};

export default function TimezoneGridModal({ open, onClose, initial = null, onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(() => DAY_LABELS.map(() => new Set()));
  const [saving, setSaving] = useState(false);

  // Time-window popup. Times are set here ONLY — the grid is display-only.
  //   rangeFrom = START half-hour, slot index 0..47   (00:00 … 23:30)
  //   rangeTo   = END half-hour boundary 1..48         (00:30 … 24:00) — the exact end time,
  //   so "To 17:00" ends the window at 17:00 (no extra 30 min).
  const [rangeDay, setRangeDay] = useState(null);
  const [rangeFrom, setRangeFrom] = useState(18); // 09:00
  const [rangeTo, setRangeTo] = useState(34);     // 17:00
  const [rangeDaysSel, setRangeDaysSel] = useState(() => new Set([0, 1, 2, 3, 4, 5, 6]));

  useEffect(() => {
    if (!open) return;
    setName(initial?.timezone_name || "");
    setDescription(initial?.description || "");
    setSelected(initial?.intervals_raw_data ? rawDataToSlots(initial.intervals_raw_data) : DAY_LABELS.map(() => new Set()));
  }, [open, initial]);

  const total = useMemo(() => selected.reduce((s, x) => s + x.size, 0), [selected]);

  const rStart = Math.min(rangeFrom, rangeTo);
  const rEndBoundary = Math.max(rangeFrom, rangeTo, rStart + 1);
  const allRangeDays = rangeDaysSel.size === 7;

  if (!open) return null;

  // Opening the popup pre-fills From/To from the day's current window (if any) and defaults
  // to applying on all days (the common case: one window for the whole week).
  const openRange = (d) => {
    setRangeDay(d);
    const idx = [...selected[d]].sort((a, b) => a - b);
    if (idx.length) { setRangeFrom(idx[0]); setRangeTo(idx[idx.length - 1] + 1); }
    else { setRangeFrom(18); setRangeTo(34); }
    setRangeDaysSel(new Set([0, 1, 2, 3, 4, 5, 6]));
  };

  const toggleRangeDay = (d) =>
    setRangeDaysSel((prev) => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });
  const toggleAllRangeDays = () =>
    setRangeDaysSel(allRangeDays ? new Set() : new Set([0, 1, 2, 3, 4, 5, 6]));

  const applyRange = () => {
    if (rangeDay === null) return;
    // One window per day → replace. Blocks [start, end): the block starting at `end` is
    // excluded, so "To 17:00" ends the window exactly at 17:00.
    let start = Math.min(rangeFrom, rangeTo);
    let end = Math.max(rangeFrom, rangeTo);
    if (end <= start) end = start + 1;
    const days = rangeDaysSel.size ? [...rangeDaysSel] : [rangeDay];
    setSelected((prev) => {
      const next = prev.map((x) => new Set(x));
      for (const day of days) {
        next[day].clear();
        for (let i = start; i < end; i++) next[day].add(i);
      }
      return next;
    });
    setRangeDay(null);
  };

  const clearDay = () => {
    if (rangeDay === null) return;
    const days = rangeDaysSel.size ? [...rangeDaysSel] : [rangeDay];
    setSelected((prev) => { const next = prev.map((x) => new Set(x)); for (const day of days) next[day].clear(); return next; });
    setRangeDay(null);
  };

  const submit = async () => {
    if (name.trim().length < 4) { notify("Validation", "Timezone name must be at least 4 characters.", "error"); return; }
    if (total === 0) { notify("Validation", "Set a time window for at least one day.", "error"); return; }
    setSaving(true);
    try {
      await onSubmit({ timezone_name: name.trim(), description: description.trim(), ...buildTimezonePayload(selected) });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 px-4 pb-4 pt-20 overflow-auto">
      <div className="relative w-full max-w-[1400px] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-t-xl">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Timezone</h2>
          <button onClick={onClose} className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Timezone Name"
                   className="flex-1 min-w-[200px] border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Timezone Description"
                   className="flex-1 min-w-[200px] border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
            <button onClick={submit} disabled={saving}
                    className="px-5 py-2 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50">
              {saving ? "Saving…" : "Submit"}
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex flex-wrap items-center gap-x-2">
            <span>Set each day's access window with the</span>
            <span className="inline-flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400"><Settings size={12} /> gear</span>
            <span>— the grid below just shows what you set.</span>
            {total > 0 && <span className="text-slate-400">· {fmtDur(total)} total</span>}
          </div>

          {/* What's set — read-only chips of each day's window. */}
          {total > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DAY_LABELS.map((day, d) =>
                selected[d].size > 0 ? (
                  <span key={d} className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-0.5 text-[11px] font-medium">
                    <span className="font-bold">{day.slice(0, 3)}</span>
                    <span className="tabular-nums">{dayWindows(selected[d]).join(", ")}</span>
                  </span>
                ) : null
              )}
            </div>
          )}

          {/* Display-only grid — shows the window you set; cells are not clickable. */}
          <div className="overflow-x-auto select-none border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10 p-2 border-r border-slate-200 dark:border-slate-700 min-w-[110px]"></th>
                  {SLOT_LABELS.map((s, i) => (
                    <th key={s} className={`text-[9px] font-semibold p-1 ${i % 2 === 0 ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>{s}</th>
                  ))}
                  <th className="sticky right-0 bg-slate-50 dark:bg-slate-800/60 z-10 p-2 border-l border-slate-200 dark:border-slate-700 min-w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {DAY_LABELS.map((day, d) => (
                  <tr key={day} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 p-2 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">{day}</td>
                    {SLOT_LABELS.map((_, s) => {
                      const sel = selected[d].has(s);
                      return (
                        <td key={s}
                            className={`p-0 h-6 border-l border-slate-100 dark:border-slate-800 ${sel ? "bg-violet-500" : "bg-slate-100 dark:bg-slate-800/40"}`}
                            title={`${day} ${SLOT_LABELS[s]}`} />
                      );
                    })}
                    <td className="sticky right-0 bg-white dark:bg-slate-900 z-10 p-2 border-l border-slate-200 dark:border-slate-700">
                      <button onClick={() => openRange(d)} title="Set time window"
                              className="size-7 rounded-full bg-orange-500/15 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center transition"><Settings size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Set Time Window popup — the ONLY place times are set. */}
        {rangeDay !== null && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => setRangeDay(null)}>
            <div className="w-[440px] max-w-[92vw] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Set Time Window</h3>
                <button onClick={() => setRangeDay(null)} className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={14} /></button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">From (start)</label>
                  <select value={rangeFrom} onChange={(e) => setRangeFrom(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                    {SLOT_LABELS.map((s, i) => <option key={i} value={i}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">To (end)</label>
                  <select value={rangeTo} onChange={(e) => setRangeTo(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                    {Array.from({ length: 48 }, (_, j) => j + 1).map((b) => <option key={b} value={b}>{halfHourEnd(b)}</option>)}
                  </select>
                </div>
              </div>

              {/* Apply to which days — defaults to all 7 (untick to target only some). */}
              <div className="px-5 pb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">Apply to</label>
                <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
                  <input type="checkbox" checked={allRangeDays} onChange={toggleAllRangeDays} className="size-4 accent-violet-600" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">All days</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((day, d) => {
                    const on = rangeDaysSel.has(d);
                    return (
                      <button key={d} type="button" onClick={() => toggleRangeDay(d)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors border ${on
                          ? "bg-violet-500/15 border-violet-400/40 text-violet-700 dark:text-violet-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 pb-4 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
                Window: <span className="font-bold text-slate-700 dark:text-slate-200">{SLOT_LABELS[rStart]} – {halfHourEnd(rEndBoundary)}</span>
                <span className="ml-1">· {fmtDur(rEndBoundary - rStart)} · {rangeDaysSel.size || 1} day{(rangeDaysSel.size || 1) === 1 ? "" : "s"}</span>
              </div>
              <div className="px-5 pb-5 flex justify-between gap-2">
                <button onClick={clearDay} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition">Clear</button>
                <div className="flex gap-2">
                  <button onClick={() => setRangeDay(null)} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition">Cancel</button>
                  <button onClick={applyRange} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 transition">Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
