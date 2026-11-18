import { cn } from "@/lib/utils/cn";

export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[#fffef9] border border-[#c6ceca] rounded-md",
        className
      )}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      {...props}
    />
  );
}
