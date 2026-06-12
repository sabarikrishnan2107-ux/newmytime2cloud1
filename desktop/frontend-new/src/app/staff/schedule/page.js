"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
} from "lucide-react";

import { API_BASE, api, buildQueryParams } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { getStaffUser } from "@/lib/staff-user";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const SHIFT_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  off: "Off Day",
};

function getInitials(name) {
  if (!name) return "ST";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getProfileImageUrl(profilePicture) {
  if (!profilePicture) return null;
  if (String(profilePicture).startsWith("http")) return profilePicture;

  const mediaBase = API_BASE.replace(/\/api$/, "");
  return `${mediaBase}/media/employee/profile_picture/${profilePicture}`;
}

function matchesEmployeeRecord(employee, identifiers) {
  const recordValues = [
    employee?.id,
    employee?.employee_id,
    employee?.system_user_id,
    employee?.user_id,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);

  return identifiers.some((identifier) => recordValues.includes(String(identifier)));
}

function getBestScheduleRecord(employee) {
  if (!employee) return null;

  const activeSchedule = employee?.schedule_active?.id ? employee.schedule_active : null;
  if (activeSchedule?.shift?.name && activeSchedule.shift.name !== "---") {
    return activeSchedule;
  }

  const assignedSchedule = employee?.schedule?.id ? employee.schedule : null;
  if (assignedSchedule?.shift?.name && assignedSchedule.shift.name !== "---") {
    return assignedSchedule;
  }

  const historicalSchedule = Array.isArray(employee?.schedule_all)
    ? employee.schedule_all.find((item) => item?.id && item?.shift?.name && item.shift.name !== "---")
    : null;

  return historicalSchedule || null;
}

function getWeekStart(baseDate, offset = 0) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + mondayOffset + offset * 7);
  date.setHours(0, 0, 0, 0);

  return date;
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatWeekRange(baseDate, offset = 0) {
  const start = getWeekStart(baseDate, offset);
  const end = addDays(start, 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.toLocaleDateString("en-US", { day: "numeric" });
  const endDay = end.toLocaleDateString("en-US", { day: "numeric" });
  const year = end.getFullYear();

  return startMonth === endMonth
    ? `${startMonth} ${startDay} - ${endDay}, ${year}`
    : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function normalizeDayLabel(day) {
  if (!day) return null;

  const value = String(day).trim().slice(0, 3).toLowerCase();
  const match = DAY_LABELS.find((label) => label.toLowerCase() === value);
  return match || null;
}

function parseTimeToMinutes(timeValue) {
  if (!timeValue || timeValue === "---" || timeValue === "-") return null;

  const raw = String(timeValue).trim();

  if (/am|pm/i.test(raw)) {
    const normalized = raw.replace(/\s+/g, " ").toUpperCase();
    const match = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3];

    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const parts = raw.split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

function formatTimeLabel(timeValue) {
  if (!timeValue || timeValue === "---" || timeValue === "-") return "-";

  const minutes = parseTimeToMinutes(timeValue);
  if (minutes === null) return String(timeValue);

  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function getShiftType(shift) {
  if (!shift) return "off";

  const shiftName = String(shift.name || "").toLowerCase();
  if (shiftName.includes("night") || shiftName.includes("overnight")) return "night";
  if (shiftName.includes("afternoon") || shiftName.includes("evening")) return "afternoon";
  if (shiftName.includes("morning")) return "morning";

  const startMinutes = parseTimeToMinutes(shift.on_duty_time);
  if (startMinutes === null) return "morning";

  const hour = Math.floor(startMinutes / 60);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 19) return "afternoon";
  return "night";
}

function getShiftDisplayLabel(shift, shiftType) {
  if (!shift?.name) return SHIFT_LABELS[shiftType] || "Shift";

  return String(shift.name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatBranchLocation(branch) {
  const parts = [branch?.area, branch?.city, branch?.country].filter(Boolean);
  return parts.length ? parts.join(", ") : branch?.branch_name || "---";
}

function resolveLocationValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.name || value.title || value.branch_name || value.city || value.area || "";
  }
  return "";
}

function parseCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseRadiusValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 200;
}

function getGeoFenceConfig(branch, geoFenceBranch, employeeGeoFence, fallbackLocation) {
  const hasEmployeeGeoFence = Boolean(employeeGeoFence?.geo_fencing_enabled);
  const source = hasEmployeeGeoFence ? employeeGeoFence : geoFenceBranch || branch;
  if (!source) return null;

  const latitude = parseCoordinate(source?.lat ?? source?.latitude ?? source?.lat_dd);
  const longitude = parseCoordinate(source?.lon ?? source?.lng ?? source?.long ?? source?.longitude ?? source?.lon_dd);
  const isEnabled = hasEmployeeGeoFence ? true : geoFenceBranch ? true : Boolean(source?.geofence_enabled);

  if (!isEnabled || latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude,
    radius: parseRadiusValue(source?.geofence_radius_meter ?? source?.radius),
    branchName: branch?.branch_name || geoFenceBranch?.branch_name || source?.branch_name || "---",
    location:
      source?.name ||
      formatBranchLocation(geoFenceBranch || branch) ||
      formatBranchLocation(source) ||
      fallbackLocation ||
      branch?.branch_name ||
      "---",
  };
}

function toBooleanFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  }
  return false;
}

function PreferenceStatusBadge({ enabled, activeLabel = "Enabled", inactiveLabel = "Disabled" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
        enabled
          ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
          : "border border-rose-400/20 bg-rose-400/10 text-rose-200"
      )}
    >
      {enabled ? activeLabel : inactiveLabel}
    </span>
  );
}

function GeneralPreferencesCard({ preferences }) {
  const items = [
    {
      label: "Employee Status",
      description: "Current employee account state.",
      enabled: preferences.employeeStatus,
      activeLabel: "Active",
      inactiveLabel: "Inactive",
    },
    {
      label: "Web Login Access",
      description: "Browser dashboard access.",
      enabled: preferences.webLoginAccess,
    },
    {
      label: "Mobile App Access",
      description: "iOS and Android sign-in access.",
      enabled: preferences.mobileAppAccess,
    },
    {
      label: "Location Tracking",
      description: "GPS tracking for mobile punch.",
      enabled: preferences.locationTracking,
    },
    {
      label: "Clock In/Out Permission",
      description: "Mobile punch permission.",
      enabled: preferences.mobilePunch,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.28 }}
      className="staff-glass-card rounded-[22px] border border-white/10 p-3"
    >
      <h3 className="font-headline text-[15px] font-semibold text-slate-100">General Preferences</h3>
      <p className="mt-0.5 text-[11px] leading-4 text-slate-400">Your own employee settings.</p>

      <div className="mt-2.5 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-2 rounded-[16px] border border-white/8 bg-white/[0.03] px-2.5 py-2"
          >
            <div className="min-w-0">
              <p className="text-[12px] font-medium leading-4 text-slate-100">{item.label}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{item.description}</p>
            </div>
            <PreferenceStatusBadge
              enabled={item.enabled}
              activeLabel={item.activeLabel}
              inactiveLabel={item.inactiveLabel}
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function buildWeeklyShifts(shift, branchName, location, weekOffset) {
  const weekStart = getWeekStart(new Date(), weekOffset);
  const normalizedDays = (shift?.days || []).map(normalizeDayLabel).filter(Boolean);
  const activeDays = normalizedDays.length ? normalizedDays : shift ? DEFAULT_WORKING_DAYS : [];
  const shiftType = getShiftType(shift);
  const shiftLabel = getShiftDisplayLabel(shift, shiftType);
  const start = shift ? formatTimeLabel(shift.on_duty_time) : "-";
  const end = shift ? formatTimeLabel(shift.off_duty_time) : "-";
  const todayToken = new Date().toDateString();

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = addDays(weekStart, index);
    const shortDay = DAY_LABELS[currentDate.getDay()];
    const isWorkingDay = activeDays.includes(shortDay);
    const currentShiftType = isWorkingDay ? shiftType : "off";

    return {
      key: `${formatDateKey(currentDate)}-${shortDay}`,
      dateKey: formatDateKey(currentDate),
      day: shortDay,
      monthLabel: currentDate.toLocaleDateString("en-US", {
        month: "short",
      }),
      weekdayYearLabel: `${shortDay} ${currentDate.getFullYear()}`,
      dateNumber: currentDate.getDate(),
      isToday: currentDate.toDateString() === todayToken,
      type: currentShiftType,
      shiftName: isWorkingDay ? shift?.name || SHIFT_LABELS[currentShiftType] : "Day Off",
      shiftLabel: isWorkingDay ? shiftLabel : "Off Day",
      start,
      end,
      location: isWorkingDay ? location || branchName || "---" : "—",
      branchName: branchName || "---",
    };
  });
}

function getStatusMeta(shift) {
  if (shift.isToday && shift.type === "off") {
    return {
      label: "Today · Off",
      className: "border border-amber-400/20 bg-amber-400/10 text-amber-200",
    };
  }

  if (shift.isToday) {
    return {
      label: "Today",
      className: "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    };
  }

  if (shift.type === "off") {
    return {
      label: "Off Day",
      className: "border border-white/10 bg-white/[0.04] text-slate-400",
    };
  }

  return {
    label: "Scheduled",
    className: "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  };
}

function ProfileAvatar({ name, imageUrl }) {
  const initials = getInitials(name);

  return (
    <div className="h-10 w-10 overflow-hidden rounded-[16px] border border-white/10 bg-slate-900/70 shadow-[0_10px_24px_rgba(0,0,0,0.22)] sm:h-12 sm:w-12">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-cyan-400/10 text-xs font-semibold text-cyan-200 sm:text-sm">
          {initials}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/10 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
        <div className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-cyan-200">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="font-headline text-base font-semibold text-slate-100">{value}</p>
      <p className="mt-0.5 text-[11px] leading-5 text-slate-400">{helper}</p>
    </div>
  );
}

function ScheduleBoard({ weeklyShifts, weekLabel }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="staff-glass-card flex flex-col overflow-hidden rounded-[28px] border border-white/10 xl:h-full"
    >
      <div className="border-b border-white/10 px-4 py-3 sm:px-5">
        <h2 className="font-headline text-base font-semibold text-slate-100">Weekly Schedule</h2>
        <p className="mt-0.5 text-xs text-slate-400">{weekLabel}</p>
      </div>

      <div className="hidden border-b border-white/10 bg-white/[0.03] px-4 py-2.5 sm:px-5 lg:grid lg:grid-cols-[1.12fr_0.82fr_0.95fr_0.74fr_0.82fr_0.68fr] lg:gap-3 lg:text-[10px] lg:font-semibold lg:uppercase lg:tracking-[0.16em] lg:text-slate-500">
        <span>Date</span>
        <span>Shift</span>
        <span>Time</span>
        <span>Location</span>
        <span>Branch</span>
        <span>Status</span>
      </div>

      <div className="divide-y divide-white/5 xl:flex xl:flex-1 xl:flex-col">
        {weeklyShifts.map((shift, index) => {
          const status = getStatusMeta(shift);

          return (
            <motion.article
              key={shift.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className={cn("px-4 py-3 transition-colors sm:px-5 xl:flex xl:flex-1 xl:items-center", shift.isToday && "bg-cyan-400/[0.04]")}
            >
              <div className="grid w-full gap-3 lg:grid-cols-[1.12fr_0.82fr_0.95fr_0.74fr_0.82fr_0.68fr]">
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Date</p>
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-[44px] rounded-[18px] border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{shift.monthLabel}</p>
                      <p className="font-headline text-lg font-semibold leading-none text-slate-100">{shift.dateNumber}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-slate-100 sm:text-sm">{shift.weekdayYearLabel}</p>
                        {shift.isToday ? (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-cyan-200">
                            Today
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Shift</p>
                  <p className="text-[13px] font-medium text-slate-100 sm:text-sm">{shift.shiftLabel}</p>
                </div>

                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Time</p>
                  {shift.type === "off" ? (
                    <p className="text-[13px] text-slate-400 sm:text-sm">Not scheduled</p>
                  ) : (
                    <p className="text-[13px] font-semibold text-slate-100 sm:text-sm">{shift.start} - {shift.end}</p>
                  )}
                </div>

                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Location</p>
                  <p className="text-[13px] text-slate-300 sm:text-sm">{shift.location}</p>
                </div>

                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Branch</p>
                  <p className="text-[13px] text-slate-300 sm:text-sm">{shift.branchName}</p>
                </div>

                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Status</p>
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", status.className)}>
                    {status.label}
                  </span>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

function GeoFenceCard({ geoFenceConfig, profile }) {
  const directionsUrl = geoFenceConfig
    ? `https://www.google.com/maps/dir/?api=1&destination=${geoFenceConfig.latitude},${geoFenceConfig.longitude}`
    : "";
  const embedUrl = geoFenceConfig
    ? `https://maps.google.com/maps?q=${geoFenceConfig.latitude},${geoFenceConfig.longitude}&z=16&output=embed`
    : "";

  const handleOpenDirections = () => {
    if (!directionsUrl) return;
    window.open(directionsUrl, "_blank", "noopener,noreferrer");
  };

  const handleMapKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenDirections();
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.28 }}
      className="staff-glass-card rounded-[22px] border border-white/10 p-3"
    >
      <h3 className="font-headline text-[15px] font-semibold text-slate-100">Geo-Fencing</h3>
      <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
        {geoFenceConfig
          ? "Tap the map to open directions to your geo-fenced branch location."
          : "No geo-fencing is configured for your branch right now."}
      </p>

      {geoFenceConfig ? (
        <>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onKeyDown={handleMapKeyDown}
            className="mt-2.5 block h-[140px] w-full overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/70 sm:h-[152px]"
            aria-label="Open geo-fence directions"
          >
            <iframe
              title="Geo-fence branch map"
              src={embedUrl}
              className="h-full w-full pointer-events-none"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </a>

          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-start justify-between gap-2 rounded-[16px] border border-white/8 bg-white/[0.03] px-2.5 py-2">
              <span className="text-[12px] text-slate-400">Radius</span>
              <span className="max-w-[62%] text-right text-[12px] font-medium text-slate-100">{geoFenceConfig.radius} m</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenDirections}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-[16px] border border-cyan-400/15 bg-cyan-400/10 px-3 py-1.5 text-[12px] font-medium text-cyan-200 transition-colors hover:bg-cyan-400/15"
          >
            <Navigation className="h-3.5 w-3.5" />
            Open Directions
          </button>
        </>
      ) : (
        <div className="mt-2.5 rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-3 py-5 text-center">
          <p className="text-[13px] font-medium text-slate-200">{profile.branchName}</p>
          <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
            Ask your admin to enable geo-fencing for this branch if staff should navigate to a pinned location.
          </p>
        </div>
      )}
    </motion.section>
  );
}

export default function StaffSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "Employee",
    employeeCode: "---",
    designation: "---",
    department: "---",
    branchName: "---",
    branchLocation: "---",
    profilePicture: null,
  });
  const [shiftData, setShiftData] = useState(null);
  const [geoFenceConfig, setGeoFenceConfig] = useState(null);
  const [generalPreferences, setGeneralPreferences] = useState({
    employeeStatus: false,
    webLoginAccess: false,
    mobileAppAccess: false,
    locationTracking: false,
    mobilePunch: false,
  });

  useEffect(() => {
    let ignore = false;

    async function fetchSchedulePage() {
      try {
        const staffUser = await getStaffUser();
        const params = await buildQueryParams({});

        // Use employee record from /me (cached in getStaffUser) - no need to load all employees
        const me = staffUser;
        const employeeRecord = staffUser?.employee_record || null;

        const [geoFenceResult] = await Promise.allSettled([
          params.company_id ? api.get(`/branch-list-for-geofencing/${params.company_id}`) : Promise.resolve({ data: [] }),
        ]);

        if (ignore) return;

        const scheduleRecord = getBestScheduleRecord(employeeRecord);
        const branch = employeeRecord?.branch || me?.branch || null;
        const resolvedEmployeeId = employeeRecord?.id || staffUser?.employee_id || null;
        const branchId = branch?.id || employeeRecord?.branch_id || staffUser?.branch_id || null;
        const geoFenceBranches =
          geoFenceResult.status === "fulfilled" && Array.isArray(geoFenceResult.value?.data) ? geoFenceResult.value.data : [];
        const activeGeoFenceBranch =
          branchId !== null ? geoFenceBranches.find((item) => String(item.id) === String(branchId)) || null : null;
        let employeeGeoFence = null;

        if (resolvedEmployeeId) {
          try {
            const { data } = await api.get(`/employee-geofence/${resolvedEmployeeId}`, { params });
            employeeGeoFence = data || null;
          } catch (error) {
            employeeGeoFence = null;
          }
        }

        const resolvedName =
          me?.employee_name ||
          (employeeRecord ? `${employeeRecord.first_name || ""} ${employeeRecord.last_name || ""}`.trim() : "") ||
          me?.name ||
          staffUser?.employee_name ||
          "Employee";

        const resolvedBranchName = branch?.branch_name || staffUser?.branch_name || "---";
        const resolvedBranchLocation = formatBranchLocation(branch) || resolvedBranchName;
        const resolvedProfilePicture =
          me?.employee_profile_picture ||
          employeeRecord?.profile_picture ||
          staffUser?.employee_profile_picture ||
          null;

        setProfile({
          name: resolvedName,
          employeeCode: employeeRecord?.employee_id || staffUser?.employee_id || "---",
          designation: employeeRecord?.designation?.name || staffUser?.designation_name || "---",
          department: employeeRecord?.department?.name || staffUser?.department_name || "---",
          branchName: resolvedBranchName,
          branchLocation: resolvedBranchLocation,
          profilePicture: resolvedProfilePicture,
        });
        setGeneralPreferences({
          employeeStatus: toBooleanFlag(employeeRecord?.status),
          webLoginAccess: toBooleanFlag(me?.web_login_access),
          mobileAppAccess: toBooleanFlag(me?.mobile_app_login_access),
          locationTracking: toBooleanFlag(me?.tracking_status),
          mobilePunch: toBooleanFlag(me?.mobile_punch),
        });
        setGeoFenceConfig(getGeoFenceConfig(branch, activeGeoFenceBranch, employeeGeoFence, resolvedBranchLocation));

        setShiftData(
          scheduleRecord?.shift
            ? {
                ...scheduleRecord.shift,
                branchName: resolvedBranchName,
                location:
                  resolveLocationValue(scheduleRecord?.shift?.location) ||
                  resolveLocationValue(scheduleRecord?.location) ||
                  resolvedBranchLocation,
              }
            : null
        );
      } catch (error) {
        console.error("Failed to load staff schedule page", error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchSchedulePage();

    return () => {
      ignore = true;
    };
  }, []);

  const activeWorkingDays = useMemo(() => {
    const normalized = (shiftData?.days || []).map(normalizeDayLabel).filter(Boolean);
    return normalized.length ? normalized : shiftData ? DEFAULT_WORKING_DAYS : [];
  }, [shiftData]);

  const weeklyShifts = useMemo(
    () => buildWeeklyShifts(shiftData, profile.branchName, shiftData?.location || profile.branchLocation, weekOffset),
    [profile.branchLocation, profile.branchName, shiftData, weekOffset]
  );

  const weekLabel = formatWeekRange(new Date(), weekOffset);
  const activeShiftLabel = shiftData?.name || "No active shift assigned";
  const activeShiftTime = shiftData
    ? `${formatTimeLabel(shiftData.on_duty_time)} - ${formatTimeLabel(shiftData.off_duty_time)}`
    : "No scheduled time";
  const profileImageUrl = getProfileImageUrl(profile.profilePicture);
  const officeLocation = shiftData?.location || profile.branchLocation;
  const profileMeta = [profile.designation, profile.department].filter((value) => value && value !== "---").join(" / ") || "Employee profile";

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="staff-glass-card rounded-[22px] border border-white/10 px-5 py-4 text-sm text-slate-300">
          Loading schedule...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-3 sm:p-4">
      <div className="flex flex-col gap-3 pb-4">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="staff-glass-card overflow-hidden rounded-[28px] border border-white/10"
        >
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_34%)] px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-2.5">
                <ProfileAvatar name={profile.name} imageUrl={profileImageUrl} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      {profile.name}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {weekLabel}
                    </span>
                  </div>

                  <h1 className="mt-1.5 font-headline text-[22px] font-semibold tracking-tight text-slate-50 sm:text-[26px]">
                    Shift Schedule
                  </h1>
                  <p className="mt-1 max-w-3xl text-[12px] text-slate-400 sm:text-[13px]">
                    A focused weekly view of your assigned shift, duty time, office location, and branch.
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-slate-300">
                      {profile.employeeCode}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-slate-300">
                      {profile.designation}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-slate-300">
                      {profile.department}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 self-start rounded-[18px] border border-white/10 bg-black/10 p-1">
                <button
                  type="button"
                  onClick={() => setWeekOffset((value) => value - 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-slate-100 transition-colors hover:bg-white/10"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="inline-flex h-8 items-center justify-center rounded-[14px] border border-cyan-400/15 bg-cyan-400/10 px-3 text-[12px] font-medium text-cyan-200 transition-colors hover:bg-cyan-400/15"
                >
                  Current Week
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((value) => value + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-slate-100 transition-colors hover:bg-white/10"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 border-t border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              icon={Briefcase}
              label="Assigned Shift"
              value={activeShiftLabel}
              helper={shiftData ? "Primary shift assigned to this schedule." : "No shift assignment found."}
            />
            <SummaryTile
              icon={Clock3}
              label="Shift Time"
              value={activeShiftTime}
              helper={activeWorkingDays.length > 0 ? `${activeWorkingDays.length} scheduled workdays this week` : "No scheduled workdays"}
            />
            <SummaryTile
              icon={MapPin}
              label="Office Location"
              value={officeLocation}
              helper="Assigned work location for this shift."
            />
            <SummaryTile
              icon={Building2}
              label="Branch"
              value={profile.branchName}
              helper={profileMeta}
            />
          </div>
        </motion.section>

        <div className="grid items-start gap-3 xl:min-h-[calc(100vh-220px)] xl:grid-cols-[minmax(0,1.75fr)_300px] xl:items-stretch">
          <div className="min-w-0 xl:h-full">
            <ScheduleBoard weeklyShifts={weeklyShifts} weekLabel={weekLabel} />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <GeneralPreferencesCard preferences={generalPreferences} />
            <GeoFenceCard geoFenceConfig={geoFenceConfig} profile={profile} />
          </div>
        </div>
      </div>
    </div>
  );
}
