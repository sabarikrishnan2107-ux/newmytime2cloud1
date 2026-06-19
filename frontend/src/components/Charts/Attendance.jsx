import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const punctualityData = [
  { day: "Oct 15", percent: 95 },
  { day: "Oct 16", percent: 96 },
  { day: "Oct 17", percent: 98 },
  { day: "Oct 18", percent: 93 },
  { day: "Oct 19", percent: 97 },
  { day: "Oct 20", percent: 99 },
  { day: "Oct 21", percent: 94 },
];

export default function Attendance() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={punctualityData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="day" />
        <YAxis
          domain={[90, 100]}
          label={{
            value: "Punctuality (%)",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="percent"
          stroke="#10B981" // Green color
          strokeWidth={3}
          dot={{ r: 5 }}
          activeDot={{ r: 8 }}
          name="Punctuality (%)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
