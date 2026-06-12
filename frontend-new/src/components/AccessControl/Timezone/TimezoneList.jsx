"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, RadioTower, Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import TimezoneGridModal from "./TimezoneGridModal";
import { getTimezones, createTimezone, updateTimezone, deleteTimezone, seedDefaultTimezones, syncTimezonesAllDevices } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";

export default function TimezoneList() {
  const permUser = getUser();
  const canCreate = can(permUser, "access_control", "access_control", "create");
  const canEdit = can(permUser, "access_control", "access_control", "edit");
  const canDelete = can(permUser, "access_control", "access_control", "delete");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimezones({ per_page: 100 });
      let list = Array.isArray(res?.data) ? res.data : [];
      if (list.length === 0) {
        await seedDefaultTimezones();
        const res2 = await getTimezones({ per_page: 100 });
        list = Array.isArray(res2?.data) ? res2.data : [];
      }
      setRows(list);
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onSubmit = async (payload) => {
    try {
      if (editing) await updateTimezone(editing.id, { ...payload, timezone_id: editing.timezone_id });
      else await createTimezone(payload);
      notify("Saved", `Timezone ${editing ? "updated" : "created"}.`, "success");
      setEditing(null);
      load();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
      throw e; // keep the modal open on failure
    }
  };

  const onDelete = async (row) => {
    if (row.is_default) { notify("Not allowed", "Default timezones cannot be deleted.", "error"); return; }
    if (!confirm(`Delete timezone "${row.timezone_name}"?`)) return;
    try {
      await deleteTimezone(row.id);
      notify("Deleted", "Timezone deleted.", "success");
      load();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await syncTimezonesAllDevices();
      const r = Array.isArray(res?.data) ? res.data : [];
      const ok = r.filter((d) => d.ok).length;
      const offline = r.filter((d) => d.offline).length;
      const failed = r.length - ok - offline;
      let msg = `${ok} of ${r.length} device(s) updated.`;
      if (offline) msg += ` ${offline} offline (skipped).`;
      if (failed) msg += ` ${failed} failed.`;
      // Offline devices aren't a failure — only flag an error if nothing synced or some genuinely failed.
      notify("Sync complete", msg, ok > 0 && failed === 0 ? "success" : (ok > 0 ? "warning" : "error"));
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: "_n", header: "#", render: (r) => r._n },
    { key: "timezone_name", header: "TimeZone Name", render: (r) => <span className="font-semibold text-violet-700 dark:text-violet-400">{r.timezone_name}</span> },
    { key: "description", header: "Description" },
    { key: "timezone_id", header: "Timezone #Id on Device" },
    { key: "employees_count", header: "Employees Count", align: "center", render: (r) => (r.employees?.length ?? r.employees_count ?? 0) },
    { key: "created_at", header: "Created", render: (r) => (r.created_at ? String(r.created_at).slice(0, 10) : "—") },
    {
      key: "actions", header: "Actions", render: (r) => (
        <div className="flex gap-3">
          {canEdit && <button onClick={() => { setEditing(r); setModalOpen(true); }} title="Edit" className="text-slate-500 hover:text-violet-600"><Pencil size={16} /></button>}
          {canDelete && !r.is_default && <button onClick={() => onDelete(r)} title="Delete" className="text-slate-500 hover:text-red-600"><Trash2 size={16} /></button>}
        </div>
      )
    },
  ];

  const data = rows.map((r, i) => ({ ...r, _n: i + 1 }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">Timezones List</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={load} title="Reload" className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/5 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          {canEdit && (
            <button onClick={onSync} disabled={syncing} className="px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50">
              <RadioTower className="w-4 h-4" />{syncing ? "Syncing…" : "Sync timezones to all devices"}
            </button>
          )}
          {canCreate && <button onClick={() => { setEditing(null); setModalOpen(true); }} title="Add timezone" className="size-9 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800"><Plus className="w-5 h-5" /></button>}
        </div>
      </div>

      <DataTable columns={columns} data={data} isLoading={loading} emptyMessage="No timezones yet." />

      <TimezoneGridModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSubmit={onSubmit} />
    </div>
  );
}
