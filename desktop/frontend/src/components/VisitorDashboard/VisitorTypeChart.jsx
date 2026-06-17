"use client";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Clients", value: 50 },
  { name: "Vendors", value: 30 },
  { name: "Interviewees", value: 20 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

export default function VisitorTypeChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
