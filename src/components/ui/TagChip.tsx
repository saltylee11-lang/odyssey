import { cn } from "@/lib/utils/cn";

interface TagChipProps {
  label: string;
  onRemove?: () => void;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TagChip({ label, onRemove, active, onClick, className }: TagChipProps) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
        active
          ? "bg-indigo-500/85 text-white"
          : "bg-white/40 border border-slate-200/50 text-slate-500 hover:bg-white/70",
        className
      )}
    >
      {label}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-red-400"
        >
          ×
        </span>
      )}
    </Comp>
  );
}
