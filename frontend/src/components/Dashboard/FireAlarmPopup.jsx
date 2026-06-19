"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Power, ShieldAlert } from "lucide-react";
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
        className="fa-popup max-w-[480px] gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:max-w-[480px]"
      >
        {/* Scoped styling + animations so the component stays self-contained (no globals.css edits) */}
        <style>{FIRE_ALARM_STYLES}</style>

        {/* ---- Header ---- */}
        <DialogHeader className="fa-header-bar gap-0 px-5 py-3.5 text-left">
          <DialogTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              Fire Alarm Notification
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/20 px-2.5 py-1 backdrop-blur">
              <span className="fa-status-dot h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-[10px] font-bold tracking-[.12em]">ACTIVE</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* ---- Devices ---- */}
        <div className="max-h-[60vh] overflow-y-auto px-5 pt-5">
          {devices.map((device, i) => (
            <div
              key={device.id ?? i}
              className="border-t border-white/5 pb-5 pt-5 first:border-0 first:pt-0"
            >
              <div className="flex gap-4">
                {/* Real-fire tile: photo on black, screen-blended so only the flames show */}
                <div className="fa-fire-tile relative flex h-24 w-24 shrink-0 items-end justify-center overflow-hidden rounded-2xl">
                  <img
                    src="/real-fire.png"
                    alt=""
                    aria-hidden="true"
                    className="fa-fire-img w-auto object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Triggered at {formatAlarmTime(device.alarm_start_datetime)}</span>
                  </div>
                  <div className="mt-1.5 truncate text-3xl font-bold tracking-tight text-white">
                    {device.name ?? "—"}
                  </div>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-2.5 text-[13px]">
                <dt className="text-slate-400">Branch</dt>
                <dd className="font-medium text-slate-100">{device.branch?.branch_name ?? "—"}</dd>
                <dt className="text-slate-400">Location</dt>
                <dd className="font-medium text-slate-100">{device.branch?.location ?? "—"}</dd>
                <dt className="text-slate-400">Serial</dt>
                <dd className="font-mono text-slate-100">{device.serial_number ?? "—"}</dd>
              </dl>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleTurnOff(device)}
                  disabled={turningOff === device.serial_number}
                  className="fa-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  <span className="fa-shine" aria-hidden="true" />
                  <Power className="h-4 w-4 shrink-0" strokeWidth={2.6} />
                  {turningOff === device.serial_number ? "Turning off…" : "Turn Off Alarm"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ---- Footer ---- */}
        <div className="fa-footer mt-1 border-t border-white/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="fa-success-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
              <span className="fa-success-dot flex h-4 w-4 items-center justify-center rounded-full">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-[12px] font-medium">All branch doors opened</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Turn off the alarm on each device to close this popup.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Self-contained styling + animations for the real-fire popup, injected via
// <style> so the component needs no globals.css change. Colors use oklch to
// match the reference design.
const FIRE_ALARM_STYLES = `
  .fa-popup {
    background: oklch(0.18 0.03 260) !important;
    color: oklch(0.984 0.003 248);
    animation: faAlarmPulse 2.4s ease-in-out infinite;
  }
  @keyframes faAlarmPulse {
    0%, 100% { box-shadow: 0 0 0 0 oklch(0.62 0.22 25 / .55), 0 30px 80px -20px oklch(0.62 0.22 25 / .40); }
    50%      { box-shadow: 0 0 0 14px oklch(0.62 0.22 25 / 0),  0 40px 100px -20px oklch(0.62 0.22 25 / .55); }
  }
  .fa-header-bar {
    background: linear-gradient(110deg, oklch(0.55 0.22 25) 0%, oklch(0.62 0.24 30) 50%, oklch(0.58 0.23 20) 100%);
    background-size: 200% 200%;
    animation: faAlarmBar 4s ease-in-out infinite;
  }
  @keyframes faAlarmBar { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  .fa-status-dot { animation: faStatusBlink 1.2s ease-in-out infinite; }
  @keyframes faStatusBlink { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

  .fa-fire-tile {
    background: radial-gradient(circle at 50% 90%, oklch(0.45 0.18 35 / .7), oklch(0.14 0.04 30 / .95) 70%);
    border: 1px solid oklch(0.62 0.22 25 / .45);
    box-shadow: inset 0 -20px 40px -10px oklch(0.7 0.24 35 / .5), 0 0 30px -5px oklch(0.62 0.22 25 / .6);
  }
  .fa-fire-img {
    height: 130%;
    mix-blend-mode: screen;
    animation: faFlicker 1.4s ease-in-out infinite;
    filter: drop-shadow(0 0 14px oklch(0.7 0.24 35 / .9));
  }
  @keyframes faFlicker {
    0%, 100% { opacity: 1;   filter: drop-shadow(0 0 14px oklch(0.7 0.24 35 / .9)); transform: scale(1); }
    50%      { opacity: .92; filter: drop-shadow(0 0 24px oklch(0.75 0.24 45 / 1)); transform: scale(1.04); }
  }

  .fa-footer { background: oklch(0.22 0.03 260 / .6); }

  .fa-btn {
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, oklch(0.65 0.23 30), oklch(0.58 0.22 20));
    box-shadow: 0 10px 30px -8px oklch(0.62 0.22 25 / .6), inset 0 1px 0 oklch(1 0 0 / .25);
    transition: transform .15s ease;
  }
  .fa-btn:active { transform: scale(.98); }
  .fa-btn .fa-shine {
    position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent);
    transition: transform .7s ease;
  }
  .fa-btn:hover .fa-shine { transform: translateX(100%); }

  .fa-success-chip {
    background: color-mix(in oklab, oklch(0.72 0.17 160) 10%, transparent);
    border: 1px solid color-mix(in oklab, oklch(0.72 0.17 160) 30%, transparent);
    color: oklch(0.72 0.17 160);
  }
  .fa-success-dot { background: color-mix(in oklab, oklch(0.72 0.17 160) 25%, transparent); }

  @media (prefers-reduced-motion: reduce) {
    .fa-popup, .fa-header-bar, .fa-status-dot, .fa-fire-img { animation: none; }
  }
`;
