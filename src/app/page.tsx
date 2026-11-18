"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/auth/client";
import Image from "next/image";


export default function Home() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const supabase = createClient();

  const [notice, setNotice] = useState("");
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

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/dashboard");
    });
    // Check for local data to migrate
    if (typeof window !== "undefined") {
      const localUser = localStorage.getItem("odyssey_user");
      const localEntries = localStorage.getItem("odyssey_entries");
      if (localUser && localEntries) setHasLocalData(true);
    }
  }, [router, supabase]);



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
    window.location.replace("/dashboard");
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
      setEmail(regEmail);
      setNotice("确认邮件已发出。打开邮件完成确认后，用这个邮箱登录。");
      setMode("login");
      setLoading(false);
      return;
    }

    await migrateIfNeeded();
    window.location.replace("/dashboard");
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

  const registering = mode === "register";
  const today = new Date();
  const latestBirthday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");

  return (
    <main className="night-sea">
      <Image src="/moonlit-sea.webp" alt="海天交界处，一叶小舟停在月光的倒影旁。" fill sizes="100vw" preload unoptimized className="sea-image" />
      <header className="sea-masthead"><span>奥德赛</span><span className="masthead-separator" /><span>个人反思日记</span></header>
      <section className="sea-entry">
        <div><h1 lang="en">Odyssey</h1><p>在这里，和自己待一会儿。</p></div>
        <button className="open-journal" onClick={() => dialog.current?.showModal()}>打开日记本 <span aria-hidden="true">↗</span></button>
      </section>
      <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-title">
        <button className="dialog-close" type="button" aria-label="关闭登录窗口" onClick={() => dialog.current?.close()}>×</button>
        <section className="auth-panel">
          <div className="auth-form-wrap">
            <h2 id="auth-title">{registering ? "写下第一页" : "翻开你的日记"}</h2>
            <p className="auth-intro">{registering ? "从今天起，把你的所思所想留在这里。" : "记下此刻的想法，也可以和 AI 再聊深一点。"}</p>
            <div className="auth-switch" aria-label="账户操作">
              {(["login", "register"] as const).map((tab) => (
                <button key={tab} type="button" disabled={loading} aria-pressed={mode === tab} onClick={() => {
                  setMode(tab); setError(""); setNotice("");
                }}>{tab === "login" ? "登录" : "注册"}</button>
              ))}
            </div>
            {hasLocalData && <p className="form-note">发现旧版的本地记录，登录后将导入。</p>}
            {notice && <p className="form-note" role="status">{notice}</p>}
            <form key={mode} onSubmit={async (event) => {
              try { await (registering ? handleRegister(event) : handleLogin(event)); }
              catch { setError("连接失败，请稍后再试。"); setLoading(false); }
            }}>
              {registering && <label>怎么称呼你<input autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} required /></label>}
              <label>邮箱<input type="email" autoComplete="email" placeholder="you@example.com" value={registering ? regEmail : email}
                onChange={(e) => (registering ? setRegEmail : setEmail)(e.target.value)} required /></label>
              <label>密码<input type="password" autoComplete={registering ? "new-password" : "current-password"} placeholder={registering ? "至少 6 位" : "输入你的密码"} minLength={registering ? 6 : undefined}
                value={registering ? regPassword : password} onChange={(e) => (registering ? setRegPassword : setPassword)(e.target.value)} required /></label>
              {registering && <label>出生日期<input type="date" autoComplete="bday" max={latestBirthday} value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)} required /><small>用来计算今天是你人生中的第几天。</small></label>}
              {error && <p className="form-error" role="alert">{error === "Invalid login credentials" ? "邮箱或密码不正确，请再试一次。" : error}</p>}
              <button type="submit" disabled={loading} className="ink-button">{loading ? "连接中…" : registering ? "创建日记本" : "登录日记本"}<span aria-hidden="true">→</span></button>
            </form>
          </div>
        </section>
      </dialog>
    </main>
  );
}
