"use server";

import { getReader, getSupabaseServer } from "@/lib/db";
import { revalidatePath } from "next/cache";

import { isAvatar } from "@/lib/avatar";

async function getUserId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return user.id;
}

export async function getProfile() {
  const { db: supabase, user } = await getReader();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, birthdate")
    .eq("id", user.id)
    .single();

  if (error) throw new Error("资料暂时无法读取，请重试。");
  return { id: String(data.id), name: String(data.name), birthdate: String(data.birthdate), email: user.email ?? "",
    avatar: isAvatar(user.user_metadata?.odyssey_avatar) ? user.user_metadata.odyssey_avatar as string : null };
}

export async function updateProfile(data: { name?: string }) {
  if (!data.name?.trim()) throw new Error("请输入昵称。");
  const userId = await getUserId();
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ name: data.name, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function saveAvatar(photo: string | null) {
  if (photo !== null && !isAvatar(photo)) throw new Error("头像格式不正确");
  const db = await getSupabaseServer();
  const { error } = await db.auth.updateUser({ data: { odyssey_avatar: photo } });
  if (error) throw new Error("头像保存失败");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function daysAlive(birthdate: string): Promise<number> {
  const birth = new Date(birthdate);
  const today = new Date();
  const diff = today.getTime() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; // birth day = 1
}
