import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const defaultLabels = {
  showing: "Showing",
  to: "to",
  of: "of",
  results: "results",
  previous: "Previous",
  next: "Next",
  perPageSuffix: "/ page",
};

function Pagination({
  page, // 1-based
  perPage,
  total,
  isLoading = false,

  onPageChange,
  onPerPageChange,

  pageSizeOptions = [10, 25, 50],
  className = "",
  labels = defaultLabels,

  LeftIcon,
  RightIcon,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  const currentPage = clamp(page || 1, 1, totalPages);

  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  const canPrev = currentPage > 1 && !isLoading;
  const canNext = currentPage < totalPages && !isLoading;

  const goPrev = () => canPrev && onPageChange(currentPage - 1);
  const goNext = () => canNext && onPageChange(currentPage + 1);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 ${className}`}>
      
      {/* LEFT: Range Information */}
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {labels.showing} <span className="text-slate-900 dark:text-slate-100">{start}-{end}</span> {labels.of} <span className="text-slate-900 dark:text-slate-100">{total}</span>
      </span>

      {/* RIGHT: Controls Container */}
      <div className="flex items-center">
        
        {/* Per Page Custom Selector */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          >
            {perPage}
            <span className={`material-icons-outlined text-[16px] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {/* Dropdown Menu (Opens Upward to avoid clipping) */}
          {isDropdownOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              {pageSizeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    perPage === option 
                      ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20" 
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                  onClick={() => {
                    onPerPageChange(Number(option));
                    setIsDropdownOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {labels.perPageSuffix}
          </span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center mt-1 gap-3">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className="p-1.5 rounded-md  hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title={labels.previous}
          >
            {LeftIcon ? <LeftIcon /> : <span className="material-icons-outlined text-sm block">chevron_left</span>}
          </button>
          
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <span className="text-slate-600 dark:text-slate-200">{currentPage}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>

          <button
            onClick={goNext}
            disabled={!canNext}
            className="p-1.5 rounded-md  hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title={labels.next}
          >
            {RightIcon ? <RightIcon /> : <span className="material-icons-outlined text-sm block">chevron_right</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
  onPageChange: PropTypes.func.isRequired,
  onPerPageChange: PropTypes.func,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  className: PropTypes.string,
  labels: PropTypes.shape({
    showing: PropTypes.string,
    to: PropTypes.string,
    of: PropTypes.string,
    results: PropTypes.string,
    previous: PropTypes.string,
    next: PropTypes.string,
    perPageSuffix: PropTypes.string,
  }),
  LeftIcon: PropTypes.elementType,
  RightIcon: PropTypes.elementType,
};

export default React.memo(Pagination);