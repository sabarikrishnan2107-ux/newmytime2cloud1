"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlarmClock, Flame } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAlarmNotifications,
  getAlarmSoundUrl,
  turnOffDeviceAlarm,
} from "@/lib/api";

const POLL_INTERVAL_MS = 15000;

// Same format as the old panel's $dateFormat.format5: "HH:mm Wkd, Mon DD, YYYY"
const formatAlarmTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  return `${time} ${date}`;
};

/**
 * Fire-alarm popup. Polls get_notifications_alarm every 15s and shows a
 * non-dismissible dialog while any device has alarm_status = 1. The only way
 * to close it is to turn off the alarm on each device (matches the old panel).
 */
export default function FireAlarmPopup() {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [turningOff, setTurningOff] = useState(null);
  const audioRef = useRef(null);
  const inFlight = useRef(false);

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(getAlarmSoundUrl());
        audioRef.current.loop = true;
      }
      // Browsers block autoplay until the user interacts with the page —
      // swallow the rejection so it never bubbles as an unhandled error.
      audioRef.current.play().catch(() => {});
    } catch {
      /* ignore audio failures */
    }
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const checkAlarms = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await getAlarmNotifications();
      if (Array.isArray(data) && data.length > 0) {
        setDevices(data);
        setOpen(true);
        playSound();
      } else {
        setDevices([]);
        setOpen(false);
        stopSound();
      }
    } catch {
      /* network hiccup — retry on next tick */
    } finally {
      inFlight.current = false;
    }
  }, [playSound, stopSound]);

  useEffect(() => {
    checkAlarms();
    const id = setInterval(checkAlarms, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      stopSound();
    };
  }, [checkAlarms, stopSound]);

  const handleTurnOff = async (device) => {
    if (!device?.serial_number) return;
    if (!window.confirm("Are you sure you want to TURN OFF the Alarm?")) return;
    setTurningOff(device.serial_number);
    try {
      await turnOffDeviceAlarm(device.serial_number);
      await checkAlarms();
    } catch {
      /* keep popup open; user can retry */
    } finally {
      setTurningOff(null);
    }
  };

  if (!open || devices.length === 0) return null;

  return (
    // Non-dismissible: onOpenChange is a no-op, so Esc / overlay clicks won't
    // close it. The alarm clears only when every device is turned off.
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl p-0 overflow-hidden border-2 border-red-500"
      >
        <DialogHeader className="bg-red-600 px-6 py-4">
          <DialogTitle className="flex items-center justify-center gap-2 text-center text-lg font-bold text-white">
            <Flame className="h-6 w-6" />
            Attention: Fire Alarm Notification
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">
          {devices.map((device, i) => (
            <div
              key={device.id ?? i}
              className="flex items-start gap-4 border-b border-gray-100 pb-4 last:border-0 dark:border-slate-700"
            >
              <Flame className="h-12 w-12 shrink-0 animate-pulse text-red-500" />
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Fire Alarm Triggered at: {formatAlarmTime(device.alarm_start_datetime)}
                </div>
                <div className="mt-2 grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
                  <div className="space-y-1 text-sm font-semibold text-gray-700 sm:col-span-2 dark:text-gray-200">
                    <div>Device Name: {device.name ?? "—"}</div>
                    <div>Branch Name: {device.branch?.branch_name ?? "—"}</div>
                    <div>Device Location: {device.branch?.location ?? "—"}</div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <AlarmClock className="h-10 w-10 animate-pulse text-red-500" />
                    <button
                      type="button"
                      onClick={() => handleTurnOff(device)}
                      disabled={turningOff === device.serial_number}
                      className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {turningOff === device.serial_number ? "Turning off…" : "Turn OFF Alarm"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="text-sm">
            <div className="font-medium text-green-600">
              Note: All Branch Level Doors are Opened
            </div>
            <p className="mt-1 text-gray-500">
              Turn off the alarm on each device to close this popup.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
