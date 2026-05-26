import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}

export function EmptyState({ icon = "📝", title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex-1 flex flex-col items-center justify-center text-slate-400 py-12", className)}>
      <p className="text-4xl mb-3">{icon}</p>
      <p>{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-4 text-indigo-500 text-sm hover:text-indigo-600">
          {action.label} →
        </Link>
      )}
    </div>
  );
}
