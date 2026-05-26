"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastCtx {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm shadow-lg backdrop-blur-xl border animate-in slide-in-from-bottom-2 fade-in pointer-events-auto",
              t.type === "success" && "bg-emerald-500/90 text-white border-emerald-400",
              t.type === "error" && "bg-red-500/90 text-white border-red-400",
              t.type === "info" && "bg-slate-800/90 text-white border-slate-700"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
