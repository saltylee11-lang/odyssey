"use server";

import { getSupabaseServer } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { daysAlive } from "./profile";

async function getUserId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return user.id;
}

export async function createEntry(content: string, tags: string[], birthdate: string) {
  const userId = await getUserId();
  const dayNumber = await daysAlive(birthdate);
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      content,
      summary: "",
      tags,
      day_number: dayNumber,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  return data as { id: string };
}

export async function createEntryWithAI(
  content: string,
  tags: string[],
  birthdate: string,
  aiReply: string,
  summary: string,
  userReply?: string
) {
  const userId = await getUserId();
  const dayNumber = await daysAlive(birthdate);
  const supabase = await getSupabaseServer();
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      content,
      summary,
      tags,
      day_number: dayNumber,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const messages: { entry_id: string; sequence: number; role: string; content: string }[] = [
    { entry_id: (entry as any).id, sequence: 1, role: "assistant", content: aiReply },
  ];
  if (userReply) {
    messages.push({ entry_id: (entry as any).id, sequence: 2, role: "user", content: userReply });
  }
  if (messages.length > 0) {
    await supabase.from("ai_messages").insert(messages);
  }

  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  return entry as { id: string };
}

export async function addAIMessage(entryId: string, role: string, content: string, sequence: number) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();

  // Verify ownership
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();

  if (!entry) throw new Error("记录不存在");

  const { error } = await supabase
    .from("ai_messages")
    .insert({ entry_id: entryId, role, content, sequence });

  if (error) throw new Error(error.message);
  revalidatePath(`/journal/${entryId}`);
}

export async function updateEntrySummary(entryId: string, summary: string) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("journal_entries")
    .update({ summary })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/journal/${entryId}`);
}

export async function getEntries(limit = 20, offset = 0) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEntry);
}

export async function getEntry(id: string) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return mapEntry(data);
}

export async function getEntryWithMessages(id: string) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !entry) return null;

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("entry_id", id)
    .order("sequence", { ascending: true });

  return { ...mapEntry(entry), messages: messages ?? [] };
}

export async function deleteEntry(id: string) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/timeline");
}

export async function searchEntries(query: string, tags: string[] = []) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();

  let q = supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (query) {
    q = q.or(`content.ilike.%${query}%,summary.ilike.%${query}%`);
  }

  if (tags.length > 0) {
    q = q.overlaps("tags", tags);
  }

  const { data, error } = await q;

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEntry);
}

// Map snake_case DB columns to camelCase for the frontend
function mapEntry(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    summary: row.summary,
    tags: row.tags ?? [],
    dayNumber: row.day_number,
    createdAt: row.created_at,
  };
}
