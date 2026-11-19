import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/actions/profile';
import { getSupabaseServer } from '@/lib/db';
import { Settings } from './Settings';
import { version } from '../../../package.json';

export const metadata: Metadata = { title: '设置 · 奥德赛' };

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect('/');
  const db = await getSupabaseServer();
  const { count } = await db.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', profile.id);
  return <Settings key={profile.id} profile={profile} entryCount={count} version={version} />;
}
