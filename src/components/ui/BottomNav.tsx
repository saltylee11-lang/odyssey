"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "首页" },
  { href: "/journal/new", label: "此刻" },
  { href: "/timeline", label: "时间轴" },
  { href: "/search", label: "搜索" },
  { href: "/settings", label: "设置" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="mt-auto pt-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-2xl flex justify-center gap-6 px-6 py-3 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              pathname === item.href
                ? "text-indigo-600 font-medium"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
