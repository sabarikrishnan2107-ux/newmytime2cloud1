"use client";

import * as React from "react";

const Label = ({ children }) => (
  <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
    {children}
  </label>
);

const SectionTitle = ({ icon, title }) => (
  <h3 className="text-xs font-bold text-primary dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2 mb-5">
    {icon} {title}
    <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1 ml-2"></div>
  </h3>
);

export { Label, SectionTitle };
