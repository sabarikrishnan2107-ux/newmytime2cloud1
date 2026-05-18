"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { api, buildQueryParams } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 25;

/**
 * Maps a kpiKey to:
 *   { endpoint, baseParams, postFilter }
 *
 * `postFilter` is an optional client-side filter applied to the response rows.
 * Used when the backend doesn't expose the specific predicate (e.g.
 * "currently_inside" = checked in but not yet checked out, "overstayed" =
 * past expected duration).
 */
function endpointFor(kpiKey) {
  const today = new Date().toISOString().split("T")[0];

  switch (kpiKey) {
    case "total_today":
      return {
        endpoint: "/visitor-management/logs",
        baseParams: { date: today, per_page: 500 },
      };
    case "currently_inside":
      return {
        endpoint: "/visitor-management/logs",
        baseParams: { date: today, per_page: 500 },
        postFilter: (rows) => rows.filter((r) => !r.out),
      };
    case "weekly_total": {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return {
        endpoint: "/visitor-management/logs",
        baseParams: { from: from.toISOString().split("T")[0], to: today, per_page: 1000 },
      };
    }
    case "overstayed":
      return {
        endpoint: "/visitor-management/logs",
        baseParams: { date: today, per_page: 500 },
        postFilter: (rows) =>
          rows.filter((r) => {
            // Heuristic: checked in, NOT checked out, and time in > 8 hours ago.
            if (r.out) return false;
            if (!r.in) return false;
            const inTime = new Date(r.in).getTime();
            if (Number.isNaN(inTime)) return false;
            return Date.now() - inTime > 8 * 60 * 60 * 1000;
          }),
      };
    case "pending_approvals":
      return {
        endpoint: "/visitor-management/pre-registrations",
        baseParams: { status: "pending", per_page: 500 },
      };
    case "pre_registered":
      return {
        endpoint: "/visitor-management/pre-registrations",
        baseParams: { per_page: 500 },
      };
    case "blacklisted":
      return {
        endpoint: "/visitor-management/blacklist",
        baseParams: { per_page: 500 },
      };
    default:
      return null;
  }
}

/**
 * Normalises rows from the three different endpoints into a uniform shape.
 */
function normaliseRow(row, kpiKey) {
  if (kpiKey === "blacklisted") {
    return {
      name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "—",
      company: row.company_name || row.visitor_company_name || "—",
      host: row.reason || "—",
      type: row.type || "Blacklisted",
      checkIn: row.created_at || "—",
      status: "Blacklisted",
    };
  }
  if (kpiKey === "pending_approvals" || kpiKey === "pre_registered") {
    return {
      name: row.visitor_name || row.full_name || "—",
      company: row.visitor_company_name || row.company || "—",
      host: row.host_name || row.host?.full_name || "—",
      type: row.visit_type || row.type || "—",
      checkIn: row.expected_arrival || row.visit_date || "—",
      status: row.status || "Pending",
    };
  }
  // logs endpoint
  return {
    name: row.visitor
      ? `${row.visitor.first_name || ""} ${row.visitor.last_name || ""}`.trim() || `Visitor ${row.visitor_id}`
      : row.visitor_name || `Visitor ${row.visitor_id || "—"}`,
    company: row.visitor?.visitor_company_name || row.company || "—",
    host: row.host?.full_name || row.host_name || "—",
    type: row.visit_type || row.type || "—",
    checkIn: row.in || "—",
    status: row.out ? "Checked Out" : "Checked In",
  };
}

export default function KpiDetailDialog({ open, onClose, kpiKey, title }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open || !kpiKey) return;
    let cancelled = false;
    const cfg = endpointFor(kpiKey);
    if (!cfg) {
      setRows([]);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      setPage(1);
      try {
        const params = await buildQueryParams({ ...cfg.baseParams });
        const { data } = await api.get(cfg.endpoint, { params });
        let items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        if (cfg.postFilter) items = cfg.postFilter(items);
        const normalised = items.map((r) => normaliseRow(r, kpiKey));
        if (!cancelled) setRows(normalised);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to load");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, kpiKey]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.company || "").toLowerCase().includes(q) ||
        (r.host || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="min-w-[900px] max-w-[1100px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-[#1d2b4a] bg-white dark:bg-[#0e1730] text-slate-800 dark:text-white">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">{title || "Details"}</DialogTitle>
            <span className="text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-full px-2.5 py-0.5">
              {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, company, host..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-300">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-rose-500">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No records found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">#</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Visitor</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Company</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Host</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Type</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Check-In</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{r.name}</td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{r.company}</td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{r.host}</td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{r.type}</td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap">{r.checkIn}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
