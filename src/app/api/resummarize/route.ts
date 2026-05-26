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
            "你是一个温柔的摘要助手。用户有一段个人记录，请用一句话（15字以内）概括这段记录的核心感受或洞见，要具体、可回忆，像朋友留下的便签。只返回摘要本身，不要加任何前缀、引号或解释。好的例子：「被理解的感觉真好」「学会和焦虑做朋友」「原来我比自己想象的勇敢」",
        },
        { role: "user", content },
      ],
      temperature: 0.5,
      max_tokens: 64,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `DeepSeek API 错误: ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  const summary = (data.choices[0].message.content as string).trim();

  return NextResponse.json({ summary });
}
