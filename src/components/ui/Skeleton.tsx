import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/60", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="backdrop-blur-xl bg-white/50 border border-white/60 rounded-2xl shadow-sm p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}
