"use client";

import { Wifi, WifiOff, Server, MapPin, RefreshCw, DoorOpen, DoorClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeviceHealthPanel({
  devices = [],
  openedDoors = {},
  onOpenDoor,
  onCloseDoor,
  onRefresh,
}) {
  const total = devices.length;
  const online = devices.filter((d) => d.status_id == 1).length;
  const uptime = total > 0 ? Math.round((online / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Server className="h-4.5 w-4.5 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Device Health</h3>
              <p className="text-[11px] text-muted-foreground">{online}/{total} online</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground tabular-nums">{uptime}%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime</p>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} title="Refresh device health">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div className="h-1 bg-success transition-all" style={{ width: `${uptime}%` }} />
        </div>
      </div>

      {/* Devices */}
      {devices.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          No devices registered.
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {devices.map((d) => {
            const isOnline = d.status_id == 1;
            const isOpen = !!openedDoors[d.device_id];
            const Icon = isOnline ? Wifi : WifiOff;
            return (
              <div
                key={d.device_id || d.id}
                className={cn(
                  "rounded-2xl border-2 bg-card px-4 py-4 transition-all duration-300",
                  isOpen
                    ? "border-destructive shadow-[0_0_18px_-2px_rgba(239,68,68,0.55)]"
                    : isOnline
                    ? "border-success/40 hover:border-success hover:shadow-[0_0_18px_-2px_rgba(34,197,94,0.45)]"
                    : "border-destructive/40 hover:border-destructive/70"
                )}
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full pulse-dot", isOnline ? "bg-success" : "bg-destructive")} />
                    <p className="truncate text-lg font-semibold text-foreground">{d.name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      isOnline ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    )}>
                      <Icon className="h-3 w-3" /> {isOnline ? "Online" : "Offline"}
                    </span>
                    <Icon className={cn("h-5 w-5", isOnline ? "text-success" : "text-destructive")} />
                  </div>
                </div>

                {/* Branch / location */}
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {d.branch?.branch_name || d.location || "—"}
                </p>

                {/* Door status pill (only when door is open) */}
                {isOpen && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-medium text-destructive">
                    <DoorOpen className="h-3 w-3" /> Door Open
                  </p>
                )}

                {/* Open / Close Door button */}
                {isOpen ? (
                  <button
                    onClick={() => onCloseDoor && onCloseDoor(d)}
                    className="mt-4 h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-destructive bg-destructive/15 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/25"
                  >
                    <DoorClosed className="h-4 w-4" /> Close Door
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenDoor && onOpenDoor(d)}
                    disabled={!isOnline}
                    title={isOnline ? "Send open door command" : "Device offline"}
                    className="mt-4 h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DoorOpen className="h-4 w-4" /> Open Door
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
