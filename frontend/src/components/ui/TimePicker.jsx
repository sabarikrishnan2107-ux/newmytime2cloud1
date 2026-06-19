"use client";

import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function parseTime(str, fallback = { h: 9, m: 0 }) {
  if (!str || typeof str !== "string") return fallback;
  const m = str.match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return fallback;
  let h = clamp(parseInt(m[1], 10), 0, 23);
  let mm = clamp(parseInt(m[2], 10), 0, 59);
  return { h, m: mm };
}
function fmt(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

const TimePicker = forwardRef(function TimePicker(
  {
    value,
    onChange,
    defaultValue,
    minuteStep = 5,
    id,
    name,
    placeholder = "Select time",
    disabled = false,
    required = false,
    autoComplete,
    className = "",
    inputClassName = "h-12",
    icon,
    ...rest
  },
  ref
) {
  const initial = useMemo(
    () => parseTime(value ?? defaultValue ?? "09:00"),
    [value, defaultValue]
  );

  const [open, setOpen] = useState(false);
  const [h, setH] = useState(initial.h);
  const [m, setM] = useState(initial.m);

  const inputRef = useRef(null);

  useEffect(() => {
    if (typeof value === "string") {
      const t = parseTime(value, { h, m });
      setH(t.h);
      setM(t.m);
    }
  }, [value]);

  const display = useMemo(() => {
    const src = typeof value === "string" ? parseTime(value) : { h, m };
    return fmt(src.h, src.m);
  }, [value, h, m]);

  function commitChange(nextH = h, nextM = m) {
    onChange?.(fmt(nextH, nextM));
  }

  function incHour(step = 1) {
    const next = (h + step + 24) % 24;
    setH(next);
    commitChange(next, m);
  }
  function incMinute(step = minuteStep) {
    const total = h * 60 + m + step;
    const mod = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const nextH = Math.floor(mod / 60);
    const nextM = mod % 60;
    setH(nextH);
    setM(nextM);
    commitChange(nextH, nextM);
  }

  function onManualInput(e) {
    const raw = e.target.value;
    const t = parseTime(raw, { h, m });
    setH(t.h);
    setM(t.m);
    onChange?.(fmt(t.h, t.m));
  }

  function setNow() {
    const d = new Date();
    const nh = d.getHours();
    const nm = d.getMinutes() - (d.getMinutes() % minuteStep);
    setH(nh);
    setM(nm);
    commitChange(nh, nm);
  }

  return (
    <div className={`relative w-full ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              ref={(node) => {
                inputRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) ref.current = node;
              }}
              id={id}
              name={name}
              type="text"
              value={display}
              onChange={onManualInput}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              autoComplete={autoComplete}
              className={`w-full rounded-lg border border-gray-200 dark:border-white/10 bg-background-light dark:bg-slate-900 text-text-strong-light dark:text-text-strong-dark focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] pr-10 text-sm transition-all ${inputClassName}`}
              {...rest}
            />
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400">
              {icon ? icon : <span className="material-icons text-base">schedule</span>}
            </span>
            {!disabled && (
              <button
                type="button"
                aria-label="Open time picker"
                className="absolute inset-0 cursor-text"
                onClick={() => setOpen(true)}
                style={{ background: "transparent" }}
              />
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-50 rounded-lg p-4 shadow-lg border border-border  bg-white dark:bg-slate-900"
        >
          <div className="flex justify-between mb-3">
            <div className="text-sm font-medium text-muted-foreground">Select Time</div>
            <div className="text-base font-semibold tabular-nums">
              {fmt(h, m)}
            </div>
          </div>

          <div className="flex justify-center gap-5 mb-4">
            <div className="flex flex-col items-center">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => incHour(1)}
                className="h-7 w-7 p-0 border border-border"
              >
                <span className="material-icons text-sm">expand_less</span>
              </Button>
              <div className="text-lg font-semibold tabular-nums mt-1">{pad2(h)}</div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => incHour(-1)}
                className="h-7 w-7 p-0 mt-1 border border-border"
              >
                <span className="material-icons text-sm">expand_more</span>
              </Button>
            </div>

            <div className="text-lg font-semibold tabular-nums flex items-center">:</div>

            <div className="flex flex-col items-center">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => incMinute(minuteStep)}
                className="h-7 w-7 p-0 border border-border"
              >
                <span className="material-icons text-sm">expand_less</span>
              </Button>
              <div className="text-lg font-semibold tabular-nums mt-1">{pad2(m)}</div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => incMinute(-minuteStep)}
                className="h-7 w-7 p-0 mt-1 border border-border"
              >
                <span className="material-icons text-sm">expand_more</span>
              </Button>
            </div>
          </div>

          <div className="">
            <Button className="w-full  text-white" type="button" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

export default TimePicker;