import React, { useState, useRef, useEffect } from "react";

const Dropdown = ({
  items = [],
  selectedItem,
  onSelect,
  placeholder = "Select Option",
  width = "w-[300px]",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${width}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-all duration-200 
          glass-card rounded-xl border border-border
          /* Light Mode */
          !bg-white  text-slate-700
          /* Dark Mode */
          dark:!bg-slate-900  dark:text-slate-300
          /* Interaction */
          focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.97]
        `}
      >
        <span className="truncate mr-2">
          {selectedItem ? (
            <>{selectedItem.name}</>
          ) : (
            <span className="text-slate-600 dark:text-slate-300">{placeholder}</span>
          )}
        </span>
        <span
          className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-10 w-full mt-2 glass-panel rounded-xl shadow-2xl 
                     !bg-white border-gray-200 
                     dark:!bg-midnight dark:border-white/10 p-1.5 animate-toast"
        >
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  setIsOpen(false);
                }}
                className={`
                  flex items-center py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200
                  hover:bg-primary/10 hover:text-primary 
                  ${
                    selectedItem?.id === item.id
                      ? "text-primary bg-primary/5"
                      : "text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                  }
                `}
              >
                {/* Active Indicator Dot */}
                <div
                  className={`w-1.5 h-1.5 rounded-full mr-3 transition-all ${
                    selectedItem?.id === item.id
                      ? "bg-primary scale-110"
                      : "bg-transparent"
                  }`}
                />

                <span className="truncate">{item.name}</span>

                {selectedItem?.id === item.id && (
                  <span className="material-symbols-outlined ml-auto text-xs">
                    check
                  </span>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
