"use client";

const variantStyles = {
  primary: "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50",
  success: "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50",
  warning: "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50",
  destructive: "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50",
};

const iconVariant = {
  primary: "text-blue-500 bg-blue-500/10",
  success: "text-emerald-500 bg-emerald-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  destructive: "text-red-500 bg-red-500/10",
};

export function KPICard({ title, value, icon: Icon, variant = "primary", trend, trendUp }) {
  return (
    <div className={`rounded-xl border p-5 transition hover:shadow-md ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconVariant[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${trendUp ? "text-emerald-500" : "text-red-400"}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
