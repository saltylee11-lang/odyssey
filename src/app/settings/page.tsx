"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/auth/client";
import { getProfile, updateProfile } from "@/actions/profile";
import { getAllEntries } from "@/actions/journal";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

export default function Settings() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [profile, setProfile] = useState<{ name: string; birthdate: string; email: string } | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entryCount, setEntryCount] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const profile = await getProfile();
        if (!profile) { router.push("/"); return; }
        const { data } = await supabase.auth.getUser();
        setProfile({ ...profile, email: data.user?.email ?? "" });
        setName(profile.name);
        const { count, error } = await supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", profile.id);
        if (error) throw error;
        setEntryCount(count ?? 0);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (!mounted) return null;

  async function handleSaveName() {
    if (!name.trim()) return;
    try {
      await updateProfile({ name: name.trim() });
      setProfile((prev) => prev ? { ...prev, name: name.trim() } : null);
      setSaved(true);
      toast("已保存", "success");
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast("保存失败", "error");
    }
  }

  async function handleLogout() {
    localStorage.removeItem("odyssey_api_key");
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleExport() {
    try {
      const entries = await getAllEntries();
      const data = { profile, entries };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `odyssey-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast("导出成功", "success");
    } catch {
      toast("导出失败", "error");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportStatus("正在读取导入文件…");
    try {
      const data = JSON.parse(await file.text());
      if (data.format === "ibetter-presence-v1") {
        const { importPresence } = await import("@/lib/import-presence");
        const result = await importPresence(supabase, data);
        setImportStatus(`已核对 ${result.verified} 篇「存在」日记，本次新增 ${result.inserted} 篇。`);
        const { count } = await supabase.from("journal_entries").select("id", { count: "exact", head: true });
        if (count !== null) setEntryCount(count);
      } else if (Array.isArray(data.entries)) {
        const { importLocalData } = await import("@/actions/migration");
        await importLocalData(data.profile ?? profile, data.entries);
        toast("导入成功", "success");
        window.location.reload();
      } else {
        throw Error("文件格式不正确");
      }
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  if (loading || !profile) {
    return (
      <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
        <Skeleton className="h-40 rounded-2xl" />
      </main>
    );
  }

  const days = Math.floor((Date.now() - new Date(profile.birthdate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-center mb-6">
        <h1 className="journal-title">设置</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-6 mb-4">
        <div className="w-20 h-20 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-3xl font-bold text-indigo-400 mb-3">
          {profile.name.charAt(0)}
        </div>
        <p className="text-slate-500 text-sm">
          {profile.name} · 第 {days.toLocaleString()} 天
        </p>
      </div>

      {/* Settings */}
      <GlassCard className="flex flex-col overflow-hidden mb-4">
        <div className="p-4 border-b border-slate-200/40">
          <p className="text-xs text-slate-400 mb-2">昵称</p>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button onClick={handleSaveName} className="px-4 py-2">{saved ? "已保存" : "保存"}</Button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-200/40">
          <p className="text-xs text-slate-400 mb-1">邮箱</p>
          <p className="text-sm text-slate-600">{profile.email}</p>
        </div>

        <div className="p-4 border-b border-slate-200/40">
          <p className="text-xs text-slate-400 mb-1">出生日期</p>
          <p className="text-sm text-slate-600">{profile.birthdate}</p>
        </div>

        <div id="ai" className="p-4 border-b border-slate-200/40">
          <label htmlFor="deepseek-key" className="block text-sm mb-2">DeepSeek 密钥</label><p className="text-xs text-slate-500 mb-3">用于 AI 对话。只写日记可以跳过。</p>
          <ApiKeyInput />
        </div>

        <div className="p-4 border-b border-slate-200/40">
          <p className="text-xs text-slate-400 mb-1">记录总数</p>
          <p className="text-sm text-slate-600">{entryCount} 条</p>
        </div>

        {importStatus && <p role="status" className="px-4 py-2 text-sm">{importStatus}</p>}
        <div className="p-4 border-b border-slate-200/40 flex items-center justify-between">
          <span className="text-xs text-emerald-500">✓ 云端</span>
          <span className="flex gap-4">
            <button onClick={handleExport} className="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer">导出</button>
            <label className="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer">
              导入<input type="file" disabled={importing} accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </span>
        </div>

        <div className="p-4">
          <p className="text-xs text-slate-400 mb-1">奥德赛</p>
          <p className="text-xs text-slate-400">寻找归途 · 0.2.0.7</p>
        </div>
      </GlassCard>

      <Button variant="danger" onClick={handleLogout} className="w-full">
        退出登录
      </Button>

    </main>
  );
}

function ApiKeyInput() {
  const [key, setKey] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("odyssey_api_key") || "";
    return "";
  });
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!key);
  const hasKey = !!key;

  if (!editing && hasKey) {
    return (
      <div className="flex gap-2">
        <Input id="deepseek-key" type="password" value="••••••••" disabled className="flex-1 text-slate-400" />
        <Button variant="secondary" onClick={() => setEditing(true)} className="px-3 py-1 text-xs">修改</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input id="deepseek-key" type="password" placeholder="sk-..." value={key} onChange={(e) => setKey(e.target.value)} className="flex-1 text-sm" />
      <Button onClick={() => { localStorage.setItem("odyssey_api_key", key.trim()); setSaved(true); setEditing(!key.trim()); setTimeout(() => setSaved(false), 2000); }} className="px-3 py-1 text-xs">{saved ? "已保存" : "保存"}</Button>
    </div>
  );
}
