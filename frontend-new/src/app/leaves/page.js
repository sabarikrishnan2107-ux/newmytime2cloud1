"use client";

// Tailwind safelist (do not remove): bg-amber-500/10 text-amber-400 border-amber-500/20 bg-amber-400 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 bg-emerald-400 bg-rose-500/10 text-rose-400 border-rose-500/20 bg-rose-400 bg-slate-500/10 text-slate-400 border-slate-500/20 bg-slate-400 bg-sky-500/10 text-sky-400 border-sky-500/20 bg-sky-400

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download, MoreHorizontal, Plus, Eye, Check, X } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { getBranches, getDepartmentsByBranchIds } from '@/lib/api';
import { getLeavesRequest, approveLeave, rejectLeave, uploadLeaveDocuments } from '@/lib/endpoint/leaves';
import { Paperclip } from 'lucide-react';
import { parseApiError } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import MultiDropDown from '@/components/ui/MultiDropDown';
import DateRangeSelect from '@/components/ui/DateRange';
import Pagination from '@/lib/Pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeaveRequestCreate from '@/components/LeaveRequest/Create';
import { Button } from '@/components/ui/button';

const TYPE_COLORS = {
  annual: "#3b82f6", sick: "#06b6d4", casual: "#10b981",
  emergency: "#f59e0b", maternity: "#ec4899", unpaid: "#64748b",
  wfh: "#0ea5e9", comp: "#a855f7",
};
const FALLBACK_COLORS = ["#8b5cf6", "#14b8a6", "#f43f5e", "#a855f7", "#84cc16"];

const colorForType = (name, idx = 0) => {
  const k = (name || "").toLowerCase().split(" ")[0];
  return TYPE_COLORS[k] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
};

const STATUS_LABEL = { 0: "Pending", 1: "Approved", 2: "Rejected" };
const fmtDate = (s) => (s ? String(s).split("T")[0] : "—");

const computeTotalDays = (r) => {
  if (r?.total_days) return r.total_days;
  if (r?.days) return r.days;
  const s = r?.from_date || r?.start_date;
  const e = r?.to_date || r?.end_date;
  if (!s || !e) return null;
  const ms = new Date(e).getTime() - new Date(s).getTime();
  if (isNaN(ms) || ms < 0) return null;
  const days = Math.floor(ms / 86400000) + 1;
  if (r?.day_type === "half_first" || r?.day_type === "half_second") return days - 0.5;
  return days;
};

function Avatar({ name, src, size = 36 }) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-pink-500", "bg-violet-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"];
  const hash = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  if (showImage) {
    return (
      <img src={src} alt={name || ""} onError={() => setErrored(true)} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    );
  }
  return (
    <div className={`${bg} text-white font-semibold rounded-full flex items-center justify-center text-xs shrink-0`} style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = {
    0: { label: "Pending", color: "amber" },
    1: { label: "Approved", color: "emerald" },
    2: { label: "Rejected", color: "rose" },
  }[status] || { label: "—", color: "slate" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20 px-2.5 py-0.5 text-[11px] font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-${cfg.color}-400`} />
      {cfg.label}
    </span>
  );
}

function TypeChip({ name }) {
  const color = colorForType(name);
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `${color}22`, color }}>
      {name || "—"}
    </span>
  );
}

function RowMenu({ row, onAction }) {
  const [open, setOpen] = useState(false);
  const showApprove = row.status !== 1;
  const showReject = row.status !== 2;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="rounded p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="end" className="z-50 w-40 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1 shadow-xl text-sm">
          <button onClick={() => { onAction("view", row); setOpen(false); }} className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5">
            <Eye className="w-4 h-4" />
            View
          </button>
          {showApprove && (
            <button onClick={() => { onAction("approve", row); setOpen(false); }} className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5">
              <Check className="w-4 h-4" />
              Approve
            </button>
          )}
          {showReject && (
            <button onClick={() => { onAction("reject", row); setOpen(false); }} className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/5">
              <X className="w-4 h-4" />
              Reject
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const STATUS_ITEMS = [
  { id: "0", name: "Pending" },
  { id: "1", name: "Approved" },
  { id: "2", name: "Rejected" },
];

export default function LeavesPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reasonDialog, setReasonDialog] = useState({ open: false, action: null, row: null, notes: "", file: null });
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');

  const [selectedBranch, setSelectedBranch] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const toDateStr = (d) => (d ? new Date(d).toISOString().split("T")[0] : undefined);

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    getBranches().then((b) => setBranches([{ name: "Select All", id: "" }, ...b])).catch((e) => setError(parseApiError(e)));
  }, []);

  useEffect(() => {
    getDepartmentsByBranchIds(selectedBranch).then(setDepartments).catch((e) => setError(parseApiError(e)));
  }, [selectedBranch]);

  const fetchRows = useCallback(async (page, pp) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        per_page: pp,
        sortDesc: 'false',
        branch_ids: selectedBranch,
        department_ids: selectedDepartments,
        status_ids: selectedStatuses,
        search: searchTerm || null,
        start_date: toDateStr(fromDate),
        end_date: toDateStr(toDate),
      };
      const result = await getLeavesRequest(params);
      if (result && Array.isArray(result.data)) {
        setRows(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      } else {
        throw new Error('Invalid data structure received from API.');
      }
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch, selectedDepartments, selectedStatuses, searchTerm, fromDate, toDate]);

  const debouncedSetSearch = useDebounce((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, 500);

  const handleSearch = (e) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSetSearch(value);
  };

  useEffect(() => {
    fetchRows(currentPage, perPage);
  }, [currentPage, perPage, fetchRows]);

  const handleRefresh = () => fetchRows(currentPage, perPage);

  const handleRowAction = (action, row) => {
    if (action === "view") {
      router.push(`/leaves/view?id=${row.id}`);
      return;
    }
    if (action === "approve" || action === "reject") {
      setReasonDialog({ open: true, action, row, notes: "", file: null });
    }
  };

  const handleConfirmReason = async () => {
    const { action, row, notes, file } = reasonDialog;
    if (!row) return;
    const rowId = row.id;
    const employeeId = row.employee?.id;
    setIsSubmittingReason(true);
    // Close the dialog immediately on click — API runs in the background.
    setReasonDialog({ open: false, action: null, row: null, notes: "", file: null });
    try {
      const payload = { approve_reject_notes: notes || "" };
      if (action === "approve") await approveLeave(rowId, payload);
      if (action === "reject") await rejectLeave(rowId, payload);
      if (file) {
        try {
          await uploadLeaveDocuments(rowId, employeeId, [{ title: file.name, file }]);
        } catch (docErr) { console.warn("document upload failed", docErr); }
      }
      handleRefresh();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsSubmittingReason(false);
    }
  };

  const handleExport = () => {
    const csvRows = [
      ["Employee", "ID", "Department", "Branch", "Type", "From", "To", "Days", "Reason", "Status", "Applied"],
      ...rows.map((r) => [
        `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.trim() || "—",
        r.employee?.employee_id || r.id,
        r.employee?.department?.name || "",
        r.employee?.branch?.name || "",
        r.leave_type?.name || r.leave_group_type?.leave_type?.name || "",
        fmtDate(r.from_date || r.start_date),
        fmtDate(r.to_date || r.end_date),
        computeTotalDays(r) ?? "",
        r.reason || r.leave_note || "",
        STATUS_LABEL[r.status] || "",
        fmtDate(r.created_at),
      ]),
    ];
    const csv = csvRows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-requests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatLR = (r) => {
    const num = r.id ? String(r.id).padStart(4, "0") : "—";
    return `LR-${num}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">Leave Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{total} total requests · live across all branches</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Download className="w-4 h-4" />
            Export
          </button>
          <Button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            New Leave
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <MultiDropDown
            items={branches}
            value={selectedBranch}
            onChange={(v) => { setSelectedBranch(v); setCurrentPage(1); }}
            placeholder="Select a Branch"
          />
        </div>
        <div className="w-56">
          <MultiDropDown
            items={departments}
            value={selectedDepartments}
            onChange={(v) => { setSelectedDepartments(v); setCurrentPage(1); }}
            placeholder="Select a Department"
          />
        </div>
        <div className="w-56">
          <MultiDropDown
            items={STATUS_ITEMS}
            value={selectedStatuses}
            onChange={(v) => { setSelectedStatuses(v); setCurrentPage(1); }}
            placeholder="Select a Status"
          />
        </div>
        <div className="min-w-[240px]">
          <DateRangeSelect
            value={{ from: fromDate, to: toDate }}
            numberOfMonths={2}
            onChange={({ from: newFrom, to: newTo }) => {
              setFromDate(newFrom);
              setToDate(newTo);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={inputValue}
            onChange={handleSearch}
            placeholder="Search by name or ID"
            className="w-full pl-10 pr-3 h-10 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                {["Employee", "Department", "Type", "Duration", "Days", "Reason", "Status", ""].map((h) => (
                  <th key={h} className="text-left font-medium text-slate-500 dark:text-slate-400 px-5 py-3 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="text-center py-10 text-rose-500">{String(error)}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500">No leave requests found.</td></tr>
              ) : rows.map((r) => {
                const name = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.trim() || "—";
                const dept = r.employee?.department?.name || "—";
                const branch = r.employee?.branch?.name || "";
                const typeName = r.leave_type?.name || r.leave_group_type?.leave_type?.name;
                const reason = r.reason || r.leave_note || "—";
                const openDetails = () => { router.push(`/leaves/view?id=${r.id}`); };
                return (
                  <tr key={r.id} onClick={openDetails} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} src={r.employee?.profile_picture} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{name}</p>
                          <p className="text-xs text-slate-500">{formatLR(r)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-700 dark:text-slate-200">{dept}</p>
                      <p className="text-xs text-slate-500">{branch}</p>
                    </td>
                    <td className="px-5 py-3"><TypeChip name={typeName} /></td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmtDate(r.from_date || r.start_date)} → {fmtDate(r.to_date || r.end_date)}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{computeTotalDays(r) ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={reason}>{reason}</td>
                    <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}><RowMenu row={r} onAction={handleRowAction} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 dark:border-white/10 px-4 py-2">
          <Pagination
            page={currentPage}
            perPage={perPage}
            total={total}
            onPageChange={setCurrentPage}
            onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); }}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[720px] !max-w-[95%] p-7 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <LeaveRequestCreate setOpen={setOpen} onSuccess={handleRefresh} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={reasonDialog.open}
        onOpenChange={(v) => !isSubmittingReason && setReasonDialog((d) => ({ ...d, open: v }))}
      >
        <DialogContent className="!w-[460px] !max-w-[95%] p-6">
          <DialogHeader>
            <DialogTitle>
              {reasonDialog.action === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {reasonDialog.row?.employee?.first_name
                ? `${reasonDialog.row.employee.first_name} ${reasonDialog.row.employee.last_name || ""}`.trim()
                : "Employee"}
              {" — "}
              {reasonDialog.row?.leave_type?.name || reasonDialog.row?.leave_group_type?.leave_type?.name || "Leave"}
            </p>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Reason {reasonDialog.action === "reject" && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              value={reasonDialog.notes}
              onChange={(e) => setReasonDialog((d) => ({ ...d, notes: e.target.value }))}
              placeholder={
                reasonDialog.action === "approve"
                  ? "Optional note for the approval…"
                  : "Reason for rejecting this request…"
              }
              rows={4}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setReasonDialog({ open: false, action: null, row: null, notes: "", file: null })}
                disabled={isSubmittingReason}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReason}
                disabled={isSubmittingReason || (reasonDialog.action === "reject" && !reasonDialog.notes.trim())}
                className={reasonDialog.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
              >
                {isSubmittingReason ? "Saving…" : reasonDialog.action === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
