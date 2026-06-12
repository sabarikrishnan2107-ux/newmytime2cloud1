"use client";

import { useCallback, useEffect, useState } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { getStaffUser } from "@/lib/staff-user";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const defaultSummaryCards = [
  {
    label: "Requests This Month",
    value: "128",
    helper: "Live Snapshot",
    icon: "analytics",
    iconClass: "bg-purple-400/12 text-purple-300",
    badgeClass: "border border-purple-400/15 bg-purple-400/12 text-purple-200",
  },
  {
    label: "Pending Review",
    value: "14",
    helper: "Action Needed",
    icon: "pending_actions",
    iconClass: "bg-cyan-400/12 text-cyan-300",
    badgeClass: "border border-cyan-400/15 bg-cyan-400/12 text-cyan-300",
    valueClass: "text-cyan-300",
  },
  {
    label: "Approved",
    value: "105",
    helper: "Closed",
    icon: "check_circle",
    iconClass: "bg-emerald-400/12 text-emerald-300",
    badgeClass: "border border-emerald-400/15 bg-emerald-400/12 text-emerald-200",
  },
  {
    label: "Rejected",
    value: "9",
    helper: "Closed",
    icon: "cancel",
    iconClass: "bg-red-400/12 text-red-300",
    badgeClass: "border border-red-400/15 bg-red-400/12 text-red-200",
  },
];

const defaultRequests = [
  {
    id: "REQ-4821",
    type: "Missing Punch",
    typeIcon: "emergency_home",
    typeClass: "text-purple-300",
    date: "Oct 24, 2023",
    previousValue: "--:--",
    updatedValue: "17:30",
    updatedClass: "text-emerald-300",
    status: "Pending",
    statusClass: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
    reason: "Forgot to clock out due to emergency system check",
    canEdit: true,
  },
  {
    id: "REQ-4819",
    type: "Incorrect Time",
    typeIcon: "schedule",
    typeClass: "text-cyan-300",
    date: "Oct 22, 2023",
    previousValue: "08:15",
    updatedValue: "08:00",
    updatedClass: "text-emerald-300",
    status: "Approved",
    statusClass: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    reason: "Security badge failure at main entrance gate",
    canEdit: false,
  },
  {
    id: "REQ-4802",
    type: "Duplicate Entry",
    typeIcon: "warning",
    typeClass: "text-red-300",
    date: "Oct 20, 2023",
    previousValue: "12:00",
    updatedValue: "REMOVAL",
    updatedClass: "text-red-300",
    status: "Rejected",
    statusClass: "bg-red-400/10 text-red-300 border-red-400/20",
    reason: "Manual entry error during shift changeover",
    canEdit: true,
  },
];

const requestTypeOptions = [
  "Missed Punch (In/Out)",
  "Wrong Entry Time",
  "System Failure",
  "Work from Home / Off-site",
];

function getTodayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function createDefaultRequestForm() {
  const today = getTodayInputValue();
  return {
    request_type: requestTypeOptions[0],
    from_date: today,
    to_date: today,
    from_time: "",
    to_time: "",
    remarks: "",
  };
}

function toDateInputValue(value) {
  if (!value) return getTodayInputValue();

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return getTodayInputValue();
  }

  const offset = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 10);
}

function normalizeTimeValue(value) {
  if (!value) return "";

  const text = String(value).trim();
  if (!text) return "";

  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  const parsed = new Date(`1970-01-01T${text}`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatRequestTime(value) {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return "---";

  const [hours, minutes] = normalized.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function createRequestFormFromRequest(request) {
  return {
    request_type: request.requestTypeValue || requestTypeOptions[0],
    from_date: request.fromDateValue || getTodayInputValue(),
    to_date: request.toDateValue || getTodayInputValue(),
    from_time: request.fromTimeValue || "",
    to_time: request.toTimeValue || "",
    remarks: request.remarksValue || "",
  };
}

function SummaryCard({ label, value, helper, icon, iconClass, badgeClass, valueClass }) {
  return (
    <div className="staff-glass-card relative overflow-hidden rounded-[24px] border border-white/10 p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${badgeClass}`}>{helper}</span>
      </div>

      <div className="mt-8">
        <span className={`font-headline text-[32px] font-semibold leading-none text-slate-100 ${valueClass || ""}`}>{value}</span>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status, statusClass }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase ${statusClass}`}>
      {status}
    </span>
  );
}

function normalizeDisplayValue(value) {
  if (value === null || value === undefined) return "---";
  const text = String(value).trim();
  return text ? text : "---";
}

function formatRequestDate(value) {
  if (!value) return "---";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return normalizeDisplayValue(value);
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusConfig(status) {
  if (status === 1 || status === "1" || status === "approved" || status === "Approved" || status === "A") {
    return {
      status: "Approved",
      statusClass: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    };
  }

  if (status === 2 || status === "2" || status === "rejected" || status === "Rejected" || status === "R") {
    return {
      status: "Rejected",
      statusClass: "bg-red-400/10 text-red-300 border-red-400/20",
    };
  }

  return {
    status: "Pending",
    statusClass: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
  };
}

function RequestField({ label, value, className = "" }) {
  return (
    <div className={`rounded-xl bg-slate-800/40 p-3 ${className}`.trim()}>
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100 break-words">{value}</p>
    </div>
  );
}

function ViewMetricCard({ label, value, icon, accentClass = "text-cyan-300" }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-[18px] ${accentClass}`}>{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-100">{value || "---"}</p>
    </div>
  );
}

function ViewWindowCard({ label, dateValue, timeValue, accentClass }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-[18px] ${accentClass}`}>schedule</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
      <p className="mt-4 font-headline text-xl font-semibold text-slate-50">{dateValue || "---"}</p>
      <p className="mt-1 text-sm font-medium text-slate-400">{timeValue || "---"}</p>
    </div>
  );
}

function FormLabel({ children }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</label>;
}

export default function StaffChangeRequestPage() {
  const [summaryCards, setSummaryCards] = useState(defaultSummaryCards.map(c => ({ ...c, value: "0" })));
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [form, setForm] = useState(createDefaultRequestForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const pendingRequestCount = requests.filter((request) => request.status === "Pending").length;
  const approvedRequestCount = requests.filter((request) => request.status === "Approved").length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const u = await getStaffUser();
      const params = await buildQueryParams({});
      const staffRequestId = u.system_user_id || u.employee_id;

      const { data } = await api.get("/change_request", {
        params: { ...params, employee_device_id: staffRequestId, per_page: 5, page: currentPage },
      });
      const items = data?.data || [];
      setTotalPages(data?.last_page || 1);
      setTotal(data?.total || items.length);

      if (items.length > 0) {
        const total = items.length;
        const pending = items.filter((r) => getStatusConfig(r.status).status === "Pending").length;
        const approved = items.filter((r) => getStatusConfig(r.status).status === "Approved").length;
        const rejected = items.filter((r) => getStatusConfig(r.status).status === "Rejected").length;

        setSummaryCards([
          { ...defaultSummaryCards[0], value: String(total) },
          { ...defaultSummaryCards[1], value: String(pending) },
          { ...defaultSummaryCards[2], value: String(approved) },
          { ...defaultSummaryCards[3], value: String(rejected) },
        ]);

        setRequests(items.map((r) => {
          const st = getStatusConfig(r.status);

          return {
            id: `REQ-${r.id}`,
            recordId: r.id,
            branch: normalizeDisplayValue(r.branch?.branch_name || r.employee?.branch?.branch_name || r.branch_name),
            eid: normalizeDisplayValue(r.employee?.employee_id || r.employee_id || r.employee_device_id),
            requestType: normalizeDisplayValue(r.request_type || r.type || "Change Request"),
            from: formatRequestDate(r.from_date || r.date || r.created_at),
            to: formatRequestDate(r.to_date || r.date || r.created_at),
            fromTime: formatRequestTime(r.from_time || r.old_time),
            toTime: formatRequestTime(r.to_time || r.new_time),
            remarks: normalizeDisplayValue(r.remarks || r.reason || r.note),
            requestTypeValue: normalizeDisplayValue(r.request_type || r.type || "Change Request"),
            fromDateValue: toDateInputValue(r.from_date || r.date || r.created_at),
            toDateValue: toDateInputValue(r.to_date || r.date || r.created_at),
            fromTimeValue: normalizeTimeValue(r.from_time || r.old_time),
            toTimeValue: normalizeTimeValue(r.to_time || r.new_time),
            remarksValue: r.remarks || r.reason || r.note || "",
            requestedAtValue: r.requested_at || r.created_at || null,
            employeeDeviceId: r.employee_device_id || r.employee?.system_user_id,
            branchId: r.branch_id || r.employee?.branch_id || r.branch?.id,
            companyId: r.company_id,
            statusCode: r.status,
            canEdit: st.status === "Pending",
            ...st,
          };
        }));
      } else {
        setSummaryCards(defaultSummaryCards.map((c) => ({ ...c, value: "0" })));
        setRequests([]);
      }
    } catch (e) {
      console.warn("Change request error", e);
      setSummaryCards(defaultSummaryCards.map((c) => ({ ...c, value: "0" })));
      setRequests([]);
      setTotalPages(1);
      setTotal(0);
      setLoadError(
        e?.response?.data?.message ||
        "Unable to load change requests right now. Please check the backend connection or sign in again."
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleFormDialogChange = (open) => {
    setIsCreateOpen(open);
    if (open) {
      setSubmitError("");
      return;
    }
    setFormMode("create");
    setSelectedRequest(null);
    setSubmitError("");
  };

  const openCreateDialog = () => {
    setFormMode("create");
    setSelectedRequest(null);
    setForm(createDefaultRequestForm());
    setSubmitError("");
    setIsCreateOpen(true);
  };

  const openEditDialog = (request) => {
    if (!request?.canEdit) return;

    setFormMode("edit");
    setSelectedRequest(request);
    setForm(createRequestFormFromRequest(request));
    setSubmitError("");
    setIsCreateOpen(true);
  };

  const openViewDialog = (request) => {
    setSelectedRequest(request);
    setIsViewOpen(true);
  };

  const handleSubmitRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const user = await getStaffUser();
      const employeeDeviceId = user.system_user_id || user.employee_id;
      const branchId = user.branch_id;
      const companyId = user.company_id;

      if (employeeDeviceId === null || employeeDeviceId === undefined || branchId === null || branchId === undefined || companyId === null || companyId === undefined) {
        setSubmitError("Unable to load your employee details for this request.");
        return;
      }

      const payload = {
        request_type: form.request_type,
        from_date: form.from_date,
        to_date: form.to_date,
        from_time: form.from_time,
        to_time: form.to_time,
        remarks: form.remarks,
        requested_at: selectedRequest?.requestedAtValue || new Date().toISOString(),
        status: selectedRequest?.statusCode ?? "P",
        employee_device_id: selectedRequest?.employeeDeviceId || employeeDeviceId,
        branch_id: selectedRequest?.branchId || branchId,
        company_id: selectedRequest?.companyId || companyId,
      };

      let response;
      if (formMode === "edit" && selectedRequest?.recordId) {
        response = await api.put(`/change_request/${selectedRequest.recordId}`, payload);
      } else {
        response = await api.post("/change_request", payload);
      }

      if (response?.data?.status === false) {
        setSubmitError(response?.data?.message || `Unable to ${formMode === "edit" ? "update" : "submit"} the change request right now.`);
        return;
      }

      handleFormDialogChange(false);

      if (currentPage === 1) {
        await fetchData();
      } else {
        setCurrentPage(1);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.request_type?.[0] ||
        error?.response?.data?.errors?.from_date?.[0] ||
        error?.response?.data?.errors?.to_date?.[0] ||
        error?.response?.data?.errors?.remarks?.[0] ||
        `Unable to ${formMode === "edit" ? "update" : "submit"} the change request right now.`;
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]"></div>
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-purple-400/10 blur-[120px]"></div>
      </div>

      <div className="flex flex-col">
        <header className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.1),transparent_36%)]">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Attendance Requests
              </span>
              <h1 className="mt-3 font-headline text-[28px] font-semibold tracking-tight text-slate-50 sm:text-[32px]">
                Change Request Hub
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Submit punch corrections, review approval progress, and keep a clear record of attendance updates in one place.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                  {total} total submission{total === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                  {pendingRequestCount} pending review
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                  {approvedRequestCount} approved
                </span>
              </div>
            </div>

          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 to-cyan-400 px-5 text-sm font-bold text-[#004d57] shadow-[0_0_20px_rgba(0,227,253,0.22)] transition hover:brightness-110 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            New Request
          </button>
          </div>
        </header>

        <Dialog open={isCreateOpen} onOpenChange={handleFormDialogChange}>
          <DialogContent className="max-h-[90vh] !w-[720px] !max-w-[94vw] overflow-hidden border-white/10 bg-[#0b1324] p-0 text-slate-100">
            <form onSubmit={handleSubmitRequest} className="flex max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-white/10 px-6 py-5">
                <DialogTitle className="text-lg font-bold text-slate-100">
                  {formMode === "edit" ? "Edit Attendance Request" : "New Attendance Request"}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {formMode === "edit"
                    ? "Update the details of your pending attendance correction request before review."
                    : "Provide the attendance correction details you want your reviewer to process."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <FormLabel>Request Type</FormLabel>
                    <select
                      value={form.request_type}
                      onChange={(event) => handleFormChange("request_type", event.target.value)}
                      className="h-11 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                      required
                    >
                      {requestTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <FormLabel>From Date</FormLabel>
                    <input
                      type="date"
                      value={form.from_date}
                      onChange={(event) => handleFormChange("from_date", event.target.value)}
                      className="h-11 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <FormLabel>To Date</FormLabel>
                    <input
                      type="date"
                      value={form.to_date}
                      onChange={(event) => handleFormChange("to_date", event.target.value)}
                      className="h-11 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <FormLabel>From Time</FormLabel>
                    <input
                      type="time"
                      value={form.from_time}
                      onChange={(event) => handleFormChange("from_time", event.target.value)}
                      className="h-11 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <FormLabel>To Time</FormLabel>
                    <input
                      type="time"
                      value={form.to_time}
                      onChange={(event) => handleFormChange("to_time", event.target.value)}
                      className="h-11 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <FormLabel>Remarks</FormLabel>
                    <textarea
                      value={form.remarks}
                      onChange={(event) => handleFormChange("remarks", event.target.value)}
                      placeholder="Enter your remarks"
                      className="min-h-[120px] resize-none rounded-xl border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/50"
                    />
                  </div>
                </div>

                {submitError ? (
                  <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                    {submitError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleFormDialogChange(false)}
                  className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 px-5 py-2 text-sm font-bold text-[#004d57] shadow-[0_0_10px_rgba(0,227,253,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (formMode === "edit" ? "Saving..." : "Submitting...") : (formMode === "edit" ? "Save Changes" : "Submit Request")}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-h-[90vh] !w-[760px] !max-w-[94vw] overflow-hidden border-white/10 bg-[#0b1324] p-0 text-slate-100">
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.1),transparent_36%)] px-6 py-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="inline-flex rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                        Attendance Request
                      </span>
                      <DialogTitle className="mt-3 font-headline text-[24px] font-semibold tracking-tight text-slate-50">
                        Request Overview
                      </DialogTitle>
                      <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        Review the submitted request window, current approval status, and employee notes in one place.
                      </DialogDescription>
                    </div>

                    <div className="self-start">
                      <StatusBadge
                        status={selectedRequest?.status || "---"}
                        statusClass={selectedRequest?.statusClass || "border border-white/10 bg-white/5 text-slate-200"}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <ViewMetricCard label="Branch" value={selectedRequest?.branch || "---"} icon="apartment" />
                    <ViewMetricCard label="Employee ID" value={selectedRequest?.eid || "---"} icon="badge" />
                    <ViewMetricCard label="Request Type" value={selectedRequest?.requestType || "---"} icon="fact_check" accentClass="text-purple-300" />
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 overflow-y-auto px-6 py-6">
                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-2 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-headline text-base font-semibold text-slate-100">Request Window</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        The requested attendance correction period submitted for review.
                      </p>
                    </div>
                    <span className="inline-flex self-start rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                      {selectedRequest?.requestType || "---"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
                    <ViewWindowCard
                      label="From"
                      dateValue={selectedRequest?.from || "---"}
                      timeValue={selectedRequest?.fromTime || "---"}
                      accentClass="text-cyan-300"
                    />

                    <div className="hidden md:flex md:justify-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">east</span>
                      </div>
                    </div>

                    <ViewWindowCard
                      label="To"
                      dateValue={selectedRequest?.to || "---"}
                      timeValue={selectedRequest?.toTime || "---"}
                      accentClass="text-emerald-300"
                    />
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <ViewMetricCard label="Current Status" value={selectedRequest?.status || "---"} icon="task_alt" accentClass="text-emerald-300" />
                  <ViewMetricCard label="Submission Reference" value={selectedRequest?.id || "---"} icon="confirmation_number" accentClass="text-amber-300" />
                </section>

                <section className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-cyan-300">description</span>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Employee Notes</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{selectedRequest?.remarks || "---"}</p>
                </section>
              </div>

              <div className="flex justify-end border-t border-white/10 bg-white/[0.02] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <main className="flex flex-1 flex-col gap-8">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} {...card} />
            ))}
          </section>

          <section className="staff-glass-card flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-headline text-base font-semibold text-slate-100">Recent Submissions</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review your latest attendance requests, their current status, and any available actions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                  {requests.length} visible on this page
                </span>
                <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
                  {pendingRequestCount > 0
                    ? `${pendingRequestCount} pending request${pendingRequestCount === 1 ? "" : "s"} remain editable`
                    : "No pending requests awaiting action"}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/20 px-6 text-sm text-slate-500">
                Loading your attendance requests...
              </div>
            ) : loadError ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 px-6 text-center">
                <p className="text-sm font-semibold text-red-300">Could not load recent submissions</p>
                <p className="mt-2 max-w-xl text-sm text-slate-400">{loadError}</p>
                <button
                  type="button"
                  onClick={fetchData}
                  className="mt-4 inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Retry
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/20 px-6 text-center">
                <p className="text-sm font-semibold text-slate-100">No requests submitted yet</p>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  Once you send an attendance correction request, it will appear here with its approval status and available actions.
                </p>
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Create First Request
                </button>
              </div>
            ) : (
              <>
            <div className="space-y-4 xl:hidden">
              {requests.map((request) => (
                <article key={request.id} className="rounded-[24px] border border-white/5 bg-slate-900/30 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-headline text-base font-bold text-slate-100">{request.requestType}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{request.id} | {request.eid}</p>
                    </div>
                    <StatusBadge status={request.status} statusClass={request.statusClass} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <RequestField label="Branch" value={request.branch} />
                    <RequestField label="EID" value={request.eid} />
                    <RequestField label="Request Type" value={request.requestType} />
                    <RequestField label="From" value={`${request.from}${request.fromTime !== "---" ? ` | ${request.fromTime}` : ""}`} />
                    <RequestField label="To" value={`${request.to}${request.toTime !== "---" ? ` | ${request.toTime}` : ""}`} />
                    <RequestField label="Remarks" value={request.remarks} className="sm:col-span-2" />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openViewDialog(request)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/15"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditDialog(request)}
                      disabled={!request.canEdit}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        request.canEdit
                          ? "border border-purple-400/20 bg-purple-400/10 text-purple-300 hover:bg-purple-400/15"
                          : "cursor-not-allowed border border-white/10 bg-slate-800/60 text-slate-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full border-separate border-spacing-y-3 text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                    <th className="px-4 pb-2">Branch</th>
                    <th className="px-4 pb-2">EID</th>
                    <th className="px-4 pb-2">Request Type</th>
                    <th className="px-4 pb-2">From</th>
                    <th className="px-4 pb-2">To</th>
                    <th className="px-4 pb-2">Remarks</th>
                    <th className="px-4 pb-2">Status</th>
                    <th className="px-4 pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {requests.map((request) => (
                    <tr key={`${request.id}-desktop`} className="group transition-all duration-300">
                      <td className="rounded-l-[20px] border-y border-l border-white/6 bg-slate-900/30 px-4 py-4 font-medium text-slate-100 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-100">{request.branch}</span>
                          <span className="text-[11px] text-slate-500">Assigned branch</span>
                        </div>
                      </td>
                      <td className="border-y border-white/6 bg-slate-900/30 px-4 py-4 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-cyan-300">{request.eid}</span>
                          <span className="text-[11px] text-slate-500">Employee code</span>
                        </div>
                      </td>
                      <td className="border-y border-white/6 bg-slate-900/30 px-4 py-4 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-100">{request.requestType}</span>
                          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{request.id}</span>
                        </div>
                      </td>
                      <td className="border-y border-white/6 bg-slate-900/30 px-4 py-4 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-100">{request.from}</span>
                          <span className="text-[11px] text-slate-500">{request.fromTime}</span>
                        </div>
                      </td>
                      <td className="border-y border-white/6 bg-slate-900/30 px-4 py-4 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-100">{request.to}</span>
                          <span className="text-[11px] text-slate-500">{request.toTime}</span>
                        </div>
                      </td>
                      <td className="max-w-[280px] border-y border-white/6 bg-slate-900/30 px-4 py-4 text-slate-500 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <p className="line-clamp-2 text-sm leading-6 text-slate-400">{request.remarks}</p>
                      </td>
                      <td className="border-y border-white/6 bg-slate-900/30 px-4 py-4 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <StatusBadge status={request.status} statusClass={request.statusClass} />
                      </td>
                      <td className="rounded-r-[20px] border-y border-r border-white/6 bg-slate-900/30 px-4 py-4 transition group-hover:border-cyan-400/10 group-hover:bg-slate-900/45">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewDialog(request)}
                            className="inline-flex items-center gap-1 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-400/15"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditDialog(request)}
                            disabled={!request.canEdit}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition ${
                              request.canEdit
                                ? "border border-purple-400/20 bg-purple-400/10 text-purple-300 hover:bg-purple-400/15"
                                : "cursor-not-allowed border border-white/10 bg-slate-800/60 text-slate-500"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </>
            )}

            <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-medium text-slate-500">
                Showing page <span className="text-slate-100">{currentPage}</span> of <span className="text-slate-100">{totalPages}</span> | {total} total submission{total === 1 ? "" : "s"}
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/70 text-slate-500 transition hover:bg-slate-700/70 disabled:opacity-30">
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${currentPage === p
                      ? "bg-cyan-400 text-[#004d57] shadow-[0_0_8px_rgba(0,227,253,0.3)]"
                      : "bg-slate-800/70 text-slate-500 hover:bg-slate-700/70"}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/70 text-slate-500 transition hover:bg-slate-700/70 disabled:opacity-30">
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
