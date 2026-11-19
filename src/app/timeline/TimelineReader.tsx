"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useLocalDay } from "@/hooks/useLocalDay";
import { useTimelineRecords, type TimelineScope } from "./useTimelineRecords";
import { CalendarNotes } from "@/components/CalendarNotes";
import { notesForDate } from "@/lib/calendar/annotations";
import { Skeleton } from "@/components/ui/Skeleton";
import styles from "./timeline.module.css";

const DAY_SPACING = 12;
const BUFFER_DAYS = 64;

export function TimelineReader({ scope }: { scope: TimelineScope }) {
  const localDay = useLocalDay();
  const params = useSearchParams();
  if (!localDay) return <Skeleton className="w-full h-20 mt-8" />;
  const birthdate = parseISO(scope.birthday);
  const today = differenceInCalendarDays(parseISO(localDay), birthdate) + 1;
  const lastDay = Math.max(30_000, today + 10_000);
  const target = Number(params.get("day"));
  const initialDay = Number.isInteger(target) && target > 0 && target <= lastDay ? target : today;
  return <Timeline key={scope.owner + ':' + initialDay} scope={scope} birthdate={birthdate} today={today} lastDay={lastDay} initialDay={initialDay} />;
}

function dayAtOffset(offset: number, lastDay: number) {
  return Math.min(lastDay, Math.max(1, Math.round(offset / DAY_SPACING) + 1));
}

function milestone(day: number) {
  if (day % 1000 === 0) return "thousand";
  if (day % 100 === 0) return "hundred";
}

function Timeline({ scope, birthdate, today, lastDay, initialDay }: {
  scope: TimelineScope; birthdate: Date; today: number; lastDay: number; initialDay: number;
}) {
  const [day, setDay] = useState(initialDay);
  const ruler = useRef<HTMLDivElement>(null);
  const date = addDays(birthdate, day - 1);
  const notes = notesForDate(date, birthdate);
  const dateLabel = format(date, "yyyy年M月d日 EEEE", { locale: zhCN });
  const distance = (lastDay - 1) * DAY_SPACING;
  const firstVisible = Math.max(1, day - BUFFER_DAYS);
  const lastVisible = Math.min(lastDay, day + BUFFER_DAYS);
  const { selected, markers } = useTimelineRecords(scope, day);
  const selectedEntries = selected.data?.entries;

  function jump(target: number) {
    if (!Number.isInteger(target) || target < 1 || target > lastDay) return;
    ruler.current?.scrollTo({ left: (target - 1) * DAY_SPACING, behavior: "instant" });
    setDay(target);
  }

  useLayoutEffect(() => {
    const scroller = ruler.current!;
    scroller.scrollLeft = (initialDay - 1) * DAY_SPACING;
    let timer: ReturnType<typeof setTimeout>;
    let touching = false;
    const nativeScrollEnd = Reflect.has(scroller, "onscrollend");

    function snap() {
      if (touching) return;
      const nearest = dayAtOffset(scroller.scrollLeft, lastDay);
      const left = (nearest - 1) * DAY_SPACING;
      if (Math.abs(scroller.scrollLeft - left) > 0.01) scroller.scrollLeft = left;
      setDay(nearest);
    }
    function onScroll() {
      setDay(dayAtOffset(scroller.scrollLeft, lastDay));
      if (!nativeScrollEnd) {
        clearTimeout(timer);
        timer = setTimeout(snap, 150);
      }
    }
    function startTouch() { touching = true; clearTimeout(timer); }
    function endTouch() { touching = false; clearTimeout(timer); timer = setTimeout(snap, 180); }
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", snap);
    if (!nativeScrollEnd) {
      scroller.addEventListener("touchstart", startTouch, { passive: true });
      scroller.addEventListener("touchend", endTouch);
      scroller.addEventListener("touchcancel", endTouch);
    }
    return () => {
      clearTimeout(timer);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", snap);
      scroller.removeEventListener("touchstart", startTouch);
      scroller.removeEventListener("touchend", endTouch);
      scroller.removeEventListener("touchcancel", endTouch);
    };
  }, [initialDay, lastDay]);

  return (
    <>
      <div className={styles.selection}>
        <p className={styles.day} data-milestone={milestone(day)}>{day}</p>
        <p className={styles.date}>{dateLabel}</p>
        <div className={styles.notes}><CalendarNotes notes={notes} /></div>
        <form className={styles.jump} onSubmit={event => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem("jumpDay") as HTMLInputElement;
          jump(input.valueAsNumber);
          input.value = "";
        }}>
          <label htmlFor="jumpDay">跳转到第</label>
          <input id="jumpDay" name="jumpDay" type="number" inputMode="numeric" min={1} max={lastDay}
            required placeholder={String(today)} />
          <span>天</span>
          <button type="submit">前往</button>
          <button type="button" onClick={() => jump(today)}>今天</button>
        </form>
      </div>

      <div className={styles.ruler}>
        <div className={styles.indicator} aria-hidden="true" />
        <div ref={ruler} className={styles.scroller} role="slider" tabIndex={0}
          aria-label="按天浏览日记" aria-valuemin={1} aria-valuemax={lastDay} aria-valuenow={day} aria-valuetext={[dateLabel, ...notes.map(note => note.label)].join("，")}
          onKeyDown={event => {
            const targets: Record<string, number> = {
              ArrowLeft: day - 1, ArrowRight: day + 1, ArrowDown: day - 1, ArrowUp: day + 1,
              Home: 1, End: lastDay, PageDown: day - 10, PageUp: day + 10,
            };
            if (event.key in targets) {
              event.preventDefault();
              jump(Math.min(lastDay, Math.max(1, targets[event.key])));
            }
          }}
          onClick={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            jump(dayAtOffset(event.currentTarget.scrollLeft + event.clientX - rect.left - rect.width / 2, lastDay));
          }}>
          <div className={styles.track} style={{ width: `calc(100% + ${distance}px)` }}>
            <div className={styles.scale} style={{ width: distance }}>
              {Array.from({ length: lastVisible - firstVisible + 1 }, (_, index) => {
                const tick = firstVisible + index;
                const tickNotes = tick === day ? notes : notesForDate(addDays(birthdate, tick - 1), birthdate);
                return <div key={tick} data-milestone={milestone(tick)} data-calendar={tickNotes[0]?.kind}
                  title={tickNotes.length ? tickNotes.map(note => note.label).join(" · ") : undefined} data-day={tick} className={styles.tick} aria-hidden="true"
                  data-entry={markers.data?.days.has(tick) || (tick === day && !!selectedEntries?.length)} data-selected={day === tick} data-today={today === tick}
                  style={{ left: (tick - 1) * DAY_SPACING }}>
                  <i />
                  {tick % 10 === 0 && <span>{tick}</span>}
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>

      {markers.failed && <div className={styles.empty}><button onClick={markers.retry}>重新读取日期标记</button></div>}
      <section className={styles.entries} aria-label="当天的日记">
        {selected.failed ? <div className={styles.empty}><p>这一天的日记暂时无法读取</p><button onClick={selected.retry}>重试</button></div>
          : !selectedEntries ? <p className={styles.empty} role="status">正在读取当天的日记…</p>
          : selectedEntries.length ? selectedEntries.map(entry => (
          <Link href={`/journal/${entry.id}`} key={entry.id} className={styles.card}>
            {entry.summary && entry.content && entry.summary !== entry.content && <p className={styles.summary}>{entry.summary}</p>}
            <p className={styles.body}>{entry.content || entry.summary}</p>
            <time dateTime={entry.created_at}>{format(new Date(entry.created_at), day === today ? "HH:mm" : "M月d日 HH:mm")}</time>
          </Link>
        )) : (
          <div className={styles.empty}>
            <p>{day > today ? "未来的日子，还没有到来" : "这一天还没有记录"}</p>
            {day <= today && <Link href={`/journal/new?day=${day}`}>添加记录</Link>}
          </div>
        )}
      </section>
    </>
  );
}
