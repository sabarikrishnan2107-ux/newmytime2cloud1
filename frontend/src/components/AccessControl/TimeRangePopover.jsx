"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, X, ChevronUp, ChevronDown } from "lucide-react";

/**
 * Time-range filter popover. Two clock-style pickers (FROM / TO) side by side,
 * each with hour + minute spinners (24-hour format) and quick preset chips.
 *
 * Props:
 *   - timeFrom / timeTo : "HH:MM" strings (empty = unset)
 *   - onChange(from, to): called when the user clicks Apply
 *   - onClear()         : called when the user clears the filter
 */
export default function TimeRangePopover({ timeFrom = "", timeTo = "", onChange, onClear }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isActive = !!(timeFrom || timeTo);

  // Internal draft state (only commit on Apply)
  const [draftFrom, setDraftFrom] = useState({ h: 0, m: 0 });
  const [draftTo, setDraftTo] = useState({ h: 23, m: 59 });

  useEffect(() => {
    setDraftFrom(parseHHMM(timeFrom, { h: 0, m: 0 }));
    setDraftTo(parseHHMM(timeTo, { h: 23, m: 59 }));
  }, [timeFrom, timeTo, open]);

  function applyPreset(fromH, fromM, toH, toM) {
    setDraftFrom({ h: fromH, m: fromM });
    setDraftTo({ h: toH, m: toM });
  }

  function handleApply() {
    onChange?.(fmtHHMM(draftFrom), fmtHHMM(draftTo));
    setOpen(false);
  }

  function handleClear() {
    onClear?.();
    setOpen(false);
  }

  let label;
  if (timeFrom && timeTo)      label = `${timeFrom} – ${timeTo}`;
  else if (timeFrom)            label = t("accessControl.timeRange.from", { time: timeFrom });
  else if (timeTo)              label = t("accessControl.timeRange.until", { time: timeTo });
  else                          label = t("accessControl.timeRange.filterByTime");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 " +
            (isActive
              ? "border-cyan-500/60 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 shadow-[0_0_0_3px_rgba(34,211,238,0.08)]"
              : "border-border bg-card text-foreground hover:border-cyan-500/40")
          }
        >
          <Clock className={"h-3.5 w-3.5 " + (isActive ? "text-cyan-500" : "text-muted-foreground")} />
          <span className="tabular-nums">{label}</span>
          {isActive && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); handleClear(); } }}
              className="flex items-center justify-center w-4 h-4 rounded text-cyan-500 hover:bg-cyan-500/10"
              aria-label={t("accessControl.timeRange.clearTimeFilter")}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="p-0 w-[340px] bg-card border-border rounded-xl overflow-hidden shadow-xl"
      >
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">{t("accessControl.timeRange.title")}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("accessControl.timeRange.format24")}</span>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <ClockPicker label={t("accessControl.timeRange.fromLabel")} value={draftFrom} onChange={setDraftFrom} />
            <ClockPicker label={t("accessControl.timeRange.toLabel")}   value={draftTo}   onChange={setDraftTo} />
          </div>

          {/* Quick presets */}
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              {t("accessControl.timeRange.quickPresets")}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <PresetChip label={t("accessControl.timeRange.morning")} hint="06:00–12:00" onClick={() => applyPreset(6, 0, 12, 0)} />
              <PresetChip label={t("accessControl.timeRange.afternoon")} hint="12:00–18:00" onClick={() => applyPreset(12, 0, 18, 0)} />
              <PresetChip label={t("accessControl.timeRange.evening")} hint="18:00–23:00" onClick={() => applyPreset(18, 0, 23, 0)} />
              <PresetChip label={t("accessControl.timeRange.allDay")} hint="00:00–23:59" onClick={() => applyPreset(0, 0, 23, 59)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition"
          >
            {t("accessControl.timeRange.clear")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition shadow-sm"
          >
            {t("accessControl.timeRange.apply")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Single clock-style picker (hour spinner + minute spinner) ---------- */
function ClockPicker({ label, value, onChange }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 text-center">
        {label}
      </div>
      <div className="flex items-center justify-center gap-1">
        <Spinner
          value={value.h}
          min={0}
          max={23}
          onChange={(h) => onChange({ ...value, h })}
        />
        <div className="text-2xl font-bold text-muted-foreground/60 pb-0.5">:</div>
        <Spinner
          value={value.m}
          min={0}
          max={59}
          onChange={(m) => onChange({ ...value, m })}
        />
      </div>
    </div>
  );
}

function Spinner({ value, min, max, onChange }) {
  const display = String(value).padStart(2, "0");
  const inc = () => onChange(value >= max ? min : value + 1);
  const dec = () => onChange(value <= min ? max : value - 1);

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={inc}
        className="w-9 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-cyan-500 hover:bg-cyan-500/10 transition"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (!isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        className="w-12 text-center text-xl font-bold tabular-nums text-foreground bg-transparent outline-none focus:text-cyan-500"
      />
      <button
        type="button"
        onClick={dec}
        className="w-9 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-cyan-500 hover:bg-cyan-500/10 transition"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PresetChip({ label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors"
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums">{hint}</span>
    </button>
  );
}

/* ---------- Helpers ---------- */
function parseHHMM(s, fallback) {
  if (!s) return { ...fallback };
  const m = String(s).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { ...fallback };
  return { h: Math.max(0, Math.min(23, parseInt(m[1], 10))), m: Math.max(0, Math.min(59, parseInt(m[2], 10))) };
}
function fmtHHMM(v) {
  return String(v.h).padStart(2, "0") + ":" + String(v.m).padStart(2, "0");
}
