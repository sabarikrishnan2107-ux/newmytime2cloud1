"use client";

import { useState, useEffect } from "react";
import { Eye, X, Plus, Check, XCircle, FileDown } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { getUser } from "@/config/index";
import ProfilePicture from "@/components/ProfilePicture";
import DateRangeSelect from "@/components/ui/DateRange";
import ManualAttendanceCorrectionModal from "@/components/Attendance/ManualAttendanceCorrectionModal";
import { changeRequest as fetchChangeRequests, updateRequest } from "@/lib/endpoint/attendance";
import { notify } from "@/lib/utils";

export default function ManualLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [from, setFrom] = useState(() => {
    const dt = new Date();
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [to, setTo] = useState(() => {
    const dt = new Date();
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const user = getUser();
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/attendance_logs?company_id=${user?.company_id || 0}&DeviceID=Manual&from_date=${from}&to_date=${to}&per_page=500&sortDesc=true`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      const data = await res.json();
      setLogs(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    try {
      const res = await fetchChangeRequests({ per_page: 200 });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      // Treat null / "" / "P" / "pending" as pending; exclude approved/rejected.
      const isPending = (s) => {
        if (s === null || s === undefined) return true;
        const v = String(s).trim().toLowerCase();
        return v === "" || v === "p" || v === "pending";
      };
      setPending(list.filter((r) => isPending(r.status)));
    } catch (e) {
      console.error(e);
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) fetchLogs();
    fetchPending();
  }, [from, to]);

  const handleApprove = async (req) => {
    setActingId(req.id);
    try {
      const me = getUser?.() || {};
      await updateRequest(req.id, {
        status: "A",
        company_id: req.company_id,
        employee_device_id: req.employee_device_id,
        from_date: req.from_date,
        to_date: req.to_date,
        request_type: req.request_type,
        approver_user_id: me?.id ?? me?.user_id ?? null,
      });
      notify?.("Request approved");
      await Promise.all([fetchPending(), fetchLogs()]);
    } catch (e) {
      console.error(e);
      notify?.("Couldn't approve. Please try again.", "error");
    } finally {
      setActingId(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!logs.length) {
      notify?.("No manual logs to export for the selected date range.");
      return;
    }
    setDownloading(true);
    try {
      const user = getUser?.() || {};
      const html2pdf = (await import("html2pdf.js")).default;

      const approverName = (log) => {
        if (!log.approver) return "System";
        const emp = log.approver.employee;
        const empFull = emp ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() : "";
        return log.approver.name || empFull || log.approver.email || `User #${log.approver.id}`;
      };
      const employeeName = (log) =>
        log.employee?.full_name
        || `${log.employee?.first_name ?? ""} ${log.employee?.last_name ?? ""}`.trim()
        || `ID: ${log.UserID}`;
      const logTime = (log) =>
        log.time || (log.LogTime ? String(log.LogTime).split(" ")[1]?.substring(0, 5) : "—");
      const logDate = (log) => log.date || log.log_date || (log.LogTime ? String(log.LogTime).split(" ")[0] : "—");
      const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

      const rows = logs.map((log, i) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${i + 1}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(employeeName(log))}${log.employee?.employee_id ? ` <span style="color:#94a3b8;">(${esc(log.employee.employee_id)})</span>` : ""}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(log.employee?.department?.name || "")}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(approverName(log))}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:center;">${esc(logDate(log))}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:center;font-variant-numeric:tabular-nums;">${esc(logTime(log))}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:center;text-transform:uppercase;">${esc(log.log_type || "—")}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(log.reason || "—")}</td>
        </tr>
      `).join("");

      const container = document.createElement("div");
      container.style.cssText = "padding:24px;background:#fff;color:#0f172a;font-family:Arial,Helvetica,sans-serif;width:1000px;";
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:14px;">
          <div>
            <div style="font-size:18px;font-weight:700;letter-spacing:-0.2px;">Manual Attendance Logs</div>
            <div style="font-size:11px;color:#475569;margin-top:2px;">${esc(user?.company_name || user?.name || "")}</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#475569;">
            <div><strong style="color:#0f172a;">Range:</strong> ${esc(from)} &mdash; ${esc(to)}</div>
            <div style="margin-top:2px;"><strong style="color:#0f172a;">Generated:</strong> ${esc(new Date().toLocaleString())}</div>
            <div style="margin-top:2px;"><strong style="color:#0f172a;">Total:</strong> ${logs.length}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">#</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Employee</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Department</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Approved By</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:center;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Date</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:center;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Time</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:center;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Type</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Reason</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:14px;font-size:10px;color:#94a3b8;text-align:right;">MyTime2Cloud · Manual Logs Export</div>
      `;

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `manual-logs_${from}_to_${to}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(container)
        .save();
    } catch (e) {
      console.error(e);
      notify?.("Couldn't generate PDF. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleReject = async (req) => {
    setActingId(req.id);
    try {
      const me = getUser?.() || {};
      await updateRequest(req.id, {
        status: "R",
        company_id: req.company_id,
        employee_device_id: req.employee_device_id,
        from_date: req.from_date,
        to_date: req.to_date,
        request_type: req.request_type,
        approver_user_id: me?.id ?? me?.user_id ?? null,
      });
      notify?.("Request rejected");
      await fetchPending();
    } catch (e) {
      console.error(e);
      notify?.("Couldn't reject. Please try again.", "error");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="p-6 w-full">
      {/* Main Table */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manual Logs</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || !logs.length}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-4 h-4" />
              {downloading ? "Generating…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              Add Manual Log
            </button>
            <div className="w-72">
              <DateRangeSelect
                value={{ from, to }}
                onChange={({ from, to }) => { setFrom(from); setTo(to); }}
              />
            </div>
          </div>
        </div>

        {/* Pending employee submissions — approve/reject */}
        {(pendingLoading || pending.length > 0) && (
          <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-500/20 overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/20 flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Pending Employee Requests
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 tabular-nums">
                {pending.length}
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider border-b border-gray-200 dark:border-white/10">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Request Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {pendingLoading && pending.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">Loading pending requests…</td></tr>
                ) : pending.map((r) => {
                  const emp = r.employee || {};
                  const fmtDate = (d) => d ? String(d).slice(0, 10) : "—";
                  const fmtTime = (t) => t ? String(t).slice(0, 5) : null;
                  const fromT = fmtTime(r.from_time);
                  const toT   = fmtTime(r.to_time);
                  const timeLabel = fromT && toT ? `${fromT} → ${toT}` : (fromT || toT || "—");
                  const dateLabel = r.from_date === r.to_date
                    ? fmtDate(r.from_date)
                    : `${fmtDate(r.from_date)} → ${fmtDate(r.to_date)}`;
                  return (
                    <tr key={r.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/[0.04] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProfilePicture src={emp.profile_picture} />
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-white">
                              {emp.full_name || `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || `ID: ${r.employee_device_id}`}
                            </div>
                            <div className="text-xs text-slate-400">
                              {emp.department?.name || emp.branch?.branch_name || ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{r.request_type || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{dateLabel}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">{timeLabel}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[260px] truncate" title={r.remarks || ""}>
                        {r.remarks || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(r)}
                            disabled={actingId === r.id}
                            className="inline-flex items-center gap-1 px-3 h-8 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(r)}
                            disabled={actingId === r.id}
                            className="inline-flex items-center gap-1 px-3 h-8 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider border-b border-gray-200 dark:border-white/10">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Approved By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Log Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No manual logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${selectedLog?.id === log.id ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProfilePicture src={log.employee?.profile_picture} />
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-white">
                            {log.employee?.full_name || log.employee?.first_name || `ID: ${log.UserID}`}
                          </div>
                          <div className="text-xs text-slate-400">
                            {log.employee?.department?.name || ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.approver ? (
                        <div className="flex items-center gap-3">
                          <ProfilePicture src={log.approver.employee?.profile_picture} />
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-white">
                              {(() => {
                                const emp = log.approver.employee;
                                const empFull = emp ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() : "";
                                return log.approver.name
                                  || empFull
                                  || log.approver.email
                                  || `User #${log.approver.id}`;
                              })()}
                            </div>
                            <div className="text-xs text-slate-400">
                              {log.approver.employee?.department?.name || log.approver.email || ""}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{log.date || log.log_date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{log.time || log.LogTime?.split(" ")[1]?.substring(0, 5)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${log.log_type?.toLowerCase() === "in" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"}`}>
                        {log.log_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{log.reason || "---"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary/5"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manual Log modal */}
      <ManualAttendanceCorrectionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          fetchLogs();
        }}
      />

      {/* Center Popup Modal */}
      {selectedLog && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLog(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Log Details</h2>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Info */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-white/10">
              <ProfilePicture src={selectedLog.employee?.profile_picture} size={48} />
              <div>
                <div className="text-base font-semibold text-slate-800 dark:text-white">
                  {selectedLog.employee?.full_name || selectedLog.employee?.first_name || `ID: ${selectedLog.UserID}`}
                </div>
                <div className="text-sm text-slate-400">
                  {selectedLog.employee?.department?.name || ""} {selectedLog.employee?.employee_id ? `| ${selectedLog.employee.employee_id}` : ""}
                </div>
              </div>
            </div>

            {/* Approved By */}
            {selectedLog.approver ? (
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
                <span className="text-sm text-slate-400">Approved By:</span>
                <ProfilePicture src={selectedLog.approver.employee?.profile_picture} size={32} />
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const emp = selectedLog.approver.employee;
                      const empFull = emp ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() : "";
                      return selectedLog.approver.name
                        || empFull
                        || selectedLog.approver.email
                        || `User #${selectedLog.approver.id}`;
                    })()}
                  </span>
                  {(selectedLog.approver.employee?.department?.name || selectedLog.approver.email) && (
                    <div className="text-xs text-slate-400">
                      {selectedLog.approver.employee?.department?.name || selectedLog.approver.email}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
                <span className="text-sm text-slate-400">Approved By:</span>
                <span className="text-sm font-semibold text-slate-400 italic">System</span>
              </div>
            )}

            {/* Details */}
            <div className="space-y-4">
              <DetailRow label="Log Time" value={selectedLog.LogTime || `${selectedLog.log_date} ${selectedLog.time}`} />
              <DetailRow label="Log Type">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${selectedLog.log_type?.toLowerCase() === "in" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"}`}>
                  {selectedLog.log_type}
                </span>
              </DetailRow>
              <DetailRow label="Device" value={selectedLog.DeviceID || "Manual"} />
              <DetailRow label="Reason" value={selectedLog.reason || "---"} />
              <DetailRow label="Note" value={selectedLog.note || "---"} />
              <DetailRow label="GPS Location" value={selectedLog.gps_location || "---"} />
              <DetailRow label="Attachment">
                {selectedLog.attachment ? (
                  <a
                    href={`${API_BASE_URL.replace('/api', '')}/ManualLog/attachments/${selectedLog.attachment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View Attachment
                  </a>
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">---</span>
                )}
              </DetailRow>
              <DetailRow label="Created At" value={selectedLog.created_at || "---"} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, children }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-400">{label}</span>
      {children || <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</span>}
    </div>
  );
}
