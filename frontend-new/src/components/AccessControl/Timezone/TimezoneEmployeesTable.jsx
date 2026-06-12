"use client";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/lib/Pagination";
import AssignTimezoneModal from "./AssignTimezoneModal";
import { getTimezoneEmployees, getTimezoneDropdown } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";

export default function TimezoneEmployeesTable() {
  const permUser = getUser();
  const canEdit = can(permUser, "access_control", "access_control", "edit");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [tzFilter, setTzFilter] = useState("");
  const [timezones, setTimezones] = useState([]);
  const [assignEmp, setAssignEmp] = useState(null);

  useEffect(() => { getTimezoneDropdown().then((d) => setTimezones(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimezoneEmployees({
        page,
        per_page: perPage,
        common_search: search.length >= 3 ? search : null,
        filter_timezone_id: tzFilter || null,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.total || 0);
      setPage(res?.current_page || 1);
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, tzFilter]);
  useEffect(() => { load(); }, [load]);

  const tzBadge = (emp) => {
    const mapped = emp.timezones_mapped || [];
    if (mapped.length === 0) return <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">Default Full Access</span>;
    const names = [...new Set(mapped.map((m) => m.timezone?.timezone_name).filter(Boolean))];
    return <span className="px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs">{names.join(", ") || "Assigned"}</span>;
  };

  const columns = [
    {
      key: "display_name", header: "Name", render: (e) => (
        <div>
          <div className="font-semibold">{e.display_name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || "—"}</div>
          <div className="text-xs text-slate-400">{e.designation?.name || ""}</div>
        </div>
      )
    },
    { key: "ids", header: "Emp Id/Device Id", render: (e) => <div><div className="font-semibold">{e.employee_id || "—"}</div><div className="text-xs text-slate-400">{e.system_user_id || "—"}</div></div> },
    { key: "branch", header: "Branch", render: (e) => e.branch?.branch_name || "—" },
    { key: "department", header: "Department", render: (e) => e.department?.name || "—" },
    { key: "phone_number", header: "Mobile Number", render: (e) => e.phone_number || "—" },
    { key: "timezones", header: "Timezones", render: tzBadge },
    { key: "actions", header: "Actions", render: (e) => (
        canEdit
          ? <button onClick={() => setAssignEmp(e)} className="px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-500/40 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase hover:bg-violet-50 dark:hover:bg-violet-500/10 transition">Assign</button>
          : <span className="text-slate-300">—</span>
      )
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">Timezone Employees List</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search (min 3)" className="border border-gray-200 dark:border-white/10 rounded-full px-4 py-2 text-sm dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
          <select value={tzFilter} onChange={(e) => { setTzFilter(e.target.value); setPage(1); }} className="border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-sm dark:bg-slate-800">
            <option value="">All Timezones</option>
            {timezones.map((t) => <option key={t.id} value={t.id}>{t.timezone_name}</option>)}
          </select>
          <button onClick={load} title="Reload" className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/5 transition-colors"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={loading}
        emptyMessage="No employees found."
        pagination={
          <Pagination
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
            pageSizeOptions={[10, 25, 50]}
          />
        }
      />

      {assignEmp && <AssignTimezoneModal open={!!assignEmp} employee={assignEmp} onClose={() => setAssignEmp(null)} onSaved={load} />}
    </div>
  );
}
