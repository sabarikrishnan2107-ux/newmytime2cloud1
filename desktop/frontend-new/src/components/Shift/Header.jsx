
const ShiftHeader = () => {
  return (
    <header className="h-16 border-b border-border  dark:bg-slate-900 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-600 dark:text-gray-300 tracking-tight">
          Shift Configuration
        </h2>
        <p className="text-xs text-gray-600 dark:text-slate-300 hidden sm:block">
          Manage timings, policies, and attendance rules for Shift
        </p>
      </div>
      {/* <div className="flex items-center gap-3">
        <button className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border  text-gray-600 dark:text-slate-300 text-sm font-medium transition-all hover:bg-slate-700">
          <span className="material-symbols-outlined text-[18px]">history</span>
          <span className="hidden sm:inline">History</span>
        </button>
        <button className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-sm font-bold hover:bg-emerald-500/20 transition-all">
          <span className="material-symbols-outlined text-[18px]">
            ios_share
          </span>
          <span className="hidden sm:inline">Export</span>
        </button>
      </div> */}
    </header>
  );
};

export default ShiftHeader;
