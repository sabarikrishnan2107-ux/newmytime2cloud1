import React from "react";

const Upcoming = () => {
  return (
    <>
      <div className="flex-1 bg-white dark:bg-slate-900 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-2xl shadow-glass flex flex-col overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white dark:bg-slate-900">
          <h3 className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-neon-cyan">
              event_list
            </span>
            Upcoming
          </h3>
          <span className="bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full border border-gray-300 dark:border-white/5">
            5 Total
          </span>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-white/5  transition-all group cursor-pointer backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 ">
                  Dec 05
                </span>
                <h4 className="font-bold text-slate-600 dark:text-slate-300  transition-colors shadow-black drop-shadow-sm">
                  Strategy Meet
                </h4>
              </div>
              <span
                className="
  /* Shared Styles */
  px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-colors
  
  /* Light Mode (Default) */
  bg-cyan-50 text-cyan-700 border-cyan-200
  
  /* Dark Mode */
  dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-500/20
"
              >
                Corporate
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-[14px]">
                domain
              </span>
              <span className="truncate">HQ Only</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-white/5  transition-all group cursor-pointer backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 ">
                  Dec 24
                </span>
                <h4 className="font-bold text-slate-600 dark:text-slate-300  transition-colors shadow-black drop-shadow-sm">
                  Christmas Eve
                </h4>
              </div>
              <span
                className="
  /* Shared Base Styles */
  px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-colors
  
  /* Light Mode (Default) */
  bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200
  
  /* Dark Mode Styles */
  dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-500/20
"
              >
                Public
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-[14px]">
                public
              </span>
              <span className="truncate">All Branches</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-white/5  transition-all group cursor-pointer backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 ">
                  Dec 25
                </span>
                <h4 className="font-bold text-slate-600 dark:text-slate-300  transition-colors shadow-black drop-shadow-sm">
                  Christmas Day
                </h4>
              </div>
              <span
                className="
  /* Shared Base Styles */
  px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-colors
  
  /* Light Mode (Default) */
  bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200
  
  /* Dark Mode Styles */
  dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-500/20
"
              >
                Public
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-[14px]">
                public
              </span>
              <span className="truncate">All Branches</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-white/5 transition-all group cursor-pointer backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 ">
                  Dec 25
                </span>
                <h4 className="font-bold text-slate-600 dark:text-slate-300  transition-colors shadow-black drop-shadow-sm">
                  Hanukkah
                </h4>
              </div>
              <span
                className="
  /* Shared Base Styles */
  px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-colors
  
  /* Light Mode (Default) */
  bg-emerald-50 text-emerald-800 border-emerald-200
  
  /* Dark Mode Styles */
  dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/20
"
              >
                Religious
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-[14px]">
                location_on
              </span>
              <span className="truncate">NY, Israel</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-white/5  transition-all group cursor-pointer backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 ">
                  Dec 26
                </span>
                <h4 className="font-bold text-slate-600 dark:text-slate-300  transition-colors shadow-black drop-shadow-sm">
                  Boxing Day
                </h4>
              </div>
              <span
                className="
  /* Shared Base Styles */
  px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-colors
  
  /* Light Mode (Default) */
  bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200
  
  /* Dark Mode Styles */
  dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-500/20
"
              >
                Public
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-[14px]">
                location_on
              </span>
              <span className="truncate">UK, Canada, Australia</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Upcoming;
