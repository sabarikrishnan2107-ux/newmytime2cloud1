"use client";
import React, { useEffect, useMemo, useState } from "react";
import { X, RadioTower } from "lucide-react";
import { getDevices, getDeviceListNew, syncTimezonesToDevices } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

// A device is reachable for WriteTimeGroup only when online. The rest of the app treats
// status_id == 1 as online (see syncTimezonesAllDevices), so we match that convention.
const isOnline = (d) => d?.status_id == 1;

export default function SyncTimezonesModal({ open, onClose, onSynced }) {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(() => new Set()); // Set<device_id>
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        // Same proven fetch as AssignTimezoneModal: paginated /device (handles manager
        // branch scoping), fall back to /device-list if empty.
        const devRes = await getDevices({ per_page: 500 });
        let devList = Array.isArray(devRes?.data) ? devRes.data : (Array.isArray(devRes) ? devRes : []);
        if (devList.length === 0) {
          const alt = await getDeviceListNew({});
          devList = Array.isArray(alt?.data) ? alt.data : (Array.isArray(alt) ? alt : []);
        }
        setDevices(devList);
        // Default: pre-select every online device (matches the "Select all online" default).
        setSelected(new Set(devList.filter(isOnline).map((d) => d.device_id)));
      } catch (e) {
        notify("Error", parseApiError(e), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const onlineDevices = useMemo(() => devices.filter(isOnline), [devices]);
  const offlineCount = devices.length - onlineDevices.length;
  const allOnlineSelected = onlineDevices.length > 0 && onlineDevices.every((d) => selected.has(d.device_id));

  if (!open) return null;

  const toggle = (serial) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(serial) ? next.delete(serial) : next.add(serial);
      return next;
    });

  const toggleAll = () =>
    setSelected(() => (allOnlineSelected ? new Set() : new Set(onlineDevices.map((d) => d.device_id))));

  const doSync = async () => {
    const serials = [...selected];
    if (serials.length === 0) return;
    setSyncing(true);
    try {
      const res = await syncTimezonesToDevices(serials);
      const r = Array.isArray(res?.data) ? res.data : [];
      const ok = r.filter((x) => x.ok).length;
      const failed = r.length - ok;
      let msg = `${ok} of ${r.length} device(s) updated.`;
      if (failed) msg += ` ${failed} failed.`;
      notify("Sync complete", msg, failed === 0 ? "success" : (ok > 0 ? "warning" : "error"));
      onSynced?.();
      onClose();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 px-6 pb-6 pt-20 overflow-auto">
      <div className="w-full max-w-[640px] rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between rounded-t-xl">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Sync Timezones to Devices</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Writes the current timezone windows to the devices you select.</p>
          </div>
          <button onClick={onClose} className="size-7 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"><X size={16} /></button>
        </div>

        <div className="p-6 pt-4 space-y-2 max-h-[60vh] overflow-auto">
          {loading && <div className="text-sm text-slate-500">Loading devices…</div>}

          {!loading && devices.length > 0 && (
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={allOnlineSelected} disabled={onlineDevices.length === 0} onChange={toggleAll} className="size-4 accent-violet-600" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Select all online devices</span>
              <span className="ml-auto text-xs text-slate-400">{onlineDevices.length} online{offlineCount ? ` · ${offlineCount} offline` : ""}</span>
            </label>
          )}

          {!loading && devices.map((d) => {
            const online = isOnline(d);
            const checked = selected.has(d.device_id);
            return (
              <label
                key={d.id ?? d.device_id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${online ? "cursor-pointer border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600" : "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"}`}
              >
                <input type="checkbox" disabled={!online} checked={checked} onChange={() => online && toggle(d.device_id)} className="size-4 accent-violet-600" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{d.name || d.device_id}</div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{d.device_id}</div>
                </div>
                <div className={`ml-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${online ? "text-green-600 dark:text-green-500" : "text-slate-400"}`}>
                  <span className={`size-2 rounded-full ${online ? "bg-green-500" : "bg-slate-400"}`} />
                  {online ? "Online" : "Offline"}
                </div>
              </label>
            );
          })}

          {!loading && devices.length === 0 && <div className="text-sm text-slate-500">No devices found.</div>}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
          {offlineCount > 0 && <span className="text-[11px] text-slate-400 mr-auto">Offline devices can’t receive updates until they reconnect.</span>}
          <button onClick={onClose} className={`${offlineCount > 0 ? "" : "ml-auto"} px-4 py-2 rounded border border-violet-200 dark:border-violet-500/40 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase hover:bg-violet-50 dark:hover:bg-violet-500/10 transition`}>Cancel</button>
          <button onClick={doSync} disabled={syncing || selected.size === 0} className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50">
            <RadioTower size={14} />{syncing ? "Syncing…" : `Sync ${selected.size} device${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
