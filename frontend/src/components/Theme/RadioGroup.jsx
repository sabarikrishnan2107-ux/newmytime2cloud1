import React from "react";

const RadioGroup = ({
  options = [],
  selectedValue,
  onChange,
  label,
  name = "radio-group",
  layout = "horizontal", // or "horizontal"
}) => {
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}

      <div
        className={`flex ${layout === "horizontal" ? "flex-row gap-3" : "flex-col gap-2"}`}
      >
        {options.map((option) => {
          const isSelected = selectedValue === option.value;

          return (
            <label
              key={option.value}
              className={` px-2
                relative flex items-center group cursor-pointer h-10 rounded-xl border transition-all duration-200
                ${
                  isSelected
                    ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-white/30 ring-1 ring-slate-200 dark:ring-white/10"
                    : "bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30"
                }
              `}
            >
              {/* Hidden Native Radio */}
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />

              {/* Custom Radio Circle */}
              <div
                className={`
                flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200
                ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white"
                    : "border-slate-300 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-white/40"
                }
              `}
              >
                <div
                  className={`
                  w-2 h-2 rounded-full bg-white dark:bg-slate-900 transition-transform duration-200
                  ${isSelected ? "scale-100" : "scale-0"}
                `}
                />
              </div>

              {/* Label Text */}
              <div className="ml-3 flex flex-col">
                <span
                  className={`text-sm font-medium transition-colors ${
                    isSelected
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-slate-400">
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default RadioGroup;
