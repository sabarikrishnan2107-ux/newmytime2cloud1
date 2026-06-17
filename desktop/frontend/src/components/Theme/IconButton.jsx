import React from "react";

const IconButton = ({
  icon: Icon, // Expects a Lucide icon component
  onClick = () => {},
  isLoading = false,
  title = "Action",
  disabled = false,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      title={title}
      className={`
        relative p-2.5 transition-all duration-200 rounded-xl border flex items-center justify-center
        glass-card
        
        /* Light Mode - Neutral */
        !bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:text-slate-900
        
        /* Dark Mode - Slate-900 */
        dark:!bg-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:border-white/20
        
        /* States */
        disabled:opacity-40 disabled:cursor-not-allowed
        active:scale-95
        ${className}
      `}
    >
      {Icon && (
        <Icon
          className={`w-4 h-4 transition-transform ${isLoading ? "animate-spin" : ""}`}
        />
      )}
    </button>
  );
};

export default IconButton;
