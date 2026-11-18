"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEntry, createEntryWithAI } from "@/actions/journal";
import { chatWithAI } from "@/lib/ai";
import { getProfile } from "@/actions/profile";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

export default function NewJournal() {
  const router = useRouter();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [error, setError] = useState("");
  const [chatting, setChatting] = useState(false);
  const [summary, setSummary] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [dayOverride, setDayOverride] = useState<number | undefined>();
  const [mode, setMode] = useState<"normal" | "guided">("normal");

  // Guided mode state
  const [guideMessages, setGuideMessages] = useState<{ role: string; content: string }[]>([]);
  const [guideInput, setGuideInput] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem("odyssey_api_key") ?? "");
    const params = new URLSearchParams(window.location.search);
    let cancelled = false;
    const key = localStorage.getItem("odyssey_api_key");
    const guided = params.get("mode") === "guided";
    const start = setTimeout(async () => {
      if (!guided) return;
      setMode("guided");
      if (!key) { setError("请先在设置中连接 DeepSeek"); return; }
      setGuideLoading(true);
      try {
        const { reply, summary } = await chatWithAI("请以我内心另一个自己的身份，温和地问我一个能从今天的具体经历开始回答的问题。", key);
        if (!cancelled) { setGuideMessages([{ role: "assistant", content: reply }]); setSummary(summary); }
      } catch {
        if (!cancelled) setError("连接失败，可以先写下此刻的想法。");
      } finally {
        if (!cancelled) setGuideLoading(false);
      }
    }, 0);
    const targetDay = parseInt(params.get("day") || "");
    if (!isNaN(targetDay) && targetDay >= 1) setDayOverride(targetDay);
    getProfile().then((p) => {
      if (!p) router.push("/");
      else setBirthdate(p.birthdate);
    }).catch(() => router.push("/"));
    return () => { cancelled = true; clearTimeout(start); };
  }, [router]);

  async function saveRecord(text: string, messages: typeof chatMessages = []) {
    if (!text.trim() || !birthdate || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      const entry = messages.length
        ? await createEntryWithAI(text, [], birthdate, "", summary, undefined, dayOverride, messages)
        : await createEntry(text, [], birthdate, dayOverride);
      if ("messagesSaved" in entry && !entry.messagesSaved) {
        toast("日记正文已保存，对话附件保存失败", "error");
      } else {
        toast("记录已保存", "success");
      }
      router.replace(`/journal/${entry.id}`);
    } catch {
      setError("保存失败，文字还在这里，可以再试一次。");
      saveLock.current = false;
      setSaving(false);
    }
  }

  async function handleChat() {
    if (!content.trim()) return;
    if (!apiKey) { setError("请先在设置中连接 DeepSeek"); return; }
    setLoading(true);
    setError("");
    try {
      const { reply, summary } = await chatWithAI(content, apiKey);
      setSummary(summary);
      setChatMessages([{ role: "assistant", content: reply }]);
      setChatting(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setLoading(false);
    }
  }

  async function continueChat() {
    if (!chatInput.trim() || !apiKey) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const updated = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(updated);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `最初的记录：「${content.slice(0, 500)}」\n\n之前的对话：\n${updated.map((m, i) => (m.role === "assistant" ? "内心：" : "我：") + (i === updated.length - 1 ? m.content : m.content.slice(0, 200))).join("\n")}\n\n请继续回应我，可以先简短共鸣，然后继续追问，引导深入思考。`,
          apiKey,
        }),
      });
      if (!res.ok) throw new Error("连接失败");
      const data = await res.json();
      setSummary(data.summary ?? "");
      setChatMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setLoading(false);
    }
  }

  async function sendGuideMessage() {
    const key = apiKey;
    if (!guideInput.trim() || !key) return;
    const userMsg = guideInput.trim();
    setGuideInput("");
    const updated = [...guideMessages, { role: "user", content: userMsg }];
    setGuideMessages(updated);
    setGuideLoading(true);

    try {
      const prompt = `之前的对话：\n${updated.map((m) => (m.role === "assistant" ? "内心：" : "我：") + m.content).join("\n")}\n\n请继续以我内心另一个自己的身份回应我。可以先简短回应，然后继续提问引导我深入思考。紧扣最初记录的主题。`;
      const { reply, summary } = await chatWithAI(prompt, key);
      setSummary(summary);
      setGuideMessages([...updated, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setGuideLoading(false);
    }
  }

  function saveConversation(guided: boolean) {
    const messages = guided ? guideMessages : chatMessages;
    const draft = guided ? guideInput : chatInput;
    const replies = messages.filter((m) => m.role === "user").map((m) => m.content);
    const text = [guided ? "" : content, ...replies, draft.trim()].filter(Boolean).join("\n\n");
    const transcript = draft.trim() ? [...messages, { role: "user", content: draft.trim() }] : messages;
    return saveRecord(text, transcript);
  }

  return (
    <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">
      <PageHeader title={mode === "guided" ? "深入对话" : "写日记"} />
      {dayOverride && (
        <p className="text-xs text-slate-400 text-center -mt-2 mb-3">
          记录在第 {dayOverride} 天
        </p>
      )}

      {/* Guided AI mode */}
      {mode === "guided" && (
        <div className="flex-1 flex flex-col">
          {guideMessages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
              {guideLoading ? (
                <p className="text-slate-400 text-sm">连接中...</p>
              ) : (
                <>
                  <p className="text-slate-300 text-sm">无法连接</p>

                  <button onClick={() => { setMode("normal"); setError(""); }} className="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer">返回</button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {guideMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl ${
                      msg.role === "assistant"
                        ? "bg-indigo-50/70 backdrop-blur-sm border border-indigo-100/40 mr-4"
                        : "bg-white/60 backdrop-blur-sm border border-white/60 ml-4"
                    }`}
                  >
                    <p className="text-xs text-slate-400 mb-1">
                      {msg.role === "assistant" ? "深处的回声" : "你"}
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                ))}
                {guideLoading && (
                  <div className="flex gap-1.5 items-center px-4 py-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-typing-dot" style={{ animationDelay: "0s" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-typing-dot" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-typing-dot" style={{ animationDelay: "0.4s" }} />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  glass
                  readOnly={saving}
                  aria-label="对话回应"
                  value={guideInput}
                  onChange={(e) => setGuideInput(e.target.value)}
                  placeholder="回应..."
                  className="flex-1 min-h-[60px]"
                />
                <div className="flex flex-col gap-2">
                  <Button onClick={sendGuideMessage} disabled={saving || guideLoading || !guideInput.trim()}>
                    发送
                  </Button>
                  <Button variant="secondary" onClick={() => saveConversation(true)} disabled={saving || guideLoading || !birthdate || (!guideInput.trim() && !guideMessages.some((m) => m.role === "user"))}>
                    {saving ? "保存中…" : "保存对话"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 1: Write */}
      {mode !== "guided" && !chatting && (
        <div className="flex-1 flex flex-col">
          <div className="writing-paper">
            <div className="paper-meta"><span>{dayOverride ? `第 ${dayOverride} 天` : "今日记录"}</span><span>{Array.from(content.trim()).length} 字</span></div>
            <textarea aria-label="日记正文" value={content} readOnly={saving || loading}
              onChange={(e) => setContent(e.target.value)} placeholder="今天，哪件小事还留在你心里？" />
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => saveRecord(content)} disabled={saving || loading || !content.trim() || !birthdate} className="flex-1">
              {saving ? "保存中…" : "保存记录"}
            </Button>
            {apiKey && <Button variant="secondary" onClick={handleChat} disabled={saving || loading || !content.trim()}>
              {loading ? "思考中..." : "深入聊聊"}
            </Button>}
          </div>
          <Link href="/dashboard" className="text-center text-xs text-slate-300 hover:text-slate-400 mt-6 py-2">
            返回今天
          </Link>
        </div>
      )}

      {/* Step 2: Multi-turn AI chat */}
      {mode !== "guided" && chatting && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            <GlassCard className="p-3">
              <p className="text-xs text-slate-400 mb-1">你说：</p>
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            </GlassCard>

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-2xl ${
                  msg.role === "assistant"
                    ? "bg-indigo-50/70 backdrop-blur-sm border border-indigo-100/40"
                    : "bg-white/60 backdrop-blur-sm border border-white/60"
                }`}
              >
                <p className="text-xs text-slate-400 mb-1">
                  {msg.role === "assistant" ? "深处的回声" : "你"}
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className="flex gap-1.5 items-center px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-typing-dot" style={{ animationDelay: "0s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-typing-dot" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-typing-dot" style={{ animationDelay: "0.4s" }} />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              glass
              readOnly={saving}
              aria-label="对话回应"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="继续写下你的回应…"
              className="flex-1 min-h-[56px]"
            />
            <div className="flex flex-col gap-2">
              <Button onClick={continueChat} disabled={saving || loading || !chatInput.trim()}>
                发送
              </Button>
              <Button variant="secondary" onClick={() => saveConversation(false)} disabled={saving || loading || !birthdate}>
                {saving ? "保存中…" : "保存记录"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </main>
  );
}
