import { NextResponse } from "next/server";

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
        {
          role: "system",
          content:
            "你是用户内心深处的回声——一个来自他自己的、温暖而善于提问的声音。当用户分享一个想法、感悟或引用时：1. 首先简短地回应（一两句话），仿佛是他自己内心对这个想法产生的共鸣 2. 然后提出 1-2 个开放性的追问，引导他继续深挖 3. 最后，在回复末尾用【摘要：xxx】格式，用一句话概括这次思考的核心。语气温柔、好奇，不带评判。",
        },
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
