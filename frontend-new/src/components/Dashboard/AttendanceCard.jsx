import { dashboardGetCountslast7DaysChart } from "@/lib/endpoint/dashboard";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, AreaChart as AreaChartIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
} from "recharts";

// Series colors: green = present, red = absent.
const PRESENT_COLOR = "#10b981";
const PRESENT_LINE = "#34d399"; // brighter mint for the area line/dots
const ABSENT_COLOR = "#f43f5e";

// Stacked-bar segments that render NOTHING for zero values (avoids the recharts
// artifact where `radius` draws a tiny nub at value 0). Only the TOP-most visible
// segment of the stack gets rounded top corners.
function AbsentBar(props) {
  if (!props.value || props.height <= 0) return null;
  return <Rectangle {...props} radius={[5, 5, 0, 0]} />;
}
function PresentBar(props) {
  if (!props.value || props.height <= 0) return null;
  // Present sits at the bottom; round its top only when there's no absent on top.
  const isTop = !(props.payload && props.payload.absent > 0);
  return <Rectangle {...props} radius={isTop ? [5, 5, 0, 0] : [0, 0, 0, 0]} />;
}

function TooltipRow({ color, label, value }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
      <span className="ml-auto text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, absentLabel, presentLabel }) {
  if (!active || !payload || !payload.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 min-w-[150px]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {r.day} · {r.dateLabel}
      </p>
      <TooltipRow color={PRESENT_COLOR} label={presentLabel} value={r.present ?? 0} />
      <TooltipRow color={ABSENT_COLOR} label={absentLabel} value={r.absent ?? 0} />
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
    </span>
  );
}

function ChartTypeToggle({ mode, onChange }) {
  const btn = (active) =>
    `flex h-6 w-7 items-center justify-center rounded-md transition ${
      active
        ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
    }`;
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-0.5">
      <button type="button" aria-label="Bar chart" className={btn(mode === "bar")} onClick={() => onChange("bar")}>
        <BarChart3 className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Area chart" className={btn(mode === "area")} onClick={() => onChange("area")}>
        <AreaChartIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AttendanceCard({ branch_ids, department_ids }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState([]);
  const [mode, setMode] = useState("bar"); // "bar" | "area"

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

  const chartData = useMemo(() => stats, [stats]);

  // Headcount drives the Y-axis max so every bar reads as "X of N people".
  const headcount = useMemo(() => {
    return stats.reduce((max, r) => Math.max(max, Number(r.headcount || 0)), 0);
  }, [stats]);

  // Round the axis max up to a "nice" number above headcount (or the data, if no
  // headcount came back) so the top gridline is a clean value.
  const yMax = useMemo(() => {
    const dataMax = stats.reduce(
      (max, r) => Math.max(max, Number(r.present || 0), Number(r.absent || 0)),
      0
    );
    const base = Math.max(headcount, dataMax, 1);
    const step = base <= 10 ? 2 : base <= 50 ? 5 : 10;
    return Math.ceil(base / step) * step;
  }, [stats, headcount]);

  const { avgPresent, avgAbsent, peakAbsent } = useMemo(() => {
    if (!stats.length) return { avgPresent: 0, avgAbsent: 0, peakAbsent: 0 };
    const absents = stats.map((r) => r.absent || 0);
    const presents = stats.map((r) => r.present || 0);
    return {
      avgAbsent: Math.round(absents.reduce((s, v) => s + v, 0) / absents.length),
      avgPresent: Math.round(presents.reduce((s, v) => s + v, 0) / presents.length),
      peakAbsent: Math.max(...absents),
    };
  }, [stats]);

  const gridProps = {
    vertical: false,
    stroke: "currentColor",
    strokeOpacity: 0.08,
    strokeDasharray: "2 4",
  };
  const xAxisProps = {
    dataKey: "dayLetter",
    axisLine: false,
    tickLine: false,
    tick: { fontSize: 11, fill: "currentColor", fillOpacity: 0.6 },
    dy: 4,
  };
  const tooltipEl = (
    <Tooltip
      cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
      content={
        <ChartTooltip
          absentLabel={t("dashboard.absences.absent")}
          presentLabel={t("dashboard.absences.present")}
        />
      }
    />
  );

  return (
    <>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
            {t('dashboard.absences.title')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('dashboard.absences.subtitle')}</p>
        </div>
        <ChartTypeToggle mode={mode} onChange={setMode} />
      </div>

      <div className="flex items-center gap-4 mb-1 text-[11px]">
        <LegendDot color={PRESENT_COLOR} label={t('dashboard.absences.present')} />
        <LegendDot color={ABSENT_COLOR} label={t('dashboard.absences.absent')} />
      </div>

      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.avgPresent')} </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{avgPresent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.avgAbsent')} </span>
          <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{avgAbsent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.peakAbsent')} </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{peakAbsent}</span>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "bar" ? (
            <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRESENT_COLOR} stopOpacity="1" />
                  <stop offset="100%" stopColor={PRESENT_COLOR} stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ABSENT_COLOR} stopOpacity="1" />
                  <stop offset="100%" stopColor={ABSENT_COLOR} stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis {...xAxisProps} />
              <YAxis hide allowDecimals={false} domain={[0, yMax]} />
              {tooltipEl}
              {/* Stacked: green present on the bottom, red absent on top. */}
              <Bar dataKey="present" stackId="att" fill="url(#presentGrad)" shape={<PresentBar />} barSize={24} animationDuration={600} />
              <Bar dataKey="absent" stackId="att" fill="url(#absentGrad)" shape={<AbsentBar />} barSize={24} animationDuration={600} />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="presentArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRESENT_LINE} stopOpacity="0.38" />
                  <stop offset="100%" stopColor={PRESENT_COLOR} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis {...xAxisProps} />
              <YAxis hide allowDecimals={false} domain={[0, yMax]} />
              {tooltipEl}
              {/* Single soft-green Present trend (tooltip still shows absent too). */}
              <Area
                type="natural" dataKey="present"
                stroke={PRESENT_LINE} strokeWidth={2.4} fill="url(#presentArea)"
                dot={{ r: 3.5, fill: PRESENT_LINE, stroke: "#0b1322", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: PRESENT_LINE, stroke: "#0b1322", strokeWidth: 2 }}
                animationDuration={600}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default AttendanceCard;
