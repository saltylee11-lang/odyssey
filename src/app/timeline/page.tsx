"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { createClient } from "@/lib/auth/client";
import { getProfile } from "@/actions/profile";
import { getEntries } from "@/actions/journal";
import { BottomNav } from "@/components/ui/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";

const TICK_WIDTH = 10;
const TICK_HEIGHT_SMALL = 14;
const TICK_HEIGHT_TALL = 44;
const VISIBLE_DAYS = 40;
const BUFFER_DAYS = 80; // render buffer on each side

interface EntryData {
  id: string;
  summary: string;
  content: string;
  dayNumber: number;
  createdAt: string;
  tags: string[];
}

export default function Timeline() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [profile, setProfile] = useState<{ name: string; birthdate: string } | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<EntryData[]>([]);
  const todayDayNum = useRef(0);
  const selectedDayRef = useRef(0);
  const isAutoScrolling = useRef(false);

  // Visible range for virtualization
  const [visStart, setVisStart] = useState(0);
  const [visEnd, setVisEnd] = useState(100);

  const entriesByDay = useRef<Map<number, EntryData[]>>(new Map());

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const profile = await getProfile();
        if (!profile) { router.push("/"); return; }
        setProfile(profile);

        const bd = new Date(profile.birthdate);
        const today = new Date();
        const dayNum = Math.floor((today.getTime() - bd.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(dayNum);
        todayDayNum.current = dayNum;

        const allEntries = await getEntries(500);
        const map = new Map<number, EntryData[]>();
        for (const e of allEntries) {
          const dayNumber = (e as any).dayNumber ?? Math.floor(
            (new Date(e.createdAt as string).getTime() - bd.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;
          if (!map.has(dayNumber)) map.set(dayNumber, []);
          map.get(dayNumber)!.push({
            id: e.id, summary: e.summary, content: e.content,
            dayNumber, createdAt: (e as any).createdAt ?? e.createdAt,
            tags: e.tags ?? [],
          });
        }
        entriesByDay.current = map;

        // Set visible range around today
        const start = Math.max(1, dayNum - BUFFER_DAYS);
        const end = dayNum + BUFFER_DAYS;
        setVisStart(start);
        setVisEnd(end);
      } catch {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // Auto-scroll to today + init selected day/entries
  useEffect(() => {
    if (!loading && totalDays > 0 && scrollRef.current) {
      // Wait for layout to complete before scroll (production needs this)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!scrollRef.current) return;
          const viewWidth = scrollRef.current.clientWidth;
          const targetLeft = (totalDays + VISIBLE_DAYS) * TICK_WIDTH - viewWidth / 2;
          isAutoScrolling.current = true;
          scrollRef.current.scrollTo({ left: Math.max(0, targetLeft), behavior: "instant" });
          selectedDayRef.current = totalDays;
          setSelectedDay(totalDays);
          setSelectedEntries(entriesByDay.current.get(totalDays) ?? []);
          setTimeout(() => { isAutoScrolling.current = false; }, 800);
        });
      });
    }
  }, [loading, totalDays]);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (!scrollRef.current || isAutoScrolling.current) return;
      const scrollLeft = scrollRef.current.scrollLeft;
      const viewWidth = scrollRef.current.clientWidth;
      const centerScroll = scrollLeft + viewWidth / 2;
      const dayIdx = Math.round(centerScroll / TICK_WIDTH - VISIBLE_DAYS);

      if (dayIdx !== selectedDayRef.current) {
        selectedDayRef.current = dayIdx;
        setSelectedDay(dayIdx);
        setSelectedEntries(entriesByDay.current.get(dayIdx) ?? []);
        if (navigator.vibrate && entriesByDay.current.has(dayIdx)) {
          navigator.vibrate(5);
        }
      }

      // Update visible range (with larger threshold to minimize re-renders)
      const startVisible = Math.max(1, Math.floor((scrollLeft / TICK_WIDTH) - VISIBLE_DAYS - BUFFER_DAYS));
      const endVisible = Math.ceil(((scrollLeft + viewWidth) / TICK_WIDTH) + BUFFER_DAYS);
      setVisStart((prev) => Math.abs(prev - startVisible) > 50 ? startVisible : prev);
      setVisEnd((prev) => Math.abs(prev - endVisible) > 50 ? endVisible : prev);
    });
  }, []);

  if (!mounted) return null;

  const birthdate = profile ? new Date(profile.birthdate) : new Date();
  const today = new Date();
  const MAX_DAY = 30000;
  const totalWidth = (Math.max(totalDays + 10000, MAX_DAY) + VISIBLE_DAYS * 2) * TICK_WIDTH;

  function jumpToDay(target: number) {
    if (isNaN(target) || target < 1 || !scrollRef.current) return;
    const viewWidth = scrollRef.current.clientWidth;
    const targetLeft = (target + VISIBLE_DAYS) * TICK_WIDTH - viewWidth / 2;
    isAutoScrolling.current = true;
    scrollRef.current.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    selectedDayRef.current = target;
    setSelectedDay(target);
    setSelectedEntries(entriesByDay.current.get(target) ?? []);
    setTimeout(() => { isAutoScrolling.current = false; }, 800);
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full h-dvh overflow-hidden" style={{ overscrollBehavior: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">← 返回</Link>
        <h1 className="font-medium text-slate-700">时间轴</h1>
        <div className="w-8" />
      </div>

      {/* Day counter */}
      <div className="text-center py-4 flex-shrink-0">
        <p className="text-4xl font-bold text-slate-800">{selectedDay ?? totalDays}</p>
        <p className="text-xs text-slate-400 mt-1">
          {selectedDay != null
            ? format(new Date(birthdate.getTime() + (selectedDay - 1) * 86400000), "yyyy年M月d日 EEEE", { locale: zhCN })
            : format(today, "yyyy年M月d日 EEEE", { locale: zhCN })
          }
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).jumpDay as HTMLInputElement;
            const target = parseInt(input.value, 10);
            jumpToDay(target);
            input.value = "";
          }}
          className="mt-2 flex items-center justify-center gap-1"
        >
          <span className="text-xs text-slate-300">跳转到第</span>
          <input
            name="jumpDay"
            type="number"
            min={1}
            placeholder={`${totalDays}`}
            className="w-16 text-center text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white/50 focus:outline-none focus:border-indigo-300"
          />
          <span className="text-xs text-slate-300">天</span>
          <button
            type="button"
            onClick={() => jumpToDay(totalDays)}
            className="ml-2 text-xs text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            今天
          </button>
        </form>
      </div>

      {/* Ruler axis */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="w-full h-20 rounded-none" />
        </div>
      ) : (
        <div className="relative flex-shrink-0" style={{ height: 80 }}>
          {/* Center indicator */}
          <div
            className="absolute top-0 bottom-0 left-1/2 w-px z-10 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.3) 30%, rgba(99,102,241,0.5) 100%)",
              boxShadow: "0 0 8px rgba(99,102,241,0.15)",
            }}
          />

          <div
            ref={scrollRef}
            className="w-full h-full overflow-x-auto no-scrollbar"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              willChange: "scroll-position",
              touchAction: "pan-x",
            }}
            onScroll={handleScroll}
          >
            <div className="relative h-full" style={{ width: totalWidth }}>
              {/* Only render visible ticks */}
              {Array.from({ length: visEnd - visStart + 1 }, (_, i) => {
                const dayIdx = visStart + i;
                const hasEntries = entriesByDay.current.has(dayIdx);
                const isToday = dayIdx === todayDayNum.current;
                const isSelected = dayIdx === selectedDayRef.current;
                const tickHeight = hasEntries ? TICK_HEIGHT_TALL : TICK_HEIGHT_SMALL;

                const LABEL_Y = 4; // labels sit near bottom of container

                return (
                  <div
                    key={dayIdx}
                    className="absolute"
                    style={{
                      left: (dayIdx + VISIBLE_DAYS) * TICK_WIDTH,
                      bottom: 0,
                      scrollSnapAlign: "center",
                    }}
                  >
                    {/* Day label at fixed position */}
                    {dayIdx % 10 === 0 && (
                      <span
                        className="absolute text-[9px] whitespace-nowrap"
                        style={{
                          bottom: LABEL_Y,
                          left: "50%",
                          transform: "translateX(-50%)",
                          color: isSelected ? "#6366f1" : "#cbd5e1",
                        }}
                      >
                        {dayIdx}
                      </span>
                    )}
                    {/* Tick mark — grows up from above label */}
                    <div
                      className="transition-all duration-150"
                      style={{
                        position: "absolute",
                        width: isToday && !isSelected ? 2.5 : 2,
                        height: tickHeight,
                        bottom: LABEL_Y + 14,
                        left: "50%",
                        marginLeft: -1,
                        background: isToday || isSelected
                          ? "linear-gradient(180deg, #818cf8, #6366f1)"
                          : hasEntries
                          ? "#c7d2fe"
                          : "#e2e8f0",
                        borderRadius: "1px 1px 0 0",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selected day entries */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Skeleton className="w-3/4 h-4 rounded" />
            <Skeleton className="w-1/2 h-4 rounded" />
          </div>
        ) : selectedDay === null || selectedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm text-slate-300">
              {selectedDay != null && selectedDay > totalDays
                ? "未来的日子，还没有到来"
                : "这一天还没有记录"}
            </p>
            {selectedDay != null && selectedDay <= totalDays && (
              <Link
                href="/journal/new"
                className="text-sm text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                添加记录
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            {selectedEntries.map((entry) => (
              <Link
                key={entry.id}
                href={`/journal/${entry.id}`}
                className="block p-4 backdrop-blur-xl bg-white/45 border border-white/50 rounded-2xl shadow-sm hover:bg-white/65 transition-colors"
              >
                <p className={`text-sm line-clamp-2 ${!entry.summary ? "text-slate-500" : "font-medium text-slate-700"}`}>
                  {entry.summary || entry.content.slice(0, 80) + (entry.content.length > 80 ? "..." : "")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-slate-400">
                    {format(new Date(entry.createdAt), "HH:mm")}
                  </p>
                  {entry.tags?.length > 0 && (
                    <div className="flex gap-1">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 pt-2 flex-shrink-0">
        <BottomNav />
      </div>
    </main>
  );
}
