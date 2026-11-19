"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">

      <h2 className="text-lg font-semibold text-slate-800 mb-2">页面暂时无法打开</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">
        连接可能暂时中断，稍后可以重新加载。
      </p>
      <Button onClick={reset}>重试</Button>
    </main>
  );
}
