'use client';

import { useEffect, useState } from 'react';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { createClient } from '@/lib/auth/client';

type Entry = { id: string; content: string; summary: string; created_at: string };
export type TimelineScope = { owner: string; birthday: string; revision: string };
const pageSize = 500;
const blockSize = 128;

async function readRange(scope: TimelineScope, first: number, last: number, markers: boolean) {
  const db = createClient();
  const birth = parseISO(scope.birthday);
  const start = addDays(birth, first - 1).toISOString(), end = addDays(birth, last).toISOString();
  const numbered = first === last ? `day_number.eq.${first}` : `and(day_number.gte.${first},day_number.lte.${last})`;
  // Older records without a day number follow the same local calendar as the ruler.
  const filter = `${numbered},and(day_number.is.null,created_at.gte.${start},created_at.lt.${end})`;
  const days = new Set<number>();
  const entries: Entry[] = [];
  let cursor: string | undefined;
  for (;;) {
    const table = db.from('journal_entries');
    let query = (markers ? table.select('id,day_number,created_at') : table.select('id,content,summary,created_at'))
      .eq('user_id', scope.owner).or(filter).order('id').limit(pageSize);
    if (cursor) query = query.gt('id', cursor);
    const { data: rows, error } = await query;
    if (error) throw error;
    for (const row of rows) {
      if ('day_number' in row) {
        days.add(row.day_number ?? differenceInCalendarDays(new Date(row.created_at), birth) + 1);
      } else {
        entries.push(row);
      }
    }
    if (rows.length < pageSize) break;
    cursor = rows[rows.length - 1].id;
  }
  return { days, entries: entries.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) };
}

type Result = Awaited<ReturnType<typeof readRange>>;
type Cached = { data?: Result; pending?: Promise<Result>; expires: number };
// In-tab only. The server issues a new revision after a route refresh or journal edit.
const records = new Map<string, Cached>();
function useRange(scope: TimelineScope, first: number, last: number, markers: boolean) {
  const { owner, birthday, revision } = scope;
  const key = [owner, birthday, revision, first, last, markers].join(':');
  const [errorKey, setErrorKey] = useState('');
  const [attempt, retry] = useState(0);
  const [, redraw] = useState(0);
  const visible = records.get(key)?.data;
  useEffect(() => {
    let active = true;
    function load() {
      let slot = records.get(key);
      if (slot?.data && slot.expires > Date.now()) {
        if (slot.data !== visible) redraw(n => n + 1);
        return;
      }
      if (!slot) {
        slot = { expires: 0 };
        records.set(key, slot);
        if (records.size > 64) records.delete(records.keys().next().value!);
      }
      const target = slot;
      target.pending ??= readRange({ owner, birthday, revision }, first, last, markers)
        .then(data => { target.data = data; target.expires = Date.now() + 60_000; return data; })
        .finally(() => { target.pending = undefined; });
      target.pending.then(() => { if (active) { setErrorKey(''); redraw(n => n + 1); } })
        .catch(() => { if (active) setErrorKey(key); });
    }
    // Ignore intermediate ticks during a fling. Cached dates render synchronously.
    const timer = setTimeout(load, !markers && !visible ? 60 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [key, owner, birthday, revision, first, last, markers, attempt, visible]);
  return { data: visible, failed: errorKey === key, retry: () => { setErrorKey(''); retry(n => n + 1); } };
}

export function useTimelineRecords(scope: TimelineScope, day: number) {
  const block = Math.floor((day - 1) / blockSize) * blockSize + 1;
  const markers = useRange(scope, Math.max(1, block - blockSize / 2), block + blockSize * 1.5 - 1, true);
  const selected = useRange(scope, day, day, false);
  return { markers, selected };
}
