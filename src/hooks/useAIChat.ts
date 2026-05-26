"use client";

import { useState, useCallback } from "react";

interface UseAIChatOptions {
  entryId: string;
  apiKey: string;
}

export function useAIChat({ entryId, apiKey }: UseAIChatOptions) {
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState("");

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !apiKey) return;
      setStreaming(true);
      setError("");
      setStreamedText("");

      try {
        const res = await fetch(`/api/journal/entries/${entryId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, apiKey }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "请求失败");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  setStreamedText((prev) => prev + delta);
                }
              } catch { /* skip */ }
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "连接失败");
      } finally {
        setStreaming(false);
      }
    },
    [entryId, apiKey]
  );

  return { sendMessage, streaming, streamedText, error, setError };
}
