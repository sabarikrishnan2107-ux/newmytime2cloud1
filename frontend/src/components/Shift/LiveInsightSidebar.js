import React from 'react';
import { LayoutDashboard, Palmtree, Timer, CreditCard } from 'lucide-react';
import { hhmmToMinutes } from '@/lib/utils';

const LiveInsightSidebar = ({ shift }) => {
    const weekoff_type = String(shift?.weekoff_rules?.type || "").toLowerCase();
    const isFlexible = weekoff_type === "flexible";
    const week_offs = isFlexible ? [] : (shift?.weekoff_rules?.days || shift?.weekoff_days || []);
    const halfday_rules = shift?.halfday_rules;
    const beforeOt = shift?.overtime_type === "Both" || shift?.overtime_type === "Before";
    const afterOt = shift?.overtime_type === "Both" || shift?.overtime_type === "After";
    const hasOt = beforeOt || afterOt;

    // Helper to convert "HH:mm" to percentage of a 24h day
    const getPercent = (timeStr) => {
        if (!timeStr) return 0;
        const mins = hhmmToMinutes(timeStr);
        return (mins / 1440) * 100;
    };

    const startPercent = getPercent(shift?.on_duty_time);
    const endPercent = getPercent(shift?.off_duty_time);
    const isNightShift = startPercent > endPercent;

    const scheduleData = [
        { short_key: "M", day: 'Mon' },
        { short_key: "T", day: 'Tue' },
        { short_key: "W", day: 'Wed' },
        { short_key: "Th", day: 'Thu' },
        { short_key: "F", day: 'Fri' },
        { short_key: "S", day: 'Sat' },
        { short_key: "Su", day: 'Sun' },
    ];

    return (
        <>
            {/* Header */}
            <h3 className="text-lg font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2 sticky top-0 bg-transparent pb-2">
                <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                Live Insight
            </h3>

            {/* Insight Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border dark:border-white/10 rounded-xl p-4 flex flex-col justify-between h-28 relative overflow-hidden group hover:bg-white/10 transition-all">
                    <Palmtree className="absolute -top-2 -right-2 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity text-gray-600 dark:text-slate-300" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weekly Off</span>
                    <div>
                        <span className="text-2xl font-bold text-gray-600 dark:text-slate-300">{shift?.weekoff_rules?.type}</span>
                    </div>
                </div>

                <div className="bg-white/5 border dark:border-white/10 rounded-xl p-4 flex flex-col justify-between h-28 relative overflow-hidden group hover:bg-white/10 transition-all">
                    <Timer className="absolute -top-2 -right-2 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity text-gray-600 dark:text-slate-300" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grace Period</span>
                    <div>
                        <span className="text-2xl font-bold text-gray-600 dark:text-slate-300">
                            {hhmmToMinutes(shift.late_time)} <span className="text-sm font-normal text-slate-400">mins</span>
                        </span>
                        {hhmmToMinutes(shift.late_time) > 0 && <p className="text-xs text-orange-400 mt-1">Late mark enabled</p>}
                    </div>
                </div>

                <div className="bg-white/5 border dark:border-white/10 rounded-xl p-4 flex flex-col gap-3 col-span-2 relative overflow-hidden group hover:bg-white/10 transition-all">
                    <CreditCard className="absolute -top-2 -right-2 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity text-gray-600 dark:text-slate-300" />
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overtime Threshold</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${hasOt ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                            {hasOt ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                        {[
                            { label: "Before", active: beforeOt },
                            { label: "After", active: afterOt },
                            { label: "Weekend", active: !!shift.weekend_allowed_ot },
                            { label: "Holiday", active: !!shift.holiday_allowed_ot },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`} />
                                <span className={`text-[10px] font-medium ${item.active ? 'text-emerald-400' : 'text-slate-500'}`}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Schedule Preview Section */}
            <div className="flex flex-col gap-4 mt-2">
                <div className="flex justify-between items-end">
                    <h4 className="text-sm font-bold text-gray-600 dark:text-slate-300">Weekly Schedule Preview</h4>
                    <span className="text-[10px] text-slate-500">24H Timeline</span>
                </div>

                <div className="space-y-3 dark:bg-black/20 p-4 rounded-xl border dark:border-white/5">
                    <div className="flex text-[10px] text-slate-500 justify-between pl-10 pr-2 pb-2 border-b border-white/5">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                    </div>

                    {scheduleData.map((item, idx) => {
                        const prevDay = scheduleData[(idx - 1 + scheduleData.length) % scheduleData.length];
                        const nextDay = scheduleData[(idx + 1) % scheduleData.length];
                        const isDayOff = week_offs.includes(item.short_key);
                        const isPrevDayOff = week_offs.includes(prevDay.short_key);
                        const isNextDayOff = week_offs.includes(nextDay.short_key);

                        const isHalfDay = halfday_rules?.enabled && item.short_key === halfday_rules?.day;

                        let bars = [];
                        if (isHalfDay) {
                            const hdStart = getPercent(halfday_rules?.onDuty || halfday_rules?.on_duty);
                            const hdEnd = getPercent(halfday_rules?.offDuty || halfday_rules?.off_duty);
                            if (hdStart || hdEnd) {
                                if (hdStart > hdEnd) {
                                    bars = [{ left: hdStart, width: 100 - hdStart }, { left: 0, width: hdEnd }];
                                } else {
                                    bars = [{ left: hdStart, width: hdEnd - hdStart }];
                                }
                            } else {
                                const halfDuration = isNightShift ? ((100 - startPercent) + endPercent) / 2 : (endPercent - startPercent) / 2;
                                bars = [{ left: startPercent, width: halfDuration }];
                            }
                        } else if (isNightShift) {
                            // Night shift: morning bar (00:00-off_duty) from previous night
                            // Evening bar (on_duty-24:00) for current night going into next day
                            const showMorning = !isDayOff && !isNextDayOff;
                            const showEvening = !isNextDayOff;

                            // Morning bar: show if current day is not off (prev night's shift carries into this day)
                            const hasMorning = !isDayOff;
                            // Evening bar: show if next day is not weekoff
                            const hasEvening = !isNextDayOff;

                            if (hasMorning) bars.push({ left: 0, width: endPercent });
                            if (hasEvening) bars.push({ left: startPercent, width: 100 - startPercent });
                        } else if (!isDayOff) {
                            bars = [{ left: startPercent, width: endPercent - startPercent }];
                        }

                        const isFullOff = bars.length === 0;
                        const barColor = isHalfDay
                            ? 'bg-blue-500 shadow-blue-500/40'
                            : 'bg-emerald-500 shadow-emerald-500/40';

                        return (
                            <div key={item.day} className={`flex items-center gap-3 group ${isFullOff ? 'opacity-40' : ''}`}>
                                <span className={`text-xs font-medium w-7 ${isHalfDay ? 'text-blue-400' : isFullOff ? 'text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>
                                    {item.day}
                                </span>
                                <div className="flex-1 h-2.5 bg-obsidian dark:bg-slate-800 rounded-full overflow-hidden relative border border-border">
                                    {bars.map((bar, i) => (
                                        <div
                                            key={i}
                                            className={`absolute h-full shadow-lg transition-all duration-500 ${barColor}`}
                                            style={{
                                                left: `${bar.left}%`,
                                                width: `${bar.width}%`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]"></span>
                        Duty
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]"></span>
                        Half Day
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-800 border border-slate-600"></span>
                        Off
                    </div>
                </div>
            </div>
        </>
    );
};

export default LiveInsightSidebar;