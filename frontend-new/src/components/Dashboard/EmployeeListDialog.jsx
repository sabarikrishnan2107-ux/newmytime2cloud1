"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProfilePicture from "@/components/ProfilePicture";
import MultiDropDown from "@/components/ui/MultiDropDown";
import { getPresentEmployees, getAbsentEmployees } from "@/lib/endpoint/dashboard";
import { getBranches, getDepartmentsByBranchIds, getEmployeesJson } from "@/lib/api";
import { getUser } from "@/config";
import { Search, UserCheck, UserX, AlertTriangle, RefreshCw } from "lucide-react";

const VARIANTS = {
  present: {
    title: "Present Today",
    icon: UserCheck,
    accent: {
      iconBg: "bg-emerald-500/15",
      iconFg: "text-emerald-500",
      pillBg: "bg-emerald-500/15",
      pillFg: "text-emerald-500",
      rowHover: "hover:bg-emerald-50/40 dark:hover:bg-emerald-500/[0.04]",
      valueColor: "text-emerald-600 dark:text-emerald-400",
      ring: "focus-visible:ring-emerald-500/30",
    },
    extraColumn: { key: "first_punch", label: "First Punch-In", align: "center" },
    deviceColumn: true,
    fetcher: getPresentEmployees,
    sortNote: "Sorted by earliest punch-in",
    emptyMessage: "No employees present yet today.",
  },
  absent: {
    title: "Unplanned Absence",
    icon: UserX,
    accent: {
      iconBg: "bg-rose-500/15",
      iconFg: "text-rose-500",
      pillBg: "bg-rose-500/15",
      pillFg: "text-rose-500",
      rowHover: "hover:bg-rose-50/40 dark:hover:bg-rose-500/[0.04]",
      valueColor: "text-rose-600 dark:text-rose-400",
      ring: "focus-visible:ring-rose-500/30",
    },
    extraColumn: { key: "last_seen", label: "Last Seen", align: "center" },
    deviceColumn: false,
    fetcher: getAbsentEmployees,
    sortNote: "Sorted by longest absence",
    emptyMessage: "No unplanned absences today.",
  },
};

function formatPunchTime(raw) {
  if (!raw) return "—";
  const d = new Date(String(raw).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(raw);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatLastSeen(raw) {
  if (!raw) return "Never";
  const d = new Date(String(raw).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(raw);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 14) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" });
}

function formatTodayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EmployeeListDialog({ open, onOpenChange, variant = "present", branch_ids, department_ids }) {
  const cfg = VARIANTS[variant] || VARIANTS.present;
  const IconComp = cfg.icon;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  // In-popup filters (override dashboard-level filters when popup is open).
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selBranches, setSelBranches] = useState([]);
  const [selDepartments, setSelDepartments] = useState([]);
  const [selEmployees, setSelEmployees] = useState([]);

  const fetchRows = async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters?.branch_ids?.length) params.branch_ids = filters.branch_ids;
      if (filters?.department_ids?.length) params.department_ids = filters.department_ids;
      if (filters?.employee_ids?.length) params.employee_ids = filters.employee_ids;
      const data = await cfg.fetcher(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const detail = e?.response?.data?.message || e?.message || "";
      setError(detail ? `Couldn't load employees: ${detail}` : "Couldn't load employees. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Seed local filter state from props when the dialog opens.
  // The filter-change effect below picks up the new sel* values and triggers the fetch.
  useEffect(() => {
    if (!open) return;
    setSelBranches(branch_ids?.length ? [...branch_ids] : []);
    setSelDepartments(department_ids?.length ? [...department_ids] : []);
    setSelEmployees([]);
    setQuery("");

    // Load filter dropdown options.
    (async () => {
      try {
        const [branches, user] = await Promise.all([getBranches(), getUser()]);
        setBranchOptions(Array.isArray(branches) ? branches : []);

        const empMap = await getEmployeesJson(user?.company_id ?? 0);
        const list = empMap && typeof empMap === "object" && !Array.isArray(empMap)
          ? Object.values(empMap)
          : Array.isArray(empMap) ? empMap : [];
        // Normalize to MultiDropDown shape {id, name}; keep branch_id/department_id for client-side narrowing.
        setEmployeeOptions(
          list.map((e) => ({
            id: e.id,
            name: `${e.name ?? e.first_name ?? ""}${e.employee_id ? ` · ${e.employee_id}` : ""}`.trim() || "—",
            branch_id: e.branch_id,
            department_id: e.department_id,
          }))
        );
      } catch (_) {
        // Silent: dropdowns just stay empty; the rest of the UI still works.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant]);

  // Branches change → reload departments scoped to those branches (matches dashboard behavior).
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const depts = await getDepartmentsByBranchIds(selBranches);
        setDepartmentOptions(Array.isArray(depts) ? depts : []);
        // Drop any selected department that's no longer in scope.
        setSelDepartments((prev) => prev.filter((id) => (Array.isArray(depts) ? depts : []).some((d) => d.id === id)));
      } catch (_) {
        setDepartmentOptions([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selBranches, open]);

  // Re-fetch table when filters change (after the initial open-driven fetch).
  useEffect(() => {
    if (!open) return;
    fetchRows({
      branch_ids: selBranches,
      department_ids: selDepartments,
      employee_ids: selEmployees,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selBranches, selDepartments, selEmployees]);

  // Narrow employee dropdown options by current branch/department selection.
  const scopedEmployeeOptions = useMemo(() => {
    return employeeOptions.filter((e) => {
      if (selBranches.length && !selBranches.includes(e.branch_id)) return false;
      if (selDepartments.length && !selDepartments.includes(e.department_id)) return false;
      return true;
    });
  }, [employeeOptions, selBranches, selDepartments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [
        r.full_name,
        r.first_name,
        r.last_name,
        r.employee_id,
        r.branch?.name,
        r.department?.name,
        r.first_punch_device,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query]);

  const gridTemplate = cfg.deviceColumn
    ? "grid-cols-[40px_minmax(220px,1.4fr)_1fr_1fr_120px_140px]"
    : "grid-cols-[40px_minmax(220px,1.6fr)_1fr_1fr_140px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full sm:max-w-4xl max-h-[85vh] p-0 overflow-hidden bg-white dark:bg-[#0d1730] border border-slate-200 dark:border-[#1d2b4a]"
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-[#1d2b4a]">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`grid place-items-center w-9 h-9 rounded-[10px] ${cfg.accent.iconBg} ${cfg.accent.iconFg}`}>
                <IconComp className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  {cfg.title}
                  <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${cfg.accent.pillBg} ${cfg.accent.pillFg}`}>
                    {loading ? "…" : rows.length}
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {formatTodayLabel()}
                  {selBranches.length || selDepartments.length || selEmployees.length ? (
                    <span className="ml-1">· Filtered view</span>
                  ) : null}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchRows({ branch_ids: selBranches, department_ids: selDepartments, employee_ids: selEmployees })}
              disabled={loading}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Filter row: Branch / Department / Employee */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MultiDropDown
              items={branchOptions}
              value={selBranches}
              onChange={setSelBranches}
              placeholder="All Branches"
              badgesCount={1}
            />
            <MultiDropDown
              items={departmentOptions}
              value={selDepartments}
              onChange={setSelDepartments}
              placeholder="All Departments"
              badgesCount={1}
            />
            <MultiDropDown
              items={scopedEmployeeOptions}
              value={selEmployees}
              onChange={setSelEmployees}
              placeholder="All Employees"
              badgesCount={1}
            />
          </div>

          {/* Quick text search */}
          <div className="mt-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, branch, or department…"
              className={`w-full h-9 pl-9 pr-3 text-sm rounded-md border border-slate-200 dark:border-[#1d2b4a] bg-white dark:bg-[#101a30] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 ${cfg.accent.ring}`}
            />
          </div>
        </DialogHeader>

        <div className="overflow-auto max-h-[60vh]">
          <div className="min-w-[820px]">
            <div className={`grid ${gridTemplate} px-6 py-2.5 gap-3 border-b border-slate-200 dark:border-[#1d2b4a] text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-white/[0.02] sticky top-0 z-10`}>
              <div className="text-center">#</div>
              <div>Employee</div>
              <div>Branch</div>
              <div>Department</div>
              <div className={cfg.extraColumn.align === "center" ? "text-center" : ""}>
                {cfg.extraColumn.label}
              </div>
              {cfg.deviceColumn ? <div>Device</div> : null}
            </div>

            {loading ? (
              <SkeletonRows gridTemplate={gridTemplate} showDevice={cfg.deviceColumn} />
            ) : error ? (
              <ErrorState message={error} onRetry={() => fetchRows({ branch_ids: selBranches, department_ids: selDepartments, employee_ids: selEmployees })} />
            ) : filtered.length === 0 ? (
              <EmptyState hasQuery={query.length > 0} totalRows={rows.length} emptyMessage={cfg.emptyMessage} icon={IconComp} accent={cfg.accent} />
            ) : (
              filtered.map((r, idx) => (
                <div
                  key={r.id ?? r.system_user_id ?? idx}
                  className={`grid ${gridTemplate} px-6 py-2.5 gap-3 items-center text-sm transition-colors ${
                    idx % 2 === 0
                      ? "bg-white dark:bg-transparent"
                      : "bg-slate-50/60 dark:bg-white/[0.015]"
                  } ${cfg.accent.rowHover} border-b border-slate-100 dark:border-white/[0.04] last:border-b-0`}
                >
                  <div className="text-center text-slate-500 dark:text-slate-400 tabular-nums">
                    {idx + 1}
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 min-w-[36px] rounded-full overflow-hidden border border-slate-200 dark:border-[#1d2b4a] bg-slate-100 dark:bg-[#101a30] flex items-center justify-center">
                      <ProfilePicture src={r.photo} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">
                        {r.full_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—"}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        ID: {r.employee_id ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
                    {r.branch?.name || "—"}
                  </div>

                  <div className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
                    {r.department?.name || "—"}
                  </div>

                  {cfg.extraColumn.key === "first_punch" ? (
                    <div className={`text-center text-[13px] font-semibold tabular-nums ${cfg.accent.valueColor}`}>
                      {formatPunchTime(r.first_punch_time)}
                    </div>
                  ) : (
                    <div className={`text-center text-[13px] font-semibold ${cfg.accent.valueColor}`}>
                      {formatLastSeen(r.last_seen)}
                    </div>
                  )}

                  {cfg.deviceColumn ? (
                    <div className="text-[13px] text-slate-700 dark:text-slate-200 truncate" title={r.first_punch_device || ""}>
                      {r.first_punch_device || "—"}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-2.5 border-t border-slate-200 dark:border-[#1d2b4a] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-white/[0.02]">
          <span>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{filtered.length}</span>
            {query && rows.length !== filtered.length ? (
              <> of <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{rows.length}</span></>
            ) : null}
          </span>
          <span className="hidden sm:inline">{cfg.sortNote}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SkeletonRows({ gridTemplate, showDevice }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`grid ${gridTemplate} px-6 py-3 gap-3 items-center animate-pulse`}
        >
          <div className="h-3 w-4 bg-slate-200 dark:bg-white/10 rounded mx-auto" />
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="space-y-1.5">
              <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="h-2.5 w-16 bg-slate-200 dark:bg-white/10 rounded" />
            </div>
          </div>
          <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-3 w-12 bg-slate-200 dark:bg-white/10 rounded mx-auto" />
          {showDevice ? <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded" /> : null}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasQuery, totalRows, emptyMessage, icon: Icon, accent }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className={`grid place-items-center w-12 h-12 rounded-full ${accent.iconBg} ${accent.iconFg} mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {hasQuery ? "No employees match your search." : emptyMessage}
      </p>
      {hasQuery && totalRows > 0 ? (
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
          Try a different name, ID, branch, or department.
        </p>
      ) : null}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="grid place-items-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-3">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}

export default EmployeeListDialog;
