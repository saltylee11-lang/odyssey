"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";

const items = [
  ["/dashboard", "当下"], ["/journal/new", "航海日志"], ["/timeline", "时间轴"],
  ["/search", "航海图"], ["/settings", "设置"],
];

export function BottomNav() {
  const path = usePathname();
  if (path === "/") return null;
  return <header className="app-bar">
    <Link href="/dashboard" className="nav-brand" aria-label="奥德赛首页"><Brand /></Link>
    <nav aria-label="日记本导航">{items.map(([href, label]) => (
      <Link key={href} href={href} prefetch={href === "/dashboard" || href === "/timeline" ? true : href === "/search" ? false : undefined} aria-current={path === href ? "page" : undefined}>{label}</Link>
    ))}</nav>
  </header>;
}
