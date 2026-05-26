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
            "你是一个精准的摘要助手。用户会给你一段个人日记/思考内容，请用一句话（15字以内）概括核心洞见，要具体、可回忆。只返回摘要本身，不要加任何前缀、引号或解释。好的摘要例子：「对孤独的新理解——它是空间不是缺失」「发现害怕失败比失败本身更消耗自己」",
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
