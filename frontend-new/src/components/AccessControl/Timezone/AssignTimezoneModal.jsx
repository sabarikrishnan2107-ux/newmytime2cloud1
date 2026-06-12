"use client";
import React, { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { getDevices, getDeviceListNew, getTimezoneDropdown, saveEmployeeDeviceTimezones } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

export default function AssignTimezoneModal({ open, employee, onClose, onSaved }) {
  const [devices, setDevices] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [picks, setPicks] = useState({}); // deviceTableId -> timezone option {id, timezone_id, timezone_name}
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        // Primary: the proven paginated /device endpoint (same one the Devices page uses,
        // handles manager branch scoping correctly). Fall back to /device-list if empty.
        const [devRes, tzs] = await Promise.all([getDevices({ per_page: 500 }), getTimezoneDropdown()]);
        let devList = Array.isArray(devRes?.data) ? devRes.data : (Array.isArray(devRes) ? devRes : []);
        if (devList.length === 0) {
          const alt = await getDeviceListNew({});
          devList = Array.isArray(alt?.data) ? alt.data : (Array.isArray(alt) ? alt : []);
        }
        const tzList = Array.isArray(tzs) ? tzs : [];
        setDevices(devList);
        setTimezones(tzList);
        // Prefill from employee.timezones_mapped: device_table_id -> device_timezone_id
        const pre = {};
        (employee?.timezones_mapped || []).forEach((m) => {
          const tz = tzList.find((t) => t.timezone_id === m.device_timezone_id);
          if (tz) pre[m.device_table_id] = tz;
        });
        setPicks(pre);
      } catch (e) {
        notify("Error", parseApiError(e), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, employee]);

  if (!open) return null;

  const save = async () => {
    const mappings = devices
      .filter((d) => picks[d.id])
      .map((d) => ({
        id: d.id,
        serial_number: d.device_id,
        timezone_table_id: picks[d.id].id,
        device_timezone_id: picks[d.id].timezone_id,
      }));
    if (mappings.length === 0) { notify("Nothing to save", "Pick a timezone for at least one device.", "error"); return; }
    setSaving(true);
    try {
      await saveEmployeeDeviceTimezones({ employee_ids: [employee.id], mappings });
      notify("Saved", "Timezone mapping updated.", "success");
      onSaved?.();
      onClose();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 px-6 pb-6 pt-20 overflow-auto">
      <div className="w-full max-w-[640px] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-3 bg-violet-600 text-white flex items-center justify-between rounded-t-xl">
          <h2 className="font-bold">Update Timezone Mapping(s){employee?.display_name ? ` · ${employee.display_name}` : ""}</h2>
          <button onClick={onClose} className="size-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-3 max-h-[70vh] overflow-auto">
          {loading && <div className="text-sm text-slate-500">Loading devices…</div>}
          {!loading && devices.map((d, i) => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="w-5 text-slate-400 text-sm">{i + 1}</span>
              <input disabled value={d.name || d.device_id} className="flex-1 border rounded px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-sm" />
              <select value={picks[d.id]?.id ?? ""} onChange={(e) => {
                  const tz = timezones.find((t) => String(t.id) === e.target.value);
                  setPicks((p) => ({ ...p, [d.id]: tz || undefined }));
                }} className="flex-1 border rounded px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                <option value="">— No change —</option>
                {timezones.map((t) => <option key={t.id} value={t.id}>{t.timezone_name}</option>)}
              </select>
              <Clock size={16} className={picks[d.id] ? "text-green-600" : "text-slate-300"} />
            </div>
          ))}
          {!loading && devices.length === 0 && <div className="text-sm text-slate-500">No devices found.</div>}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border border-violet-200 dark:border-violet-500/40 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase hover:bg-violet-50 dark:hover:bg-violet-500/10 transition">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
