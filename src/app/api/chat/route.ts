import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  const { content, apiKey } = await request.json();

  if (!content || !apiKey) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      temperature: 0.8,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `DeepSeek API 错误: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const fullText = data.choices[0].message.content as string;

  const summaryMatch = fullText.match(/【摘要[：:]\s*(.+?)】/);
  let summary = summaryMatch ? summaryMatch[1] : "";
  const reply = fullText.replace(/【摘要[：:].+?】/, "").trim();

  // If summary is too similar to content or empty, return empty
  if (summary && content && (summary.trim() === content.trim().slice(0, summary.length) || summary.length < 3)) {
    summary = "";
  }

  return NextResponse.json({ reply, summary });
}
