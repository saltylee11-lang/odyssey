"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { useLocalDay } from "@/hooks/useLocalDay";

export function DayNumber({ birthdate }: { birthdate: string }) {
  const day = useLocalDay();
  return <strong>{day ? (differenceInCalendarDays(parseISO(day), parseISO(birthdate)) + 1).toLocaleString("en-US") : "…"}</strong>;
}
