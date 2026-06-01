"use client";

import React, { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DropDown from "@/components/ui/DropDown";
import DateRangeSelect from "@/components/ui/DateRange";
import { getMissingLogsDeviceList, getMissingAttendanceLogs } from "@/lib/api";
import { formatDateDubai, notify, parseApiError } from "@/lib/utils";

/**
 * Missing Device Logs — re-pulls attendance logs that a device failed to push
 * for a given date. For MYTIME1 (face) devices the device streams the recovered
 * logs back over MQTT, so we subscribe and append rows live.
 * Ported from the old Vue `missingrecords.vue`.
 */
export default function MissingLogsModal({ open, onClose }) {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [date, setDate] = useState(formatDateDubai(new Date()));

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [rows, setRows] = useState([]);

  const mqttClientRef = useRef(null);
  const processedRef = useRef(new Set()); // prevent duplicate rows from MQTT

  const cleanupMqtt = () => {
    if (mqttClientRef.current) {
      mqttClientRef.current.end(true);
      mqttClientRef.current = null;
    }
  };

  // Load device list when the dialog opens.
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const data = await getMissingLogsDeviceList();
        if (!active) return;
        // DropDown matches by `id`; devices are keyed by `device_id`.
        setDevices(
          (Array.isArray(data) ? data : []).map((d) => ({
            ...d,
            id: d.device_id,
            name: d.name,
          }))
        );
      } catch (error) {
        notify("Error", parseApiError(error), "error");
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  // Reset transient state + close MQTT whenever the dialog is closed.
  useEffect(() => {
    if (!open) {
      cleanupMqtt();
      setMessage("");
      setErrors({});
      setRows([]);
      processedRef.current = new Set();
    }
    return () => cleanupMqtt();
  }, [open]);

  const subscribeToDevice = (selectedDevice) => {
    const MQTT_WS_URL = process.env.NEXT_PUBLIC_MQTT_WS_URL;
    if (!MQTT_WS_URL) {
      console.warn("NEXT_PUBLIC_MQTT_WS_URL is not configured");
      return;
    }

    cleanupMqtt();

    const client = mqtt.connect(MQTT_WS_URL, {
      clientId: `missing_logs_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
    });
    mqttClientRef.current = client;

    const topic = `mqtt/face/${deviceId}/recods/missinglogs`;

    client.on("connect", () => {
      client.subscribe(topic);
      setMessage("Finding missing logs. Please wait ..... ");
    });

    client.on("message", (_topic, buffer) => {
      let payload;
      try {
        payload = JSON.parse(buffer.toString());
      } catch (e) {
        return;
      }
      if (payload.message !== "success") return;

      const row = {
        UserID: payload.UserID || "",
        LogTime: payload.LogTime || "",
        SerialNumber: payload?.device?.id || "",
        message: payload.message || "",
      };

      const uniqueKey = `${row.SerialNumber}-${row.UserID}-${row.LogTime}`;
      if (processedRef.current.has(uniqueKey)) return;
      processedRef.current.add(uniqueKey);

      setRows((prev) => [row, ...prev]);
      setMessage("Finding missing logs. Please wait ..... ");
    });

    client.on("error", (err) => {
      console.error("MQTT error:", err?.message);
    });

    // The device finishes streaming after a short window.
    setTimeout(() => setMessage("Reading missing logs. Completed"), 1000 * 10);
  };

  const getMissingLogs = async () => {
    setMessage("");

    if (!deviceId) {
      setErrors({ device_id: ["The Device field is required."] });
      return;
    }
    if (!date) {
      setErrors({ date: ["The date field is required."] });
      return;
    }
    setErrors({});

    setLoading(true);
    setRows([]);
    processedRef.current = new Set();
    setMessage("Finding missing logs. Please wait ..... ");

    try {
      const data = await getMissingAttendanceLogs({ device_id: deviceId, date });

      if (data.status === 120) {
        setMessage(`${data.message} `);
      } else if (data.status !== 200) {
        setMessage(`${data.message} . Try again`);
      } else {
        let msg = data.message || "";
        const updated = Array.isArray(data.updated_records) ? data.updated_records : [];
        if (updated.length === 0) {
          msg += ". All Attendance logs are upto date";
        } else {
          msg += `. Total Updated Missing logs count is ${updated.length}`;
        }
        setMessage(msg);
        setRows(updated);
      }

      // MYTIME1 (face) devices stream recovered logs back over MQTT.
      const selected = devices.find((d) => d.device_id === deviceId);
      if (selected?.model_number === "MYTIME1") {
        subscribeToDevice(selected);
      }
    } catch (error) {
      setMessage("");
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="min-w-[720px] max-w-[720px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-primary text-white">
          <DialogTitle className="text-base font-semibold">
            Missing Device Logs
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Select Device
              </label>
              <DropDown
                placeholder="Device Name"
                items={devices}
                value={deviceId}
                onChange={setDeviceId}
                width="w-[280px]"
              />
              {errors.device_id && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.device_id[0]}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Select Date
              </label>
              <DateRangeSelect
                value={{ from: date, to: date }}
                single
                numberOfMonths={1}
                onChange={({ from, to }) => {
                  const picked = from || to;
                  setDate(picked ? formatDateDubai(picked) : "");
                }}
              />
              {errors.date && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.date[0]}
                </span>
              )}
            </div>

            <button
              onClick={getMissingLogs}
              disabled={loading}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Submit
            </button>
          </div>

          {/* Status message */}
          {message && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              Message: {message}
            </div>
          )}

          {/* Results */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Employee Id</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">SerialNumber</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item, index) => (
                    <tr
                      key={`${item.SerialNumber}-${item.UserID}-${item.LogTime}-${index}`}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{item.UserID}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{item.LogTime}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{item.SerialNumber}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{item.message || "Success"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
