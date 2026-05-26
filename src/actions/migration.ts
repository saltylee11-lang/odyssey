"use server";

import { getSupabaseServer } from "@/lib/db";

interface LocalEntry {
  id?: string;
  content: string;
  summary: string;
  tags?: string[];
  timestamp: string;
  aiResponse?: string | null;
  userReply?: string | null;
}

interface LocalUser {
  name: string;
  email: string;
  birthdate: string;
}

export async function importLocalData(localUser: LocalUser, localEntries: LocalEntry[]) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  // Upsert profile birthdate
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("birthdate")
    .eq("id", user.id)
    .single();

  if (!existingProfile || !existingProfile.birthdate) {
    await supabase
      .from("profiles")
      .update({ birthdate: localUser.birthdate, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  let imported = 0;
  for (const entry of localEntries) {
    const birthDate = localUser.birthdate;
    const entryDate = new Date(entry.timestamp);
    const birth = new Date(birthDate);
    const dayNumber = Math.floor((entryDate.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        content: entry.content,
        summary: entry.summary,
        tags: entry.tags ?? [],
        day_number: dayNumber,
        created_at: entryDate.toISOString(),
      });

    if (!error) imported++;
  }

  return { imported };
}
