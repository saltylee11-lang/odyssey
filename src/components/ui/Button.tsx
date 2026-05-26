import { cn } from "@/lib/utils/cn";

const variants = {
  primary:
    "bg-indigo-500/85 backdrop-blur-sm text-white font-medium hover:bg-indigo-600/85 disabled:opacity-40",
  secondary:
    "backdrop-blur-sm bg-white/50 border border-white/50 font-medium hover:bg-white/70",
  ghost: "text-slate-400 hover:text-slate-600",
  danger: "text-red-400 hover:text-red-500 hover:bg-red-50/50",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-xl py-3 px-6 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
