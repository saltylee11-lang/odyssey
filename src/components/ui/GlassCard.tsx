import { cn } from "@/lib/utils/cn";

export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "backdrop-blur-2xl bg-white/55 border border-white/70 rounded-2xl",
        className
      )}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      {...props}
    />
  );
}
