"use client";

import { useSyncExternalStore } from "react";
import { format } from "date-fns";

function subscribe(tick: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function sync() {
    clearTimeout(timer);
    if (document.hidden) return;
    tick();
    timer = setTimeout(sync, 1000 - Date.now() % 1000);
  }
  sync();
  document.addEventListener("visibilitychange", sync);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", sync);
  };
}

const localSecond = () => Math.floor(Date.now() / 1000);
const serverSecond = () => null;

export function EarthClock() {
  const second = useSyncExternalStore<number | null>(subscribe, localSecond, serverSecond);
  const date = second === null ? null : new Date(second * 1000);
  return <div className="earth-clock">
    <span>当前地球时</span>
    <time dateTime={date?.toISOString()} aria-live="off">{date ? format(date, "HH:mm:ss") : "––:––:––"}</time>
  </div>;
}
