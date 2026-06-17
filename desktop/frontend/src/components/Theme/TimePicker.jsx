import React, { useState, useRef, useEffect } from "react";

const TimePicker = ({
  value,
  onChange,
  placeholder = "Select Time",
  width = "w-full",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Generate arrays for hours and minutes
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );

  // Parse current value (Format: "HH:mm")
  const [selectedH, selectedM] = value ? value.split(":") : ["12", "00"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeSelect = (h, m) => {
    onChange(`${h}:${m}`);
  };

  return (
    <div className="relative inline-block w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={` 
         ${width}
          flex items-center justify-between px-4 h-[42px] text-sm font-medium transition-all duration-200 
          glass-card rounded-xl border
          !bg-white border-gray-200 text-slate-700
          dark:!bg-slate-900 dark:border-white/10 dark:text-slate-300
          focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.97]
        `}
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-slate-400">
            schedule
          </span>
          {value || <span className="text-slate-400">{placeholder}</span>}
        </span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="absolute z-50 mt-2 p-3 glass-panel rounded-xl shadow-2xl 
                        !bg-white border-gray-200 dark:!bg-midnight dark:border-white/10 
                        animate-toast flex flex-col gap-3 w-[220px]"
        >
          <div className="flex gap-2 h-40">
            {/* Hours Column */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 sticky top-0 bg-inherit pb-1">
                Hrs
              </div>
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => handleTimeSelect(h, selectedM)}
                  className={`py-1.5 text-sm rounded-lg transition-all ${
                    selectedH === h
                      ? "bg-primary text-white font-bold"
                      : "hover:bg-primary/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="flex items-center text-slate-300 font-bold">:</div>

            {/* Minutes Column */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 sticky top-0 bg-inherit pb-1">
                Min
              </div>
              {minutes.map((m) => (
                <button
                  key={m}
                  onClick={() => handleTimeSelect(selectedH, m)}
                  className={`py-1.5 text-sm rounded-lg transition-all ${
                    selectedM === m
                      ? "bg-primary text-white font-bold"
                      : "hover:bg-primary/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2 text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
