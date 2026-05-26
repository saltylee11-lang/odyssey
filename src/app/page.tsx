"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push("/dashboard");
    });
    // Check for local data to migrate
    if (typeof window !== "undefined") {
      const localUser = localStorage.getItem("odyssey_user");
      const localEntries = localStorage.getItem("odyssey_entries");
      if (localUser && localEntries) setHasLocalData(true);
    }
  }, [router]);

  if (!mounted) return null;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: signInData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    if (!signInData.session) {
      setError("登录失败：未能创建会话");
      setLoading(false);
      return;
    }

    await migrateIfNeeded();
    // Short delay to ensure cookie is flushed
    setLoading(false);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !regEmail.trim() || !regPassword || !birthdate) {
      setError("请填写所有字段");
      return;
    }

    const birth = new Date(birthdate);
    if (isNaN(birth.getTime()) || birth > new Date()) {
      setError(birth > new Date() ? "出生日期不能是未来" : "出生日期无效");
      return;
    }

    setLoading(true);

    const { data: signUpData, error: authErr } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { name: name.trim(), birthdate },
      },
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, show message instead of redirecting
    if (!signUpData.session) {
      setError("请查收确认邮件，点击链接后即可登录");
      setMode("login");
      setLoading(false);
      return;
    }

    await migrateIfNeeded();
    setLoading(false);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  }

  async function migrateIfNeeded() {
    if (!hasLocalData) return;
    const localUser = localStorage.getItem("odyssey_user");
    const localEntries = localStorage.getItem("odyssey_entries");
    if (!localUser || !localEntries) return;

    try {
      const { importLocalData } = await import("@/actions/migration");
      await importLocalData(JSON.parse(localUser), JSON.parse(localEntries));
      localStorage.removeItem("odyssey_user");
      localStorage.removeItem("odyssey_entries");
      setHasLocalData(false);
    } catch {
      // silent fail, user can retry from settings
    }
  }

  return (
    <main className="flex-1 relative overflow-hidden">
      {/* Cover image background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/cover.jpg)" }}
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Auth card */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div
          className="w-full max-w-xs rounded-2xl px-6 py-8"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          }}
        >
          <h1
            className="text-3xl font-bold text-white text-center mb-1"
            style={{ letterSpacing: "0.3em" }}
          >
            奥德赛
          </h1>
          <p className="text-amber-200/35 text-sm text-center mb-6 font-light">
            寻找归途
          </p>

          {hasLocalData && (
            <p className="text-amber-200/50 text-xs text-center mb-4">
              检测到本地数据，登录后将自动导入
            </p>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                required
              />
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                required
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg text-white py-2.5 text-sm font-medium"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {loading ? "..." : "登录"}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); }}
                className="text-white/40 text-sm text-center hover:text-white/60 transition-colors cursor-pointer"
              >
                没有账号？注册
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="你的名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                required
              />
              <Input
                type="email"
                placeholder="邮箱"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                required
              />
              <Input
                type="password"
                placeholder="密码"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                required
              />
              <Input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 [&::-webkit-calendar-picker-indicator]:invert"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" }}
                required
              />
              <p className="text-white/25 text-xs text-center">
                用来计算你在世上的每一天
              </p>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg text-white py-2.5 text-sm font-medium"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {loading ? "..." : "开始旅程"}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className="text-white/40 text-sm text-center hover:text-white/60 transition-colors cursor-pointer"
              >
                已有账号？登录
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
