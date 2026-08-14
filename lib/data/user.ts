import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * Every read in lib/data starts here. RLS is the real guard — these helpers
 * exist so a page never has to think about "what if there is no session".
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** For pages that cannot render at all without a session. */
export async function requireUser(next?: string) {
  const user = await getUser();
  if (!user) {
    redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  }
  return user;
}

export async function getProfile(): Promise<ProfileRow | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/** "Alex Morgan" -> "Alex". Falls back to the email local part, then a greeting-safe default. */
export function firstName(profile: { full_name: string | null; email: string | null } | null) {
  const name = profile?.full_name?.trim();
  if (name) return name.split(/\s+/)[0];
  const local = profile?.email?.split("@")[0];
  if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  return "there";
}
