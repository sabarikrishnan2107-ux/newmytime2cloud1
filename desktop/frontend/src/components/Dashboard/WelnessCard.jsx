import { useDarkMode } from "@/context/DarkModeContext";
import { getAttendanceCount } from "@/lib/endpoint/dashboard";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity } from "lucide-react";

function WelnessCard({ branch_ids, department_ids }) {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();
  const [stats, setStats] = useState({
    employeeCount: 0,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    vacationCount: 0,
    offlineDevices: 0,
  });

  useEffect(() => {
    const fetchAttendanceCounts = async () => {
      const data = await getAttendanceCount({ branch_ids, department_ids });
      setStats(data);
    };
    fetchAttendanceCounts();
  }, [branch_ids, department_ids]);

  const wellnessValue = useMemo(() => {
    const employeeCount = Number(stats?.employeeCount) || 0;
    const presentCount = Number(stats?.presentCount) || 0;
    const vacationCount = Number(stats?.vacationCount) || 0;
    if (employeeCount <= 0) return 0;
    const positiveFactors = presentCount + vacationCount;
    const score = Math.round((positiveFactors / employeeCount) * 100);
    if (!Number.isFinite(score)) return 0;
    return Math.min(100, Math.max(0, score));
  }, [stats]);

  const safeWellnessValue = Number.isFinite(wellnessValue) ? wellnessValue : 0;

  const status = useMemo(() => {
    if (safeWellnessValue >= 80) return { labelKey: "dashboard.wellness.statusOptimal",  color: "#10b981", icon: ShieldCheck, glow: "rgba(16,185,129,0.45)", textCls: "text-emerald-500", bgCls: "bg-emerald-500/15" };
    if (safeWellnessValue >= 60) return { labelKey: "dashboard.wellness.statusStable",   color: "#22c55e", icon: ShieldCheck, glow: "rgba(34,197,94,0.45)",  textCls: "text-green-500",   bgCls: "bg-green-500/15" };
    if (safeWellnessValue >= 40) return { labelKey: "dashboard.wellness.statusCaution",  color: "#f59e0b", icon: AlertTriangle, glow: "rgba(245,158,11,0.45)", textCls: "text-amber-500",   bgCls: "bg-amber-500/15" };
    return { labelKey: "dashboard.wellness.statusCritical", color: "#ef4444", icon: ShieldAlert, glow: "rgba(239,68,68,0.45)",  textCls: "text-rose-500",    bgCls: "bg-rose-500/15" };
  }, [safeWellnessValue]);

  const StatusIcon = status.icon;
  const trackColor = isDark ? "#1e293b" : "#e5e7eb";

  // Create gradient endpoint angle
  const gaugeData = [{ value: safeWellnessValue }];

  return (
    <>
      <div className="absolute top-5 left-5 z-10">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
          {t('dashboard.wellness.title')}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('dashboard.wellness.subtitle')}</p>
      </div>

      {/* Gauge */}
      <div className="relative w-44 h-44 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="wellGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={status.color} stopOpacity="1" />
                <stop offset="100%" stopColor={status.color} stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {/* Track */}
            <Pie
              data={[{ value: 100 }]}
              dataKey="value"
              innerRadius={66}
              outerRadius={82}
              fill={trackColor}
              stroke="none"
              isAnimationActive={false}
            />
            {/* Value arc */}
            <Pie
              data={gaugeData}
              dataKey="value"
              innerRadius={66}
              outerRadius={82}
              startAngle={90}
              endAngle={90 - (safeWellnessValue / 100) * 360}
              fill="url(#wellGrad)"
              stroke="none"
              cornerRadius={20}
              isAnimationActive
            />
          </PieChart>
        </ResponsiveContainer>

        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ filter: `drop-shadow(0 0 12px ${status.glow})` }}
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-full ${status.bgCls} ${status.textCls} mb-1`}>
            <StatusIcon className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <span className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight tabular-nums leading-none">
            {safeWellnessValue}
            <span className="text-base font-bold text-slate-500 dark:text-slate-400 ml-0.5">%</span>
          </span>
          <span className={`mt-1 text-[10px] font-bold uppercase tracking-[0.12em] ${status.textCls} ${status.bgCls} px-2 py-0.5 rounded-full`}>
            {t(status.labelKey)}
          </span>
        </div>
      </div>

      {/* Alert footer */}
      <div className="mt-4 w-full">
        <div className={`flex items-center gap-2 rounded-lg border p-2 ${
          safeWellnessValue < 70
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-emerald-500/30 bg-emerald-500/5"
        }`}>
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${status.bgCls} ${status.textCls} shrink-0`}>
            {safeWellnessValue < 70 ? <AlertTriangle className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold leading-tight ${status.textCls}`}>
              {safeWellnessValue < 70 ? t('dashboard.wellness.attentionRequired') : t('dashboard.wellness.systemHealthy')}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t('dashboard.wellness.unplannedAbsencesToday', { count: stats.absentCount })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default WelnessCard;
