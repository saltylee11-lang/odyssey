"use client";

import { useState, useEffect, useCallback } from "react";

interface Reminder {
  time: string;
  enabled: boolean;
}

export function useReminder() {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    // Load saved reminder
    const saved = localStorage.getItem("odyssey_reminder");
    if (saved) setReminder(JSON.parse(saved));
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, []);

  const saveReminder = useCallback(async (time: string, enabled: boolean) => {
    if (enabled && permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    const r: Reminder = { time, enabled };
    localStorage.setItem("odyssey_reminder", JSON.stringify(r));
    setReminder(r);

    if (enabled) {
      scheduleNotification(time);
    }
    return true;
  }, [permission, requestPermission]);

  const deleteReminder = useCallback(() => {
    localStorage.removeItem("odyssey_reminder");
    setReminder(null);
  }, []);

  // Check every minute if it's time to notify
  useEffect(() => {
    if (!reminder?.enabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const [h, m] = reminder.time.split(":").map(Number);
      if (now.getHours() === h && now.getMinutes() === m) {
        const today = new Date().toDateString();
        const lastSent = localStorage.getItem("odyssey_reminder_last_sent");
        if (lastSent !== today) {
          new Notification("奥德赛", {
            body: "此刻，你在想什么？",
            icon: "/favicon.ico",
          });
          localStorage.setItem("odyssey_reminder_last_sent", today);
        }
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [reminder]);

  return { reminder, permission, saveReminder, deleteReminder, requestPermission };
}

function scheduleNotification(time: string) {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const msUntilTarget = target.getTime() - now.getTime();
  // Schedule one-shot (browser will need to be open)
  setTimeout(() => {
    const today = new Date().toDateString();
    const lastSent = localStorage.getItem("odyssey_reminder_last_sent");
    if (lastSent !== today && Notification.permission === "granted") {
      new Notification("奥德赛", {
        body: "此刻，你在想什么？",
        icon: "/favicon.ico",
      });
      localStorage.setItem("odyssey_reminder_last_sent", today);
    }
  }, msUntilTarget);
}
