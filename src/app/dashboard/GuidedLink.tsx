"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}
function hasKey() { return Boolean(localStorage.getItem("odyssey_api_key")); }

export function GuidedLink() {
  const enabled = useSyncExternalStore(subscribe, hasKey, () => false);
  return <Link className="guided-link" href={enabled ? "/journal/new?mode=guided" : "/settings#ai"}>
    {enabled ? "深入对话" : "连接 AI"} <span aria-hidden="true">↗</span>
  </Link>;
}
