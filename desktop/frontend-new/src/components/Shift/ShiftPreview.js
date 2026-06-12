import React from 'react';
import { LayoutDashboard, Palmtree, Timer, CreditCard } from 'lucide-react';
import { hhmmToMinutes } from '@/lib/utils';

const ShiftPreview = ({ shift }) => {
    const weekoff_type = String(shift?.weekoff_rules?.type || "").toLowerCase();
    const isFlexible = weekoff_type === "flexible";
    const week_offs = isFlexible ? [] : (shift?.weekoff_rules?.days || shift?.weekoff_days || []);
    const halfday_rules = shift?.halfday_rules;

    // Helper to convert "HH:mm" to percentage of a 24h day
    const getPercent = (timeStr) => {
        if (!timeStr) return 0;
        const mins = hhmmToMinutes(timeStr);
        return (mins / 1440) * 100;
    };

    const startPercent = getPercent(shift?.on_duty_time);
    const endPercent = getPercent(shift?.off_duty_time);
    const durationPercent = endPercent - startPercent;

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
        <div>
            <div className="space-y-3  p-4 rounded-xl ">
                <div className="flex text-[10px] text-slate-500 justify-between pl-10 pr-2 pb-2 border-b border-white/5">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                </div>

                {scheduleData.map((item) => {
                    const isOff = week_offs.includes(item.short_key);
                    const isHalfDay = halfday_rules?.enabled && item.short_key === halfday_rules?.day;

                    let barStart = startPercent;
                    let barWidth = durationPercent;
                    if (isHalfDay) {
                        const hdStart = getPercent(halfday_rules?.onDuty || halfday_rules?.on_duty);
                        const hdEnd = getPercent(halfday_rules?.offDuty || halfday_rules?.off_duty);
                        if (hdStart || hdEnd) {
                            barStart = hdStart;
                            barWidth = hdEnd - hdStart;
                        } else {
                            barWidth = durationPercent / 2;
                        }
                    }

                    return (
                        <div key={item.day} className={`flex items-center gap-3 group ${isOff ? 'opacity-40' : ''}`}>
                            <span className={`text-xs font-medium w-7 ${isHalfDay ? 'text-blue-400' : 'text-gray-600 dark:text-slate-300'}`}>
                                {item.day}
                            </span>
                            <div className="flex-1 h-2.5 bg-obsidian dark:bg-slate-800 rounded-full overflow-hidden relative border border-border">
                                {!isOff && (
                                    <div
                                        className={`absolute h-full shadow-lg transition-all duration-500 ${isHalfDay
                                            ? 'bg-blue-500 shadow-blue-500/40'
                                            : 'bg-emerald-500 shadow-emerald-500/40'
                                            }`}
                                        style={{
                                            left: `${barStart}%`,
                                            width: `${barWidth}%`
                                        }}
                                    />
                                )}
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
    );
};

export default ShiftPreview;