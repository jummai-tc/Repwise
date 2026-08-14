"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { onboardingPatchSchema } from "@/lib/validation/onboarding";
import { generatePlanForUser } from "@/lib/plan/generate";

export type SaveResult =
  | { ok: true; persisted: boolean }
  | { ok: false; error: string };

/**
 * Persists one step of the wizard. Each step saves as it goes so a drop-off
 * can be resumed rather than restarted.
 *
 * The client validates first for instant feedback; this re-validates because a
 * client can always be bypassed.
 */
export async function saveOnboardingStep(patch: unknown): Promise<SaveResult> {
  const parsed = onboardingPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: "Some of those answers did not look right." };
  }

  // No Supabase project connected yet — let the wizard run end to end so the
  // flow can be reviewed, but be explicit that nothing was written.
  if (!isSupabaseConfigured()) return { ok: true, persisted: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) return { ok: false, error: "We could not save that. Please try again." };

  return { ok: true, persisted: true };
}

/**
 * Marks onboarding done and builds the first training and nutrition plan from
 * the answers, so the app has real content the moment the wizard closes.
 */
export async function completeOnboarding(patch: unknown): Promise<SaveResult> {
  const saved = await saveOnboardingStep(patch);
  if (!saved.ok) return saved;

  if (!isSupabaseConfigured()) return { ok: true, persisted: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true, onboarding_step: 6 })
    .eq("id", user.id);

  if (error) return { ok: false, error: "We could not finish setting you up." };

  // A failed generation must not trap someone in the wizard — they land on the
  // dashboard either way and can rebuild the plan from the training page.
  const generated = await generatePlanForUser();
  if (!generated.ok) {
    console.error("Plan generation failed after onboarding:", generated.error);
  }

  return { ok: true, persisted: true };
}

export async function goToDashboard() {
  redirect("/dashboard");
}
