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
      {/* Night sky background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0a1628 0%, #102340 20%, #162d50 45%, #1b3660 70%, #1f3f6e 100%)",
        }}
      />

      {/* Sea */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: "35%",
          background:
            "linear-gradient(180deg, #162d50 0%, #0f2140 30%, #091830 65%, #051020 100%)",
        }}
      />

      {/* Horizon line */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: "35%",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%)",
        }}
      />

      {/* Moon */}
      <div className="absolute" style={{ top: "12%", left: "18%" }}>
        <div
          style={{
            width: 120, height: 120, borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(254,243,199,0.12) 0%, rgba(254,243,199,0.03) 50%, transparent 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 75, height: 75, top: 22, left: 22, borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(254,243,199,0.25) 0%, rgba(253,230,138,0.06) 55%, transparent 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 48, height: 48, top: 36, left: 36, borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 35%, #fefdf7 0%, #fbf5e4 25%, #f2e1b0 60%, #e4cd86 100%)",
            boxShadow:
              "0 0 30px rgba(254,243,199,0.18), 0 0 60px rgba(254,243,199,0.05)",
          }}
        />
      </div>

      {/* Moon reflection */}
      <div
        className="absolute"
        style={{
          bottom: "15%", left: "30%", width: 80, height: 140,
          background:
            "linear-gradient(180deg, rgba(254,243,199,0.1) 0%, rgba(254,243,199,0.04) 40%, transparent 80%)",
          borderRadius: "50%", filter: "blur(3px)",
        }}
      />
      <div className="absolute" style={{ bottom: "17%", left: "38%", width: 50, height: 2, borderRadius: 1 }}>
        <div className="w-full h-full rounded-full bg-amber-200/08" />
      </div>
      <div className="absolute" style={{ bottom: "22%", left: "36%", width: 30, height: 1.5, borderRadius: 1 }}>
        <div className="w-full h-full rounded-full bg-amber-200/05" />
      </div>

      {/* Small boat silhouette */}
      <div className="absolute" style={{ bottom: "28%", right: "16%", width: 36, height: 16 }}>
        <div
          style={{
            position: "absolute", bottom: 0, left: 3, width: 30, height: 8,
            background: "#0d1d36", borderRadius: "0 0 50% 50%",
            borderBottom: "1.5px solid #132a4a",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: 5, left: 10, width: 14, height: 5,
            background: "#081528", borderRadius: "40%",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: 4, left: 24, width: 0.8, height: 12,
            background: "#132a4a",
          }}
        />
      </div>

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
