import type { SupabaseClient } from '@supabase/supabase-js';

type RecordObject = Record<string, unknown>;
function record(value: unknown): RecordObject {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('备份格式不正确。');
  return value as RecordObject;
}

async function restoredId(owner: string, entry: RecordObject, timestamp: string, index: number) {
  const id = typeof entry.id === 'string' ? entry.id : '';
  if (/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return id.toLowerCase();
  const seed = JSON.stringify([owner, id || [timestamp, entry.content, index]]);
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed))).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
}

export async function restoreJournal(db: SupabaseClient, file: RecordObject, owner: { id: string; email: string; birthdate: string }) {
  record(file);
  const profile = file.profile ? record(file.profile) : {};
  if ((profile.id && profile.id !== owner.id) || (typeof profile.email === 'string' && profile.email.toLowerCase() !== owner.email.toLowerCase())) throw Error('这份备份属于另一个账号。');
  if (!Array.isArray(file.entries)) throw Error('请选择 Odyssey 日记备份或 iBetter「存在」导入文件。');
  const rows = await Promise.all(file.entries.map(async (value: unknown, i: number) => {
    const entry = record(value);
    if (entry.userId && entry.userId !== owner.id) throw Error('备份包含其他账号的日记。');
    const timestamp = entry.createdAt ?? entry.timestamp;
    if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp)) || typeof entry.content !== 'string'
      || (entry.tags != null && (!Array.isArray(entry.tags) || !entry.tags.every(t => typeof t === 'string')))) throw Error(`第 ${i + 1} 篇日记的数据不完整。`);
    return { id: await restoredId(owner.id, entry, timestamp, i), user_id: owner.id, content: entry.content,
      created_at: timestamp, summary: typeof entry.summary === 'string' ? entry.summary : '', tags: entry.tags ?? [],
      day_number: Number.isInteger(entry.dayNumber) ? entry.dayNumber : Math.floor((Date.parse(timestamp) - Date.parse(owner.birthdate)) / 86400000) + 1 };
  }));
  let added = 0;
  for (let start = 0; start < rows.length; start += 60) {
    const batch = rows.slice(start, start + 60);
    const { data, error } = await db.from('journal_entries').upsert(batch, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (error) throw Error('导入中断，重新选择同一份备份可以继续。');
    added += data.length;
    const ids = [...new Set(batch.map(row => row.id))];
    const check = await db.from('journal_entries').select('id').eq('user_id',owner.id).in('id',ids);
    if (check.error || check.data.length !== ids.length) throw Error('部分日记未能核对，请检查账号后重试。');
  }
  return added;
}
