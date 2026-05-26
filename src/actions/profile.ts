"use server";

import { getSupabaseServer } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return user.id;
}

export async function getProfile() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, name, birthdate")
    .eq("id", user.id)
    .single();

  return data as { id: string; name: string; birthdate: string } | null;
}

export async function updateProfile(data: { name?: string }) {
  const userId = await getUserId();
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ name: data.name, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function daysAlive(birthdate: string): Promise<number> {
  const birth = new Date(birthdate);
  const today = new Date();
  const diff = today.getTime() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; // birth day = 1
}
