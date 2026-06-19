"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Check, X, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const EM_DASH = "—";
const TRIPLE_DASH = "---";

export default function EnrolledDevicesModal({ open, employee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchRows = useCallback((signal) => {
    if (!employee?.id) return;
    setLoading(true);
    setRows([]);
    setErrors([]);
    setFetchError(null);
    setSelectedDeviceIds(new Set());

    return axios
      .get(`${API_BASE}/employees/${employee.id}/enrolled-devices`, {
        signal,
        headers: { Accept: "application/json" },
      })
      .then((res) => {
        setRows(res?.data?.data ?? []);
        setErrors(res?.data?.errors ?? []);
      })
      .catch((err) => {
        if (axios.isCancel?.(err) || err?.name === "CanceledError" || err?.name === "AbortError") return;
        setFetchError(err?.response?.data?.message || err?.message || "Failed to load devices");
      })
      .finally(() => setLoading(false));
  }, [employee?.id]);

  useEffect(() => {
    if (!open || !employee?.id) return;
    const ctrl = new AbortController();
    fetchRows(ctrl.signal);
    return () => ctrl.abort();
  }, [open, employee?.id, fetchRows]);

  const handleRefresh = () => {
    const ctrl = new AbortController();
    fetchRows(ctrl.signal);
  };

  const handleDelete = async (row) => {
    if (!confirm(`Remove ${employee?.first_name || "employee"} from ${row.device_name}?`)) {
      return;
    }
    setDeletingId(row.device_id);
    try {
      const res = await axios.delete(
        `${API_BASE}/employees/${employee.id}/enrolled-devices/${encodeURIComponent(row.device_id)}`,
        { headers: { Accept: "application/json" } }
      );
      if (res?.data?.success === false) {
        alert(res?.data?.message || "Delete failed");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.device_id === row.device_id
            ? { ...r, available: false, location: null, face: false, rfid: false, pin: false }
            : r
        )
      );
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Delete failed";
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const pickErrorMessage = (settledResult) => {
    if (settledResult.status === "rejected") {
      const r = settledResult.reason;
      return r?.response?.data?.message || r?.message || "Delete failed";
    }
    if (settledResult.value?.data?.success === false) {
      return settledResult.value?.data?.message || "Delete failed";
    }
    return "Delete failed";
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedDeviceIds);
    if (ids.length === 0) return;
    if (!confirm(`Remove employee from ${ids.length} device(s)?`)) return;

    setBulkDeleting(true);
    const results = await Promise.allSettled(
      ids.map((deviceId) =>
        axios.delete(
          `${API_BASE}/employees/${employee.id}/enrolled-devices/${encodeURIComponent(deviceId)}`,
          { headers: { Accept: "application/json" } }
        )
      )
    );

    const succeeded = [];
    const failed = [];
    results.forEach((r, i) => {
      const deviceId = ids[i];
      const ok = r.status === "fulfilled" && r.value?.data?.success !== false;
      if (ok) succeeded.push(deviceId);
      else failed.push({ deviceId, message: pickErrorMessage(r) });
    });

    if (succeeded.length > 0) {
      setRows((prev) =>
        prev.map((r) =>
          succeeded.includes(r.device_id)
            ? { ...r, available: false, location: null, face: false, rfid: false, pin: false }
            : r
        )
      );
    }

    setSelectedDeviceIds(new Set(failed.map((f) => f.deviceId)));

    if (failed.length > 0) {
      alert(
        `Removed from ${succeeded.length} device(s). ${failed.length} failed:\n` +
          failed.map((f) => `• ${f.deviceId}: ${f.message}`).join("\n")
      );
    }

    setBulkDeleting(false);
  };

  const eligibleRows = rows.filter((r) => r.available);
  const eligibleCount = eligibleRows.length;
  const selectedCount = eligibleRows.reduce(
    (acc, r) => (selectedDeviceIds.has(r.device_id) ? acc + 1 : acc),
    0
  );
  const allSelected = eligibleCount > 0 && selectedCount === eligibleCount;
  const noneSelected = selectedCount === 0;
  const indeterminate = !allSelected && !noneSelected;

  const toggleOne = (deviceId) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedDeviceIds(() => {
      if (allSelected) return new Set();
      return new Set(eligibleRows.map((r) => r.device_id));
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[min(96vw,1100px)] sm:!max-w-[min(96vw,1100px)] w-full p-0 overflow-hidden gap-0"
      >
        <DialogTitle className="sr-only">Employee Devices</DialogTitle>

        <div className="flex items-center justify-between bg-[#7c3aed] dark:bg-[#7c3aed] px-6 py-4">
          <h2 className="text-white font-semibold text-base tracking-wide">Employee</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="text-white/90 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Delete selected"
              >
                {bulkDeleting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Delete Selected ({selectedCount})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/90 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-3 text-center whitespace-nowrap w-12">
                  {eligibleCount > 0 && (
                    <input
                      type="checkbox"
                      aria-label="Select all enrolled devices"
                      className="h-4 w-4 cursor-pointer accent-indigo-600"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                      onChange={toggleAll}
                      disabled={bulkDeleting}
                    />
                  )}
                </th>
                <th className="px-3 py-3 text-left whitespace-nowrap w-10">#</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">User Id</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">Device Name</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Employee Data</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Location</th>
                <th className="px-2 py-3 text-center whitespace-nowrap w-14">Face</th>
                <th className="px-2 py-3 text-center whitespace-nowrap w-14">RFID</th>
                <th className="px-2 py-3 text-center whitespace-nowrap w-14">PIN</th>
                <th className="px-2 py-3 text-center whitespace-nowrap w-16">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center">
                    <Loader2 className="w-7 h-7 animate-spin inline-block text-indigo-500" />
                  </td>
                </tr>
              )}

              {!loading && fetchError && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-red-600 dark:text-red-400">
                    {fetchError}
                  </td>
                </tr>
              )}

              {!loading && !fetchError && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No devices found for this employee&apos;s company.
                  </td>
                </tr>
              )}

              {!fetchError && rows.map((row, idx) => {
                const isDeleting = deletingId === row.device_id;
                const isAvailable = !!row.available;
                return (
                  <tr
                    key={row.device_id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-3 text-center">
                      {isAvailable ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.device_name}`}
                          className="h-4 w-4 cursor-pointer accent-indigo-600"
                          checked={selectedDeviceIds.has(row.device_id)}
                          onChange={() => toggleOne(row.device_id)}
                          disabled={bulkDeleting}
                        />
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200 tabular-nums">
                      {employee?.system_user_id ?? EM_DASH}
                    </td>
                    <td className="px-3 py-3 text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {row.device_name}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {isAvailable ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Available on Device
                        </span>
                      ) : (
                        <span className="text-red-500 dark:text-red-400 font-medium">
                          No Response From Device
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {row.location || TRIPLE_DASH}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {row.face
                        ? <Check className="w-4 h-4 inline-block text-emerald-600 dark:text-emerald-400" />
                        : <span className="text-slate-300 dark:text-slate-600">{EM_DASH}</span>}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {row.rfid
                        ? <Check className="w-4 h-4 inline-block text-emerald-600 dark:text-emerald-400" />
                        : <span className="text-slate-300 dark:text-slate-600">{EM_DASH}</span>}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {row.pin
                        ? <Check className="w-4 h-4 inline-block text-emerald-600 dark:text-emerald-400" />
                        : <span className="text-slate-300 dark:text-slate-600">{EM_DASH}</span>}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {isAvailable ? (
                        <button
                          type="button"
                          disabled={isDeleting || bulkDeleting}
                          onClick={() => handleDelete(row)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="Remove from device"
                        >
                          {(isDeleting || (bulkDeleting && selectedDeviceIds.has(row.device_id)))
                            ? <Loader2 className="w-4 h-4 animate-spin inline-block" />
                            : <X className="w-5 h-5 inline-block" strokeWidth={2.5} />}
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">{EM_DASH}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {errors.length > 0 && (
          <div className="px-6 py-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-t border-amber-200 dark:border-amber-500/30">
            {errors.length} device{errors.length === 1 ? "" : "s"} returned an error during probe.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
