"use client";
import { useSyncExternalStore } from "react";
import { format } from "date-fns";

function localDay() { return format(new Date(), 'yyyy-MM-dd'); }
function subscribeDay(update: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function schedule() {
    clearTimeout(timer);
    update();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    timer = setTimeout(schedule, midnight.getTime() - Date.now() + 50);
  }
  schedule();
  document.addEventListener('visibilitychange', schedule);
  return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
}

export function useLocalDay() {
  return useSyncExternalStore(subscribeDay, localDay, () => '');
}
