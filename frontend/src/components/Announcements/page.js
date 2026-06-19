"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAnnouncementList } from '@/lib/endpoint/announcements';
import { Badge } from '../ui/badge';

const categoryBadge = (category) => {
    if (!category) return null;

    const colorMap = {
        "Urgent": "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        "Informational": "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        "Meeting": "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
        "Priority": "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        "Low Priority": "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
    };

    const color = colorMap[category.name] || colorMap["Low Priority"];

    return (
        <Badge
            variant="outline"
            className={`flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full ${color}`}
        >
            {category.name}
        </Badge>
    );
};

const statusBadge = (start_date, end_date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(start_date);
    const end = new Date(end_date);

    let statusKey = "A"; // Active
    if (end < today) {
        statusKey = "E"; // Expired
    } else if (start > today) {
        statusKey = "S"; // Scheduled
    }

    const statusConfig = {
        "E": {
            label: "Expired",
            color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20",
        },
        "A": {
            label: "Active",
            color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        },
        "S": {
            label: "Scheduled",
            color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        },
    };

    const current = statusConfig[statusKey];

    return (
        <Badge
            variant="outline"
            className={`flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full ${current.color}`}
        >
            {current.label}
        </Badge>
    );
};

export default function AnnouncementsPage() {
    const router = useRouter();
    const [rows, setRows] = useState([]);

    const fetchAllData = async () => {
        try {
            const params = {
                page: 1,
                per_page: 100,
            };
            const result = await getAnnouncementList(params);
            setRows(result.data || []);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    return (
        <div className="overflow-auto">
            <table className="w-full text-left border-collapse min-w-[200px]">
                <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Title</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Branch</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Category</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Duration</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Posted</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                    {rows.length > 0 ? rows.map((row) => (
                        <tr
                            key={row.id}
                            onClick={() => router.push('/announcements')}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group relative cursor-pointer"
                            title="Go to Announcements"
                        >
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[200px] truncate" title={row.title}>{row.title || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row?.branch?.branch_name || 'All'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{categoryBadge(row.category)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row.start_date || 'N/A'} - {row.end_date || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{statusBadge(row.start_date, row.end_date)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">No announcements found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
