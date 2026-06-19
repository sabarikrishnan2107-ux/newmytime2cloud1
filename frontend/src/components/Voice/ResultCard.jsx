"use client";

import { Calendar } from "lucide-react";

/**
 * Shared renderer for voice query results.
 * Used by both the floating VoicePanel and the centered VoiceResultModal.
 *
 * `size` = "sm" (compact panel) | "lg" (centered modal, roomier rows).
 */
export function ResultCard({ result, size = "sm" }) {
  if (!result || !result.data) return null;

  const lg = size === "lg";
  const rowPad = lg ? "px-4 py-3" : "px-3 py-2";
  const avatar = lg ? "w-9 h-9 text-sm" : "w-7 h-7 text-[10px]";
  const nameText = lg ? "text-sm" : "text-xs";
  const subText = lg ? "text-[11px]" : "text-[10px]";
  const maxH = lg ? "max-h-[55vh]" : "max-h-[250px]";
  const gap = lg ? "space-y-2" : "space-y-1.5";

  switch (result.type) {
    case "employee_list":
      return (
        <div className={`${gap} ${maxH} overflow-y-auto pr-1`}>
          {result.data.employees?.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-xs">No employees found</div>
          ) : (
            result.data.employees?.map((emp, i) => (
              <div key={i} className={`flex items-center justify-between ${rowPad} bg-white/5 rounded-2xl border border-white/5`}>
                <div className="flex items-center gap-2.5">
                  <div className={`${avatar} rounded-full bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center font-bold text-indigo-400`}>
                    {(emp.name || "?").charAt(0)}
                  </div>
                  <div>
                    <div className={`${nameText} font-medium text-slate-200`}>{emp.name}</div>
                    <div className={`${subText} text-slate-500`}>{emp.branch}</div>
                  </div>
                </div>
                {emp.in && emp.in !== "---" && (
                  <div className={`${subText} text-slate-400`}>
                    {emp.in} - {emp.out}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      );

    case "summary":
      return (
        <div className={lg ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-2 gap-2"}>
          <SummaryCard label="Present" value={result.data.present} color="emerald" size={size} />
          <SummaryCard label="Absent" value={result.data.absent} color="red" size={size} />
          <SummaryCard label="Late" value={result.data.late} color="amber" size={size} />
          <SummaryCard label="Leave" value={result.data.leave} color="blue" size={size} />
          <SummaryCard label="Holiday" value={result.data.holiday} color="purple" size={size} />
          <SummaryCard label="Off" value={result.data.off} color="slate" size={size} />
        </div>
      );

    case "count":
      return (
        <div className={lg ? "text-center py-8" : "text-center py-4"}>
          <div className={`${lg ? "text-6xl bg-gradient-to-br from-indigo-300 to-purple-400 bg-clip-text text-transparent" : "text-4xl text-indigo-400"} font-bold`}>
            {result.data.count}
          </div>
          <div className={`${lg ? "text-sm mt-2" : "text-xs mt-1"} text-slate-500`}>{result.label}</div>
        </div>
      );

    case "leave_list":
      return (
        <div className={`${gap} ${maxH} overflow-y-auto pr-1`}>
          {result.data.leaves?.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-xs">No leave requests found</div>
          ) : (
            result.data.leaves?.map((leave, i) => (
              <div key={i} className={`flex items-center justify-between ${rowPad} bg-white/5 rounded-2xl border border-white/5`}>
                <div>
                  <div className={`${nameText} font-medium text-slate-200`}>{leave.name}</div>
                  <div className={`${subText} text-slate-500`}>{leave.leave_type} &middot; {leave.days} day{leave.days > 1 ? "s" : ""}</div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  leave.status === "Approved" ? "bg-emerald-500/15 text-emerald-400" :
                  leave.status === "Pending" ? "bg-amber-500/15 text-amber-400" :
                  "bg-red-500/15 text-red-400"
                }`}>
                  {leave.status}
                </span>
              </div>
            ))
          )}
        </div>
      );

    case "change_list":
      return (
        <div className={`${gap} ${maxH} overflow-y-auto pr-1`}>
          {result.data.requests?.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-xs">No change requests</div>
          ) : (
            result.data.requests?.map((req, i) => (
              <div key={i} className={`${rowPad} bg-white/5 rounded-2xl border border-white/5`}>
                <div className={`${nameText} font-medium text-slate-200`}>{req.name}</div>
                <div className={`${subText} text-slate-500`}>{req.date} &middot; {req.reason}</div>
              </div>
            ))
          )}
        </div>
      );

    case "holiday_list":
      return (
        <div className={`${gap} ${maxH} overflow-y-auto pr-1`}>
          {result.data.holidays?.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-xs">No upcoming holidays</div>
          ) : (
            result.data.holidays?.map((h, i) => (
              <div key={i} className={`flex items-center justify-between ${rowPad} bg-white/5 rounded-2xl border border-white/5`}>
                <div className="flex items-center gap-2.5">
                  <Calendar size={lg ? 16 : 14} className="text-purple-400" />
                  <div className={`${nameText} font-medium text-slate-200`}>{h.name}</div>
                </div>
                <div className={`${subText} text-slate-400`}>{h.date}</div>
              </div>
            ))
          )}
        </div>
      );

    default:
      return null;
  }
}

export function SummaryCard({ label, value, color, size = "sm" }) {
  const lg = size === "lg";
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className={`rounded-2xl border text-center ${lg ? "p-4" : "p-3"} ${colors[color]}`}>
      <div className={lg ? "text-3xl font-bold" : "text-2xl font-bold"}>{value}</div>
      <div className={`${lg ? "text-[10px]" : "text-[10px]"} font-medium uppercase tracking-wider mt-0.5 opacity-70`}>{label}</div>
    </div>
  );
}

export default ResultCard;
