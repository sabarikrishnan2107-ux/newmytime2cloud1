import React from "react";

const TextArea = ({ label, icon, error, className = "", rows = 4, ...props }) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="text-xs font-medium ml-1 text-gray-600 dark:text-gray-300 font-display uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="relative group">
        {/* Leading Icon - Fixed to top-3 for textareas */}
        {icon && (
          <span className="z-10 material-symbols-outlined absolute left-3 top-3 text-gray-700 dark:text-gray-400 transition-colors text-[20px] pointer-events-none">
            {icon}
          </span>
        )}

        {/* Textarea Field */}
        <textarea
          {...props}
          rows={rows}
          className={`
            w-full flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 
            glass-card rounded-xl border outline-none resize-none
            
            /* Light Mode */
            !bg-white border-gray-200 text-slate-600 placeholder:text-slate-400
            
            /* Dark Mode */
            dark:!bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:placeholder:text-slate-600
            
            /* Focus State */
            focus:ring-2 focus:ring-primary/20 focus:border-primary/50
            
            /* Padding adjustment if icon exists */
            ${icon ? "pl-10" : ""}
            
            /* Error State */
            ${error ? "border-rose-500/50 focus:ring-rose-500/20" : ""}
          `}
        />
      </div>

      {/* Error Message */}
      {error && (
        <span className="text-[11px] font-medium ml-1 text-rose-500 animate-in fade-in slide-in-from-top-1">
          {error}
        </span>
      )}
    </div>
  );
};

export default TextArea;