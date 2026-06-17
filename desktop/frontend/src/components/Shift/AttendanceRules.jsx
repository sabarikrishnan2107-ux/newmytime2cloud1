"use client";

import React, { useEffect, useState } from "react";
import DropDown from "../ui/DropDown";
import Input from "../Theme/Input";
import TimePicker from "../ui/TimePicker";
import ToggleCard from "../ui/ToggleCard";
import { minutesToHHMM, hhmmToMinutes } from "../../lib/utils";

const shiftTime = (timeStr, offsetMinutes) => {
  if (!timeStr) return "00:00";
  const [h, m] = timeStr.split(":").map(Number);
  let total = h * 60 + m + offsetMinutes;
  if (total < 0) total += 1440;
  total = total % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const DEFAULT_HALFDAY = {
  enabled: false,
  day: "S",
  onDuty: "09:00",
  offDuty: "01:00",
  minHours: 4,
  beginStart: "08:30",
  beginEnd: "09:30",
  endStart: "12:30",
  endEnd: "02:00",
};

const DEFAULT_WEEKOFF = {
  type: "Fixed",
  days: ["S", "Su"],
  cycle: "Weekly",
  count: 2,
  even: [],
  odd: [],
};

const DAYS = [
  { key: "M", label: "M" },
  { key: "T", label: "T" },
  { key: "W", label: "W" },
  { key: "Th", label: "T" }, // keeps your original UI (2nd T = Thursday)
  { key: "F", label: "F" },
  { key: "S", label: "S" },
  { key: "Su", label: "S" },
];

const dayBtnBase =
  "w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors";
const dayBtnOff =
  "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white";
const dayBtnOn =
  "bg-primary text-white ring-1 ring-primary ring-offset-1 ring-offset-transparent shadow-sm";

const toggleArrayValue = (array, value) => {
  return array.includes(value)
    ? array.filter((item) => item !== value) // Remove if exists
    : [...array, value]; // Add if missing
};

function DayButtons({ valueArray, onChange }) {
  return (
    <div className="flex space-x-2">
      {DAYS.map((d) => {
        // Use includes instead of .has()
        const active = valueArray.includes(d.key);

        return (
          <button
            key={d.key}
            type="button"
            className={`${dayBtnBase} ${active ? dayBtnOn : dayBtnOff}`}
            onClick={() => onChange(toggleArrayValue(valueArray, d.key))}
            aria-pressed={active}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AttendanceRules({ shift, handleChange }) {
  const [selectedOverTimeType, setSelectedOverTimeType] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [beforeDuty, setBeforeDuty] = useState(
    shift?.overtime_type == "Both" || shift?.overtime_type == "Before"
      ? true
      : false,
  );
  const [afterDuty, setAfterDuty] = useState(
    shift?.overtime_type == "Both" || shift?.overtime_type == "After"
      ? true
      : false,
  );

  const [weekendOt, setWeekendOt] = useState(shift?.weekend_allowed_ot);
  const [holidayOt, setHolidayOt] = useState(shift?.holiday_allowed_ot);

  const toggleConfig = [
    { label: "Before Duty", state: beforeDuty, setter: setBeforeDuty },
    { label: "After Duty", state: afterDuty, setter: setAfterDuty },
    { label: "Weekend OT", state: weekendOt, setter: setWeekendOt },
    { label: "Holiday OT", state: holidayOt, setter: setHolidayOt },
  ];

  const [fixedDays, setFixedDays] = useState(shift?.weekoff_rules?.days || ["S", "Su"]);

  console.log(shift?.weekoff_rules);

  const [halfDay, setHalfDay] = useState(DEFAULT_HALFDAY);
  const [weekOffRules, setWeekOffRules] = useState(DEFAULT_WEEKOFF);

  useEffect(() => {
    if (!shift) return;
    setHalfDay({ ...DEFAULT_HALFDAY, ...(shift.halfday_rules || {}) });
    setWeekOffRules({ ...DEFAULT_WEEKOFF, ...(shift.weekoff_rules || {}) });
    setHydrated(true);
  }, [shift?.id]); // <-- IMPORTANT: stable dependency


  useEffect(() => {
    setWeekOffRules((p) => ({ ...p, days: fixedDays }));
  }, [fixedDays]);

  useEffect(() => {
    handleChange("weekoff_rules", weekOffRules);
  }, [weekOffRules]);

  useEffect(() => {
    handleChange("halfday_rules", halfDay);
  }, [halfDay]);

  // Auto-update Beginning/Ending Window when onDuty/offDuty changes
  useEffect(() => {
    if (!halfDay.onDuty || !halfDay.offDuty) return;
    setHalfDay((p) => ({
      ...p,
      beginStart: shiftTime(p.onDuty, -60),
      beginEnd: shiftTime(p.onDuty, 60),
      endStart: shiftTime(p.offDuty, -60),
      endEnd: shiftTime(p.offDuty, 60),
    }));
  }, [halfDay.onDuty, halfDay.offDuty]);

  useEffect(() => {
    if (beforeDuty && afterDuty) {
      setSelectedOverTimeType("Both");
    } else if (!beforeDuty && !afterDuty) {
      setSelectedOverTimeType("None");
    } else if (beforeDuty) {
      setSelectedOverTimeType("Before");
    } else if (afterDuty) {
      setSelectedOverTimeType("After");
    }
  }, [beforeDuty, afterDuty]);

  useEffect(() => {
    handleChange("overtime_type", selectedOverTimeType);
  }, [selectedOverTimeType]);

  useEffect(() => {
    handleChange("weekend_allowed_ot", weekendOt);
  }, [weekendOt]);

  useEffect(() => {
    handleChange("holiday_allowed_ot", holidayOt);
  }, [holidayOt]);

  return (
    <div className="lg:col-span-8 space-y-6">
      <section className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border p-6 transition-colors">
        <div className="flex items-center mb-5 text-primary">
          <span className="material-symbols-outlined mr-2">tune</span>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            Policies &amp; Exceptions
          </h3>
        </div>

        <div className="space-y-4">
          {/* Weekend Config */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-border flex flex-col xl:flex-row xl:items-start gap-6 transition-colors">
            <div className="flex items-start xl:w-1/4 mt-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-3 mt-1">
                <span className="material-symbols-outlined text-sm">
                  weekend
                </span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Weekend Config
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Weekly off policy
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Weekend Type
                  </label>
                  <div className="relative">
                    <DropDown
                      items={[
                        { id: "Fixed", name: "Fixed" },
                        { id: "Flexible", name: "Flexible" },
                        { id: "Alternating", name: "Alternating" },
                      ]}
                      value={weekOffRules.type}
                      onChange={(e) =>
                        setWeekOffRules((p) => ({ ...p, type: e }))
                      }
                      placeholder="Select Day"
                      width="w-full"
                    />
                  </div>
                </div>

                {/* Fixed */}
                {weekOffRules.type === "Fixed" && (
                  <div className="w-full md:w-2/3">
                    <label className="block text-xs text-gray-500 mb-1 font-medium">
                      Select Days
                    </label>
                    <DayButtons
                      valueArray={fixedDays}
                      onChange={setFixedDays}
                    />
                  </div>
                )}

                {/* Flexible */}
                {weekOffRules.type === "Flexible" && (
                  <div className="w-full md:w-2/3 flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2">
                      <label className="block text-xs text-gray-500 mb-1 font-medium">
                        Cycle
                      </label>
                      <DropDown
                        items={[
                          { id: "Weekly", name: "Weekly" },
                          { id: "Monthly", name: "Monthly" },
                        ]}
                        value={weekOffRules.cycle}
                        onChange={(e) =>
                          setWeekOffRules((p) => ({ ...p, cycle: e }))
                        }
                        placeholder="Select Day"
                        width="w-full"
                      />
                    </div>

                    <div className="w-full md:w-1/2">
                      <label className="block text-xs text-gray-500 mb-1 font-medium">
                        Number of Days
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="e.g. 2"
                          value={weekOffRules.count}
                          onChange={(e) =>
                            setWeekOffRules((p) => ({
                              ...p,
                              count: e.target.value,
                            }))
                          }
                        />
                        <span className="text-xs text-gray-400 absolute right-3 top-2.5">
                          days
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alternating */}
                {weekOffRules.type === "Alternating" && (
                  <div className="w-full md:w-2/3 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 font-medium">
                        Even Weeks
                      </label>
                      <DayButtons
                        valueArray={weekOffRules?.even}
                        onChange={(e) =>
                          setWeekOffRules((p) => ({ ...p, even: e }))
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1 font-medium">
                        Odd Weeks
                      </label>
                      <DayButtons
                        valueArray={weekOffRules?.odd}
                        onChange={(e) =>
                          setWeekOffRules((p) => ({ ...p, odd: e }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Half Day */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-border flex flex-col xl:flex-row xl:items-start gap-6 transition-colors">
            <div className="flex items-start xl:w-1/4 mt-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3 mt-1">
                <span className="material-symbols-outlined text-sm">
                  contrast
                </span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Half Day
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Weekly short duration
                </p>

                <label className="flex items-center cursor-pointer mt-2">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!halfDay.enabled}
                      onChange={(e) =>
                        setHalfDay((p) => ({ ...p, enabled: e.target.checked }))
                      }
                    />

                    <div className="block bg-gray-300 dark:bg-gray-700 w-9 h-5 rounded-full transition-colors peer-checked:bg-emerald-500 peer-checked:dark:bg-emerald-500" />
                    <div className="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform transform peer-checked:translate-x-full" />
                  </div>
                  <span className="ml-2 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                    Enable
                  </span>
                </label>
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Day
                  </label>
                  <DropDown
                    items={[
                      { id: "M", name: "Monday" },
                      { id: "T", name: "Tuesday" },
                      { id: "W", name: "Wednesday" },
                      { id: "Th", name: "Thursday" },
                      { id: "F", name: "Friday" },
                      { id: "S", name: "Saturday" },
                      { id: "Su", name: "Sunday" },
                    ]}
                    value={halfDay.day}
                    onChange={(e) => setHalfDay((p) => ({ ...p, day: e }))}
                    placeholder="Select Day"
                    width="w-full"
                    disabled={!halfDay.enabled}
                  />
                </div>

                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    On Duty
                  </label>
                  <div className="relative">
                    <TimePicker
                      defaultValue={halfDay.onDuty}
                      onChange={(e) => setHalfDay((p) => ({ ...p, onDuty: e }))}
                      disabled={!halfDay.enabled}
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Off Duty
                  </label>
                  <div className="relative">
                    <TimePicker
                      defaultValue={halfDay.offDuty}
                      onChange={(e) =>
                        setHalfDay((p) => ({ ...p, offDuty: e }))
                      }
                      disabled={!halfDay.enabled}
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Min. Working Hours
                  </label>
                  <div className="relative">
                    <TimePicker
                      defaultValue={halfDay.minHours}
                      onChange={(e) =>
                        setHalfDay((p) => ({ ...p, minHours: e }))
                      }
                      disabled={!halfDay.enabled}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-200 dark:border-gray-800">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Beginning Window
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">
                        Start
                      </label>
                      <TimePicker
                        value={halfDay.beginStart}
                        onChange={(e) =>
                          setHalfDay((p) => ({ ...p, beginStart: e }))
                        }
                        disabled={!halfDay.enabled}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">
                        End
                      </label>
                      <TimePicker
                        value={halfDay.beginEnd}
                        onChange={(e) =>
                          setHalfDay((p) => ({ ...p, beginEnd: e }))
                        }
                        disabled={!halfDay.enabled}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Ending Window
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">
                        Start
                      </label>
                      <TimePicker
                        value={halfDay.endStart}
                        onChange={(e) =>
                          setHalfDay((p) => ({ ...p, endStart: e }))
                        }
                        disabled={!halfDay.enabled}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">
                        End
                      </label>
                      <TimePicker
                        value={halfDay.endEnd}
                        onChange={(e) =>
                          setHalfDay((p) => ({ ...p, endEnd: e }))
                        }
                        disabled={!halfDay.enabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overtime Config */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-border flex flex-col xl:flex-row xl:items-center gap-4 transition-colors">
            <div className="flex items-start xl:w-1/4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 mt-1">
                <span className="material-symbols-outlined text-sm">
                  more_time
                </span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Overtime Config
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Rules for extra hours
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {toggleConfig.map((item, index) => (
                  <ToggleCard
                    key={index}
                    label={item.label}
                    checked={item.state}
                    onChange={() => item.setter(!item.state)}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-200 dark:border-gray-800">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Eligibility Threshold
                  </label>
                  <div className="relative">
                    <Input
                      value={hhmmToMinutes(shift.overtime_interval)}
                      onChange={(e) =>
                        handleChange(
                          "overtime_interval",
                          minutesToHHMM(e.target.value) || "",
                        )
                      }
                    />
                    <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                      mins
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Min. work required to qualify for OT
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Max Allowed OT
                  </label>
                  <div className="relative">
                    <Input
                      value={hhmmToMinutes(shift.daily_ot_allowed_mins)}
                      onChange={(e) =>
                        handleChange(
                          "daily_ot_allowed_mins",
                          minutesToHHMM(e.target.value) || "",
                        )
                      }
                    />
                    <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                      mins
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Daily cap on overtime hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Late Rules */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-border flex flex-col xl:flex-row xl:items-start gap-4 transition-colors">
            <div className="flex items-start xl:w-1/4 mt-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-3 mt-1">
                <span className="material-symbols-outlined text-sm">
                  hourglass_bottom
                </span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Late Rules
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Late entry penalties
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div className="flex flex-col md:flex-row items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                <div className="flex items-center min-w-[200px]">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                    Late Threshold
                  </span>
                  <div className="relative flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      &gt;
                    </span>

                    <div className="relative">
                      <Input
                        value={hhmmToMinutes(shift.late_time)}
                        onChange={(e) =>
                          handleChange(
                            "late_time",
                            minutesToHHMM(e.target.value),
                          )
                        }
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                        mins
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Action: {shift.attendanc_rule_late_coming}
                  </span>
                  <div className="relative flex-1 w-full">
                    <DropDown
                      items={[
                        { id: "Late Mark", name: "Late Mark" },
                        { id: "No Action", name: "No Action" },
                      ]}
                      value={shift.attendanc_rule_late_coming}
                      onChange={(id) =>
                        handleChange("attendanc_rule_late_coming", id)
                      }
                      placeholder="Select Day"
                      width="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="flex items-center min-w-[200px]">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                    Significant Delay
                  </span>
                  <div className="relative flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      &gt;
                    </span>

                    <div className="relative">
                      <Input
                        value={hhmmToMinutes(shift.absent_min_in)}
                        onChange={(e) =>
                          handleChange(
                            "absent_min_in",
                            minutesToHHMM(e.target.value),
                          )
                        }
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                        mins
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Action:
                  </span>
                  <div className="relative flex-1 w-full">
                    <DropDown
                      items={[
                        { id: "No Action", name: "No Action" },
                        { id: "Half Day", name: "Half Day" },
                        { id: "Absent", name: "Absent" },
                      ]}
                      value={shift.significant_attendanc_rule_late_coming}
                      onChange={(id) =>
                        handleChange(
                          "significant_attendanc_rule_late_coming",
                          id,
                        )
                      }
                      placeholder="Select Day"
                      width="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Early Out Rules */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-border flex flex-col xl:flex-row xl:items-start gap-4 transition-colors">
            <div className="flex items-start xl:w-1/4 mt-2">
              <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mr-3 mt-1">
                <span className="material-symbols-outlined text-sm">
                  logout
                </span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Early Out Rules
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Early exit penalties
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div className="flex flex-col md:flex-row items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                <div className="flex items-center min-w-[200px]">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                    Early Exit
                  </span>
                  <div className="relative flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      &gt;
                    </span>

                    <div className="relative">
                      <Input
                        value={hhmmToMinutes(shift.early_time)}
                        onChange={(e) =>
                          handleChange(
                            "early_time",
                            minutesToHHMM(e.target.value),
                          )
                        }
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                        mins
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Action:
                  </span>
                  <div className="relative flex-1 w-full">
                    <DropDown
                      items={[
                        { id: "Early Mark", name: "Early Mark" },
                        { id: "No Action", name: "No Action" },
                      ]}
                      value={shift.attendanc_rule_early_going}
                      onChange={(id) =>
                        handleChange("attendanc_rule_early_going", id)
                      }
                      placeholder="Select Day"
                      width="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="flex items-center min-w-[200px]">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                    Major Early Exit
                  </span>
                  <div className="relative flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      &gt;
                    </span>
                    <div className="relative">
                      <Input
                        value={hhmmToMinutes(shift.absent_min_out)}
                        onChange={(e) =>
                          handleChange(
                            "absent_min_out",
                            minutesToHHMM(e.target.value),
                          )
                        }
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                        mins
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Action:
                  </span>
                  <div className="relative flex-1 w-full">
                    <DropDown
                      items={[
                        { id: "No Action", name: "No Action" },
                        { id: "Half Day", name: "Half Day" },
                        { id: "Absent", name: "Absent" },
                      ]}
                      value={shift.significant_attendanc_rule_early_going}
                      onChange={(id) =>
                        handleChange(
                          "significant_attendanc_rule_early_going",
                          id,
                        )
                      }
                      placeholder="Select Day"
                      width="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
