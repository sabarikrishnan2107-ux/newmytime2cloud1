"use client";

import React, { useEffect, useState } from "react";
import { Cake, Calendar, Sparkles, Gift } from "lucide-react";
import { getWeeklyBirthdays } from "@/lib/endpoint/dashboard";
import { svcUrl } from "@/lib/runtimeHost";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const resolvePic = (pic) =>
  pic
    ? pic.startsWith("http")
      ? pic
      : `${svcUrl("http", 8000)}/media/employee/profile_picture/${pic}`
    : null;

export default function WeeklyBirthdays() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getWeeklyBirthdays();
        if (!cancelled) setRows(res?.data || []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-10 opacity-50 text-[10px] uppercase tracking-widest">
        Loading birthdays…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center py-10 text-[10px] text-rose-400">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
        <span className="material-symbols-outlined text-4xl mb-2">cake</span>
        <p className="text-[10px] font-bold uppercase tracking-widest">
          No birthdays this week
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.employee_id}
            onClick={() => setSelected(r)}
            title="View birthday details"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
              r.is_today
                ? "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15"
                : "bg-white/[0.02] border-white/5 hover:bg-white/5"
            }`}
          >
            {/* Avatar / cake icon */}
            <div className={`shrink-0 size-10 rounded-full overflow-hidden flex items-center justify-center ${
              r.is_today ? "bg-pink-500/20 ring-2 ring-pink-400/60" : "bg-slate-700/40"
            }`}>
              {r.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvePic(r.profile_picture)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <span className="text-lg" aria-hidden="true">🎂</span>
              )}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">
                  {r.full_name}
                </p>
                {r.is_today && (
                  <span className="text-[8px] font-black tracking-widest uppercase bg-pink-500 text-white px-1.5 py-0.5 rounded">
                    TODAY
                  </span>
                )}
                {r.age_turning ? (
                  <span className="text-[9px] text-slate-500">turns {r.age_turning}</span>
                ) : null}
              </div>
              <p className="text-[10px] text-slate-500 truncate italic mt-0.5">
                {r.wish}
              </p>
            </div>

            {/* Date column */}
            <div className="shrink-0 text-right">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${
                r.is_today ? "text-pink-500 dark:text-pink-400" : "text-slate-500"
              }`}>
                {r.day_of_week}
              </p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 font-mono">
                {r.display_date}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Birthday Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {selected && (
            <>
              {/* Festive gradient header */}
              <div className="relative bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 px-6 pt-7 pb-10 text-white text-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
                <Sparkles className="absolute top-4 left-5 h-4 w-4 text-white/70" />
                <Sparkles className="absolute bottom-6 right-8 h-3.5 w-3.5 text-white/60" />
                <Sparkles className="absolute top-10 right-12 h-3 w-3 text-white/50" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    <div className="size-20 rounded-full overflow-hidden ring-4 ring-white/40 bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      {selected.profile_picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvePic(selected.profile_picture)}
                          alt={selected.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <span className="text-3xl" aria-hidden="true">🎂</span>
                      )}
                    </div>
                    {selected.is_today && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest uppercase bg-white text-pink-600 px-2 py-0.5 rounded-full shadow">
                        Today
                      </span>
                    )}
                  </div>

                  <DialogHeader className="mt-4 space-y-1 items-center sm:text-center">
                    <DialogTitle className="text-xl font-bold text-white leading-tight">
                      {selected.full_name}
                    </DialogTitle>
                    {selected.age_turning ? (
                      <p className="text-xs font-medium text-white/85 uppercase tracking-wider">
                        Turns {selected.age_turning}
                      </p>
                    ) : null}
                  </DialogHeader>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4 bg-white dark:bg-slate-800">
                {/* Wish message */}
                {selected.wish && (
                  <div className="relative bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 rounded-xl p-4">
                    <Gift className="absolute -top-2.5 -left-2.5 h-6 w-6 p-1 rounded-full bg-pink-500 text-white shadow" />
                    <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">
                      "{selected.wish}"
                    </p>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 shrink-0">
                    <Calendar className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Birthday</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {selected.day_of_week ? `${selected.day_of_week}, ` : ""}{selected.display_date}
                    </p>
                  </div>
                </div>

                {/* Age turning (separate row, only if present) */}
                {selected.age_turning ? (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-500 shrink-0">
                      <Cake className="h-4 w-4" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Age</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Turning {selected.age_turning} years old
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
