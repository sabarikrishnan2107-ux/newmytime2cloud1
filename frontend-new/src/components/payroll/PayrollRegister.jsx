"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/payroll/StatusBadge";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Download, Eye, FileText, X, Loader2 } from "lucide-react";
import PDFProgressOverlay from "@/components/Report/PDFProgressOverlay";

const PDF_SERVICE_BASE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || 'http://localhost:3002';

export default function PayrollRegister() {
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get("batch");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [empFilter, setEmpFilter] = useState("all");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [batchInfo, setBatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = await buildQueryParams({});
        let batch;
        if (batchIdParam) {
          // View specific batch from dashboard eye icon
          const batchRes = await api.get("/payroll-management/batches", { params: { ...params, per_page: 50 } });
          batch = (batchRes.data?.data || []).find(b => String(b.id) === batchIdParam);
        }
        if (!batch) {
          // Fallback: get latest batch
          const batchRes = await api.get("/payroll-management/batches", { params: { ...params, per_page: 1 } });
          batch = batchRes.data?.data?.[0];
        }
        if (!batch) { setLoading(false); return; }
        setBatchInfo(batch);

        const { data } = await api.get(`/payroll-management/records/${batch.id}`, { params: { ...params, per_page: 100 } });
        const items = (data?.data || []).map(r => ({
          id: r.id,
          employeeId: r.employee?.employee_id || r.employee_id,
          name: r.employee ? `${r.employee.first_name} ${r.employee.last_name || ""}`.trim() : `Emp ${r.employee_id}`,
          department: r.employee?.department?.name || "---",
          branch: r.employee?.branch?.branch_name || "---",
          presentDays: r.present_days ?? 0,
          absentDays: r.absent_days ?? 0,
          lateDays: r.late_days ?? 0,
          lateMinutes: r.late_minutes ?? 0,
          otHours: parseFloat(r.ot_hours) || 0,
          basicSalary: parseFloat(r.basic_salary) || 0,
          totalAllowances: parseFloat(r.total_allowances) || 0,
          otAmount: parseFloat(r.ot_amount) || 0,
          grossEarned: parseFloat(r.gross_earned) || 0,
          absenceDeduction: parseFloat(r.absence_deduction ?? 0),
          lateDeduction: parseFloat(r.late_deduction ?? 0),
          loanDeduction: parseFloat(r.loan_deduction ?? 0),
          advanceDeduction: parseFloat(r.advance_deduction ?? 0),
          fineAmount: parseFloat(r.fine_amount ?? 0),
          otherDeduction: parseFloat(r.other_deduction ?? 0),
          totalDeduction: parseFloat(r.total_deduction) || 0,
          netSalary: parseFloat(r.net_salary) || 0,
          status: r.status,
        }));
        setRecords(items);
      } catch (e) {
        console.warn("Register error", e);
        console.warn("Response:", e?.response?.data);
      }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = records.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || String(e.employeeId).toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === "all" || e.branch === branchFilter;
    const matchDept = deptFilter === "all" || e.department === deptFilter;
    const matchEmp = empFilter === "all" || String(e.employeeId) === String(empFilter);
    return matchSearch && matchBranch && matchDept && matchEmp;
  });

  const branches = [...new Set(records.map(e => e.branch).filter(b => b && b !== "---"))];
  // Departments narrowed by selected branch
  const departments = [...new Set(
    records
      .filter(e => branchFilter === "all" || e.branch === branchFilter)
      .map(e => e.department)
      .filter(d => d && d !== "---")
  )];
  // Employees narrowed by selected branch + dept
  const empOptions = records
    .filter(e => (branchFilter === "all" || e.branch === branchFilter) && (deptFilter === "all" || e.department === deptFilter))
    .map(e => ({ id: e.employeeId, name: e.name }));
  const totalNet = filtered.reduce((s, e) => s + e.netSalary, 0);
  const totalGross = filtered.reduce((s, e) => s + e.grossEarned, 0);

  return (
    <div className="space-y-5">
      <PDFProgressOverlay isOpen={isBulkDownloading} progress={bulkProgress} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Payroll Register</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {batchInfo?.month || "---"} &middot; {filtered.length} employees &middot; Net: {totalNet.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            if (filtered.length === 0) return;
            const totalDed = filtered.reduce((s, e) => s + e.totalDeduction, 0);
            const monthLabel = batchInfo?.month ? new Date(batchInfo.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "---";
            const rows = filtered.map(e => `
              <tr>
                <td style="font-weight:600;color:#1a5276">${e.employeeId}</td>
                <td>${e.name}</td>
                <td>${e.department}</td>
                <td style="text-align:center">${e.presentDays}</td>
                <td style="text-align:center">${e.absentDays}</td>
                <td style="text-align:center">${e.otHours}</td>
                <td style="text-align:right">${e.basicSalary.toLocaleString()}</td>
                <td style="text-align:right">${e.totalAllowances.toLocaleString()}</td>
                <td style="text-align:right">${e.otAmount.toLocaleString()}</td>
                <td style="text-align:right;font-weight:600">${e.grossEarned.toLocaleString()}</td>
                <td style="text-align:right;color:#c0392b">${e.totalDeduction.toLocaleString()}</td>
                <td style="text-align:right;font-weight:700;color:#1a5276">${e.netSalary.toLocaleString()}</td>
                <td><span style="background:#d5f5e3;color:#1e8449;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${e.status}</span></td>
              </tr>`).join("");
            const win = window.open("", "_blank");
            win.document.write(`<html><head><title>Payroll Register - ${monthLabel}</title>
              <style>
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#333}
                .header{background:linear-gradient(135deg,#1a5276,#2e86c1);color:#fff;padding:30px 40px;text-align:center}
                .header h1{font-size:22px;font-weight:700;margin-bottom:4px}
                .header p{font-size:12px;opacity:0.85}
                .content{padding:20px 30px}
                table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px}
                th{background:#1a5276;color:#fff;padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
                td{padding:9px 8px;border-bottom:1px solid #e8e8e8}
                tr:nth-child(even){background:#f8f9fa}
                tr:hover{background:#eaf2f8}
                .footer{background:#f0f3f5;padding:14px 30px;font-size:12px;font-weight:700;color:#1a5276;display:flex;justify-content:space-between;border-top:2px solid #1a5276}
                @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.header{background:#1a5276 !important}}
              </style></head><body>
              <div class="header">
                <h1>MyTime2Cloud - Payroll Register (${monthLabel})</h1>
              </div>
              <div class="content">
                <table>
                  <thead><tr>
                    <th>ID</th><th>Name</th><th>Dept</th><th style="text-align:center">Present</th><th style="text-align:center">Absent</th>
                    <th style="text-align:center">OT Hrs</th><th style="text-align:right">Basic</th><th style="text-align:right">Allowances</th>
                    <th style="text-align:right">OT Amt</th><th style="text-align:right">Gross</th><th style="text-align:right">Deductions</th>
                    <th style="text-align:right">Net Salary</th><th>Status</th>
                  </tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
              <div class="footer">
                <span>Total: Gross ${totalGross.toLocaleString()} | Deductions ${totalDed.toLocaleString()} | Net ${totalNet.toLocaleString()}</span>
              </div>
              </body></html>`);
            win.document.close();
            setTimeout(() => win.print(), 300);
          }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button
            disabled={isBulkDownloading || filtered.length === 0}
            onClick={async () => {
              if (!batchInfo?.id || filtered.length === 0) return;
              setIsBulkDownloading(true);
              setBulkProgress(0);

              try {
                const params = await buildQueryParams({});
                const recordIds = filtered.map(e => e.id).join(",");
                const bulkUrl = `${api.defaults.baseURL}/payroll-management/payslips-bulk?company_id=${params.company_id}&batch_id=${batchInfo.id}&record_ids=${recordIds}`;

                setBulkProgress(10);

                const response = await fetch(`${PDF_SERVICE_BASE}/pdf`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: bulkUrl }),
                });

                setBulkProgress(60);

                if (!response.ok) throw new Error("PDF generation failed");

                const blob = await response.blob();
                setBulkProgress(90);

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `All_Payslips_${batchInfo?.month || "export"}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                setBulkProgress(100);
              } catch (err) {
                alert("Failed to download payslips: " + err.message);
              } finally {
                setTimeout(() => { setIsBulkDownloading(false); setBulkProgress(0); }, 1000);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
          >
            {isBulkDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            All Payslips PDF
          </button>
          <button onClick={() => {
            if (filtered.length === 0) return;
            const headers = ["Employee", "ID", "Dept", "Present", "Absent", "Late", "OT Hrs", "Basic", "Allowances", "OT Amt", "Gross", "Deductions", "Net Salary", "Status"];
            const rows = filtered.map(e => [e.name, e.employeeId, e.department, e.presentDays, e.absentDays, e.lateDays, e.otHours, e.basicSalary, e.totalAllowances, e.otAmount, e.grossEarned, e.totalDeduction, e.netSalary, e.status]);
            rows.push(["", "", "", "", "", "", totalGross, "", totalNet, ""]);
            const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `payroll_register_${batchInfo?.month || "export"}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
            <FileText className="h-3.5 w-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search employee or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={branchFilter}
          onChange={e => { setBranchFilter(e.target.value); setDeptFilter("all"); setEmpFilter("all"); }}
          className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 min-w-[150px]"
        >
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setEmpFilter("all"); }}
          className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 min-w-[150px]"
        >
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={empFilter}
          onChange={e => {
            const empId = e.target.value;
            setEmpFilter(empId);
            if (empId !== "all") {
              const rec = records.find(r => String(r.employeeId) === String(empId));
              if (rec) {
                if (rec.branch && rec.branch !== "---") setBranchFilter(rec.branch);
                if (rec.department && rec.department !== "---") setDeptFilter(rec.department);
              }
            }
          }}
          className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 min-w-[180px]"
        >
          <option value="all">All Employees</option>
          {empOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>

        {(search || branchFilter !== "all" || deptFilter !== "all" || empFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setBranchFilter("all"); setDeptFilter("all"); setEmpFilter("all"); }}
            className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-500 hover:border-red-300 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table id="payroll-register-table" className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3">Dept</th>
                <th className="px-3 py-3">Present</th>
                <th className="px-3 py-3">Absent</th>
                <th className="px-3 py-3">Late</th>
                <th className="px-3 py-3">OT Hrs</th>
                <th className="px-3 py-3">Basic</th>
                <th className="px-3 py-3">Allowances</th>
                <th className="px-3 py-3">OT Amt</th>
                <th className="px-3 py-3">Gross</th>
                <th className="px-3 py-3">Deductions</th>
                <th className="px-3 py-3">Net Salary</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
                  onClick={() => { setSelectedEmp(e); setDrawerOpen(true); }}>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{e.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {e.employeeId}
                      {e.branch && e.branch !== "---" && (
                        <span className="text-gray-500 dark:text-gray-300"> | {e.branch}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11px]">{e.department}</td>
                  <td className="px-3 py-3 text-emerald-600 dark:text-emerald-400 font-medium">{e.presentDays}</td>
                  <td className="px-3 py-3 text-red-500 font-medium">{e.absentDays}</td>
                  <td className="px-3 py-3 text-amber-500 font-medium">{e.lateMinutes > 0 ? `${e.lateMinutes}m (${e.lateDays}d)` : e.lateDays}</td>
                  <td className="px-3 py-3">{e.otHours}</td>
                  <td className="px-3 py-3">{e.basicSalary.toLocaleString()}</td>
                  <td className="px-3 py-3">{e.totalAllowances.toLocaleString()}</td>
                  <td className="px-3 py-3">{e.otAmount.toLocaleString()}</td>
                  <td className="px-3 py-3">{e.grossEarned.toLocaleString()}</td>
                  <td className="px-3 py-3">{e.totalDeduction.toLocaleString()}</td>
                  <td className="px-3 py-3 font-semibold text-gray-800 dark:text-gray-100">{e.netSalary.toLocaleString()}</td>
                  <td className="px-3 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1" onClick={ev => ev.stopPropagation()}>
                      <button title="View Details" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition"
                        onClick={() => { setSelectedEmp(e); setDrawerOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button title="Download Payslip" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-emerald-500 transition"
                        onClick={async () => {
                          try {
                            const params = await buildQueryParams({});
                            const url = `${api.defaults.baseURL}/payroll-management/payslip/${e.id}?company_id=${params.company_id}`;
                            window.open(url, "_blank");
                          } catch (err) { alert("Failed to load payslip"); }
                        }}>
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan="14" className="px-4 py-8 text-center text-gray-400 text-xs">Loading payroll data...</td></tr>
              )}
              {!loading && filtered.length === 0 && records.length === 0 && (
                <tr><td colSpan="14" className="px-4 py-8 text-center text-gray-400 text-xs">No payroll generated yet. Go to Dashboard and click "Generate Payroll" first.</td></tr>
              )}
              {!loading && filtered.length === 0 && records.length > 0 && (
                <tr><td colSpan="14" className="px-4 py-8 text-center text-gray-400 text-xs">No employees match your search</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Totals */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50">
        <span className="text-xs text-gray-500">Showing {filtered.length} of {records.length} employees</span>
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          Total Gross: {totalGross.toLocaleString()} | Total Net: {totalNet.toLocaleString()}
        </div>
      </div>

      {/* Detail Drawer */}
      {drawerOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedEmp.name}</h3>
                <p className="text-[10px] text-gray-500">{selectedEmp.department} &middot; ID: {selectedEmp.employeeId}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Attendance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Present Days</span><span className="text-emerald-500 font-medium">{selectedEmp.presentDays}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Absent Days</span><span className="text-red-500 font-medium">{selectedEmp.absentDays}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Late</span><span className="text-amber-500 font-medium">{selectedEmp.lateMinutes}min ({selectedEmp.lateDays} days)</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">OT Hours</span><span className="text-blue-500 font-medium">{selectedEmp.otHours}</span></div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Basic Salary</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.basicSalary.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Allowances</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.totalAllowances.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">OT Amount</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.otAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs border-t border-gray-100 dark:border-white/10 pt-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Gross Earned</span><span className="font-bold text-gray-800 dark:text-gray-100">{selectedEmp.grossEarned.toLocaleString()}</span></div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Deductions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Absence Deduction</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.absenceDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Late Deduction</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.lateDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Loan Deduction</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.loanDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Advance Deduction</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.advanceDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Fine Amount</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.fineAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Other Deduction</span><span className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmp.otherDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs border-t border-gray-100 dark:border-white/10 pt-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Total Deductions</span><span className="font-bold text-red-500">{selectedEmp.totalDeduction.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Net Salary</span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{selectedEmp.netSalary.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Status</h4>
                <StatusBadge status={selectedEmp.status} />
              </div>

              {/* Download & Print Buttons */}
              <div className="flex gap-2 pt-2">
                <button onClick={async () => {
                  try {
                    const params = await buildQueryParams({});
                    const url = `${api.defaults.baseURL}/payroll-management/payslip/${selectedEmp.id}?company_id=${params.company_id}`;
                    window.open(url, "_blank");
                  } catch (e) { alert("Failed"); }
                }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-white hover:bg-blue-600 transition">
                  <Download className="h-3.5 w-3.5" /> Download Payslip
                </button>
                <button onClick={() => {
                  const e = selectedEmp;
                  const monthLabel = batchInfo?.month ? new Date(batchInfo.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "---";
                  const win = window.open("", "_blank");
                  win.document.write(`<html><head><title>Payslip - ${e.name}</title>
                    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:20px auto;color:#333}
                    .header{background:linear-gradient(135deg,#1a5276,#2e86c1);color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0}
                    .header h2{font-size:16px}.header p{font-size:11px;opacity:0.8;margin-top:4px}
                    .section{padding:16px 20px;border-bottom:1px solid #eee}
                    .section h4{font-size:11px;font-weight:700;color:#1a5276;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
                    .row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}
                    .row .label{color:#666}.row .value{font-weight:500}
                    .total-row{border-top:1px solid #ddd;padding-top:8px;margin-top:4px;font-weight:700}
                    .net{background:#e8f8f5;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
                    .net span:first-child{font-weight:700;color:#1a5276;font-size:13px}.net span:last-child{font-size:22px;font-weight:800;color:#1e8449}
                    @media print{body{margin:0}}</style></head><body>
                    <div class="header"><h2>${e.name}</h2><p>${e.department} · ID: ${e.employeeId} · ${monthLabel}</p></div>
                    <div class="section"><h4>Attendance</h4>
                      <div class="row"><span class="label">Present Days</span><span class="value">${e.presentDays}</span></div>
                      <div class="row"><span class="label">Absent Days</span><span class="value" style="color:#c0392b">${e.absentDays}</span></div>
                      <div class="row"><span class="label">Late Days</span><span class="value" style="color:#e67e22">${e.lateDays}</span></div>
                      <div class="row"><span class="label">OT Hours</span><span class="value" style="color:#2980b9">${e.otHours}</span></div>
                    </div>
                    <div class="section"><h4>Earnings</h4>
                      <div class="row"><span class="label">Basic Salary</span><span class="value">${e.basicSalary.toLocaleString()}</span></div>
                      <div class="row"><span class="label">Allowances</span><span class="value">${e.totalAllowances.toLocaleString()}</span></div>
                      <div class="row"><span class="label">OT Amount</span><span class="value">${e.otAmount.toLocaleString()}</span></div>
                      <div class="row total-row"><span>Gross Earned</span><span>${e.grossEarned.toLocaleString()}</span></div>
                    </div>
                    <div class="section"><h4>Deductions</h4>
                      <div class="row"><span class="label">Absence Deduction</span><span class="value">${e.absenceDeduction.toLocaleString()}</span></div>
                      <div class="row"><span class="label">Late Deduction</span><span class="value">${e.lateDeduction.toLocaleString()}</span></div>
                      <div class="row"><span class="label">Loan Deduction</span><span class="value">${e.loanDeduction.toLocaleString()}</span></div>
                      <div class="row"><span class="label">Advance Deduction</span><span class="value">${e.advanceDeduction.toLocaleString()}</span></div>
                      <div class="row"><span class="label">Fine Amount</span><span class="value">${e.fineAmount.toLocaleString()}</span></div>
                      <div class="row"><span class="label">Other Deduction</span><span class="value">${e.otherDeduction.toLocaleString()}</span></div>
                      <div class="row total-row"><span>Total Deductions</span><span style="color:#c0392b">${e.totalDeduction.toLocaleString()}</span></div>
                    </div>
                    <div class="net"><span>Net Salary</span><span>${e.netSalary.toLocaleString()}</span></div>
                    </body></html>`);
                  win.document.close();
                  setTimeout(() => win.print(), 300);
                }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <FileText className="h-3.5 w-3.5" /> Print Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
