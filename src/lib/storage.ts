"use client";

export interface UserProfile {
  name: string;
  email: string;
  birthdate: string; // ISO date
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  aiResponse: string | null;
  userReply: string | null;
  summary: string;
  timestamp: string; // ISO datetime
}

const USER_KEY = "odyssey_user";
const ENTRIES_KEY = "odyssey_entries";

export function saveUser(profile: UserProfile) {
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
}

export function getUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function saveEntry(entry: JournalEntry) {
  const entries = getEntries();
  entries.unshift(entry);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function updateEntry(id: string, updates: Partial<JournalEntry>) {
  const entries = getEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], ...updates };
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }
}

export function getEntries(): JournalEntry[] {
  const raw = localStorage.getItem(ENTRIES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getEntry(id: string): JournalEntry | undefined {
  return getEntries().find((e) => e.id === id);
}

export function daysAlive(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  const diff = today.getTime() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
