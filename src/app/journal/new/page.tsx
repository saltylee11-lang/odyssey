"use client";

import { useState, useEffect } from "react";
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [chatting, setChatting] = useState(false);
  const [birthdate, setBirthdate] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [dayOverride, setDayOverride] = useState<number | undefined>();
  const [mode, setMode] = useState<"normal" | "guided">("normal");
  const [lastSavedContent, setLastSavedContent] = useState("");

  // Guided mode state
  const [guideMessages, setGuideMessages] = useState<{ role: string; content: string }[]>([]);
  const [guideInput, setGuideInput] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideStarted, setGuideStarted] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem("odyssey_api_key") ?? "");
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "guided") setMode("guided");
    const targetDay = parseInt(params.get("day") || "");
    if (!isNaN(targetDay) && targetDay >= 1) setDayOverride(targetDay);
    getProfile().then((p) => {
      if (!p) router.push("/");
      else setBirthdate(p.birthdate);
    }).catch(() => router.push("/"));
  }, [router]);

  async function handleSave() {
    if (!content.trim()) return;
    try {
      await createEntry(content, [], birthdate, dayOverride);
      toast("已保存", "success");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    }
  }

  async function handleChat() {
    if (!content.trim()) return;
    if (!apiKey) { setError("请先在首页设置连接密钥"); return; }
    setLoading(true);
    setError("");
    try {
      const { reply, summary } = await chatWithAI(content, apiKey);
      setChatMessages([{ role: "assistant", content: reply }]);
      setLastSavedContent(content);
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
      setChatMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setLoading(false);
    }
  }

  async function finishChat() {
    const userMsgs = chatMessages.filter((m) => m.role === "user");
    if (userMsgs.length === 0) {
      toast("那就下次再聊吧~", "info");
      setSaved(true);
      return;
    }
    try {
      const fullContent = [content, ...userMsgs.map((m) => m.content)].join("\n\n");
      const lastAi = [...chatMessages].reverse().find((m) => m.role === "assistant")?.content ?? "";
      const summaryMatch = lastAi.match(/【摘要[：:]\s*(.+?)】/);
      const summary = summaryMatch ? summaryMatch[1] : fullContent.slice(0, 40);
      await createEntryWithAI(fullContent, [], birthdate, chatMessages.filter((m) => m.role === "assistant").map((m) => m.content).join("\n---\n"), summary, undefined, dayOverride);
      toast("已保存", "success");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    }
  }

  async function startGuidedSession() {
    if (!apiKey) { setError("请先设置连接密钥"); return; }
    setGuideLoading(true);
    setGuideStarted(true);
    try {
      const contextPrompt = lastSavedContent
        ? `我刚才记录了这样一段想法：「${lastSavedContent}」。请以我内心深处另一个自己的身份，基于我刚才的这段记录，向我提出一个开放性的追问，引导我继续深挖。不要泛泛而谈，要具体针对我刚才说的内容。语气温柔、好奇、不带评判。`
        : "请以我内心深处另一个自己的身份，向我提出一个开放性的问题。要温柔、好奇、不带评判，引导我探索此刻的内心。";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contextPrompt, apiKey }),
      });
      if (!res.ok) throw new Error("连接失败");
      const data = await res.json();
      const msgs: { role: string; content: string }[] = [];
      if (lastSavedContent) {
        msgs.push({ role: "user", content: lastSavedContent });
      }
      msgs.push({ role: "assistant", content: data.reply });
      setGuideMessages(msgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
      setGuideStarted(false);
    } finally {
      setGuideLoading(false);
    }
  }

  async function sendGuideMessage() {
    if (!guideInput.trim() || !apiKey) return;
    const userMsg = guideInput.trim();
    setGuideInput("");
    const updated = [...guideMessages, { role: "user", content: userMsg }];
    setGuideMessages(updated);
    setGuideLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `${lastSavedContent ? `最初的记录：「${lastSavedContent}」\n\n` : ""}之前的对话：\n${updated.map((m) => (m.role === "assistant" ? "内心：" : "我：") + m.content).join("\n")}\n\n请继续以我内心另一个自己的身份回应我。可以先简短回应，然后继续提问引导我深入思考。紧扣最初记录的主题。`,
          apiKey,
        }),
      });
      if (!res.ok) throw new Error("连接失败");
      const data = await res.json();
      setGuideMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setGuideLoading(false);
    }
  }

  async function saveGuidedSession() {
    const userMessages = guideMessages.filter((m) => m.role === "user");
    const aiMessages = guideMessages.filter((m) => m.role === "assistant");

    // Don't save if user hasn't replied (only the auto-added initial content exists)
    const actualReplies = userMessages.filter((m) => m.content !== lastSavedContent);
    if (actualReplies.length === 0) {
      toast("那就下次再聊吧~", "info");
      setSaved(true);
      return;
    }

    try {
      const fullContent = actualReplies.map((m) => m.content).join("\n\n");
      const lastAiReply = [...aiMessages].reverse()[0]?.content ?? "";
      const summaryMatch = lastAiReply.match(/【摘要[：:]\s*(.+?)】/);
      const summary = summaryMatch ? summaryMatch[1] : fullContent.slice(0, 40);

      await createEntryWithAI(
        fullContent,
        [],
        birthdate,
        aiMessages.map((m) => m.content).join("\n---\n"),
        summary,
        undefined,
        dayOverride
      );
      toast("已保存", "success");
      setSaved(true);
    } catch (e) {
      toast("保存失败", "error");
    }
  }

  if (saved) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
        <GlassCard className="text-center p-8">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-xl font-semibold mb-2 text-slate-800">已保存</h2>
          <p className="text-slate-500 mb-6">你的想法已经被记录下来了</p>
          <div className="flex flex-col gap-3">
            {apiKey && (
              <Button onClick={() => {
                setLastSavedContent(content);
                setSaved(false); setChatting(false); setError("");
                setMode("guided"); setContent("");
              }} className="py-3 px-8 bg-indigo-500">
                深入对话
              </Button>
            )}
            <Button variant="secondary" onClick={() => {
              setContent(""); setChatMessages([]); setChatInput("");
              setSaved(false); setChatting(false); setError("");
              setMode("normal");
            }} className="py-3 px-8">再写一条</Button>
            <Button variant="ghost" onClick={() => router.push("/timeline")} className="py-3 px-8">
              回到时间轴
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="py-3 px-8">
              回到主页
            </Button>
          </div>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-6 pb-24 max-w-lg mx-auto w-full">
      <PageHeader title={mode === "guided" ? "深入对话" : "此刻"} backHref="/dashboard" />
      {dayOverride && (
        <p className="text-xs text-slate-400 text-center -mt-2 mb-3">
          记录在第 {dayOverride} 天
        </p>
      )}

      {/* Guided AI mode */}
      {mode === "guided" && (
        <div className="flex-1 flex flex-col">
          {!guideStarted ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-5xl mb-4">🧠</p>
              <h3 className="text-lg font-medium text-slate-700 mb-2">深入对话</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
                AI 将以你内心的另一个自己的身份，<br />向你提问，引导你探索深处的想法。
              </p>
              <Button onClick={startGuidedSession} disabled={guideLoading} className="px-8 py-3">
                {guideLoading ? "连接中..." : "开始对话"}
              </Button>
              <button
                onClick={() => setMode("normal")}
                className="mt-4 text-sm text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                返回
              </button>
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
                  value={guideInput}
                  onChange={(e) => setGuideInput(e.target.value)}
                  placeholder="回应..."
                  className="flex-1 min-h-[60px]"
                />
                <div className="flex flex-col gap-2">
                  <Button onClick={sendGuideMessage} disabled={guideLoading || !guideInput.trim()}>
                    发送
                  </Button>
                  <Button variant="secondary" onClick={saveGuidedSession} disabled={guideMessages.length === 0}>
                    下次再聊吧
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
          <Textarea
            glass
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="此刻，你在想什么？"
            className="flex-1 min-h-[180px] w-full"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <Button onClick={handleSave} disabled={!content.trim()} className="flex-1">
              记录
            </Button>
            <Button variant="secondary" onClick={handleChat} disabled={loading || !content.trim()}>
              {loading ? "思考中..." : "深入聊聊"}
            </Button>
          </div>
          <Link href="/dashboard" className="text-center text-xs text-slate-300 hover:text-slate-400 mt-6 py-2">
            暂时没什么想说的
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
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="可以使用豆包输入法语音聊天哦"
              className="flex-1 min-h-[56px]"
            />
            <div className="flex flex-col gap-2">
              <Button onClick={continueChat} disabled={loading || !chatInput.trim()}>
                发送
              </Button>
              <Button variant="secondary" onClick={finishChat} disabled={loading}>
                今天就聊到这里吧
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
