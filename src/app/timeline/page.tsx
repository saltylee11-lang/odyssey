import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/actions/profile";
import { Skeleton } from "@/components/ui/Skeleton";
import { TimelineReader } from "./TimelineReader";
import styles from "./timeline.module.css";

async function Reader() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  return <TimelineReader scope={{ owner: profile.id, birthday: profile.birthdate, revision: crypto.randomUUID() }} />;
}

export default function TimelinePage() {
  return <main className={styles.page}>
    <h1 className="journal-title">时间轴</h1>
    <Suspense fallback={<Skeleton className="w-full h-20 mt-8" />}><Reader /></Suspense>
  </main>;
}
