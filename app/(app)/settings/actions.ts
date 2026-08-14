"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { onboardingPatchSchema } from "@/lib/validation/onboarding";

export type UpdateResult =
  | { ok: true; persisted: boolean }
  | { ok: false; error: string };

/** Saves profile edits from the settings screen. */
export async function updateProfile(patch: unknown): Promise<UpdateResult> {
  const parsed = onboardingPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: "Some of those values did not look right." };
  }

  if (!isSupabaseConfigured()) return { ok: true, persisted: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "We could not save your changes. Please try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, persisted: true };
}
