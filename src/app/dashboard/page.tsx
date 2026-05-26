"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { createClient } from "@/lib/auth/client";
import { getProfile } from "@/actions/profile";
import { BottomNav } from "@/components/ui/BottomNav";

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; birthdate: string } | null>(null);
  const [days, setDays] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setMounted(true);
    setApiKey(localStorage.getItem("odyssey_api_key") || "");
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
    </main>
  );
}
