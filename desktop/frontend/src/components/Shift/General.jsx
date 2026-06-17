import React, { useState, useRef, useEffect } from "react";

import { Clock, Sunrise, Moon, Fingerprint, TimerIcon } from "lucide-react";
import TimePicker from "../Theme/TimePicker";
import Input from "../Theme/Input";

const General = ({
  value = "",
  onChange = () => {},
  placeholder = "Select Time",
  width = "w-full",
}) => {
  const [isUnlimited, setIsUnlimited] = useState(true);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          Flexible Work Window
        </h3>
      </div>

      <div className="bg-[#1e293b]/50 border border-white/10 rounded-xl p-5 shadow-lg flex flex-col gap-6 backdrop-blur-sm">
        {/* Global Availability Range Card */}
        <div className="p-4 bg-[#0f172a]/50 border border-white/5 rounded-lg relative overflow-hidden">
          {/* Background Decorative Icon */}
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <TimerIcon size={96} className="text-emerald-400" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 relative z-10">
            <div>
              <h4 className="text-white font-semibold text-base">
                Global Availability Range
              </h4>
              <p className="text-sm text-slate-400 mt-1">
                Define the open window during which staff can clock in and out.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                Active Window
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
            {/* Window Open */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Sunrise size={16} /> Window Open
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock
                    size={18}
                    className="text-slate-500 group-focus-within:text-white transition-colors"
                  />
                </div>
                <TimePicker />
                {/* <input
                  type="time"
                  defaultValue="03:00"
                  className="w-full rounded-lg bg-[#1e293b] border border-white/10 text-white py-3 pl-10 pr-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-base shadow-sm transition-all outline-none"
                /> */}
              </div>
              <p className="text-[10px] text-slate-500 pl-1">
                Earliest allowed start time
              </p>
            </div>

            {/* Window Close */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Moon size={16} /> Window Close
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock
                    size={18}
                    className="text-slate-500 group-focus-within:text-white transition-colors"
                  />
                </div>
                <TimePicker />
              </div>
              <p className="text-[10px] text-slate-500 pl-1">
                Latest allowed end time
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Punch Policy Card */}
        <div className="bg-[#0f172a]/30 border border-white/5 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Fingerprint size={20} className="text-emerald-400" />
              Multi-Punch Policy
            </h4>

            {/* Toggle Switch */}
            <label className="relative flex items-center cursor-pointer gap-2 p-1.5 pr-3 rounded-full bg-[#1e293b] border border-white/10 hover:border-slate-500 transition-colors">
              <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-slate-700">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isUnlimited}
                  onChange={() => setIsUnlimited(!isUnlimited)}
                />
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${isUnlimited ? "translate-x-4 bg-emerald-400" : "translate-x-0"} ${isUnlimited ? "bg-white" : "bg-slate-400"}`}
                />
              </div>
              <span className="text-xs text-white font-medium select-none">
                Allow Unlimited In/Out
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Target Daily Hours */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block">
                Target Daily Hours
              </label>
              <div className="relative">
                <Input
                  defaultValue="8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">
                  HRS
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Expected total duration per day
              </p>
            </div>

            {/* Min Session Duration */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block">
                Minimum Session Duration
              </label>
              <div className="relative">
                <Input
                  defaultValue="30"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">
                  MIN
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Prevent accidental short punches
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default General;
