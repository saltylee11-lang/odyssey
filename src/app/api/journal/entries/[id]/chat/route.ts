import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Verify ownership
  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (entryErr || !entry) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

  const { content, apiKey } = await request.json();
  if (!content || !apiKey) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  // Get existing AI messages
  const { data: existingMessages } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("entry_id", id)
    .order("sequence", { ascending: true });

  // Build conversation
  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: entry.content },
    ...(existingMessages ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content },
  ];

  // Stream from DeepSeek
  const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.8,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!deepseekRes.ok) {
    const err = await deepseekRes.text();
    return NextResponse.json({ error: `DeepSeek API 错误: ${deepseekRes.status} ${err}` }, { status: deepseekRes.status });
  }

  // Save the user message
  const nextSeq = (existingMessages?.length ?? 0) + 1;
  await supabase.from("ai_messages").insert({
    entry_id: id,
    sequence: nextSeq,
    role: "user",
    content,
  });

  // Pipe the stream back
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = deepseekRes.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(encoder.encode(chunk));

          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) fullResponse += delta;
              } catch { /* skip */ }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (fullResponse) {
        // Save AI response
        await supabase.from("ai_messages").insert({
          entry_id: id,
          sequence: nextSeq + 1,
          role: "assistant",
          content: fullResponse,
        });

        // Update summary
        const summaryMatch = fullResponse.match(/【摘要[：:]\s*(.+?)】/);
        const summary = summaryMatch ? summaryMatch[1] : entry.summary;
        await supabase.from("journal_entries")
          .update({ summary })
          .eq("id", id);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
