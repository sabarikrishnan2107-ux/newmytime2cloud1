import { dashboardGetCountslast7DaysChart } from "@/lib/endpoint/dashboard";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.day}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white tabular-nums">
        {p.value} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">attended</span>
      </p>
    </div>
  );
}

function AttendanceCard({ branch_ids, department_ids }) {
  const [stats, setStats] = useState([
    { day: "M", value: 100, fill: "#14b8a6" },
    { day: "T", value: 100, fill: "#06b6d4" },
    { day: "W", value: 100, fill: "#10b981" },
    { day: "T", value: 100, fill: "#6366f1" },
    { day: "F", value: 100, fill: "#a855f7" },
    { day: "S", value: 100, fill: "#f59e0b" },
    { day: "S", value: 100, fill: "#ef4444" },
  ]);

  useEffect(() => {
    const fetchAttendanceCounts = async () => {
      setStats(
        await dashboardGetCountslast7DaysChart({ branch_ids, department_ids }),
      );
    };

    fetchAttendanceCounts();
  }, [branch_ids, department_ids]);

  const { avg, total, peak, trend } = useMemo(() => {
    if (!stats.length) return { avg: 0, total: 0, peak: 0, trend: 0 };
    const total = stats.reduce((s, x) => s + (x.value || 0), 0);
    const avg = Math.round(total / stats.length);
    const peak = Math.max(...stats.map((x) => x.value || 0));
    const first = stats[0]?.value || 0;
    const last = stats[stats.length - 1]?.value || 0;
    const trend = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
    return { avg, total, peak, trend };
  }, [stats]);

  return (
    <>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
            Attendance Volume
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Weekly Distribution</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className={`h-3.5 w-3.5 ${trend >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
            <span className={`text-[11px] font-semibold tabular-nums ${trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {trend >= 0 ? "+" : ""}{trend}%
            </span>
          </div>
        </div>
      </div>

      {/* Inline summary chips */}
      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Avg </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{avg}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Peak </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{peak}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{total}</span>
        </div>
      </div>

      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stats}
            margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
          >
            <defs>
              {stats.map((s, i) => (
                <linearGradient key={`g-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.fill} stopOpacity="1" />
                  <stop offset="100%" stopColor={s.fill} stopOpacity="0.55" />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.6 }}
              dy={4}
            />
            <YAxis hide />
            <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} content={<ChartTooltip />} />
            <ReferenceLine y={avg} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={22} animationDuration={700}>
              {stats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#barGrad-${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default AttendanceCard;
