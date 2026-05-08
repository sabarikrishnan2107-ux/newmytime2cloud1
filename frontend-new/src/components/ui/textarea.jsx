import * as React from "react";

const Textarea = ({ className = "", ...props }) => (
    <textarea
        className={`w-full text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 glass-card rounded-lg px-3 py-2 outline-none transition-all ${className}`}
        {...props}
    />
);

export { Textarea };
