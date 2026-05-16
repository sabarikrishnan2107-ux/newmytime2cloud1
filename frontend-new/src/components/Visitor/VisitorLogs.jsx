"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Download, Eye, X, Clock, LogIn, LogOut } from "lucide-react";

const statusColors = {
  "on-site": "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  completed: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  overstayed: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

export default function VisitorLogs() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = await buildQueryParams({});
      const reqParams = { ...params, per_page: 100 };
      if (dateFilter) reqParams.date = dateFilter;
      const { data } = await api.get("/visitor-management/logs", { params: reqParams });
      setLogs((data?.data || []).map(l => ({
        id: l.id,
        visitorName: l.visitor ? `${l.visitor.first_name} ${l.visitor.last_name || ""}`.trim() : `Visitor ${l.visitor_id}`,
        company: l.visitor?.visitor_company_name || "---",
        host: "---",
        checkIn: l.date && l.in ? `${l.date} ${l.in}` : l.date || "---",
        checkOut: l.out ? `${l.date} ${l.out}` : null,
        duration: l.total_hrs || "---",
        type: "Business",
        zone: "---",
        method: "---",
        status: l.out ? "completed" : l.over_stay ? "overstayed" : "on-site",
      })));
    } catch (e) { console.warn("Logs error", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [dateFilter]);

  const filtered = logs.filter(l => {
    const matchSearch = !search || [l.visitorName, l.company, l.host].some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Visitor Logs</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Complete visitor check-in and check-out history</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder="Search visitor, company, host..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Visitor</th><th className="px-3 py-3">Host</th><th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Check In</th><th className="px-3 py-3">Check Out</th><th className="px-3 py-3">Duration</th>
                <th className="px-3 py-3">Zone</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300">
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{l.visitorName}</div>
                    <div className="text-[10px] text-gray-400">{l.company}</div>
                  </td>
                  <td className="px-3 py-3">{l.host}</td>
                  <td className="px-3 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">{l.type}</span></td>
                  <td className="px-3 py-3 text-[11px] font-mono">{l.checkIn}</td>
                  <td className="px-3 py-3 text-[11px] font-mono">{l.checkOut || "---"}</td>
                  <td className="px-3 py-3 font-medium">{l.duration}</td>
                  <td className="px-3 py-3">{l.zone}</td>
                  <td className="px-3 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[l.status] || ""}`}>{l.status}</span></td>
                  <td className="px-3 py-3">
                    <button onClick={() => setSelectedLog(l)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400 text-xs">No logs found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50">
        <span className="text-xs text-gray-500">Showing {filtered.length} logs</span>
      </div>

      {selectedLog && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedLog.visitorName}</h3>
                <p className="text-[10px] text-gray-500">{selectedLog.company}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[["Host", selectedLog.host], ["Type", selectedLog.type], ["Zone", selectedLog.zone], ["Method", selectedLog.method],
                ["Check In", selectedLog.checkIn], ["Check Out", selectedLog.checkOut || "Still on-site"], ["Duration", selectedLog.duration]].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span><span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
