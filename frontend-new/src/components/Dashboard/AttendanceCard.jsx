import { dashboardGetCountslast7DaysChart } from "@/lib/endpoint/dashboard";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

// Per-day accent palette (same intent as before, but heights now reflect ABSENT count).
const DAY_COLORS = ["#14b8a6", "#06b6d4", "#10b981", "#6366f1", "#a855f7", "#f59e0b", "#ef4444"];

function ChartTooltip({ active, payload, absentLabel, presentLabel }) {
  if (!active || !payload || !payload.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 min-w-[150px]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {r.day} · {r.dateLabel}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{r.absent ?? 0}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{absentLabel}</span>
      </div>
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
        {presentLabel} {r.present ?? 0}
      </p>
    </div>
  );
}

function AttendanceCard({ branch_ids, department_ids }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await dashboardGetCountslast7DaysChart({ branch_ids, department_ids });
        if (!cancelled) setStats(Array.isArray(data) ? data : []);
      } catch (_) {
        if (!cancelled) setStats([]);
      }
    })();
    return () => { cancelled = true; };
  }, [branch_ids, department_ids]);

  // Bar key = absent (what we want to highlight). Days with 0 absent stay flat.
  const chartData = useMemo(() => {
    return stats.map((row, idx) => ({
      ...row,
      fill: DAY_COLORS[idx % DAY_COLORS.length],
    }));
  }, [stats]);

  const { avgAbsent, totalAbsent, peakAbsent, trend, trendIcon } = useMemo(() => {
    if (!stats.length) return { avgAbsent: 0, totalAbsent: 0, peakAbsent: 0, trend: 0, trendIcon: Minus };

    const absents = stats.map((r) => r.absent || 0);
    const totalAbsent = absents.reduce((s, v) => s + v, 0);
    const avgAbsent = Math.round(totalAbsent / absents.length);
    const peakAbsent = Math.max(...absents);

    // Trend: avg of last 3 days vs preceding days. Up arrow on absent is BAD, so flip color logic.
    const tailN = Math.min(3, Math.floor(absents.length / 2)) || 1;
    const tail = absents.slice(-tailN);
    const head = absents.slice(0, absents.length - tailN);
    const tailAvg = tail.reduce((s, v) => s + v, 0) / Math.max(tail.length, 1);
    const headAvg = head.reduce((s, v) => s + v, 0) / Math.max(head.length, 1);
    const trend = headAvg > 0 ? Math.round(((tailAvg - headAvg) / headAvg) * 100) : 0;
    const trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

    return { avgAbsent, totalAbsent, peakAbsent, trend, trendIcon };
  }, [stats]);

  const TrendIconComp = trendIcon;
  // Absences trending UP is bad → red; DOWN is good → green.
  const trendColor = trend > 0
    ? "text-rose-600 dark:text-rose-400"
    : trend < 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-500 dark:text-slate-400";
  const trendIconColor = trend > 0
    ? "text-rose-500"
    : trend < 0
      ? "text-emerald-500"
      : "text-slate-400";

  return (
    <>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
            {t('dashboard.absences.title')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('dashboard.absences.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5" title="Absence trend: recent days vs earlier days">
            <TrendIconComp className={`h-3.5 w-3.5 ${trendIconColor}`} />
            <span className={`text-[11px] font-semibold tabular-nums ${trendColor}`}>
              {trend > 0 ? "+" : ""}{trend}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.avg')} </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{avgAbsent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.peak')} </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{peakAbsent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.total')} </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{totalAbsent}</span>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
          >
            <defs>
              {chartData.map((s, i) => (
                <linearGradient key={`g-${i}`} id={`absentGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.fill} stopOpacity="1" />
                  <stop offset="100%" stopColor={s.fill} stopOpacity="0.55" />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="dayLetter"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.6 }}
              dy={4}
            />
            <YAxis hide allowDecimals={false} domain={[0, (dataMax) => Math.max(dataMax + 2, 5)]} />
            <Tooltip
              cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
              content={<ChartTooltip absentLabel={t('dashboard.absences.tooltipAbsent')} presentLabel={t('dashboard.absences.tooltipPresent')} />}
            />
            <ReferenceLine
              y={avgAbsent}
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeDasharray="3 3"
              label={{
                value: `avg ${avgAbsent}`,
                position: "right",
                fill: "currentColor",
                fillOpacity: 0.6,
                fontSize: 10,
              }}
            />
            <Bar dataKey="absent" radius={[6, 6, 0, 0]} barSize={22} animationDuration={600}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#absentGrad-${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default AttendanceCard;
