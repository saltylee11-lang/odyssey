"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "首页" },
  { href: "/journal/new", label: "此刻" },
  { href: "/timeline", label: "时间轴" },
  { href: "/search", label: "搜索" },
  { href: "/settings", label: "设置" },
];

const hiddenOn = ["/"];

export function BottomNav() {
  const pathname = usePathname();
  if (hiddenOn.includes(pathname)) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom,0px)]">
      <div
        className="mx-auto max-w-lg rounded-2xl overflow-hidden shadow-sm"
        style={{
          background: "rgba(248,248,252,0.72)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "0.5px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex justify-around px-8 py-3.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="text-base transition-colors"
                style={{
                  color: active ? "#6366f1" : "#999",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
