"use client";

import React, { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Building2, Tag, Clock, ArrowRight } from 'lucide-react';
import { getHolidays } from '@/lib/endpoint/holidays';
import { getBranches } from '@/lib/api';
import { api } from '@/lib/api';
import { API_BASE, buildQueryParams } from '@/lib/api-client';
import { Badge } from '../ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const statusBadge = (startDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate) : null;
    const isPast = !start || start < today;
    const cfg = isPast
        ? {
              label: 'Past',
              color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20',
          }
        : {
              label: 'Upcoming',
              color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
          };

    return (
        <div className="flex items-center">
            <Badge variant="outline" className={`flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.label}
            </Badge>
        </div>
    );
};

const formatDate = (iso) => {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const relativeText = (startDate) => {
    if (!startDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return null;
    start.setHours(0, 0, 0, 0);
    const diffMs = start.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
};

export default function HolidaysPage() {
    const [rows, setRows] = useState([]);
    const [selectedHoliday, setSelectedHoliday] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const year = new Date().getFullYear();
            try {
                // 1. Company-configured holidays from the DB.
                const dbPromise = getHolidays({
                    page: 1,
                    per_page: 1000,
                    sortDesc: 'false',
                    branch_ids: [],
                    search: null,
                    types: [],
                }).catch(() => ({ data: [] }));

                // 2. All branches, grouped by country so we only call the government
                // endpoint once per unique country.
                const branchesPromise = getBranches().catch(() => []);

                const [dbRes, branches] = await Promise.all([dbPromise, branchesPromise]);
                if (cancelled) return;

                const dbRows = Array.isArray(dbRes?.data) ? dbRes.data : [];
                const branchList = Array.isArray(branches) ? branches : [];

                // 3. For each unique country, fetch government holidays (cached server-side for 30d).
                const countries = [
                    ...new Set(
                        branchList
                            .map((b) => (b?.country || '').toString().trim().toUpperCase())
                            .filter(Boolean),
                    ),
                ];

                const govByCountry = {};
                await Promise.all(
                    countries.map(async (code) => {
                        try {
                            const params = await buildQueryParams({ country_code: code, year });
                            const { data } = await api.get(`${API_BASE}/government-holidays`, { params });
                            govByCountry[code] = data?.success && Array.isArray(data.data) ? data.data : [];
                        } catch (_) {
                            govByCountry[code] = [];
                        }
                    }),
                );

                // 4. Expand each government holiday into one row per branch in that country.
                // Skip if the same (branch_id, name, start_date) is already in DB rows.
                const dbKey = (r) =>
                    `${r?.branch_id ?? ''}|${(r?.name || '').toLowerCase()}|${r?.start_date || ''}`;
                const dbKeys = new Set(dbRows.map(dbKey));

                const govRows = [];
                branchList.forEach((b) => {
                    const code = (b?.country || '').toString().trim().toUpperCase();
                    const list = govByCountry[code] || [];
                    list.forEach((h) => {
                        const synthetic = {
                            id: `gov_${b.id}_${h.id}`,
                            name: h.name,
                            start_date: h.start_date,
                            end_date: h.end_date,
                            total_days: h.total_days,
                            branch: { branch_name: b.branch_name || b.name || code },
                            branch_id: b.id,
                            last_sync_at: null,
                            source: 'government',
                        };
                        if (!dbKeys.has(dbKey(synthetic))) govRows.push(synthetic);
                    });
                });

                // 5. Merge + sort: upcoming first (asc by start_date), then past (desc).
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = (r) => {
                    const d = r.start_date ? new Date(r.start_date) : null;
                    return !d || d < today;
                };
                const merged = [...dbRows, ...govRows].sort((a, b) => {
                    const ap = isPast(a), bp = isPast(b);
                    if (ap !== bp) return ap ? 1 : -1;
                    const ad = new Date(a.start_date || 0).getTime();
                    const bd = new Date(b.start_date || 0).getTime();
                    return ap ? bd - ad : ad - bd;
                });

                setRows(merged);
            } catch (err) {
                console.error('Holidays fetch failed:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="overflow-auto">
            <table className="w-full text-left border-collapse min-w-[200px]">
                <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Branch</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Name</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Duration</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Total Days</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Source</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                    {rows.length > 0 ? (
                        rows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => setSelectedHoliday(row)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group relative cursor-pointer"
                                title="View holiday details"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.branch?.branch_name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                                    {row?.start_date || 'N/A'}
                                    {row?.end_date && row.end_date !== row.start_date ? ` - ${row.end_date}` : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.total_days || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                                    {row?.source === 'government' ? 'Government' : 'Company'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{statusBadge(row?.start_date)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">
                                No holiday detail found for selected filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Holiday Detail Dialog */}
            <Dialog open={!!selectedHoliday} onOpenChange={(open) => !open && setSelectedHoliday(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    {selectedHoliday && (
                        <>
                            {/* Header with gradient */}
                            <div className="relative bg-gradient-to-br from-primary/90 to-purple-600/90 px-6 pt-6 pb-8 text-white">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />
                                <div className="relative z-10 flex items-start gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                                        <CalendarDays className="h-5 w-5" strokeWidth={2.2} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <DialogHeader className="space-y-1">
                                            <DialogTitle className="text-xl font-bold text-white leading-tight">
                                                {selectedHoliday.name || 'Holiday'}
                                            </DialogTitle>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {statusBadge(selectedHoliday.start_date)}
                                                {relativeText(selectedHoliday.start_date) && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                                        <Clock className="h-3 w-3" />
                                                        {relativeText(selectedHoliday.start_date)}
                                                    </span>
                                                )}
                                            </div>
                                        </DialogHeader>
                                    </div>
                                </div>
                            </div>

                            {/* Body details */}
                            <div className="px-6 py-5 space-y-4 bg-white dark:bg-slate-800">
                                {/* Duration row with start -> end */}
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                        <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                                        <div className="flex items-center gap-2 flex-wrap text-sm font-medium text-slate-700 dark:text-slate-200">
                                            <span>{formatDate(selectedHoliday.start_date)}</span>
                                            {selectedHoliday.end_date && selectedHoliday.end_date !== selectedHoliday.start_date && (
                                                <>
                                                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{formatDate(selectedHoliday.end_date)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Total Days */}
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                                        <Clock className="h-4 w-4" strokeWidth={2.2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total Days</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {selectedHoliday.total_days || 1} {selectedHoliday.total_days === 1 || !selectedHoliday.total_days ? 'day' : 'days'}
                                        </p>
                                    </div>
                                </div>

                                {/* Branch */}
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                                        <MapPin className="h-4 w-4" strokeWidth={2.2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Branch</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {selectedHoliday?.branch?.branch_name || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Source */}
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                                        {selectedHoliday.source === 'government' ? (
                                            <Building2 className="h-4 w-4" strokeWidth={2.2} />
                                        ) : (
                                            <Tag className="h-4 w-4" strokeWidth={2.2} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Source</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {selectedHoliday.source === 'government' ? 'Government Holiday' : 'Company Holiday'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
