"use client";

import { useEffect } from "react";

export function useBrowserNotification(options = {}, autoTrigger = false) {
  const showNotification = (customOptions = {}) => {
    if (!("Notification" in window)) {
      console.warn("Browser does not support notifications");
      return;
    }

    if (Notification.permission !== "granted") {
      console.warn("Permission not granted");
      return;
    }

    const finalOptions = {
      title: customOptions.title || options.title || "Notification",
      body: customOptions.body || options.body || "",
      icon: customOptions.icon || options.icon || "/avatar-placeholder.png",
    };

    const notification = new Notification(finalOptions.title, {
      body: finalOptions.body,
      icon: finalOptions.icon,
    });

    notification.onclick = function () {
      window.focus();
      notification.close();
    };
  };

  useEffect(() => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (autoTrigger && Notification.permission === "granted") {
      showNotification();
    }
  }, []);

  return { showNotification };
}