import React from "react";
import Calendar from "./Calendar";
import Upcoming from "./Upcoming";

const Holiday = () => {
  return (
    <div className="flex gap-6">
      <div className="flex-1 flex flex-col gap-4">
        <Calendar />
      </div>
      <div className="w-full lg:w-96 flex flex-col gap-6">
        <div className="bg-gradient-to-br from-obsidian-800 to-obsidian-950 border border-gray-200 dark:border-white/10 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:border-neon-cyan/30 transition-all">
          <div className="absolute top-0 right-0 w-40 h-40 bg-neon-cyan/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-neon-magenta/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-1 text-gray-600 dark:text-gray-300">
              Add New Holiday
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Create a public, religious or corporate event.
            </p>
            <button  className="w-full flex item-center justify-center bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white dark:text-slate-900 font-bold py-3 px-8 rounded-lg flex items-center gap-2 transform active:scale-95 uppercase tracking-wide text-xs shadow-md dark:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all">
              <span className="material-symbols-outlined text-lg">
                add_circle
              </span>
              ADD HOLIDAY
            </button>
          </div>
        </div>
        <Upcoming />
      </div>
    </div>
  );
};

export default Holiday;
