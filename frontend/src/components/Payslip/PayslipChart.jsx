import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const data = [
  { month: "Jun", earnings: 4000, deductions: 800 },
  { month: "Jul", earnings: 4200, deductions: 900 },
  { month: "Aug", earnings: 4100, deductions: 850 },
  { month: "Sep", earnings: 4500, deductions: 1000 },
  { month: "Oct", earnings: 4800, deductions: 1100 },
  { month: "Nov", earnings: 5200, deductions: 1200 }, // Highlighted Month
];

const SalaryHistoryChart = () => {
  return (
    <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Salary History
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Earnings & Deductions
          </p>
        </div>
        <button className="text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          Full Report
        </button>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="80%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
          >
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y + 20}
                  fill={payload.value === "Nov" ? "#5c67f2" : "#999"}
                  fontWeight={payload.value === "Nov" ? "bold" : "normal"}
                  textAnchor="middle"
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis hide domain={[0, 8000]} />{" "}
            {/* Hidden Y-axis to keep it clean */}
            <Tooltip cursor={false} />
            {/* Background Track / Deductions */}
            <Bar
              dataKey="deductions"
              stackId="a"
              fill="#b49cd9"
              barSize={45}
              radius={[0, 0, 0, 0]} // Flat bottom
              background={{ fill: "#f8f9fc", radius: 10 }} // This creates the grey capsule track
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-deduct-${index}`}
                  fill={entry.month === "Nov" ? "#8b5cf6" : "#b49cd9"}
                />
              ))}
            </Bar>
            {/* Earnings (Stacked on top) */}
            <Bar
              dataKey="earnings"
              stackId="a"
              radius={[10, 10, 0, 0]} // Rounded top only
              barSize={45}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-earn-${index}`}
                  fill={entry.month === "Nov" ? "#6366f1" : "#a5b4fc"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalaryHistoryChart;
