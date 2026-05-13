"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Download, Eye } from "lucide-react";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DropDown from "@/components/ui/DropDown";
import DateRangeSelect from "@/components/ui/DateRange";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Pagination from "@/lib/Pagination";
import { api, buildQueryParams } from "@/lib/api-client";
import { getBranches, getVisitorHosts } from "@/lib/api";
import { formatDateDubai, parseApiError, notify } from "@/lib/utils";

const reportTypes = [
  { id: "daily_log", name: "Daily Visitor Log" },
  { id: "weekly_summary", name: "Weekly Summary Report" },
  { id: "monthly_summary", name: "Monthly Summary Report" },
  { id: "visitor_type", name: "Visitor Type Report" },
  { id: "host_report", name: "Host Activity Report" },
  { id: "peak_hours", name: "Peak Hours Analysis" },
  { id: "overstay", name: "Overstay Report" },
  { id: "blacklist", name: "Blacklist Report" },
  { id: "access_method", name: "Access Method Report" },
  { id: "no_show", name: "No-Show Report" },
  { id: "compliance", name: "Compliance Report" },
];

const visitorTypeOptions = [
  { id: "Business", name: "Business" },
  { id: "Contractor", name: "Contractor" },
  { id: "VIP", name: "VIP" },
  { id: "Guest", name: "Guest" },
  { id: "Delivery", name: "Delivery" },
];

const statusOptions = [
  { id: "on-site", name: "On-site" },
  { id: "completed", name: "Completed" },
  { id: "overstayed", name: "Overstayed" },
  { id: "no-show", name: "No-show" },
];

const statusColors = {
  "on-site": "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  completed: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  overstayed: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  "no-show": "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
};

const getDefaultDateRange = () => {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const mm = m < 10 ? `0${m}` : m;
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${lastDay < 10 ? "0" + lastDay : lastDay}`,
  };
};

const COLUMN_SETS = {
  daily_log: ["Visitor", "Host", "Type", "Check In", "Check Out", "Duration", "Status", "Zone"],
  weekly_summary: ["Week", "Total Visitors", "Peak Day", "Peak Hour", "Avg Duration"],
  monthly_summary: ["Month", "Total Visitors", "Avg / Day", "Peak Day", "Overstays"],
  visitor_type: ["Visitor Type", "Count", "Avg Duration", "Share"],
  host_report: ["Host", "Visitor Count", "Total Hours", "Avg Duration"],
  peak_hours: ["Hour", "Check-ins", "Check-outs", "Capacity %"],
  overstay: ["Visitor", "Host", "Expected Out", "Actual Out", "Overstay Hrs"],
  blacklist: ["Visitor", "Reason", "Date Added", "Incidents"],
  access_method: ["Method", "Count", "Share"],
  no_show: ["Visitor", "Host", "Scheduled", "Type"],
  compliance: ["Visitor", "NDA", "Safety Induction", "ID Verified", "Status"],
};

export default function VisitorReports() {
  const defaultDates = getDefaultDateRange();

  const [reportType, setReportType] = useState("daily_log");
  const [selectedVisitorTypes, setSelectedVisitorTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedHostIds, setSelectedHostIds] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);

  const [branches, setBranches] = useState([]);
  const [hosts, setHosts] = useState([]);

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const columns = useMemo(() => COLUMN_SETS[reportType] || [], [reportType]);

  useEffect(() => {
    (async () => {
      try { setBranches(await getBranches()); } catch (e) { /* ignore */ }
    })();
    (async () => {
      try { setHosts(await getVisitorHosts()); } catch (e) { /* ignore */ }
    })();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseParams = await buildQueryParams({});
      const params = {
        ...baseParams,
        page: currentPage,
        per_page: perPage,
        report_type: reportType,
        from_date: formatDateDubai(from),
        to_date: formatDateDubai(to),
      };
      if (selectedVisitorTypes.length) params.visitor_types = selectedVisitorTypes.join(",");
      if (selectedStatuses.length) params.statuses = selectedStatuses.join(",");
      if (selectedHostIds.length) params.host_ids = selectedHostIds.join(",");
      if (selectedBranchIds.length) params.branch_ids = selectedBranchIds.join(",");

      const { data } = await api.get("/visitor-management/logs", { params });
      const rows = (data?.data || []).map(l => {
        const emp = l.visitor?.host?.employee;
        const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : "";
        return {
          id: l.id,
          visitorName: l.visitor ? `${l.visitor.first_name} ${l.visitor.last_name || ""}`.trim() : `Visitor ${l.visitor_id}`,
          company: l.visitor?.visitor_company_name || "---",
          host: empName || l.visitor?.host_name || "---",
          type: l.visitor?.visitor_type || "Business",
          checkIn: l.date && l.in ? `${l.date} ${l.in}` : (l.date || "---"),
          checkOut: l.out ? `${l.date} ${l.out}` : null,
          duration: l.total_hrs || "---",
          zone: l.visitor?.zone?.name || "---",
          status: l.out ? "completed" : l.over_stay ? "overstayed" : "on-site",
          raw: l,
        };
      });
      setRecords(rows);
      setTotal(data?.total || rows.length);
    } catch (err) {
      setError(parseApiError(err));
      setRecords([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    setHasSubmitted(true);
    setCurrentPage(1);
    fetchRecords();
  };

  useEffect(() => {
    if (hasSubmitted) fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage]);

  const handleDownload = (format) => {
    if (!from || !to) {
      notify("Warning", "Date range must be selected", "warning");
      return;
    }
    const qs = new URLSearchParams({
      report_type: reportType,
      from_date: formatDateDubai(from),
      to_date: formatDateDubai(to),
      format,
    });
    if (selectedVisitorTypes.length) qs.append("visitor_types", selectedVisitorTypes.join(","));
    if (selectedStatuses.length) qs.append("statuses", selectedStatuses.join(","));
    if (selectedHostIds.length) qs.append("host_ids", selectedHostIds.join(","));
    if (selectedBranchIds.length) qs.append("branch_ids", selectedBranchIds.join(","));
    notify("Info", `${format.toUpperCase()} download for ${reportType} requested`, "info");
  };

  const renderCell = (row, col) => {
    if (reportType !== "daily_log") return "---";
    switch (col) {
      case "Visitor":
        return (
          <div>
            <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{row.visitorName}</div>
            <div className="text-[10px] text-gray-400">{row.company}</div>
          </div>
        );
      case "Host": return row.host;
      case "Type": return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
          {row.type}
        </span>
      );
      case "Check In": return <span className="text-[11px] font-mono">{row.checkIn}</span>;
      case "Check Out": return <span className="text-[11px] font-mono">{row.checkOut || "---"}</span>;
      case "Duration": return <span className="font-medium">{row.duration}</span>;
      case "Status": return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[row.status] || ""}`}>
          {row.status}
        </span>
      );
      case "Zone": return row.zone;
      default: return "---";
    }
  };

  return (
    <div className="pt-8 pb-4 px-3 md:pt-10 md:pb-6 md:px-6 lg:pt-12 lg:pb-8 lg:px-10 overflow-x-hidden">
      <h3 className="text-2xl font-extrabold text-gray-600 dark:text-slate-300 flex items-center">
        Visitor Reports
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Generate and download visitor management reports
      </p>

      <div className="flex flex-wrap items-center gap-2 my-2">
        <div className="flex flex-col min-w-[220px]">
          <DropDown
            placeholder="Report Type"
            items={reportTypes}
            value={reportType}
            onChange={(val) => setReportType(val)}
          />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Visitor Type"
            items={visitorTypeOptions}
            value={selectedVisitorTypes}
            onChange={setSelectedVisitorTypes}
            badgesCount={1}
          />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Status"
            items={statusOptions}
            value={selectedStatuses}
            onChange={setSelectedStatuses}
            badgesCount={1}
          />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Host"
            items={hosts}
            value={selectedHostIds}
            onChange={setSelectedHostIds}
            badgesCount={1}
          />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <MultiDropDown
            placeholder="Branch"
            items={branches}
            value={selectedBranchIds}
            onChange={setSelectedBranchIds}
            badgesCount={1}
          />
        </div>

        <div className="flex flex-col min-w-[240px]">
          <DateRangeSelect
            value={{ from, to }}
            onChange={({ from: newFrom, to: newTo }) => {
              setFrom(newFrom);
              setTo(newTo);
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Submit
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap focus:outline-none focus:ring-0">
              <Download className="w-4 h-4" /> Download
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1">
            <DropdownMenuItem
              onClick={() => handleDownload("pdf")}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <img src="/icons/pdf.png" alt="PDF Icon" className="w-4 h-4" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownload("excel")}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <img src="/icons/excel.png" alt="Excel Icon" className="w-4 h-4" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Excel</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {columns.map(c => (
                  <th key={c} className="px-3 py-3">{c}</th>
                ))}
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {isLoading && (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400 text-xs">Loading...</td></tr>
              )}
              {!isLoading && error && (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-red-500 text-xs">{error}</td></tr>
              )}
              {!isLoading && !error && records.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400 text-xs">
                  {hasSubmitted ? "No records found" : "Select filters and click Submit to load the report"}
                </td></tr>
              )}
              {!isLoading && !error && records.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300">
                  {columns.map(c => (
                    <td key={c} className="px-3 py-3">{renderCell(row, c)}</td>
                  ))}
                  <td className="px-3 py-3">
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 dark:border-white/5">
          <Pagination
            page={currentPage}
            perPage={perPage}
            total={total}
            isLoading={isLoading}
            onPageChange={setCurrentPage}
            onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); }}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </div>
    </div>
  );
}
