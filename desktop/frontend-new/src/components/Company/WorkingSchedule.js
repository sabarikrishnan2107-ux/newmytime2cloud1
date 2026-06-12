import React, { useState } from 'react';
import TimePicker from '../ui/TimePicker';
import DropDown from '../ui/DropDown';

const WorkingSchedule = () => {
  // Initial state for the 7 days of the week
  const [schedule, setSchedule] = useState([
    { day: "Monday", active: true, start: "09:00", end: "18:00" },
    { day: "Tuesday", active: true, start: "09:00", end: "18:00" },
    { day: "Wednesday", active: true, start: "09:00", end: "18:00" },
    { day: "Thursday", active: true, start: "09:00", end: "18:00" },
    { day: "Friday", active: true, start: "09:00", end: "17:00" },
    { day: "Saturday", active: false, start: "", end: "" },
    { day: "Sunday", active: false, start: "", end: "" },
  ]);

  const [weekendConfig, setWeekendConfig] = useState({
    off1: "Sunday",
    off2: "Saturday"
  });

  const toggleDay = (index) => {
    const newSchedule = [...schedule];
    newSchedule[index].active = !newSchedule[index].active;
    setSchedule(newSchedule);
  };

  const updateTime = (index, field, value) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  return (
    <div className="mx-auto flex flex-col gap-8">

      {/* Standard Office Hours Section */}
      <div className="glass-card rounded-2xl shadow-sm p-6 md:p-8 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400 rounded-xl">
            <span className="material-symbols-outlined">schedule</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-600 dark:text-gray-300">Standard Office Hours</h2>
            <p className="text-sm text-slate-500">Configure your default weekly operations</p>
          </div>
        </div>

        <div className="space-y-1">
          {/* Header Labels */}
          <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
            <div className="col-span-4">Day</div>
            <div className="col-span-8 flex gap-4">
              <span className="w-1/2">Start Time</span>
              <span className="w-1/2">End Time</span>
            </div>
          </div>

          {/* Daily Rows */}
          {schedule.map((item, index) => (
            <div
              key={item.day}
              className={`flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-4 p-4 rounded-xl transition-colors border
      ${item.active
                  ? "bg-white/40 hover:bg-indigo-50/30 border-transparent dark:bg-slate-800/60 dark:hover:bg-indigo-500/10 dark:border-slate-700"
                  : "bg-slate-50/50 hover:bg-slate-100/50 border-transparent dark:bg-slate-800/30 dark:hover:bg-slate-700/40"
                }`}
            >
              {/* Day + Toggle */}
              <div className="col-span-4 flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={item.active}
                    onChange={() => toggleDay(index)}
                  />
                  <div
                    className="w-11 h-6 rounded-full
          bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300
          dark:bg-slate-700 dark:peer-focus:ring-indigo-500
          peer-checked:bg-indigo-600
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:h-5 after:w-5 after:rounded-full after:bg-white
          after:border after:border-slate-300 after:transition-all
          peer-checked:after:translate-x-full"
                  />
                </label>

                <span
                  className={`font-semibold
          ${item.active
                      ? "text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                    }`}
                >
                  {item.day}
                </span>
              </div>

              {/* Time inputs */}
              <div
                className={`col-span-8 flex gap-4
        ${!item.active && "opacity-50 pointer-events-none"}`}
              >

                <TimePicker value={item.start} />
                <TimePicker value={item.end} />


              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Weekend Configuration Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm dark:shadow-none p-6 md:p-8 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 rounded-xl">
            <span className="material-symbols-outlined">weekend</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Weekend Configuration
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Define standard weekly time-off policies
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300">
              Weekly Off 1
            </label>
            <DropDown
              items={[
                { "id": "Saturday", "name": "Saturday" },
                { "id": "Sunday", "name": "Sunday" },
                { "id": "Monday", "name": "Monday" },
              ]
              }
              value={schedule.shift_type_id}
              onChange={(id) => handleChange("shift_type_id", id)}
              placeholder="Select Shift Type"
              width="w-full"
            />


          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300">
              Weekly Off 2
            </label>
            <DropDown
              items={[
                { "id": "Saturday", "name": "Saturday" },
                { "id": "Sunday", "name": "Sunday" },
                { "id": "None", "name": "None" },
              ]
              }
              value={schedule.shift_type_id}
              onChange={(id) => handleChange("shift_type_id", id)}
              placeholder="Select Shift Type"
              width="w-full"
            />

          </div>
        </div>
      </div>


    </div>
  );
};

export default WorkingSchedule;