"use client";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/lib/Pagination";
import { getTimezoneMappings } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

export default function MappingList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimezoneMappings({ page, per_page: perPage });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.total || 0);
      setPage(res?.current_page || 1);
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);
  useEffect(() => { load(); }, [load]);

  // device_id / employee_id columns are stored as JSON arrays of objects.
  const fmtArr = (val, keys) => {
    let arr = val;
    if (typeof arr === "string") { try { arr = JSON.parse(arr); } catch { arr = []; } }
    if (!Array.isArray(arr)) return "—";
    const out = arr.map((x) => keys.map((k) => x?.[k]).find(Boolean)).filter(Boolean);
    return out.length ? out.join(", ") : "—";
  };

  const columns = [
    { key: "_n", header: "#", render: (r) => r._n },
    { key: "timezone", header: "Timezone", render: (r) => <span className="font-semibold text-violet-700 dark:text-violet-400">{r.timezone?.timezone_name || "—"}</span> },
    { key: "devices", header: "Devices", render: (r) => fmtArr(r.device_id, ["name", "device_id"]) },
    { key: "employees", header: "Employees", render: (r) => fmtArr(r.employee_id, ["display_name", "first_name", "name"]) },
    { key: "branch", header: "Branch", render: (r) => r.branch?.branch_name || "—" },
    { key: "created_at", header: "Created", render: (r) => (r.created_at ? String(r.created_at).slice(0, 10) : "—") },
  ];

  const data = rows.map((r, i) => ({ ...r, _n: (page - 1) * perPage + i + 1 }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">Mapping List</h1>
        <button onClick={load} title="Reload" className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/5 transition-colors"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        emptyMessage="No timezone mappings yet."
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
    </div>
  );
}
