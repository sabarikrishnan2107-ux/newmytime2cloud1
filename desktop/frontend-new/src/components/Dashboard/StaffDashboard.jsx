"use client";

import { useEffect, useState } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { getUser } from "@/config";
import ProfilePicture from "../ProfilePicture";

const getEmployeeStatistics = async (params = {}) => {
  const queryParams = await buildQueryParams(params);
  const { data } = await api.get("/employee-statistics", { params: queryParams });
  return data;
};

const getEmployeeAttendanceToday = async (params = {}) => {
  const queryParams = await buildQueryParams(params);
  const today = new Date().toISOString().split("T")[0];
  const { data } = await api.get("/attendance_logs", {
    params: { ...queryParams, from_date: today, to_date: today, per_page: 50 },
  });
  return data;
};

const getEmployeeProfile = async () => {
  const { data } = await api.get("/employee-profile");
  return data;
};

export default function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await getUser();
        setUser(u);

        // Fetch stats
        const statsData = await getEmployeeStatistics({
          employee_id: u.employee_id || u.system_user_id,
          shift_type_id: 0,
        });
        setStats(statsData);

        // Fetch today's logs
        const logsData = await getEmployeeAttendanceToday({
          system_user_id: u.system_user_id || u.employee_id,
        });
        setTodayLogs(logsData?.data || []);
      } catch (err) {
        console.error("StaffDashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const todayIn = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1] : null;
  const todayOut = todayLogs.length > 1 ? todayLogs[0] : null;

  const statColors = {
    P: "text-emerald-400 border-l-emerald-500/50",
    A: "text-rose-400 border-l-rose-500/50",
    M: "text-amber-400 border-l-amber-500/50",
    ME: "text-blue-400 border-l-blue-500/50",
    L: "text-purple-400 border-l-purple-500/50",
    H: "text-slate-400 border-l-slate-500/50",
    LI: "text-orange-400 border-l-orange-500/50",
    EO: "text-red-400 border-l-red-500/50",
    O: "text-cyan-400 border-l-cyan-500/50",
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="px-2 mb-6">
        <h2 className="text-xl font-bold text-gray-600 dark:text-gray-300">
          My Dashboard
        </h2>
      </div>

      <div className="flex flex-col gap-5">
        {/* Profile + Today's Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile Card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="size-16 rounded-full overflow-hidden border-2 border-emerald-500/30">
                <ProfilePicture src={user?.profile_picture} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
                  {user?.first_name} {user?.last_name}
                </h3>
                <p className="text-xs text-slate-400">
                  ID: {user?.employee_id || user?.system_user_id}
                </p>
                <p className="text-xs text-slate-400">
                  {user?.branch_name || "---"} / {user?.department_name || "---"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 mb-1">Designation</p>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {user?.designation_name || "---"}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 mb-1">Company</p>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {user?.company_name || "---"}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Attendance */}
          <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">
              Today's Attendance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
                <p className="text-xs text-emerald-400 mb-2">Clock In</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {todayIn
                    ? new Date(todayIn.LogTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {todayIn ? todayIn.DeviceID?.startsWith("Camera") ? "Camera" : todayIn.DeviceID?.includes("Mobile") ? "Mobile" : "Device" : "Not clocked in"}
                </p>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 text-center">
                <p className="text-xs text-rose-400 mb-2">Clock Out</p>
                <p className="text-2xl font-bold text-rose-400">
                  {todayOut
                    ? new Date(todayOut.LogTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {todayOut ? todayOut.DeviceID?.startsWith("Camera") ? "Camera" : todayOut.DeviceID?.includes("Mobile") ? "Mobile" : "Device" : "Waiting"}
                </p>
              </div>
            </div>

            {/* Today's Log Timeline */}
            {todayLogs.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] text-slate-400 mb-2">All Logs Today</p>
                <div className="flex flex-wrap gap-2">
                  {[...todayLogs].reverse().map((log, i) => (
                    <div
                      key={i}
                      className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-300"
                    >
                      {new Date(log.LogTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span className="text-[9px] text-slate-500 ml-1">
                        {log.log_type === "In" ? "IN" : log.log_type === "Out" ? "OUT" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Statistics */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">
            This Month's Summary
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {Array.isArray(stats) &&
              stats.map((stat, i) => (
                <div
                  key={i}
                  className={`glass-card p-4 rounded-xl border-l-2 ${statColors[stat.Key] || "text-slate-400 border-l-slate-500/50"}`}
                >
                  <p className="text-[10px] text-slate-400 mb-1">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-300">
                    {stat.value}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">
            Recent Attendance Logs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-white/5">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Device</th>
                  <th className="text-left py-2 px-3">Mode</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 text-slate-300 hover:bg-white/5"
                  >
                    <td className="py-2 px-3">
                      {new Date(log.LogTime).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">
                      {new Date(log.LogTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 px-3">{log.gps_location || log.DeviceID}</td>
                    <td className="py-2 px-3">{log.mode || "---"}</td>
                    <td className="py-2 px-3">
                      {log.log_type === "In" ? (
                        <span className="text-emerald-400 font-medium">In</span>
                      ) : log.log_type === "Out" ? (
                        <span className="text-rose-400 font-medium">Out</span>
                      ) : (
                        "---"
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {todayLogs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      No attendance logs today
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
