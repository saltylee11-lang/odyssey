import { cn } from "@/lib/utils/cn";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  glass?: boolean;
}

export function Textarea({ className, glass, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        glass
          ? "backdrop-blur-sm bg-white/40 border border-white/50 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          : "w-full rounded-lg border border-slate-200 bg-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none",
        className
      )}
      {...props}
    />
  );
}
