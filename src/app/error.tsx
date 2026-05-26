"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <p className="text-4xl mb-4">😔</p>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">出了点问题</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">
        {error.message || "页面加载失败，请重试"}
      </p>
      <Button onClick={reset}>重试</Button>
    </main>
  );
}
