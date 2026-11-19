import type { Metadata } from 'next';
import { getProfile } from '@/actions/profile';
import { getAllEntries } from '@/actions/journal';
import { Atlas } from './Atlas';
import { frequentWords } from './words';

export const metadata: Metadata = { title: '航海图 · 奥德赛' };

export default function AtlasPage() {
  const birthday = getProfile().then(profile => profile?.birthdate ?? null).catch(() => null);
  const cloud = getAllEntries().then(entries => ({ count: entries.length, words: frequentWords(entries) })).catch(() => null);
  return <Atlas birthday={birthday} cloud={cloud} />;
}
