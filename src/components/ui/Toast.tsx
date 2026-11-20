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
      <div className="toast-stack fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            role={t.type === "error" ? "alert" : "status"}
            key={t.id}
            className={cn(
              "px-4 py-2.5 rounded-md text-sm shadow-md border text-white",
              t.type === "success" && "bg-[#345d53] border-[#345d53]",
              t.type === "error" && "bg-[#8a453c] border-[#8a453c]",
              t.type === "info" && "bg-slate-800 border-slate-700"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
