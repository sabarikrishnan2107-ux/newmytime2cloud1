"use client";

import Designation from "@/components/Designation/Page";
import Department from "@/components/Department/Page";

const DepartmentTabs = () => {

  return <div className="p-10 space-y-6 ">
    <header
      className="flex-shrink-0  pb-6 border-b border-gray-200 dark:border-white/20  "
    >
      <div
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-600 dark:text-gray-300 tracking-tight">
            Organization Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your company hierarchy, departments, and designations.
          </p>
        </div>
        {/* <div className="flex items-center gap-3">
          <button
            className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]"
            >file_download</span>
            Export
          </button>

        </div> */}
      </div>
    </header>

    <div className="flex-1 overflow-y-auto">
      <div className=" mx-auto w-full h-full">
        <div
          className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-[600px]"
        >
          <div
            className="xl:col-span-2 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/20 overflow-hidden shadow-xl"
          >
            <Department />
          </div>
          <div
            className="xl:col-span-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/20 overflow-hidden shadow-xl"
          >
            <Designation />
          </div>
        </div>
      </div>
    </div>

  </div>

};

export default DepartmentTabs;
