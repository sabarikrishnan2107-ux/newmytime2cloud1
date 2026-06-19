const CompanyAttendanceRating = () => {
  const ratings = [
    { percentage: "91% to 100%", rating: 5, description: "Excellent attendance" },
    { percentage: "81% to 90%", rating: 4.5, description: "Very good attendance" },
    { percentage: "71% to 80%", rating: 4, description: "Good attendance" },
    { percentage: "61% to 70%", rating: 3.5, description: "Satisfactory attendance" },
    { percentage: "51% to 60%", rating: 3, description: "Moderate attendance" },
    { percentage: "41% to 50%", rating: 2.5, description: "Below average attendance" },
    { percentage: "31% to 40%", rating: 2, description: "Poor attendance" },
    { percentage: "21% to 30%", rating: 1.5, description: "Very poor attendance" },
    { percentage: "11% to 20%", rating: 1, description: "Extremely low attendance" },
    { percentage: "0% to 10%", rating: 0, description: "No attendance" },
  ];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto dark:bg-slate-900 ">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                Attendance Percentage
              </th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                Rating
              </th>
              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((item, index) => (
              <tr
                key={index}
                className={
                  index % 2 === 0
                    ? "bg-white dark:bg-slate-900"
                    : "bg-slate-50 dark:bg-slate-950/40"
                }
              >
                <td className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-muted-foreground">
                  {item.percentage}
                </td>
                <td className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-muted-foreground ">
                  {item.rating}
                </td>
                <td className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-muted-foreground">
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyAttendanceRating;
