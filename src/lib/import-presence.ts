import type { SupabaseClient } from "@supabase/supabase-js";

type PresenceEntry = { date: string; timestamp: string; content: string };
type PresenceFile = { email: string; entries: PresenceEntry[] };

const DAY = 86_400_000;

async function presenceId(userId: string, date: string) {
  const input = new TextEncoder().encode(`Odyssey/iBetter/存在/${userId}/${date}`);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", input)).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export async function importPresence(db: SupabaseClient, file: PresenceFile) {
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user?.email || user.email.toLowerCase() !== file.email?.toLowerCase()) {
    throw Error("请切换到导入文件对应的 Odyssey 账号。");
  }
  const { data: profile, error } = await db.from("profiles").select("birthdate").eq("id", user.id).single();
  if (error || !profile?.birthdate) throw Error("未能读取生日，请重新登录后再试。");
  if (!Array.isArray(file.entries) || !file.entries.length) throw Error("文件里没有日记。");
  const dates = new Set<string>();
  const records = await Promise.all(file.entries.map(async ({ date, timestamp, content }) => {
    const day = Date.parse(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day) || new Date(day).toISOString().slice(0,10) !== date
      || !Number.isFinite(Date.parse(timestamp)) || typeof content !== "string" || !content.trim() || dates.has(date)) {
      throw Error("文件包含无效或重复的打卡日期，请检查原表。");
    }
    dates.add(date);
    return { id: await presenceId(user.id, date), user_id: user.id, day_number: (day - Date.parse(profile.birthdate)) / DAY + 1,
      content, summary: "", tags: ["iBetter", "存在"], created_at: timestamp };
  }));
  let inserted = 0;
  for (let offset = 0; offset < records.length; offset += 80) {
    const batch = records.slice(offset, offset + 80);
    const days = batch.map(r => r.day_number);
    const readDays = async () => {
      const found = new Map<string, Set<string>>();
      let cursor: string | undefined;
      while (true) {
        let query = db.from("journal_entries").select("id,day_number,content").eq("user_id", user.id)
          .in("day_number", days).order("id").limit(500);
        if (cursor) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error) throw Error("读取已有日记失败，可以重试。");
        for (const row of data) {
          const key = String(row.day_number);
          if (!found.has(key)) found.set(key, new Set());
          found.get(key)!.add(row.content);
        }
        if (data.length < 500) return found;
        cursor = data[data.length - 1].id;
      }
    };
    const existing = await readDays();
    const missing = batch.filter(r => !existing.get(String(r.day_number))?.has(r.content));
    if (!missing.length) continue;
    const { data, error } = await db.from("journal_entries").upsert(missing,
      { onConflict: "id", ignoreDuplicates: true }).select("id");
    if (error) throw Error("这批日记没有写完。重新选择同一文件可以继续。");
    inserted += data.length;
    const verified = await readDays();
    if (batch.some(r => !verified.get(String(r.day_number))?.has(r.content))) {
      throw Error("同一日期的导入记录内容有变化，已保留原日记。");
    }
  }
  return { inserted, verified: records.length };
}
