"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { createClient } from "@/lib/auth/client";
import { getProfile } from "@/actions/profile";
import { getEntries, deleteEntry } from "@/actions/journal";
import { useToast } from "@/components/ui/Toast";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BottomNav } from "@/components/ui/BottomNav";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ name: string; birthdate: string } | null>(null);
  const [days, setDays] = useState(0);
  const [entries, setEntries] = useState<{ id: string; summary: string; content: string; createdAt: string }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);

  // API Key
  const [apiKey, setApiKey] = useState("");
  const [apiSaved, setApiSaved] = useState(false);
  const [apiEditing, setApiEditing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const apiKey = localStorage.getItem("odyssey_api_key") || "";
    setApiKey(apiKey);

    async function load() {
      try {
        const profile = await getProfile();
        if (!profile) { router.push("/"); return; }
        setProfile(profile);
        const birth = new Date(profile.birthdate);
        const dayNum = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setDays(dayNum);

        const entriesData = await getEntries(5);
        setEntries(entriesData.map((e) => ({
          id: e.id,
          summary: e.summary,
          content: e.content,
          createdAt: e.createdAt.toISOString(),
        })));
        setShowOriginal(localStorage.getItem("show_original") === "true");
      } catch {
        // If server action fails, check auth
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (!mounted) return null;

  const today = format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN });

  return (
    <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="text-center py-8">
        <p className="text-slate-500 text-sm">{today}</p>
        <h1 className="text-lg text-slate-500 mt-1">
          你好，<span className="text-slate-800 font-semibold">{profile?.name}</span>
        </h1>
        <div className="mt-6">
          <p className="text-6xl font-bold text-slate-800">{days.toLocaleString()}</p>
          <p className="text-slate-400 mt-2 text-sm">这是你在世上的第 {days.toLocaleString()} 天</p>
        </div>
      </div>

      {/* Quick action */}
      <Link href="/journal/new" className="block w-full py-4 text-center bg-indigo-500/85 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-indigo-600/85 transition-colors cursor-pointer mb-3">
        此刻你在想什么？
      </Link>

      {apiKey && (
        <Link href="/journal/new?mode=guided" className="block w-full py-3 text-center text-indigo-500 bg-indigo-50/50 backdrop-blur-sm border border-indigo-100/60 font-medium rounded-xl hover:bg-indigo-100/60 transition-colors cursor-pointer mb-8">
          深入对话
        </Link>
      )}
      {!apiKey && (
        <div className="mb-8 h-1" />
      )}

      {/* API Key */}
      <GlassCard className="mb-8 p-4">
        <p className="text-sm text-slate-500 mb-2">连接密钥</p>
        {!apiEditing && apiKey ? (
          <div className="flex gap-2">
            <Input glass type="password" value={apiKey} disabled className="flex-1 text-slate-400" />
            <Button variant="secondary" onClick={() => setApiEditing(true)} className="px-4 py-2">编辑</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              glass type="password" placeholder="sk-..."
              value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => {
                localStorage.setItem("odyssey_api_key", apiKey);
                setApiSaved(true); setApiEditing(false);
                setTimeout(() => setApiSaved(false), 2000);
              }}
              className="px-4 py-2"
            >
              {apiSaved ? "已保存" : "保存"}
            </Button>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">密钥仅保存在本地浏览器中，不会上传到任何服务器</p>
      </GlassCard>

      {/* Recent entries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-medium text-slate-700">最近记录</h2>
            {entries.length > 0 && (
              <button
                onClick={() => {
                  const next = !showOriginal;
                  setShowOriginal(next);
                  localStorage.setItem("show_original", String(next));
                }}
                className="text-xs text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
              >
                {showOriginal ? "显示摘要" : "显示原文"}
              </button>
            )}
          </div>
          {entries.length > 0 && (
            <Link href="/timeline" className="text-sm text-slate-400 hover:text-slate-600">查看全部</Link>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon="📝" title="还没有记录" description="点击上方按钮，开始你的第一条记录" />
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className="group relative">
                <Link href={`/journal/${entry.id}`}
                  className="block p-4 pr-10 backdrop-blur-xl bg-white/50 border border-white/60 rounded-2xl shadow-sm hover:bg-white/70 transition-colors">
                  <p className={`text-sm line-clamp-2 leading-relaxed ${(!showOriginal && !entry.summary) ? "text-slate-400" : ""}`}>
                    {showOriginal ? entry.content : (entry.summary || entry.content.slice(0, 60) + "...")}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(entry.createdAt), "M月d日 HH:mm")}
                  </p>
                </Link>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!confirm("确认删除这条记录？")) return;
                    try {
                      await deleteEntry(entry.id);
                      setEntries((prev) => prev.filter((x) => x.id !== entry.id));
                      toast("已删除", "success");
                    } catch {
                      toast("删除失败", "error");
                    }
                  }}
                  className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
