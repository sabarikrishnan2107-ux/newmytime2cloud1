"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/config";
import { api, buildQueryParams } from "@/lib/api-client";
import { getStaffUser } from "@/lib/staff-user";
import { svcUrl } from "@/lib/runtimeHost";
import BirthdayPopup from "@/components/Employees/BirthdayPopup";

/* ── Metric Card ── */
const MetricCard = ({ icon, iconBg, label, value, suffix, badge, badgeColor }) => (
  <div className="staff-glass-card p-6 rounded-2xl relative overflow-hidden">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badgeColor}`}>{badge}</span>}
    </div>
    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">{label}</p>
    <h3 className="text-3xl font-bold font-headline">
      {value}
      {suffix && <span className="text-sm font-normal text-slate-500 ml-1">{suffix}</span>}
    </h3>
  </div>
);

/* ── Small Metric ── */
const SmallMetric = ({ icon, iconBg, label, value, unit, badge, badgeColor }) => (
  <div className="staff-glass-card p-4 rounded-xl">
    <div className="flex justify-between items-center mb-3">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
        <span className="material-symbols-outlined text-base">{icon}</span>
      </div>
      {badge && <span className={`text-[10px] font-bold ${badgeColor}`}>{badge}</span>}
    </div>
    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</p>
    <p className="text-lg font-bold font-headline mt-1">{value} <span className="text-xs font-normal text-slate-500">{unit}</span></p>
  </div>
);

/* ── Data ── */
const feedTabs = ["Announcement", "Holidays", "My Docs", "Visitors"];

const weeklyChart = [
  { day: "MON", hours: "8.2h", height: 120, highlight: false },
  { day: "TUE", hours: "9.1h", height: 150, highlight: true },
  { day: "WED", hours: "7.8h", height: 110, highlight: false },
  { day: "THU", hours: "8.5h", height: 130, highlight: false },
  { day: "FRI", hours: "5.0h", height: 80, highlight: false },
  { day: "SAT", hours: "6.4h", height: 98, highlight: false },
  { day: "SUN", hours: "4.8h", height: 72, highlight: false, muted: true },
];

export default function StaffDashboard() {
  const [activeFeedTab, setActiveFeedTab] = useState("Announcement");
  const [loading, setLoading] = useState(true);

  // REAL DATA from APIs
  const [userName, setUserName] = useState("Employee");
  const [profilePicture, setProfilePicture] = useState(null);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [expectedHours, setExpectedHours] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [earlyOutCount, setEarlyOutCount] = useState(0);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);
  const [holidayCount, setHolidayCount] = useState(0);
  const [weekOffCount, setWeekOffCount] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState("0:00");
  const [activityLog, setActivityLog] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [shiftName, setShiftName] = useState("---");
  const [shiftTime, setShiftTime] = useState("---");
  const [shiftDays, setShiftDays] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = await getStaffUser();
        const sysUserId = u.system_user_id || u.employee_id;
        const empId = sysUserId;

        // Show page immediately
        const localName = u?.employee_name || u?.name;
        setUserName(localName && localName !== "---" ? localName : "Employee");
        setProfilePicture(u?.employee_profile_picture || null);
        setLoading(false);

        const params = await buildQueryParams({});

        // Update name/photo (non-blocking)
        api.get("/me").then(({ data }) => {
          const me = data?.user;
          const name = me?.employee_name || me?.name;
          if (name && name !== "---") setUserName(name);
          if (me?.employee_profile_picture) setProfilePicture(me.employee_profile_picture);
        }).catch(() => {});

        // 1. Fetch all stats from /staff-stats (calculates from raw logs)
        try {
          const { data } = await api.get("/staff-stats", {
            params: { ...params, system_user_id: sysUserId, user_id: u.id },
          });
          setPresentCount(data.present || 0);
          setAbsentCount(data.absent || 0);
          setLateCount(data.late || 0);
          setEarlyOutCount(data.early_out || 0);
          setIncompleteCount(data.incomplete || 0);
          setLeaveCount(data.leave || 0);
          setHolidayCount(data.holiday || 0);
          setWeekOffCount(data.week_off || 0);
          setOvertimeHours(data.overtime || "0:00");
        } catch (e) { console.warn("Stats error", e); }

        // 2. Fetch shift schedule
        try {
          const { data } = await api.get("/employees_with_schedule_count", {
            params: { ...params, per_page: 50 },
          });
          const employees = data?.data || [];
          const myRecord = employees.find((e) => e.id === u.employee_id);
          const shift = myRecord?.schedule_active?.shift;
          if (shift) {
            setShiftName(shift.name || "---");
            const on = shift.on_duty_time || "---";
            const off = shift.off_duty_time || "---";
            setShiftTime(on !== "---" && off !== "---" ? `${on} - ${off}` : "---");
            setShiftDays(shift.days || []);
          }
        } catch (e) { console.warn("Shift error", e); }

        // 3. Calculate monthly hours from logs (first log - last log per day)
        try {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          const today = now.toISOString().split("T")[0];
          const { data } = await api.get("/attendance_logs", {
            params: { ...params, from_date: monthStart, to_date: today, system_user_id: sysUserId, per_page: 100 },
          });
          const logs = data?.data || [];

          // Group logs by date
          const byDate = {};
          logs.forEach((log) => {
            const date = log.LogTime?.split(" ")[0] || log.LogTime?.split("T")[0];
            if (!byDate[date]) byDate[date] = [];
            byDate[date].push(new Date(log.LogTime));
          });

          // Sum hours per day (last - first)
          let totalMins = 0;
          Object.values(byDate).forEach((dayLogs) => {
            if (dayLogs.length >= 2) {
              dayLogs.sort((a, b) => a - b);
              const first = dayLogs[0];
              const last = dayLogs[dayLogs.length - 1];
              totalMins += (last - first) / 60000;
            }
          });

          setMonthlyHours(Math.round(totalMins / 60));

          // Expected hours = working days in month * shift hours (default 8)
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const workingDays = Math.round(daysInMonth * 5 / 7); // rough estimate
          setExpectedHours(workingDays * 8);
        } catch (e) { console.warn("Monthly hours error", e); }

        // 4. Build weekly chart from same monthly logs
        try {
          const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
          const fullDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const todayIdx = now.getDay(); // 0=Sun
          const mondayOffset = todayIdx === 0 ? -6 : 1 - todayIdx;
          const monday = new Date(now);
          monday.setDate(now.getDate() + mondayOffset);
          monday.setHours(0, 0, 0, 0);

          const weekDays = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            weekDays.push(d);
          }

          // Get logs grouped by date (reuse from monthly calculation above)
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          const todayStr = now.toISOString().split("T")[0];
          let monthLogs = [];
          try {
            const { data: mData } = await api.get("/attendance_logs", {
              params: { ...params, from_date: monthStart, to_date: todayStr, system_user_id: sysUserId, per_page: 100 },
            });
            monthLogs = mData?.data || [];
          } catch (e) {}

          const logsByDate = {};
          monthLogs.forEach((log) => {
            const date = log.LogTime?.split(" ")[0] || log.LogTime?.split("T")[0];
            if (!logsByDate[date]) logsByDate[date] = [];
            logsByDate[date].push(new Date(log.LogTime));
          });

          // Get shift days for week off detection
          const shiftDayMap = { "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6, "Sun": 0 };
          const mySchedule = [];
          try {
            const { data: schedData } = await api.get("/employees_with_schedule_count", {
              params: { ...params, per_page: 50 },
            });
            const myRec = (schedData?.data || []).find((e) => e.id === u.employee_id);
            const sDays = myRec?.schedule_active?.shift?.days || [];
            sDays.forEach((d) => { if (shiftDayMap[d] !== undefined) mySchedule.push(shiftDayMap[d]); });
          } catch (e) {}

          const chart = weekDays.map((d, i) => {
            const dateStr = d.toISOString().split("T")[0];
            const dayIdx = d.getDay();
            const dayLabel = dayNames[dayIdx];
            const isToday = dateStr === todayStr;
            const isFuture = d > now;
            const isWorkingDay = mySchedule.length === 0 || mySchedule.includes(dayIdx);
            const dayLogs = logsByDate[dateStr] || [];

            if (isFuture) {
              return { day: dayLabel, hours: "---", height: 10, highlight: false, muted: true };
            }

            if (!isWorkingDay) {
              return { day: dayLabel, hours: "Off", height: 15, highlight: false, muted: true, weekOff: true };
            }

            if (dayLogs.length < 2) {
              return { day: dayLabel, hours: dayLogs.length === 0 ? "Absent" : "0h", height: 10, highlight: isToday, absent: dayLogs.length === 0 };
            }

            dayLogs.sort((a, b) => a - b);
            const hrs = (dayLogs[dayLogs.length - 1] - dayLogs[0]) / 3600000;
            return {
              day: dayLabel,
              hours: `${hrs.toFixed(1)}h`,
              height: Math.max(20, Math.min(180, hrs * 18)),
              highlight: isToday,
            };
          });

          setWeeklyData(chart);
        } catch (e) { console.warn("Weekly chart error", e); }

        // 5. Fetch announcements
        try {
          const { data } = await api.get("/announcement", {
            params: { ...params, per_page: 5, sortDesc: true },
          });
          setAnnouncements(data?.data || []);
        } catch (e) { console.warn("Announcements error", e); }

        // 6. Fetch recent logs from /attendance_logs
        try {
          const to = new Date().toISOString().split("T")[0];
          const from = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
          const { data } = await api.get("/attendance_logs", {
            params: { ...params, from_date: from, to_date: to, system_user_id: sysUserId, per_page: 20 },
          });
          const logs = data?.data || [];
          setActivityLog(logs.map((log) => {
            const dt = new Date(log.LogTime);
            const isCamera = log.DeviceID?.startsWith("Camera") || log.DeviceID?.startsWith("CAM") || log.channel === "camera";
            const isMobile = log.DeviceID?.includes("Mobile");
            return {
              date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              weekday: dt.toLocaleDateString("en-US", { weekday: "long" }),
              time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              timeColor: log.log_type === "In" ? "text-cyan-400 font-bold" : "text-slate-400",
              action: log.log_type || "---",
              actionStyle: log.log_type === "In" ? "text-emerald-400" : log.log_type === "Out" ? "text-red-400" : "text-slate-500",
              modeIcon: isCamera ? "videocam" : isMobile ? "smartphone" : "frame_person",
              modeLabel: isCamera ? "Camera" : isMobile ? "Mobile" : "Device",
              deviceName: log?.device?.name || log.gps_location || "---",
              deviceLocation: log?.device?.location || "---",
              status: log.log_type === "In" ? "On Time" : "Standard",
              dotColor: log.log_type === "In" ? "bg-emerald-500" : "bg-cyan-400",
              flag: null,
            };
          }));
        } catch (e) { console.warn("Logs error", e); }

      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Live date/time
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <BirthdayPopup />
      {/* HEADER — CONNECTED: employee name from getUser(), live date/time */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-cyan-500/30 shrink-0 bg-slate-800">
            {profilePicture ? (
              <img
                src={profilePicture.startsWith("http") ? profilePicture : `${svcUrl("http", 8000)}/media/employee/profile_picture/${profilePicture}`}
                alt={userName}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className={`w-full h-full items-center justify-center ${profilePicture ? 'hidden' : 'flex'}`}>
              <span className="material-symbols-outlined text-2xl text-slate-400">person</span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-headline mb-1">{greeting}, {userName}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              {dateStr} &bull; {timeStr}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative w-10 h-10 staff-glass-card rounded-full flex items-center justify-center border-white/5">
            <span className="material-symbols-outlined text-slate-400">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {/* TOP METRICS — TODO: Monthly Hours, Punctuality, Annual Leave, Next Shift need new APIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard icon="timelapse" iconBg="bg-blue-500/10 text-blue-400 border border-blue-500/20" label="Monthly Hours" value={monthlyHours} suffix={`/ ${expectedHours}h`} badge={expectedHours > 0 ? `${Math.round((monthlyHours / expectedHours) * 100)}%` : "---"} badgeColor="text-blue-400 bg-blue-400/10 border-blue-400/20" />
          <MetricCard icon="verified" iconBg="bg-purple-500/10 text-purple-400 border border-purple-500/20" label="Punctuality Score" value={<>{presentCount > 0 ? Math.round(((presentCount - lateCount) / presentCount) * 100) : 0}<span className="text-lg font-medium text-purple-400/60">%</span></>} badge={presentCount > 0 && Math.round(((presentCount - lateCount) / presentCount) * 100) >= 90 ? "Top 5%" : ""} badgeColor="text-slate-400 bg-transparent border-transparent" />
          <MetricCard icon="flight" iconBg="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" label="Annual Leave" value="---" suffix="Days" badge="---" badgeColor="text-emerald-400 bg-transparent border-transparent" />
          <div className="staff-glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                <span className="material-symbols-outlined text-cyan-400">calendar_today</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Upcoming</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">My Shift</p>
            <h3 className="text-xl font-bold font-headline mb-1">{shiftName}</h3>
            <p className="text-[10px] text-emerald-400/80 font-mono tracking-tighter">{shiftTime}</p>
          </div>
        </div>

        {/* SECONDARY METRICS — CONNECTED: from /employee-statistics */}
        <div className="grid grid-cols-3 xl:grid-cols-5 gap-4">
          <SmallMetric icon="person_check" iconBg="bg-emerald-500/10 text-emerald-400" label="Days Present" value={presentCount} unit="Days" badge={presentCount > 15 ? "On Track" : ""} badgeColor="text-emerald-400" />
          <SmallMetric icon="cancel_presentation" iconBg="bg-pink-500/10 text-pink-400" label="Days Absent" value={absentCount} unit="Days" badge={absentCount > 3 ? "Action" : ""} badgeColor="text-pink-400" />
          <SmallMetric icon="history_toggle_off" iconBg="bg-amber-500/10 text-amber-400" label="Late Arrivals" value={lateCount} unit="Entries" badge={lateCount > 2 ? "Warning" : ""} badgeColor="text-amber-400" />
          <SmallMetric icon="more_time" iconBg="bg-cyan-500/10 text-cyan-400" label="Total Overtime" value={overtimeHours} unit="Hours" badge={overtimeHours !== "0:00" ? "OT" : ""} badgeColor="text-emerald-400" />
          <div className="col-span-3 sm:col-span-1">
            <SmallMetric icon="running_with_errors" iconBg="bg-red-500/10 text-red-400" label="Missed Punch" value={incompleteCount} unit="Entries" badge={incompleteCount > 0 ? "Review" : ""} badgeColor="text-red-400" />
          </div>
        </div>

        {/* MAIN SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Weekly Attendance Chart — TODO: needs new API */}
          <div className="lg:col-span-4 staff-glass-card p-6 rounded-2xl flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-bold font-headline">Weekly Attendance</h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Worked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-0 border-t-2 border-dashed border-slate-600"></span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Goal</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mb-8">Hours Logged vs Target</p>
            <div className="flex-1 flex items-end justify-between gap-2 px-1 relative mb-2 min-h-[200px]">
              <div className="absolute w-full border-t border-dashed border-slate-700/50 top-1/3 left-0"></div>
              {(weeklyData.length > 0 ? weeklyData : weeklyChart).map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-3 flex-1 min-w-[34px] max-w-[44px]">
                  <span className={`text-[10px] font-mono ${item.highlight ? "text-white font-bold" : item.absent ? "text-red-400" : item.weekOff ? "text-slate-600" : "text-slate-400"}`}>{item.hours}</span>
                  <div className={`w-full rounded-md ${item.absent ? "bg-red-500/30" : item.weekOff ? "bg-slate-700/30" : "staff-chart-bar"}`} style={{ height: `${item.height}px`, opacity: item.muted ? 0.65 : 1 }}></div>
                  <span className={`text-[9px] font-bold ${item.highlight ? "text-white" : "text-slate-500"}`}>{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wellness — TODO: needs new API */}
          {(() => {
            // Calculate wellness from weekly data
            const workingDays = weeklyData.filter((d) => !d.weekOff && !d.muted);
            let wellnessScore = 0;
            if (workingDays.length > 0) {
              const dayScores = workingDays.map((d) => {
                if (d.absent) return 0;
                const hrs = parseFloat(d.hours) || 0;
                return Math.min(100, (hrs / 8) * 100);
              });
              wellnessScore = Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length);
            }
            const burnoutRisk = 100 - wellnessScore;
            const wellnessLabel = wellnessScore >= 80 ? "Healthy" : wellnessScore >= 50 ? "Moderate" : "At Risk";
            const burnoutLabel = wellnessScore >= 80 ? "LOW" : wellnessScore >= 50 ? "MEDIUM" : "HIGH";
            const wellnessOffset = 502 - (502 * wellnessScore) / 100;
            const ringColor = wellnessScore >= 80 ? "emerald" : wellnessScore >= 50 ? "amber" : "red";

            return (
          <div className="lg:col-span-4 staff-glass-card p-6 rounded-2xl flex flex-col items-center">
            <div className="self-start mb-1">
              <h4 className="font-bold font-headline">My Wellness</h4>
              <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Work-Life Balance</p>
            </div>
            <div className="relative w-48 h-48 mt-4 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                <circle className="text-slate-800/40" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="12" />
                <circle cx="96" cy="96" fill="transparent" r="80" stroke="url(#wellness-grad)" strokeDasharray="502" strokeDashoffset={wellnessOffset} strokeLinecap="round" strokeWidth="12" />
                <defs>
                  <linearGradient id="wellness-grad" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#00e3fd" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-5xl font-black font-headline">{wellnessScore}<span className="text-2xl opacity-40">%</span></span>
                <span className={`bg-${ringColor}-500/20 text-${ringColor}-400 px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase mt-2 border border-${ringColor}-400/20`}>{wellnessLabel}</span>
              </div>
            </div>
            <div className="w-full mt-auto pt-4">
              <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-slate-500 mb-2">
                <span>BURNOUT RISK</span>
                <span>{burnoutLabel}</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${wellnessScore >= 80 ? "bg-emerald-500" : wellnessScore >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${burnoutRisk}%` }}></div>
              </div>
            </div>
          </div>
            );
          })()}

          {/* Feed Panel — Announcements connected */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="staff-glass-card rounded-2xl overflow-hidden flex flex-col h-full">
              <div className="flex border-b border-white/5 px-2">
                {feedTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFeedTab(tab)}
                    className={`px-4 py-3 text-[10px] font-black tracking-wider uppercase relative ${
                      activeFeedTab === tab
                        ? "border-b-2 border-cyan-400 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tab}
                    {tab === "My Docs" && <span className="absolute top-2.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-3 overflow-y-auto max-h-[320px]">
                {activeFeedTab === "Announcement" && (
                  <>
                    {announcements.length > 0 ? announcements.map((a, i) => (
                      <div key={i} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-blue-400">campaign</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                              {a.branch?.branch_name || "Announcement"}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-200">{a.title || a.subject || "---"}</h5>
                          {a.description && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                          )}
                          <p className="text-[9px] text-slate-600 mt-1">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-slate-500 text-xs py-8">No announcements</div>
                    )}
                  </>
                )}
                {activeFeedTab === "Holidays" && (
                  <div className="text-center text-slate-500 text-xs py-8">Coming soon</div>
                )}
                {activeFeedTab === "My Docs" && (
                  <div className="text-center text-slate-500 text-xs py-8">Coming soon</div>
                )}
                {activeFeedTab === "Visitors" && (
                  <div className="text-center text-slate-500 text-xs py-8">Coming soon</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
          {/* Activity Log — CONNECTED: from /attendance_logs */}
          <div className="lg:col-span-8 staff-glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <h4 className="font-bold font-headline">My Recent Activity Log</h4>
              </div>
              <button className="text-[10px] font-black tracking-widest text-cyan-400 uppercase flex items-center gap-1 hover:brightness-110 transition-all">
                View Full History <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-white/5 bg-slate-900/30">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Mode</th>
                    <th className="px-6 py-4">Device Name</th>
                    <th className="px-6 py-4">Punctuality</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-white/5">
                  {activityLog.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-200">{row.date}</span>
                            <span className="text-[10px] text-slate-500 mt-1">{row.weekday}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-xs font-mono ${row.timeColor}`}>{row.time}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[11px] font-bold uppercase ${row.actionStyle}`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg text-slate-300">{row.modeIcon}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-200">{row.deviceName}</span>
                          <span className="text-[10px] text-slate-500 mt-1">{row.deviceLocation}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${row.dotColor}`}></span>
                          <span className="text-[10px] font-medium">{row.status}</span>
                          {row.flag && <span className="text-[8px] bg-red-500/10 text-red-400 px-1 rounded ml-2">{row.flag}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activityLog.length === 0 && (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No recent activity logs</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nexus AI — TODO: needs new API */}
          <div className="lg:col-span-4 staff-glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col border-purple-500/20">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/20 blur-[40px] rounded-full"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">AI Feeds</span>
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-sm italic text-slate-200 leading-relaxed">
                &ldquo;I noticed you clocked in late yesterday. Need to file an exception request?&rdquo;
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 relative z-10">
              <button className="inline-flex items-center justify-center px-5 py-1.5 rounded-xl bg-purple-600 text-white text-[10px] font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:scale-[1.02] transition-transform">
                Yes, please
              </button>
              <button className="inline-flex items-center justify-center px-5 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold border border-white/5 hover:bg-slate-700 transition-colors">
                Maybe later
              </button>
            </div>
            <button className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white">auto_awesome</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
