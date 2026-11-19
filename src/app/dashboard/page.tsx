import { Suspense } from "react";
import { getReader } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DayNumber } from "./DayNumber";
import { getProfile } from "@/actions/profile";
import { getEntries } from "@/actions/journal";
import { GuidedLink } from "./GuidedLink";

export default function DashboardPage() {
  return <Suspense fallback={<Dashboard profile={null} entries={null} />}><LoadedDashboard /></Suspense>;
}

async function LoadedDashboard() {
  const { user } = await getReader();
  if (!user) redirect("/");
  const [profile, entries] = await Promise.all([getProfile(), getEntries(3)]);
  if (!profile) redirect("/");
  return <Dashboard profile={profile} entries={entries} />;
}

function Dashboard({ profile, entries }: {
  profile: Awaited<ReturnType<typeof getProfile>>;
  entries: Awaited<ReturnType<typeof getEntries>> | null;
}) {
  return (
    <main className="today-page">
      <header className="today-heading"><h1>今日手记</h1>{profile && <Link href="/settings" className="owner-link" aria-label={`打开 ${profile.name} 的个人设置`}><Avatar name={profile.name} photo={profile.avatar} /><span>{profile.name} 的日记本</span></Link>}</header>
      <section className="today-cover">
        <div className="today-text">
          <p className="day-label">今天，是你在世上的</p>
          {profile ? <DayNumber birthdate={profile.birthdate} /> : <h2>第 <strong>…</strong> 天</h2>}
          <div className="today-actions">
            <Link className="ink-button" href="/journal/new">写日记 <span aria-hidden="true">↗</span></Link>
            <GuidedLink />
          </div>
        </div>
        <div className="today-photo" role="img" aria-label="月光下的小船" />
      </section>
      <section className="recent-section" aria-label="最近写下的日记">
        <div className="section-heading"><h2>最近记录</h2><Link href="/timeline" prefetch={true}>打开时间轴 →</Link></div>
        {entries === null ? <p className="empty-recent" role="status">正在读取最近记录…</p> : entries.length ? entries.map(entry => (
          <Link className="entry-line" key={entry.id} href={`/journal/${entry.id}`}>
            <span className="entry-day">第 {entry.dayNumber} 天</span>
            <span className="entry-preview">{(entry.summary || entry.content).slice(0, 160)}</span><span aria-hidden="true">↗</span>
          </Link>
        )) : <p className="empty-recent">写好第一篇日记，就能在这里翻到它。</p>}
      </section>
    </main>
  );
}
