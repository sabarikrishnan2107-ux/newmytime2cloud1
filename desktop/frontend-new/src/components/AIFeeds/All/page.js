"use client";

import React, { useEffect, useState, useRef } from 'react';
import { getAIFeeds } from '@/lib/endpoint/dashboard';
import Input from '@/components/Theme/Input';
import ProfilePicture from '@/components/ProfilePicture';
import { X, Bell } from 'lucide-react';


export default function AIFeedAll() {
    const [dailyAttendanceRows, setDailyAttendanceRows] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedFeed, setSelectedFeed] = useState(null);

    const fetchAllData = async () => {
        try {
            const params = {
                per_page: 50,
            };
            const result = await getAIFeeds(params);
            setDailyAttendanceRows(result.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Filter rows by search
    const filteredRows = search.trim().length === 0
        ? dailyAttendanceRows
        : dailyAttendanceRows.filter(row =>
            (row?.description || "").toLowerCase().includes(search.toLowerCase())
        );

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d)) return '';
        return d.toLocaleString();
    };

    return (
        <>
            <div className="overflow-auto">
                <table className="w-full table-fixed text-left border-collapse min-w-[500px]">
                    <colgroup>
                        <col style={{ width: '60px' }} />
                        <col style={{ width: '50%' }} />
                        <col style={{ width: '160px' }} />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap" style={{ width: '60px' }}>#</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap" style={{ width: '50%' }}>Description</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap" style={{ width: '160px' }}>Created At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {filteredRows.length > 0 ? filteredRows.map((row, index) => (
                            <tr
                                key={row.id}
                                onClick={() => setSelectedFeed(row)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group relative cursor-pointer"
                            >
                                <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{index + 1}</td>
                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 overflow-hidden">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <ProfilePicture src={row?.employee?.profile_picture} />
                                        <div className="min-w-0">
                                            {row?.employee?.first_name || row?.employee?.last_name ? (
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                                    {[row?.employee?.first_name, row?.employee?.last_name].filter(Boolean).join(" ")}
                                                </div>
                                            ) : null}
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={row?.description || ''}>
                                                {row?.description || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{formatDate(row?.created_at)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">No AI feeds found for selected filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedFeed && (
                <AIFeedDetailModal feed={selectedFeed} onClose={() => setSelectedFeed(null)} />
            )}
        </>
    );
}

function AIFeedDetailModal({ feed, onClose }) {
    const emp = feed?.employee || {};
    const fullName = [emp?.first_name, emp?.last_name].filter(Boolean).join(" ").trim();
    const branchName = emp?.branch?.branch_name || "—";
    const deptName = emp?.department?.name || "—";
    const createdAt = feed?.created_at ? new Date(feed.created_at) : null;
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4"
            onClick={onClose}
        >
            <div
                className="w-[560px] max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <Bell size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-white">AI Feed Detail</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {createdAt ? createdAt.toLocaleString() : ""}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {(fullName || emp?.profile_picture) && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60">
                            <ProfilePicture src={emp?.profile_picture} />
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">{fullName || "Employee"}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    ID: {emp?.employee_id || "—"} • {branchName} / {deptName}
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Description</div>
                        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                            {feed?.description || "—"}
                        </div>
                    </div>

                    {feed?.type ? (
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Type</div>
                            <div className="text-sm text-slate-700 dark:text-slate-200">{feed.type}</div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
