"use client";

import { cn } from "@/lib/utils";

const ACCENTS = {
  blue:   { line: "#3b82f6", glow: "rgba(59,130,246,.55)",  iconBg: "rgba(59,130,246,.20)",  iconFg: "#60a5fa", label: "#ffffff" },
  green:  { line: "#22c55e", glow: "rgba(34,197,94,.55)",   iconBg: "rgba(34,197,94,.20)",   iconFg: "#4ade80", label: "#ffffff" },
  purple: { line: "#a855f7", glow: "rgba(168,85,247,.55)",  iconBg: "rgba(168,85,247,.20)",  iconFg: "#c084fc", label: "#ffffff" },
  indigo: { line: "#6366f1", glow: "rgba(99,102,241,.55)",  iconBg: "rgba(99,102,241,.20)",  iconFg: "#818cf8", label: "#ffffff" },
  red:    { line: "#ef4444", glow: "rgba(239,68,68,.55)",   iconBg: "rgba(239,68,68,.22)",   iconFg: "#fca5a5", label: "#ff8585" },
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "blue",
  active,
  onClick,
  footer,
  cta,
  emergency = false,
  largeText = false,
}) {
  const a = ACCENTS[accent] || ACCENTS.blue;

  return (
    <div
      onClick={onClick && !cta ? onClick : undefined}
      className={cn(
        "relative overflow-hidden rounded-[14px] border transition-all duration-300",
        emergency
          ? "bg-red-50 dark:bg-[#0c1220] border-red-300 dark:border-[rgba(239,68,68,.35)]"
          : "bg-white dark:bg-[#0c1220] border-gray-200 dark:border-[#1a2238]",
        onClick && !cta ? "cursor-pointer hover:-translate-y-0.5" : ""
      )}
    >
      <div className="px-3 pt-2 pb-2.5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-1.5">
          <p
            className={cn(
              "text-[13px] font-semibold tracking-[0.14em]",
              emergency
                ? "text-red-600 dark:text-[#ff8585]"
                : "text-gray-700 dark:text-white"
            )}
          >
            {label}
          </p>
          <div
            className="grid place-items-center w-9 h-9 rounded-[10px]"
            style={{ background: a.iconBg, color: a.iconFg }}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>

        {/* Value */}
        <p
          className={cn(
            "text-gray-900 dark:text-white font-extrabold leading-none tracking-tight mb-3",
            largeText ? "text-[24px]" : "text-[32px]"
          )}
        >
          {value}
        </p>

        {/* Hint */}
        {hint && <p className="text-[11px] text-gray-700 dark:text-white">{hint}</p>}

        {/* Footer (breakdown) */}
        {footer && (
          <div className="flex items-center gap-2.5 text-[11px] text-gray-700 dark:text-white">
            {footer}
          </div>
        )}

        {/* CTA button (Emergency Exit) */}
        {cta && <div className="mt-2.5">{cta}</div>}
      </div>

      {/* Bottom accent line with glow */}
      <span
        aria-hidden
        className="absolute bottom-0 h-[3px] rounded-t-[3px]"
        style={{
          left: 14,
          right: 14,
          background: a.line,
          boxShadow: `0 0 12px ${a.glow}`,
        }}
      />
    </div>
  );
}
