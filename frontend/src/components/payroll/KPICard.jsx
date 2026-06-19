"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

const TONES = {
  primary:     { iconBg: "bg-blue-500/10",    iconFg: "text-blue-500",    accent: "#3b82f6", glow: "rgba(59,130,246,.45)" },
  success:     { iconBg: "bg-emerald-500/10", iconFg: "text-emerald-500", accent: "#10b981", glow: "rgba(16,185,129,.45)" },
  warning:     { iconBg: "bg-amber-500/10",   iconFg: "text-amber-500",   accent: "#f59e0b", glow: "rgba(245,158,11,.45)" },
  destructive: { iconBg: "bg-red-500/10",     iconFg: "text-red-500",     accent: "#ef4444", glow: "rgba(239,68,68,.45)" },
};

export function KPICard({ title, value, icon: Icon, variant = "primary", trend, trendUp }) {
  const t = TONES[variant] || TONES.primary;
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;

  return (
    <div className="group relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#101a30] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${t.iconBg}`}>
          <Icon className={`h-5 w-5 ${t.iconFg}`} strokeWidth={2} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
            trendUp
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/15 text-red-600 dark:text-red-400"
          }`}>
            <TrendIcon className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>

      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-700 dark:text-white mb-2">{title}</p>
      <p className="text-[28px] font-semibold text-gray-900 dark:text-white tabular-nums leading-none">{value}</p>
    </div>
  );
}
