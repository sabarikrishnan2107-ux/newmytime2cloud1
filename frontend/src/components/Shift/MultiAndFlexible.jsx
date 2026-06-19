import { Clock, Sunrise, Moon, Fingerprint, TimerIcon } from "lucide-react";
import TimePicker from "@/components/ui/TimePicker";
import Input from "../Theme/Input";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/utils";

const MultiAndFlexible = ({ shift = "", handleChange = () => {} }) => {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          Flexible Work Window
        </h3>
      </div>

      <div className="bg-white dark:bg-[#1e293b]/50 border dark:border-white/10 rounded-xl p-5 shadow-lg flex flex-col gap-6 backdrop-blur-sm">
        {/* Global Availability Range Card */}
        <div className="p-4 bg-[#0f172a]/50 border border-white/5 rounded-lg relative overflow-hidden">
          {/* Background Decorative Icon */}
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <TimerIcon size={96} className="text-emerald-400" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 relative z-10">
            <div>
              <h4 className="text-gray-600 dark:text-slate-300 font-semibold text-base">
                Global Availability Range
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Define the open window during which staff can clock in and out.
              </p>
            </div>
          </div>

          <div className={`grid grid-cols-${shift.shift_type_id == 2 ? '2' : '3' } gap-6 relative z-10"`}>
            {/* Window Open */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Sunrise size={16} /> Window Open
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock
                    size={18}
                    className="text-slate-500 group-focus-within:text-gray-600 dark:text-slate-300 transition-colors"
                  />
                </div>
                <TimePicker
                  defaultValue={shift.on_duty_time}
                  onChange={(val) => handleChange("on_duty_time", val)}
                />
              </div>
              <p className="text-[10px] text-slate-500 pl-1">
                Earliest allowed start time
              </p>
            </div>

            {/* Window Close */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Moon size={16} /> Window Close
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock
                    size={18}
                    className="text-slate-500 group-focus-within:text-gray-600 dark:text-slate-300 transition-colors"
                  />
                </div>
                <TimePicker
                  defaultValue={shift.off_duty_time}
                  onChange={(val) => handleChange("off_duty_time", val)}
                />
              </div>
              <p className="text-[10px] text-slate-500 pl-1">
                Latest allowed end time
              </p>
            </div>
            {shift.shift_type_id == 1 ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <Clock size={16} /> Minimum Working Hrs.
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock
                      size={18}
                      className="text-slate-500 group-focus-within:text-gray-600 dark:text-slate-300 transition-colors"
                    />
                  </div>
                  <TimePicker
                    defaultValue={shift.working_hours}
                    onChange={(val) => handleChange("working_hours", val)}
                  />
                </div>
                <p className="text-[10px] text-slate-500 pl-1">
                  minimum working hours to be performed
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2 mt-5">
            {/* Toggle Section */}
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={shift.is_auto_deduct}
                  onChange={(e) => {
                    handleChange("is_auto_deduct", e.target.checked);
                    // When auto-deduct is turned off, reset the break minutes to 0.
                    if (!e.target.checked) {
                      handleChange("break_duration", minutesToHHMM(0));
                    }
                  }}
                />
                {/* Custom Toggle Switch */}
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 peer-checked:dark:bg-emerald-500"></div>
                <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  Auto-Deduct Break
                </span>
              </label>
            </div>

            {/* Input Section */}
            <div className="relative flex-1 max-w-[90px]">
              <input
                id="breakDurationInput"
                placeholder="0"
                value={hhmmToMinutes(shift.break_duration || 0)}
                checked={hhmmToMinutes(shift.break_duration)}
                disabled={!shift.is_auto_deduct}
                onChange={(e) =>
                  handleChange(
                    "break_duration",
                    minutesToHHMM(e.target.value || ""),
                  )
                }
                className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:border-blue-500 outline-none transition-all ${!shift.is_auto_deduct ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-gray-400 pointer-events-none">
                min
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Punch Policy Card */}
        {shift.shift_type_id == 2 ? (
          <div className="bg-[#0f172a]/30 border border-white/5 rounded-lg p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h4 className="text-gray-600 dark:text-slate-300 font-semibold flex items-center gap-2">
                <Fingerprint size={20} className="text-emerald-400" />
                Multi-Punch Policy
              </h4>

              {/* Toggle Switch */}
              <label className="relative flex items-center cursor-pointer gap-3 p-2 rounded-lg  border border-border w-full sm:w-auto hover:bg-[#161e31] transition-colors">
                <div
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${shift.unlimited_for_multi ? "bg-emerald-500" : "bg-slate-700"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={shift.unlimited_for_multi}
                    onChange={(e) =>
                      handleChange("unlimited_for_multi", e.target.checked)
                    }
                  />

                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${shift.unlimited_for_multi ? "translate-x-5" : "translate-x-0"}`}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-slate-300 font-medium select-none">
                  Allow Unlimited In/Out
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Target Daily Hours */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Minimum Working Hrs.
                </label>
                <div className="relative">
                  <TimePicker
                    defaultValue={shift.working_hours}
                    onChange={(val) => handleChange("working_hours", val)}
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Expected total duration per day
                </p>
              </div>

              {/* Min Session Duration */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Minimum Session Duration
                </label>
                <div className="relative">
                  <Input
                    value={hhmmToMinutes(shift.minimum_session_duration)}
                    onChange={(e) =>
                      handleChange(
                        "minimum_session_duration",
                        minutesToHHMM(e.target.value) || "",
                      )
                    }
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
        ) : null}
      </div>
    </section>
  );
};

export default MultiAndFlexible;
