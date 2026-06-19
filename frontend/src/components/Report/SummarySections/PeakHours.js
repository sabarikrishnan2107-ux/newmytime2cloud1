import { useDarkMode } from "@/context/DarkModeContext";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const departmentSegmentColors = ['text-blue-500', 'text-sky-400', 'text-emerald-500', 'text-orange-500'];

export default function PeakHours({ reportType, chartData, departmentDonutData, punctualityData }) {

  const departmentDonutSegments = departmentDonutData.reduce(
    (acc, department, index) => {
      acc.segments.push({
        key: `${department.name}-${index}`,
        dashArray: `${department.percentage} ${100 - department.percentage}`,
        dashOffset: -acc.offset,
        colorClass: departmentSegmentColors[index % departmentSegmentColors.length],
      });
      acc.offset += department.percentage;
      return acc;
    },
    { offset: 0, segments: [] }
  ).segments;

  const { isDark } = useDarkMode();

  return (

    <section className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6">
      {/* LEFT: MAIN TRENDS CHART */}
      <div className="lg:col-span-3 flex flex-col glass-panel rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wide">
              {reportType === 'daily' ? 'Peak Hours' : 'Daily Trends'}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
              {reportType === 'daily'
                ? 'Employee punch-in distribution by hour'
                : 'Stacked breakdown by day (Present vs Absent)'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {reportType === 'daily' ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Punches
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Present
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Absent
                </div>
              </>
            )}
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.1)' }}
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#f8fafc' : '#1e293b',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: isDark ? '#f8fafc' : '#1e293b' }}
                itemStyle={{ color: isDark ? '#f8fafc' : '#1e293b' }}
              />
              {reportType === 'daily' ? (
                <Bar dataKey="punches" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={30} />
              ) : (
                <>
                  <Bar dataKey="present" stackId="attendance" fill="#3b82f6" barSize={30} />
                  <Bar dataKey="absent" stackId="attendance" fill="#fb7185" radius={[3, 3, 0, 0]} barSize={30} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RIGHT: INSIGHTS COLUMN */}
      <div className="flex flex-col gap-4">
        {/* Dept Donut */}
        <div className="glass-panel rounded-xl p-5 shadow-sm">
          <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wide mb-4">
            By Department
          </h3>
          {departmentDonutData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="rotate-[-90deg]" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />
                  {departmentDonutSegments.map((segment) => (
                    <circle
                      key={segment.key}
                      cx="21"
                      cy="21"
                      r="15.9"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.dashOffset}
                      className={segment.colorClass}
                    />
                  ))}
                </svg>
              </div>
              <div className="flex flex-col gap-1 w-full">
                {departmentDonutData.map((department) => (
                  <div key={department.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 truncate max-w-[120px]">{department.name}</span>
                    <span className="font-bold dark:text-white">{department.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300">No department data found for selected filters.</p>
          )}
        </div>

        {/* Punctuality List */}
        <div className="glass-panel rounded-xl p-5 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wide">Punctuality</h3>
            <button className="text-[10px] text-blue-500 font-bold hover:underline">VIEW ALL</button>
          </div>
          <div className="flex flex-col gap-4">
            {punctualityData.length > 0 ? punctualityData.map((staff, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {staff.img ? (
                  <img src={staff.img} className="h-8 w-8 rounded-full ring-2 ring-emerald-500/20" alt="" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold ring-2 ring-blue-500/20">
                    {staff.initial}
                  </div>
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-bold truncate dark:text-white">{staff.name}</span>
                  <span className="text-[10px] text-slate-400">{staff.dept}</span>
                </div>
                <span className="text-xs font-bold text-emerald-500">{staff.score}</span>
              </div>
            )) : (
              <p className="text-xs text-slate-600 dark:text-slate-300">No punctuality data found for selected filters.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}