import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLeavesEvents } from '@/lib/endpoint/leaves';

export default function LeavesCalendarView() {
  const [viewDate, setViewDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await getLeavesEvents();
        setEvents(data || {});
      } catch (error) {
        console.error("Error fetching calendar events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Calendar Logic
  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    // Create padding for the first week
    const padding = Array(firstDay).fill(null);
    // Create actual days
    const monthDays = Array.from({ length: days }, (_, i) => i + 1);

    return [...padding, ...monthDays];
  }, [viewDate]);

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const getEventColor = (day) => {
    if (!day) return null;
    // Construct YYYY-MM-DD key for your events object
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = events[dateStr];

    if (!status) return null;
    switch (status.toLowerCase()) {
      case 'orange': case 'leave': return 'bg-orange-500';
      case 'primary': case 'blue': case 'holiday': return 'bg-blue-500';
      case 'grey': case 'weekoff': return 'bg-slate-400';
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="pb-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-indigo-500" />
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
            Leave Calendar
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 min-w-[80px] text-center">
            {monthName} {year}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="py-2">
        {/* Day Labels - Increased font and reduced margin */}
        <div className="grid grid-cols-7 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid - Tighter gap and larger text */}
        <div className="grid grid-cols-7 gap-0.5">
          {daysInMonth.map((day, idx) => (
            <div
              key={idx}
              className={`h-8 flex flex-col items-center justify-center relative rounded-lg transition-colors ${day ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
            >
              <span className={`text-xs font-semibold ${day ? 'text-slate-700 dark:text-gray-200' : 'text-transparent'}`}>
                {day}
              </span>

              {/* Event Dot - Slightly larger and tighter to the text */}
              {day && getEventColor(day) && (
                <div className={`w-1.5 h-1.5 rounded-full ${getEventColor(day)} absolute bottom-1`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-gray-100 dark:border-white/5">
        {[
          { label: 'WeekOff', color: 'bg-slate-400' },
          { label: 'Leave', color: 'bg-orange-500' },
          { label: 'Holiday', color: 'bg-blue-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 justify-center">
            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}