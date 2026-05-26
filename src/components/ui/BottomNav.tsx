"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "首页" },
  { href: "/journal/new", label: "此刻" },
  { href: "/timeline", label: "时间轴" },
  { href: "/search", label: "搜索" },
  { href: "/settings", label: "设置" },
];

const hiddenOn = ["/", "/journal/new"];

export function BottomNav() {
  const pathname = usePathname();
  if (hiddenOn.includes(pathname)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom,0px)]">
      <div
        className="mx-auto max-w-lg"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex justify-around px-2 py-2.5 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
                pathname === item.href
                  ? "text-indigo-500"
                  : "text-slate-300 hover:text-slate-500"
              )}
            >
              <span className="text-lg leading-none">
                {item.label === "首页" && "☀️"}
                {item.label === "此刻" && "✍️"}
                {item.label === "时间轴" && "🕰️"}
                {item.label === "搜索" && "🔍"}
                {item.label === "设置" && "⚙️"}
              </span>
              <span className={cn(
                "text-[11px]",
                pathname === item.href ? "font-medium" : ""
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
