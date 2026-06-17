"use client";

import { useTranslation } from "react-i18next";

const statusStyles = {
  draft: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  pending: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  paid: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  rejected: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  const key = status?.toLowerCase();
  const style = statusStyles[key] || statusStyles.draft;
  const label = t(`payroll.common.statuses.${key}`, { defaultValue: status });
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {label}
    </span>
  );
}
