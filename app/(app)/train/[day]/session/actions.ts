"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { bumpStreak } from "@/lib/streaks";
import { evaluateAchievements } from "@/lib/achievements";

const setSchema = z.object({
  exercise_id: z.uuid().nullable(),
  exercise_name: z.string().trim().min(1).max(120),
  set_number: z.number().int().min(1).max(60),
  reps: z.number().int().min(0).max(1000).nullable(),
  weight_kg: z.number().min(0).max(1000).nullable(),
  is_warmup: z.boolean().default(false),
});

const finishSchema = z.object({
  plan_day_id: z.uuid().nullable(),
  title: z.string().trim().max(120).nullable(),
  started_at: z.iso.datetime(),
  duration_seconds: z.number().int().min(0).max(86_400),
  sets: z.array(setSchema).max(300),
});

export type FinishResult =
  | { ok: true; volume_kg: number; sets: number; unlocked: string[] }
  | { ok: false; error: string };

/**
 * Writes a finished session: the session row, every completed set, then the
 * streak and any badges that unlocked. The client sends only completed sets —
 * an abandoned set should not end up in the history.
 */
export async function finishWorkout(payload: unknown): Promise<FinishResult> {
  const parsed = finishSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "That workout did not look right. Nothing was saved." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { sets, ...session } = parsed.data;

  // Volume is computed here rather than trusted from the client — it drives
  // achievements and the progress charts.
  const volume =
    Math.round(
      sets.reduce((n, s) => n + (s.reps ?? 0) * (s.weight_kg ?? 0), 0) * 10,
    ) / 10;

  const { data: sessionRow, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      plan_day_id: session.plan_day_id,
      title: session.title,
      started_at: session.started_at,
      completed_at: new Date().toISOString(),
      duration_seconds: session.duration_seconds,
      total_volume_kg: volume,
    })
    .select("id")
    .single();

  if (sessionError || !sessionRow) {
    return { ok: false, error: "We could not save that workout. Please try again." };
  }

  if (sets.length > 0) {
    const { error } = await supabase.from("set_logs").insert(
      sets.map((s) => ({
        session_id: sessionRow.id,
        user_id: user.id,
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        reps: s.reps,
        weight_kg: s.weight_kg,
        is_warmup: s.is_warmup,
      })),
    );

    if (error) {
      return { ok: false, error: "We saved the session but not every set. Please check your log." };
    }
  }

  const streak = await bumpStreak(supabase, user.id);
  const unlocked = await evaluateAchievements(supabase, user.id, streak);

  revalidatePath("/dashboard");
  revalidatePath("/train");
  revalidatePath("/progress");

  return { ok: true, volume_kg: volume, sets: sets.length, unlocked };
}
