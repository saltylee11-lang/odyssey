"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getEntryWithMessages, addAIMessage, updateEntrySummary, deleteEntry } from "@/actions/journal";
import { chatWithAI } from "@/lib/ai";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton, TextSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";


interface DBEntry {
  id: string;
  content: string;
  summary: string;
  dayNumber: number;
  createdAt: Date | string;
  messages?: AIMessage[];
}

interface AIMessage { id: string; sequence: number; role: string; content: string; }

export default function JournalDetail() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [entry, setEntry] = useState<DBEntry | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Continue chat
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [resummarizing, setResummarizing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [loadFailure, setLoadFailure] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setMounted(true);
    setLoading(true);
    setLoadFailure(false);
    setApiKey(localStorage.getItem("odyssey_api_key") ?? "");
    getEntryWithMessages(params.id as string).then(data => {
      if (!active) return;
      setEntry(data);
      setMessages(data?.messages ?? []);
    }).catch(() => { if (active) setLoadFailure(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id, attempt]);

  async function handleContinueChat() {
    if (!chatInput.trim() || !apiKey || !entry) return;
    setChatLoading(true);
    try {
      // Build conversation context
      const contextMessages = messages.map((m) => `${m.role === "assistant" ? "回声" : "你"}: ${m.content}`).join("\n\n");
      const prompt = `我的日记：${entry.content}\n\n以下是之前的对话：\n\n${contextMessages}\n\n用户的新回应：${chatInput}`;
      const { reply, summary } = await chatWithAI(prompt, apiKey);

      const nextSeq = messages.length + 1;
      await addAIMessage(entry.id, "user", chatInput, nextSeq);
      await addAIMessage(entry.id, "assistant", reply, nextSeq + 1);
      await updateEntrySummary(entry.id, summary);

      setEntry({ ...entry, summary });
      setMessages((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, sequence: nextSeq, role: "user", content: chatInput },
        { id: `temp-${Date.now() + 1}`, sequence: nextSeq + 1, role: "assistant", content: reply },
      ]);
      setChatInput("");
      toast("对话已更新", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "连接失败", "error");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSaveSummary() {
    if (!entry) return;
    try {
      await updateEntrySummary(entry.id, editedSummary.trim());
      setEntry({ ...entry, summary: editedSummary.trim() });
      setEditingSummary(false);
      toast("摘要已保存", "success");
    } catch {
      toast("保存失败", "error");
    }
  }

  async function handleResummarize() {
    if (!entry || !apiKey) return;
    setResummarizing(true);
    try {
      const res = await fetch("/api/resummarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: entry.content, apiKey }),
      });
      const data = await res.json();
      if (data.summary) {
        await updateEntrySummary(entry.id, data.summary);
        setEntry({ ...entry, summary: data.summary });
        toast("摘要已更新", "success");
      } else {
        toast(data.error || "生成失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    } finally {
      setResummarizing(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    setDeleting(true);
    try {
      await deleteEntry(entry.id);
      router.push(`/timeline?day=${entry.dayNumber}`);
      toast("已删除", "success");
    } catch {
      toast("删除失败", "error");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  if (!mounted || loading) {
    return (
      <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">
        <PageHeaderSkeleton />
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-40 mb-4 rounded-2xl" />
        <TextSkeleton lines={5} />
      </main>
    );
  }

  if (loadFailure || !entry) return <main className="today-page">
    <h1 className="journal-title">{loadFailure ? "日记暂时无法读取" : "未找到这篇日记"}</h1>
    {loadFailure && <Button variant="secondary" onClick={() => setAttempt(n => n + 1)}>重试</Button>}
    <Link href="/timeline" className="guided-link m-3">返回时间轴 →</Link>
  </main>;

  return (
    <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">

      <header className="section-heading detail-heading"><h1>第 {entry.dayNumber} 天</h1><Link href={`/timeline?day=${entry.dayNumber}`}>查看当天 →</Link></header>
      <p className="text-sm text-slate-500 mb-6">
        {format(new Date(entry.createdAt as string | Date), "yyyy年M月d日 HH:mm", { locale: zhCN })}
      </p>

      {/* Content */}
      <GlassCard className="p-4 mb-4">
        <p className="journal-prose">{entry.content}</p>
      </GlassCard>

      {/* AI conversation */}
      {messages.length > 0 && (
        <>
          {messages.map((msg) => (
            <div
              key={msg.id}
              data-role={msg.role} className="dialogue mb-4"

            >
              <p className={`text-xs mb-2 ${msg.role === "assistant" ? "text-indigo-400" : "text-slate-500"}`}>
                {msg.role === "assistant" ? "深处的回声" : "你"}
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </>
      )}

      {/* Summary */}
      <GlassCard className="p-4 mb-6">
        <p className="text-xs text-slate-400 mb-1">思考摘要</p>
        {editingSummary ? (
          <div className="flex flex-col gap-2">
            <Input
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              placeholder="输入摘要..."
              className="w-full text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveSummary();
                if (e.key === "Escape") setEditingSummary(false);
              }}
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveSummary} className="flex-1 py-1.5 text-sm">
                保存
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditingSummary(false)}
                className="flex-1 py-1.5 text-sm"
              >
                取消
              </Button>
            </div>
          </div>
        ) : entry.summary ? (
          <div>
            <button
              onClick={() => { setEditedSummary(entry.summary); setEditingSummary(true); }}
              className="text-sm font-medium text-left hover:text-indigo-500 transition-colors cursor-pointer"
            >
              {entry.summary}
            </button>
            <div className="flex gap-3 mt-1.5">
              {apiKey && (
                <button
                  onClick={handleResummarize}
                  disabled={resummarizing}
                  className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {resummarizing ? "生成中..." : "重写摘要"}
                </button>
              )}
              <button
                onClick={() => { setEditedSummary(""); setEditingSummary(true); }}
                className="text-xs text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
              >
                清空
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setEditedSummary(""); setEditingSummary(true); }}
              className="text-sm text-slate-300 hover:text-indigo-400 transition-colors cursor-pointer"
            >
              添加摘要...
            </button>
            {apiKey && (
              <button
                onClick={handleResummarize}
                disabled={resummarizing}
                className="ml-3 text-xs text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {resummarizing ? "生成中..." : "AI 生成"}
              </button>
            )}
          </div>
        )}
      </GlassCard>

      {/* Continue chat */}
      {!expanded && apiKey && (
        <Button variant="secondary" onClick={() => setExpanded(true)} className="mb-6">
          继续对话
        </Button>
      )}

      {expanded && (
        <div className="mb-6 space-y-3">
          <Textarea
            glass
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="继续对话..."
            className="w-full min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button onClick={handleContinueChat} disabled={chatLoading || !chatInput.trim()} className="flex-1">
              {chatLoading ? "..." : "发送"}
            </Button>
            <Button variant="secondary" onClick={() => setExpanded(false)}>收起</Button>
          </div>
        </div>
      )}

      <div className="text-center space-y-4">
        <Link href="/journal/new" className="text-indigo-500 hover:text-indigo-600 text-sm">
          记录新的想法 →
        </Link>
        <div>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-xs text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
            >
              删除这条记录
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs bg-red-500 text-white px-4 py-1.5 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-8" />
    </div>
  );
}
