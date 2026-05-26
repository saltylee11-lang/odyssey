"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { createClient } from "@/lib/auth/client";
import { getProfile } from "@/actions/profile";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; birthdate: string } | null>(null);
  const [days, setDays] = useState(0);
  const [mounted, setMounted] = useState(false);

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
      } catch {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) router.push("/");
      }
    }
    load();
  }, [router]);

  if (!mounted) return null;

  const today = format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN });

  return (
    <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">
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

      <Link href="/journal/new" className="block w-full py-4 text-center bg-indigo-500/85 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-indigo-600/85 transition-colors cursor-pointer mb-3">
        此刻你在想什么？
      </Link>

      {apiKey && (
        <Link href="/journal/new?mode=guided" className="block w-full py-3 text-center text-indigo-500 bg-indigo-50/50 backdrop-blur-sm border border-indigo-100/60 font-medium rounded-xl hover:bg-indigo-100/60 transition-colors cursor-pointer mb-8">
          深入对话
        </Link>
      )}
      {!apiKey && <div className="mb-8 h-1" />}

      <GlassCard className="mb-8 p-4">
        <p className="text-sm text-slate-500 mb-2">连接密钥</p>
        {!apiEditing && apiKey ? (
          <div className="flex gap-2">
            <Input glass type="password" value={apiKey} disabled className="flex-1 text-slate-400" />
            <Button variant="secondary" onClick={() => setApiEditing(true)} className="px-4 py-2">编辑</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input glass type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="flex-1" />
            <Button onClick={() => { localStorage.setItem("odyssey_api_key", apiKey); setApiSaved(true); setApiEditing(false); setTimeout(() => setApiSaved(false), 2000); }} className="px-4 py-2">{apiSaved ? "已保存" : "保存"}</Button>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">密钥仅保存在本地浏览器中，不会上传到任何服务器</p>
      </GlassCard>
    </main>
  );
}
