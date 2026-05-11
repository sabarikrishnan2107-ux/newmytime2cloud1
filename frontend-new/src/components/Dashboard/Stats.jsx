import { getAttendanceCount } from "@/lib/endpoint/dashboard";
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Plane,
  ServerOff,
  AlertTriangle,
} from "lucide-react";
import EmployeeListDialog from "./EmployeeListDialog";

const ACCENTS = {
  neutral: { line: "#64748b", glow: "rgba(100,116,139,.45)", iconBg: "rgba(100,116,139,.18)", iconFg: "#94a3b8", label: "#94a3b8" },
  green:   { line: "#22c55e", glow: "rgba(34,197,94,.55)",    iconBg: "rgba(34,197,94,.20)",    iconFg: "#4ade80", label: "#4ade80" },
  red:     { line: "#ef4444", glow: "rgba(239,68,68,.55)",    iconBg: "rgba(239,68,68,.22)",    iconFg: "#fca5a5", label: "#fb7185" },
  purple:  { line: "#a855f7", glow: "rgba(168,85,247,.55)",   iconBg: "rgba(168,85,247,.20)",   iconFg: "#c084fc", label: "#c084fc" },
  indigo:  { line: "#6366f1", glow: "rgba(99,102,241,.55)",   iconBg: "rgba(99,102,241,.20)",   iconFg: "#818cf8", label: "#a5b4fc" },
  orange:  { line: "#f97316", glow: "rgba(249,115,22,.55)",   iconBg: "rgba(249,115,22,.20)",   iconFg: "#fb923c", label: "#fdba74" },
};

function StatCard({ label, value, icon: Icon, accent = "neutral", badge, alert = false, onClick }) {
  const a = ACCENTS[accent] || ACCENTS.neutral;
  const clickable = typeof onClick === "function";
  const handleKeyDown = (e) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3.5 dark:border-[#1d2b4a] dark:bg-[#101a30] ${
        clickable
          ? "cursor-pointer transition hover:border-emerald-400/60 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:hover:border-emerald-400/40"
          : ""
      }`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{ color: a.label }}
        >
          {label}
        </p>
        <div
          className="grid place-items-center w-9 h-9 rounded-[10px]"
          style={{ background: a.iconBg, color: a.iconFg }}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-gray-900 dark:text-white">
          {value}
        </span>
        {badge && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1"
            style={{ color: a.iconFg, background: a.iconBg }}
          >
            {badge}
          </span>
        )}
        {alert && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1"
            style={{ color: a.iconFg, background: a.iconBg }}
          >
            <AlertTriangle className="h-3 w-3" /> Alert
          </span>
        )}
      </div>

    </div>
  );
}

function Stats({ branch_ids, department_ids }) {
  const [stats, setStats] = useState({
    employeeCount: 0,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    vacationCount: 0,
    offlineDevices: 0,
  });
  const [openVariant, setOpenVariant] = useState(null); // "present" | "absent" | null

  useEffect(() => {
    const fetchAttendanceCounts = async () => {
      setStats(await getAttendanceCount({ branch_ids, department_ids }));
    };

    fetchAttendanceCounts();
  }, [branch_ids, department_ids]);

  const presentPct = stats.employeeCount > 0 ? Math.round((stats.presentCount / stats.employeeCount) * 100) : null;
  const absentPct = stats.employeeCount > 0 ? Math.round((stats.absentCount / stats.employeeCount) * 100) : null;

  return (
    <>
      <StatCard
        label="Total Headcount"
        value={stats.employeeCount}
        icon={Users}
        accent="neutral"
      />
      <StatCard
        label="Present Today"
        value={stats.presentCount}
        icon={UserCheck}
        accent="green"
        badge={presentPct !== null ? `${presentPct}%` : null}
        onClick={() => setOpenVariant("present")}
      />
      <StatCard
        label="Unplanned Absence"
        value={stats.absentCount}
        icon={UserX}
        accent="red"
        badge={absentPct !== null ? `${absentPct}%` : null}
        onClick={() => setOpenVariant("absent")}
      />
      <StatCard
        label="Scheduled Leave"
        value={stats.leaveCount}
        icon={CalendarDays}
        accent="purple"
      />
      <StatCard
        label="Vacation"
        value={stats.vacationCount}
        icon={Plane}
        accent="indigo"
      />
      <StatCard
        label="Offline Nodes"
        value={stats.offlineDevices}
        icon={ServerOff}
        accent="orange"
        alert={stats.offlineDevices > 0}
      />

      <EmployeeListDialog
        open={openVariant !== null}
        onOpenChange={(o) => { if (!o) setOpenVariant(null); }}
        variant={openVariant || "present"}
        branch_ids={branch_ids}
        department_ids={department_ids}
      />
    </>
  );
}

export default Stats;
