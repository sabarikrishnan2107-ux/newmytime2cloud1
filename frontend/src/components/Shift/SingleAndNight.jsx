import { hhmmToMinutes, minutesToHHMM } from "@/lib/utils";
import TimePicker from "../ui/TimePicker";

const shiftTime = (timeStr, offsetMinutes) => {
  if (!timeStr) return "00:00";
  const [h, m] = timeStr.split(":").map(Number);
  let total = h * 60 + m + offsetMinutes;
  if (total < 0) total += 1440;
  total = total % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const SingleAndNight = ({ shift = "", handleChange = () => {} }) => {
  const handleOnDutyChange = (val) => {
    handleChange("on_duty_time", val);
    handleChange("beginning_in", shiftTime(val, -60));
    handleChange("beginning_out", shiftTime(val, 60));
  };

  const handleOffDutyChange = (val) => {
    handleChange("off_duty_time", val);
    handleChange("ending_in", shiftTime(val, -60));
    handleChange("ending_out", shiftTime(val, 60));
  };

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">shift</span>
        Clock-In/Out Configuration
      </h3>
      <div className="bg-white dark:bg-[#1e293b]/50 border border-gray-200 dark:dark:border-white/10 rounded-xl p-6 shadow-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200 dark:dark:border-white/10">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-primary">
              <span className="material-symbols-outlined text-[18px]">
                login
              </span>
              On Duty Time
            </label>
            <TimePicker
              defaultValue={shift.on_duty_time}
              onChange={handleOnDutyChange}
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-red-400">
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
              Off Duty Time
            </label>
            <TimePicker
              defaultValue={shift.off_duty_time}
              onChange={handleOffDutyChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-600 dark:text-slate-300">
              Beginning Window
            </span>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div>
                <span className="text-xs text-gray-600 dark:text-slate-300 mb-1 block">
                  Start
                </span>
                <TimePicker
                  value={shift.beginning_in}
                  onChange={(val) => handleChange("beginning_in", val)}
                />
              </div>
              <div>
                <span className="text-xs text-gray-600 dark:text-slate-300 mb-1 block">
                  End
                </span>
                <TimePicker
                  value={shift.beginning_out}
                  onChange={(val) => handleChange("beginning_out", val)}
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-600 dark:text-slate-300">
              Ending Window
            </span>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div>
                <span className="text-xs text-gray-600 dark:text-slate-300 mb-1 block">
                  Start
                </span>

                <TimePicker
                  value={shift.ending_in}
                  onChange={(val) => handleChange("ending_in", val)}
                />
              </div>
              <div>
                <span className="text-xs text-gray-600 dark:text-slate-300 mb-1 block">
                  End
                </span>
                <TimePicker
                  value={shift.ending_out}
                  onChange={(val) => handleChange("ending_out", val)}
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-600 dark:text-slate-300">
              Minimum Working Hrs.
            </span>
            <div className="grid grid-cols-1 gap-3 mt-5">
              <div>
                <span className="text-xs text-gray-600 dark:text-slate-300 mb-1 block">
                  Total Hours
                </span>

                <TimePicker
                  defaultValue={shift.working_hours}
                  onChange={(val) => handleChange("working_hours", val)}
                />
              </div>
            </div>
          </div>
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
                  handleChange("break_duration", minutesToHHMM(0 || ""));
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
    </section>
  );
};

export default SingleAndNight;
