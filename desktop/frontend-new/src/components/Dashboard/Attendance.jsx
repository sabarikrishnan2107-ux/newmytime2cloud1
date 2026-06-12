const recentAbsences = [
  {
    id: "E104",
    name: "James T.",
    reason: "Sick Leave",
    date: "Oct 24",
    status: "Approved",
  },
  {
    id: "E201",
    name: "Laura M.",
    reason: "Personal Day",
    date: "Oct 24",
    status: "Pending",
  },
  {
    id: "E305",
    name: "Chris K.",
    reason: "Late Check-in",
    date: "Oct 25",
    status: "Missed Punch",
  },
];

export default function Attendance() {
  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-2xl">
      <h3 className="text-2xl font-bold text-gray-700 mb-5">
        Absent Employee
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recentAbsences.map((absence, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 transition duration-150"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {absence.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {absence.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {absence.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      absence.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : absence.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {absence.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="#" className="text-blue-600 hover:text-blue-800">
                    Review
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
