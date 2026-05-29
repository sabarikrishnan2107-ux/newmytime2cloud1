"use client";

import React, { useEffect, useState } from "react";
import { FileText, AlertTriangle, ExternalLink, Trash2 } from "lucide-react";
import DocumentUploadModal from "./DocumentModal";
import { deleteDocument, getDocuments } from "@/lib/api";

const parseDate = (raw) => {
  if (!raw || raw === "N/A" || raw === "---") return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDate = (raw) => {
  const d = parseDate(raw);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const getDocStatus = (doc) => {
  const exp = parseDate(doc.expiry_date) || parseDate(doc.expiry_date_display);
  if (!exp) return { label: "Verified", tone: "green" };
  const days = Math.floor((exp - new Date()) / 86400000);
  if (days < 0) return { label: "Expired", tone: "red" };
  if (days <= 30) return { label: "Expiring Soon", tone: "amber" };
  return { label: "Verified", tone: "green" };
};

const TONE = {
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ICON_TONE = {
  green: "bg-primary/10 text-primary ring-primary/20",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  red: "bg-red-500/10 text-red-400 ring-red-500/20",
};

const EmployeeDocuments = ({ employee_id }) => {
  const [documents, setDocuments] = useState([]);

  const fetchDocuments = async (id) => {
    setDocuments((await getDocuments(id)) || []);
  };

  const handleDelete = async (doc) => {
    if (!doc?.id) return;
    if (!window.confirm(`Delete "${doc.title || "this document"}"?`)) return;
    try {
      await deleteDocument(doc.id);
      fetchDocuments(employee_id);
    } catch (_) {}
  };

  useEffect(() => {
    if (employee_id) fetchDocuments(employee_id);
  }, [employee_id]);

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="glass-card rounded-2xl p-6 flex flex-col">
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Documents</h3>
            <p className="text-xs text-[#9db0b9] mt-0.5">
              {documents.length} {documents.length === 1 ? "file" : "files"} on record
            </p>
          </div>
          <DocumentUploadModal employee_id={employee_id} onSuccess={(e) => fetchDocuments(e)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-white/5">
                <th className="py-3 pr-4 font-semibold">Document</th>
                <th className="py-3 px-4 font-semibold">Issue Date</th>
                <th className="py-3 px-4 font-semibold">Expiry Date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 pl-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    No documents yet
                  </td>
                </tr>
              )}
              {documents.map((doc) => {
                const status = getDocStatus(doc);
                const isExpired = status.tone === "red";
                const Icon = isExpired || status.tone === "amber" ? AlertTriangle : FileText;
                return (
                  <tr key={doc.id} className="text-sm hover:bg-white/[0.03] transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`size-10 shrink-0 rounded-lg flex items-center justify-center ring-1 ${ICON_TONE[status.tone]}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {doc.title || "Untitled"}
                          </span>
                          {doc.attachment && (
                            <span className="text-xs text-[#9db0b9] truncate">{doc.attachment}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {fmtDate(doc.issue_date) === "—" ? doc.issue_date_display || "—" : fmtDate(doc.issue_date)}
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {fmtDate(doc.expiry_date) === "—" ? doc.expiry_date_display || "—" : fmtDate(doc.expiry_date)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${TONE[status.tone]}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {doc.access_url ? (
                          <a
                            href={doc.access_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <ExternalLink size={14} /> View
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          title="Delete"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 dark:border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDocuments;
