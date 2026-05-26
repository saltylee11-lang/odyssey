import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export interface AIResponse {
  reply: string;
  summary: string;
}

export async function chatWithAI(
  userContent: string,
  apiKey: string
): Promise<AIResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: userContent, apiKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "连接失败" }));
    throw new Error(err.error || `请求失败: ${res.status}`);
  }

  const data = await res.json();
  return { reply: data.reply, summary: data.summary };
}
