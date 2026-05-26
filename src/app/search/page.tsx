"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { searchEntries } from "@/actions/journal";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; summary: string; content: string; createdAt: Date | string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const entries = await searchEntries(q.trim());
      setResults(entries);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  return (
    <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">
      <PageHeader title="搜索" />

      <Input
        glass
        type="search"
        placeholder="搜索你的记录..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-6"
        autoFocus
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : searched && results.length === 0 ? (
        <EmptyState icon="🔍" title="未找到记录" description="试试其他关键词" />
      ) : results.length > 0 ? (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {results.map((entry) => (
            <Link key={entry.id} href={`/journal/${entry.id}`}>
              <GlassCard className="p-4 hover:bg-white/70 transition-colors">
                <p className="text-sm font-medium line-clamp-1">{entry.summary}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{entry.content}</p>
                <p className="text-xs text-slate-300 mt-1">
                  {format(
                    new Date(
                      typeof entry.createdAt === "string"
                        ? entry.createdAt
                        : entry.createdAt.toISOString()
                    ),
                    "M月d日 HH:mm"
                  )}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
      ) : null}

    </main>
  );
}
