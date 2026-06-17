import React from "react";

const Calendar = () => {
  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 backdrop-blur-xl border border-gray-200 dark:border-glass-border rounded-2xl p-4 shadow-glass">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-gray-200 dark:border-white/10 shadow-sm">
            <button className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">
                chevron_left
              </span>
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">
                chevron_right
              </span>
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-400 tracking-wide">
            December 2024
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-white/10">
            <button className="px-3 py-1.5 text-xs font-semibold rounded-md bg-white/10 text-gray-400 shadow-md ring-1 ring-white/5 border border-gray-200 dark:border-white/10">
              Month
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold rounded-md text-gray-400 hover:bg-white/5 transition-colors">
              Week
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold rounded-md text-gray-400 hover:bg-white/5 transition-colors">
              Year
            </button>
          </div>
          <button className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-400 ">
            <span className="material-symbols-outlined text-[18px]">
              filter_list
            </span>
            Filter
          </button>
          <div className="relative hidden sm:flex flex-col items-center">
            <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all  group">
              <svg
                className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  fill="transparent"
                  height="15"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.5"
                  width="18"
                  x="3"
                  y="6"
                ></rect>
                <path
                  d="M3 10H21"
                  stroke="currentColor"
                  stroke-width="1.5"
                ></path>
                <path
                  d="M7 3V6"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="1.5"
                ></path>
                <path
                  d="M17 3V6"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="1.5"
                ></path>
                <rect fill="#22d3ee" height="2" width="2" x="7" y="14"></rect>
                <rect fill="#e879f9" height="2" width="2" x="11" y="14"></rect>
                <rect fill="#22d3ee" height="2" width="2" x="15" y="14"></rect>
              </svg>
              Sync with Google
            </button>
            {/* <span className="absolute top-full mt-1.5 text-[10px] text-neon-cyan/60 tracking-tight whitespace-nowrap">
                Last Synced: 14m ago
              </span> */}
          </div>
        </div>
      </div>
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-glass border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col min-h-[600px] relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="grid grid-cols-7 border-b border-white/10 bg-white dark:bg-slate-900">
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            Sun
          </div>
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            Mon
          </div>
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            Tue
          </div>
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            Wed
          </div>
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            Thu
          </div>
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            Fri
          </div>
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            Sat
          </div>
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-white/5">
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">
            <span className="text-sm font-medium text-slate-600">26</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">
            <span className="text-sm font-medium text-slate-600">27</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">
            <span className="text-sm font-medium text-slate-600">28</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">
            <span className="text-sm font-medium text-slate-600">29</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">
            <span className="text-sm font-medium text-slate-600">30</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              1
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              2
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              3
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              4
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              5
            </span>
            <div
              className="
  /* Shared Base Styles */
  mt-1 p-1.5 rounded border text-xs font-semibold truncate transition-all
  
  /* Light Mode (Default) */
  bg-cyan-100/50 text-cyan-800 border-cyan-400/40 shadow-sm
  
  /* Dark Mode */
  dark:bg-cyan-950/50 dark:border-neon-cyan/30 dark:text-neon-cyan dark:shadow-glow-cyan
"
            >
              🏢 Strategy Meet
            </div>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              6
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              7
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white/[0.02]">
            <span className="text-sm font-medium text-slate-600">8</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              9
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              10
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              11
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              12
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              13
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              14
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white/[0.02]">
            <span className="text-sm font-medium text-slate-600">15</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              16
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              17
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              18
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              19
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              20
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              21
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white/[0.02]">
            <span className="text-sm font-medium text-slate-600">22</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              23
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              24
            </span>
            <div
              className="
  mt-1 p-1.5 rounded text-xs font-semibold truncate mb-1 transition-all border
  /* Light Mode */
  bg-fuchsia-100/50 text-fuchsia-700 border-fuchsia-400/30 shadow-sm
  /* Dark Mode */
  dark:bg-fuchsia-950/50 dark:border-neon-magenta/30 dark:text-neon-magenta dark:shadow-glow-magenta
"
            >
              🎁 Christmas
            </div>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-fuchsia-900/10 hover:bg-fuchsia-900/20 hover:border-neon-magenta/40 transition-colors group relative cursor-pointer">
            <span className="flex items-center justify-between">
              <span className="text-sm font-bold text-neon-magenta drop-shadow-[0_0_5px_rgba(232,121,249,0.5)]">
                25
              </span>
            </span>
            <div
              className="
  mt-1 p-1.5 rounded text-xs font-semibold truncate mb-1 transition-all border
  /* Light Mode */
  bg-fuchsia-100/50 text-fuchsia-700 border-fuchsia-400/30 shadow-sm
  /* Dark Mode */
  dark:bg-fuchsia-950/50 dark:border-neon-magenta/30 dark:text-neon-magenta dark:shadow-glow-magenta
"
            >
              🎁 Christmas
            </div>
            <div
              className="
  p-1.5 rounded text-xs font-semibold truncate transition-all border
  /* Light Mode */
  bg-emerald-100/50 text-emerald-700 border-emerald-400/30 shadow-sm
  /* Dark Mode */
  dark:bg-emerald-950/50 dark:border-emerald-500/30 dark:text-emerald-400 dark:shadow-[0_0_10px_rgba(52,211,153,0.1)]
"
            >
              🕯️ Hanukkah
            </div>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              26
            </span>
            <div
              className="
  /* Shared Base Styles */
  mt-1 p-1.5 rounded border text-xs font-semibold truncate mb-1 transition-all
  
  /* Light Mode (Default) */
  bg-blue-100/50 text-blue-700 border-blue-400/40 shadow-sm
  
  /* Dark Mode */
  dark:bg-blue-950/50 dark:border-blue-400/30 dark:text-blue-400 dark:shadow-sm
"
            >
              📦 Boxing Day
            </div>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              27
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 bg-white/[0.02]">
            <span className="text-sm font-medium text-slate-600">28</span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              29
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              30
            </span>
          </div>
          <div className="p-2 min-h-[100px] border border-gray-100 dark:border-white/5 hover:bg-white/5 hover:border-neon-cyan/40 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.1)] transition-all group relative cursor-pointer">
            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
              31
            </span>
            <div
              className="
  /* Shared Base Styles */
  mt-1 p-1.5 rounded border text-xs font-semibold truncate transition-all
  
  /* Light Mode (Default) */
  bg-purple-100/50 text-purple-700 border-purple-400/40 shadow-sm
  
  /* Dark Mode */
  dark:bg-purple-950/50 dark:border-purple-400/30 dark:text-purple-400 dark:shadow-sm
"
            >
              🎉 NYE
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Calendar;
