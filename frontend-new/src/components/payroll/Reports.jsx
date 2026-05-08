"use client";

import { useState } from "react";
import { api, buildQueryParams } from "@/lib/api-client";

const PDF_SERVICE_BASE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || "http://localhost:3002";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Building2,
  TrendingDown,
  Banknote,
  Loader2,
  Calendar,
} from "lucide-react";
import MonthPicker from "@/components/ui/MonthPicker";

// Five most important reports for payroll operations
const REPORTS = [
  {
    id: "register",
    name: "Payroll Register",
    desc: "Complete monthly payroll with attendance, earnings, deductions, and net salary for every employee.",
    icon: FileText,
    accent: { bg: "bg-blue-500/10", icon: "text-blue-500", border: "border-blue-500/20" },
  },
  {
    id: "dept_summary",
    name: "Department Salary Summary",
    desc: "Salary cost breakdown grouped by department — head-count, gross, deductions, and net.",
    icon: Building2,
    accent: { bg: "bg-purple-500/10", icon: "text-purple-500", border: "border-purple-500/20" },
  },
  {
    id: "deduction",
    name: "Deduction Report",
    desc: "All deductions including absence, late, fine, loan and advance recovery for the period.",
    icon: TrendingDown,
    accent: { bg: "bg-rose-500/10", icon: "text-rose-500", border: "border-rose-500/20" },
  },
  {
    id: "loan_recovery",
    name: "Loan & Advance Recovery",
    desc: "Monthly loan installments and salary advance recovery status with outstanding balances.",
    icon: FileSpreadsheet,
    accent: { bg: "bg-amber-500/10", icon: "text-amber-500", border: "border-amber-500/20" },
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer / WPS",
    desc: "Salary disbursement file ready for bank upload — IBAN, amount, and routing for each employee.",
    icon: Banknote,
    accent: { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/20" },
  },
];

export default function PayrollReports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloading, setDownloading] = useState(null);

  const handlePdfDownload = async (reportId, reportName) => {
    setDownloading(`${reportId}-pdf`);
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/payroll-management/export-report", {
        params: { ...params, report_type: reportId, month, format: "csv" },
        responseType: "text",
      });
      const lines = data.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
      const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.replace(/"/g, "").trim()));

      const companyName = "HYDERS PARK";
      const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const generatedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const totalRows = rows.length;

      const win = window.open("", "_blank");
      win.document.write(`<!DOCTYPE html><html><head><title>${reportName} - ${monthLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background: #f4f6f8; color: #1f2937; padding: 24px; font-size: 12px; }
  .page { max-width: 1180px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
  /* Hyders Park-style hero header */
  .header { background: linear-gradient(135deg, #0a3d62 0%, #1e5f8e 100%); color: #fff; padding: 30px 38px; position: relative; overflow: hidden; }
  .header .wave { position: absolute; right: -40px; bottom: -60px; width: 320px; height: 200px; background: rgba(255,255,255,0.06); border-radius: 50%; }
  .header .wave2 { position: absolute; right: 80px; bottom: -90px; width: 240px; height: 200px; background: rgba(255,255,255,0.04); border-radius: 50%; }
  .head-row { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
  .head-left { display: flex; align-items: center; gap: 16px; }
  .cloud-icon { width: 38px; height: 38px; opacity: 0.95; }
  .company { font-size: 26px; font-weight: 700; letter-spacing: 0.5px; line-height: 1.1; }
  .subtitle { font-size: 13px; margin-top: 4px; opacity: 0.85; font-weight: 400; }
  .confidential { font-size: 10px; text-transform: uppercase; letter-spacing: 2.5px; border: 1px solid rgba(255,255,255,0.45); padding: 7px 14px; border-radius: 4px; font-weight: 500; }

  .meta { padding: 18px 38px; display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; font-size: 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6; background: #fafbfc; }
  .meta-item { display: flex; flex-direction: column; gap: 2px; }
  .meta-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
  .meta-value { font-size: 13px; font-weight: 600; color: #0a3d62; }

  .section-title { padding: 14px 38px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #0a3d62; background: #eff6ff; border-bottom: 1px solid #dbeafe; display: flex; align-items: center; gap: 8px; }
  .section-title .dot { width: 6px; height: 6px; border-radius: 50%; background: #1e5f8e; }

  .wrap { padding: 0 28px 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; background: #fff; margin-top: 10px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
  thead th { background: #1e5f8e; color: #fff; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px; padding: 12px 14px; text-align: left; }
  tbody td { padding: 11px 14px; border-bottom: 1px solid #e5e7eb; color: #1f2937; vertical-align: middle; }
  tbody tr:nth-child(even) { background: #fafbfc; }
  tbody tr:last-child td { border-bottom: none; }

  .footer { padding: 18px 38px; background: #0a3d62; color: #fff; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
  .footer-total { font-size: 14px; font-weight: 700; letter-spacing: 0.4px; }
  .footer-brand { font-size: 11px; opacity: 0.9; }

  @media print {
    body { padding: 0; background: #fff; }
    .page { box-shadow: none; border-radius: 0; max-width: 100%; }
  }
</style></head><body>
  <div class="page">
    <div class="header">
      <div class="wave"></div>
      <div class="wave2"></div>
      <div class="head-row">
        <div class="head-left">
          <svg class="cloud-icon" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 0 0 4 12.5a4.5 4.5 0 0 0 1 8.5h12.5z"/></svg>
          <div>
            <div class="company">${companyName}</div>
            <div class="subtitle">${reportName} · ${monthLabel}</div>
          </div>
        </div>
        <div class="confidential">Confidential</div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-item"><span class="meta-label">Report</span><span class="meta-value">${reportName}</span></div>
      <div class="meta-item"><span class="meta-label">Period</span><span class="meta-value">${monthLabel}</span></div>
      <div class="meta-item"><span class="meta-label">Generated</span><span class="meta-value">${generatedOn}</span></div>
      <div class="meta-item"><span class="meta-label">Records</span><span class="meta-value">${totalRows}</span></div>
    </div>

    <div class="section-title"><span class="dot"></span> Data Set</div>

    <div class="wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>

    <div class="footer">
      <div class="footer-brand">${companyName} · Generated ${generatedOn}</div>
      <div class="footer-total">${totalRows} Record${totalRows === 1 ? "" : "s"}</div>
    </div>
  </div>
  <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
</body></html>`);
      win.document.close();
    } catch (e) {
      alert("Download failed. Make sure payroll has been generated for this month.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownload = async (reportId, format) => {
    setDownloading(`${reportId}-${format}`);
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/payroll-management/export-report", {
        params: { ...params, report_type: reportId, month, format },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportId}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Download failed. Make sure payroll has been generated for this month.");
    } finally {
      setDownloading(null);
    }
  };

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const [selectedReport, setSelectedReport] = useState(REPORTS[0].id);
  const activeReport = REPORTS.find((r) => r.id === selectedReport) || REPORTS[0];
  const csvBusy = downloading === `${selectedReport}-csv`;
  const pdfBusy = downloading === `${selectedReport}-pdf`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">Reports</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Generate and download payroll reports in CSV or PDF format
        </p>
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-900/40 backdrop-blur-sm px-3 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: unified report + month control */}
        <div className="flex items-stretch h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden flex-1 min-w-[420px]">
          <div className="flex items-center gap-2 pl-4 pr-2 flex-1 min-w-0">
            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="h-full w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100 focus:outline-none cursor-pointer pr-2"
            >
              {REPORTS.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="w-px self-stretch bg-slate-200 dark:bg-white/10" />
          <div className="flex items-center min-w-[200px]">
            <MonthPicker value={month} onChange={setMonth} placeholder="Select month" />
          </div>
        </div>

        {/* Right: download actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload(selectedReport, "csv")}
            disabled={csvBusy}
            className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:-translate-y-px hover:shadow-sm transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {csvBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Download CSV
          </button>
          <button
            onClick={() => handlePdfDownload(selectedReport, activeReport.name)}
            disabled={pdfBusy}
            className="inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-5 text-xs font-semibold text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-px transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Description for selected report */}
      <div className={`rounded-xl border ${activeReport.accent.border} bg-white dark:bg-slate-900/60 p-4 flex items-start gap-3`}>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${activeReport.accent.bg}`}>
          <activeReport.icon className={`h-5 w-5 ${activeReport.accent.icon}`} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{activeReport.name}</h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{activeReport.desc}</p>
        </div>
      </div>
    </div>
  );
}
