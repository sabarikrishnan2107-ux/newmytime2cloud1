import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
// Note: We only import the components actually needed for the Pie/Donut Chart.

// Data for Pie Chart (Absence Types)
const absenceTypeData = [
  { name: "Sick Leave", value: 7, color: "#EF4444" }, // Tailwind Red-500
  { name: "Personal Leave", value: 4, color: "#F59E0B" }, // Tailwind Amber-500
  { name: "Unexcused", value: 3, color: "#3B82F6" }, // Tailwind Blue-500
];

const totalAbsences = absenceTypeData.reduce(
  (sum, entry) => sum + entry.value,
  0
);

// Custom Tooltip component for a cleaner look
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = ((data.value / totalAbsences) * 100).toFixed(1);

    return (
      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-md text-sm font-medium">
        <p className="text-gray-900 font-semibold">{data.name}</p>
        <p className="text-gray-600">
          Cases: <span className="text-blue-600 font-bold">{data.value}</span>
        </p>
        <p className="text-gray-600">Share: {percentage}%</p>
      </div>
    );
  }

  return null;
};

// Custom Label for the Donut Chart (shows percentage outside)
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

  // Only show label if the segment is large enough to prevent clutter
  if (percent * 100 > 8) {
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-bold text-xs"
      >
        {(percent * 100).toFixed(0)}%
      </text>
    );
  }
  return null;
};

// Main Chart Component
const AbsenceTypeDonutChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        {/* The Donut Pie */}
        <Pie
          data={absenceTypeData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={80} // Creates the Donut hole
          outerRadius={120}
          paddingAngle={2} // Small gaps between slices
          fill="#8884d8"
          // Labeling for better visualization (optional, using custom label)
          labelLine={false}
          label={renderCustomizedLabel}
        >
          {absenceTypeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
          ))}
        </Pie>

        {/* Tooltip */}
        <Tooltip content={<CustomTooltip />} />

        {/* Legend - positioned at the bottom for better vertical spacing */}
        <Legend
          layout="horizontal"
          align="center"
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: "20px", fontSize: "0.875rem" }} // Tailwind text-sm
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default AbsenceTypeDonutChart;
