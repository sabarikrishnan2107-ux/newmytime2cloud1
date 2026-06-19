import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { getUpcomingLeaves } from "@/lib/endpoint/leaves"; // Import your endpoint

export default function TeamAvailability() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data = await getUpcomingLeaves();

        const mappedData = data.map((e) => ({
          name: e?.employee?.first_name,
          profile_picture: e?.employee?.profile_picture,
          date: e.start_date,
          duration: `${getDayDifference(e.start_date, e.end_date)} Days`,
        }));

        setProfiles(mappedData);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoading(false);
      }
    }; fetchProfiles();
  }, []);

  const getDayDifference = (start_date, end_date) => {
    const from = new Date(start_date);
    const to = new Date(end_date);
    return Math.max(1, Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1);
  };

  return (
    /* Removed borders, shadow, and background so it inherits from your p-8 parent */
    <div className="flex flex-col h-full w-full overflow-hidden">

      {/* Header: Adjusted padding to align with the list */}
      <div className="pb-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-500" />
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
            Team on Leave
          </span>
        </div>
        <span className="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-0.5 rounded-md font-bold">
          {profiles.length}
        </span>
      </div>

      {/* Scrollable List: Removed max-height so it fills the parent's p-8 box */}
      <div className="overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading...</div>
        ) : profiles.length > 0 ? (
          <table className="w-full border-separate border-spacing-y-2">
            <tbody>
              {profiles.map((item, index) => (
                <tr
                  key={index}
                  className="group transition-colors hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl"
                >
                  <td className="py-2 w-8">
                    <img
                      src={item.profile_picture || `https://ui-avatars.com/api/?name=${item.name}`}
                      className="h-7 w-7 rounded-full object-cover border border-gray-100 dark:border-white/10"
                    />
                  </td>
                  <td className="px-2 py-2 text-[11px] font-semibold text-slate-700 dark:text-gray-200">
                    {item.name}
                  </td>
                  <td className="px-2 py-2 text-right text-[10px] text-slate-400">
                    {item.date}
                  </td>
                  <td className="pl-2 py-2 text-right text-[10px] font-bold text-slate-500">
                    {item.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-10 text-center text-[11px] text-slate-400 italic">
            No upcoming leaves
          </div>
        )}
      </div>
    </div>
  );
}