import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  glass?: boolean;
}

export function Input({ className, glass, ...props }: InputProps) {
  return (
    <input
      className={cn(
        glass
          ? "backdrop-blur-sm bg-white/40 border border-white/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          : "w-full rounded-lg border border-slate-200 bg-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300",
        className
      )}
      {...props}
    />
  );
}
