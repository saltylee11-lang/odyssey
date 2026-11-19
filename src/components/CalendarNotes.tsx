import type { CalendarNote } from "@/lib/calendar/annotations";

export function CalendarNotes({ notes }: { notes: CalendarNote[] }) {
  if (!notes.length) return null;
  return <div className="calendar-notes" role="group" aria-label="当天标注">
    {notes.map(note => <span key={note.kind + note.label} data-kind={note.kind}>{note.label}</span>)}
  </div>;
}
