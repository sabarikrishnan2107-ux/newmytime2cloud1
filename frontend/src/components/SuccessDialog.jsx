"use client";

import React from "react";

export const SuccessDialog = ({
  successOpen,
  onOpenChange,
  title,
  description,
}) => {
  if (!successOpen) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-x-0 bottom-0 top-[72px] z-[60] flex items-center justify-center px-4"
    >
      {/* Backdrop - slightly darker to distinguish from the previous modal */}
      <div
        className="absolute inset-0 bg-black/80 frosted-glass transition-opacity animate-in fade-in duration-300"
        onClick={() => onOpenChange(false)}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-sm overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="p-8 text-center">
          {/* Animated Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-500/20 mb-4">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[32px]">
              check_circle
            </span>
          </div>

          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">
            {title}
          </h3>
          <p className="text-sm text-slate-400 mt-2">{description}</p>

          <button
            onClick={() => onOpenChange(false)}
            className="mt-6 w-full py-2.5 rounded-lg bg-primary text-white transition-all text-sm font-bold shadow-lg shadow-primary/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
