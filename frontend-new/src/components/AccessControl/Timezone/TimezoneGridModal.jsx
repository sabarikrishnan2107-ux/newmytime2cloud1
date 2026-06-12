"use client";
import React, { useState, useMemo, useEffect } from "react";
import { X, Settings } from "lucide-react";
import { notify } from "@/lib/utils";
import { DAY_LABELS, SLOT_LABELS, buildTimezonePayload, rawDataToSlots } from "@/lib/timezoneSlots";

export default function TimezoneGridModal({ open, onClose, initial = null, onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(() => DAY_LABELS.map(() => new Set()));
  const [dragMode, setDragMode] = useState(null); // 'add' | 'remove' | null
  const [saving, setSaving] = useState(false);

  // Per-day hour-range sub-modal
  const [rangeDay, setRangeDay] = useState(null);
  const [rangeFrom, setRangeFrom] = useState(9);
  const [rangeTo, setRangeTo] = useState(17);

  useEffect(() => {
    if (!open) return;
    setName(initial?.timezone_name || "");
    setDescription(initial?.description || "");
    setSelected(initial?.intervals_raw_data ? rawDataToSlots(initial.intervals_raw_data) : DAY_LABELS.map(() => new Set()));
  }, [open, initial]);

  const total = useMemo(() => selected.reduce((s, x) => s + x.size, 0), [selected]);
  if (!open) return null;

  const toggle = (d, s, mode) => setSelected((prev) => {
    const next = prev.map((x) => new Set(x));
    const set = next[d];
    if (mode === "add") set.add(s); else if (mode === "remove") set.delete(s); else set.has(s) ? set.delete(s) : set.add(s);
    return next;
  });

  const openRange = (d) => { setRangeDay(d); setRangeFrom(9); setRangeTo(17); };

  const applyRange = () => {
    if (rangeDay === null) return;
    const from = Math.min(rangeFrom, rangeTo);
    const to = Math.max(rangeFrom, rangeTo);
    setSelected((prev) => {
      const next = prev.map((x) => new Set(x));
      for (let i = 0; i < 48; i++) { const h = Math.floor(i / 2); if (h >= from && h <= to) next[rangeDay].add(i); }
      return next;
    });
    setRangeDay(null);
  };

  const clearDay = () => {
    if (rangeDay === null) return;
    setSelected((prev) => { const next = prev.map((x) => new Set(x)); next[rangeDay].clear(); return next; });
    setRangeDay(null);
  };

  const submit = async () => {
    if (name.trim().length < 4) { notify("Validation", "Timezone name must be at least 4 characters.", "error"); return; }
    if (total === 0) { notify("Validation", "Select at least one time slot.", "error"); return; }
    setSaving(true);
    try {
      await onSubmit({ timezone_name: name.trim(), description: description.trim(), ...buildTimezonePayload(selected) });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 px-4 pb-4 pt-20 overflow-auto"
         onMouseUp={() => setDragMode(null)} onMouseLeave={() => setDragMode(null)}>
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

          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold">{total}</span> slot{total === 1 ? "" : "s"} selected
            {total > 0 && <span> · {Math.round(total * 0.5 * 10) / 10}h total</span>}
          </div>

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
                            onMouseDown={() => { const m = sel ? "remove" : "add"; setDragMode(m); toggle(d, s, m); }}
                            onMouseEnter={() => { if (dragMode) toggle(d, s, dragMode); }}
                            className={`p-0 h-6 cursor-pointer transition-colors border-l border-slate-100 dark:border-slate-800 ${sel ? "bg-violet-500 hover:bg-violet-600" : "bg-slate-100 dark:bg-slate-800/40 hover:bg-violet-200 dark:hover:bg-violet-500/30"}`}
                            title={`${day} ${SLOT_LABELS[s]}`} />
                      );
                    })}
                    <td className="sticky right-0 bg-white dark:bg-slate-900 z-10 p-2 border-l border-slate-200 dark:border-slate-700">
                      <button onClick={() => openRange(d)} title="Set hour range"
                              className="size-7 rounded-full bg-orange-500/15 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center transition"><Settings size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hour Range sub-modal */}
        {rangeDay !== null && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => setRangeDay(null)}>
            <div className="w-[420px] max-w-[92vw] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Select Hour Range · {DAY_LABELS[rangeDay]}</h3>
                <button onClick={() => setRangeDay(null)} className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={14} /></button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">From</label>
                  <select value={rangeFrom} onChange={(e) => setRangeFrom(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">To</label>
                  <select value={rangeTo} onChange={(e) => setRangeTo(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:59</option>)}
                  </select>
                </div>
              </div>
              <div className="px-5 pb-4 text-[11px] text-slate-500 dark:text-slate-400">
                Selecting <span className="font-bold text-slate-700 dark:text-slate-200">{String(Math.min(rangeFrom, rangeTo)).padStart(2, "0")}:00 – {String(Math.max(rangeFrom, rangeTo)).padStart(2, "0")}:59</span>
                <span className="ml-1">· {Math.max(rangeFrom, rangeTo) - Math.min(rangeFrom, rangeTo) + 1} hour{Math.max(rangeFrom, rangeTo) - Math.min(rangeFrom, rangeTo) + 1 === 1 ? "" : "s"}</span>
              </div>
              <div className="px-5 pb-5 flex justify-between gap-2">
                <button onClick={clearDay} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition">Clear day</button>
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
