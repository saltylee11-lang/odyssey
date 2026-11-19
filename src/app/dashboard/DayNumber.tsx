"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { notesForDate } from "@/lib/calendar/annotations";
import { CalendarNotes } from "@/components/CalendarNotes";
import { useLocalDay } from "@/hooks/useLocalDay";

export function DayNumber({ birthdate }: { birthdate: string }) {
  const day = useLocalDay();
  const today = parseISO(day), birth = parseISO(birthdate);
  const notes = day ? notesForDate(today, birth) : [];
  return <>
    <h2>第 <strong>{day ? (differenceInCalendarDays(today, birth) + 1).toLocaleString("en-US") : "…"}</strong> 天</h2>
    <CalendarNotes notes={notes} />
  </>;
}
