"use client";

import { useCallback, useEffect, useRef } from "react";
import { useBrowserNotification } from "@/hooks/useBrowserNotification";
import { useLiveAttendance } from "@/context/LiveAttendanceContext";

export default function LiveAttendanceNotifier() {
  const { showNotification } = useBrowserNotification();
  const { lastAttendanceEvent } = useLiveAttendance();
  const seenEventsRef = useRef(new Map());

  const showAttendanceNotification = useCallback(
    (event) => {
      if (!event) return;
      const {
        eventId,
        personName,
        customId,
        time,
        profile_picture,
        pic,
        punctuality,
        actionText,
      } = event;

      if (!personName || !time) return;

      const readableAction = actionText || `punched ${punctuality || "On Time"}`;
      const dedupeKey =
        eventId || `${customId || "--"}-${personName}-${time}-${readableAction}`;
      const now = Date.now();
      const dedupeWindowMs = 60 * 1000;
      const lastShownAt = seenEventsRef.current.get(dedupeKey);
      const isRecentDuplicate =
        typeof lastShownAt === "number" && now - lastShownAt < dedupeWindowMs;

      if (isRecentDuplicate) return;

      seenEventsRef.current.set(dedupeKey, now);

      if (seenEventsRef.current.size > 200) {
        for (const [key, shownAt] of seenEventsRef.current) {
          if (now - shownAt > dedupeWindowMs) {
            seenEventsRef.current.delete(key);
          }
        }
      }

      // Browser-level notification still fires (only when tab is unfocused),
      // but we no longer show the in-page toast which was covering the UI.
      showNotification({
        title: "Attendance Notification",
        body: `${personName} ${readableAction} at ${time}`,
        icon: profile_picture || pic,
      });
    },
    [showNotification],
  );

  useEffect(() => {
    if (!lastAttendanceEvent) return;
    showAttendanceNotification(lastAttendanceEvent);
  }, [lastAttendanceEvent, showAttendanceNotification]);

  return null;
}
