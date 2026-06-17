import { useEffect } from "react";
import Input from "../Theme/Input";
import TimePicker from "../ui/TimePicker";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/utils";

const shiftTime = (timeStr, offsetMinutes) => {
  if (!timeStr) return "00:00";
  const [h, m] = timeStr.split(":").map(Number);
  let total = h * 60 + m + offsetMinutes;
  if (total < 0) total += 1440;
  total = total % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const Dual = ({ shift = "", handleChange = () => {} }) => {
  // Auto-update S1 Clock-In/Out Window
  useEffect(() => {
    if (!shift.on_duty_time || !shift.off_duty_time) return;
    handleChange("beginning_in", shiftTime(shift.on_duty_time, -60));
    handleChange("beginning_out", shiftTime(shift.on_duty_time, 60));
    handleChange("ending_in", shiftTime(shift.off_duty_time, -60));
    handleChange("ending_out", shiftTime(shift.off_duty_time, 60));
  }, [shift.on_duty_time, shift.off_duty_time]);

  // Auto-update S2 Clock-In/Out Window
  useEffect(() => {
    if (!shift.on_duty_time1 || !shift.off_duty_time1) return;
    handleChange("beginning_in1", shiftTime(shift.on_duty_time1, -60));
    handleChange("beginning_out1", shiftTime(shift.on_duty_time1, 60));
    handleChange("ending_in1", shiftTime(shift.off_duty_time1, -60));
    handleChange("ending_out1", shiftTime(shift.off_duty_time1, 60));
  }, [shift.on_duty_time1, shift.off_duty_time1]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            calendar_clock
          </span>
          Session shift
        </h3>
        <span className="text-xs bg-surface-dark border border-gray-200 dark:dark:border-white/10 px-2 py-1 rounded text-gray-600 dark:text-slate-300">
          Multiple IN/OUT
        </span>
      </div>
      <div className="bg-surface-dark border border-gray-200 dark:dark:border-white/10 rounded-xl p-5 shadow-lg flex flex-col gap-4">
        <div className="bg-white dark:bg-[#1e293b]/50 border border-gray-200 dark:dark:border-white/10 rounded-lg p-4 group hover:border-gray-200 dark:dark:border-white/10/80 transition-all">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4 border-b border-gray-200 dark:dark:border-white/10 pb-4">
            <div className="flex items-center gap-3 w-full">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <span className="text-xs font-bold">S1</span>
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[10px] uppercase font-bold text-gray-600 dark:text-slate-300 tracking-wider">
                  Session Name
                </label>
                <Input
                  value={shift.first_session_name}
                  onChange={(e) =>
                    handleChange("first_session_name", e.target.value || "")
                  }
                  placeholder="e.g. Afternoon"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="material-symbols-outlined text-[14px]">
                  login
                </span>
                On Duty
              </label>

              <TimePicker
                value={shift.on_duty_time}
                onChange={(val) => handleChange("on_duty_time", val)}
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-[14px]">
                  logout
                </span>
                Off Duty
              </label>
              <TimePicker
                value={shift.off_duty_time}
                onChange={(val) => handleChange("off_duty_time", val)}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-surface-dark ">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-600 dark:text-slate-300 block">
                Clock-In Window
              </span>
              <div className="flex gap-2">
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    Start
                  </span>
                  <TimePicker
                    value={shift.beginning_in}
                    onChange={(val) => handleChange("beginning_in", val)}
                  />
                </div>
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    End
                  </span>
                  <TimePicker
                    value={shift.beginning_out}
                    onChange={(val) => handleChange("beginning_out", val)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-600 dark:text-slate-300 block">
                Clock-Out Window
              </span>
              <div className="flex gap-2">
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    Start
                  </span>
                  <TimePicker
                    value={shift.ending_in}
                    onChange={(val) => handleChange("ending_in", val)}
                  />
                </div>
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    End
                  </span>
                  <TimePicker
                    value={shift.ending_out}
                    onChange={(val) => handleChange("ending_out", val)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1e293b]/50 border border-gray-200 dark:dark:border-white/10 rounded-lg p-4 group hover:border-gray-200 dark:dark:border-white/10/80 transition-all">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4 border-b border-gray-200 dark:dark:border-white/10 pb-4">
            <div className="flex items-center gap-3 w-full">
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <span className="text-xs font-bold">S2</span>
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[10px] uppercase font-bold text-gray-600 dark:text-slate-300 tracking-wider">
                  Session Name
                </label>

                <Input
                  value={shift.second_session_name}
                  onChange={(e) =>
                    handleChange("second_session_name", e.target.value || "")
                  }
                  placeholder="e.g. Afternoon"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="material-symbols-outlined text-[14px]">
                  login
                </span>
                On Duty
              </label>
              <TimePicker
                value={shift.on_duty_time1}
                onChange={(val) => handleChange("on_duty_time1", val)}
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-[14px]">
                  logout
                </span>
                Off Duty
              </label>
              <TimePicker
                value={shift.off_duty_time1}
                onChange={(val) => handleChange("off_duty_time1", val)}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-surface-dark border border-gray-200 dark:dark:border-white/10">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-600 dark:text-slate-300 block">
                Clock-In Window
              </span>
              <div className="flex gap-2">
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    Start
                  </span>
                  <TimePicker
                    value={shift.beginning_in1}
                    onChange={(val) => handleChange("beginning_in1", val)}
                  />
                </div>
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    End
                  </span>
                  <TimePicker
                    value={shift.beginning_out1}
                    onChange={(val) => handleChange("beginning_out1", val)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-600 dark:text-slate-300 block">
                Clock-Out Window
              </span>
              <div className="flex gap-2">
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    Start
                  </span>
                  <TimePicker
                    value={shift.ending_in1}
                    onChange={(val) => handleChange("ending_in1", val)}
                  />
                </div>
                <div className="w-full">
                  <span className="text-[10px] text-gray-600 dark:text-slate-300 block mb-0.5">
                    End
                  </span>
                  <TimePicker
                    value={shift.ending_out1}
                    onChange={(val) => handleChange("ending_out1", val)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dual;
