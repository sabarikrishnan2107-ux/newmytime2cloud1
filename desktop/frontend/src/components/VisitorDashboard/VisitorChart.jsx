"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { day: "Mon", visitors: 20 },
  { day: "Tue", visitors: 35 },
  { day: "Wed", visitors: 30 },
  { day: "Thu", visitors: 40 },
  { day: "Fri", visitors: 25 },
  { day: "Sat", visitors: 15 },
  { day: "Sun", visitors: 10 },
];

export default function VisitorChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="visitors" stroke="#2563eb" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
