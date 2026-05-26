"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface SwipeableCardProps {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
  deleteLabel?: string;
}

export function SwipeableCard({
  children,
  onDelete,
  className,
  deleteLabel = "删除",
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);

  const DELETE_WIDTH = 72;

  const onStart = useCallback((clientX: number) => {
    dragging.current = true;
    moved.current = false;
    startX.current = clientX - currentX.current;
  }, []);

  const onMove = useCallback(
    (clientX: number) => {
      if (!dragging.current) return;
      const diff = clientX - startX.current;
      if (Math.abs(diff - currentX.current) > 3) {
        moved.current = true;
      }
      currentX.current = Math.max(-DELETE_WIDTH, Math.min(0, diff));
      setTranslateX(currentX.current);
    },
    []
  );

  const onEnd = useCallback(() => {
    dragging.current = false;
    if (currentX.current < -DELETE_WIDTH / 2) {
      currentX.current = -DELETE_WIDTH;
    } else {
      currentX.current = 0;
    }
    setTranslateX(currentX.current);
  }, []);

  async function handleDelete() {
    if (confirming) {
      onDelete();
      setConfirming(false);
      currentX.current = 0;
      setTranslateX(0);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }

  function handleDismiss() {
    currentX.current = 0;
    setTranslateX(0);
    setConfirming(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete button behind the card */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={handleDelete}
          className={cn(
            "flex items-center justify-center text-white text-sm font-medium transition-all cursor-pointer rounded-r-2xl",
            confirming
              ? "bg-red-500"
              : "bg-red-400/85"
          )}
          style={{ width: DELETE_WIDTH }}
        >
          {confirming ? "确认删除" : deleteLabel}
        </button>
      </div>

      {/* Foreground card with swipe */}
      <div
        className={cn(
          "relative bg-white/50 backdrop-blur-xl border border-white/60 shadow-sm cursor-pointer",
          className
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging.current ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => { if (dragging.current) onMove(e.clientX); }}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
      >
        {children}
      </div>
    </div>
  );
}
