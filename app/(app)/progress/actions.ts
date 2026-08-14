"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";

export type MetricResult = { ok: true } | { ok: false; error: string };

const optionalCm = z.number().min(10).max(300).nullable().optional();

const metricsSchema = z.object({
  weight_kg: z.number().min(20).max(400).nullable().optional(),
  body_fat_pct: z.number().min(1).max(70).nullable().optional(),
  chest_cm: optionalCm,
  waist_cm: optionalCm,
  hips_cm: optionalCm,
  arm_cm: optionalCm,
  thigh_cm: optionalCm,
});

/**
 * One row per day: weighing in twice updates the day rather than adding a
 * second point, which is what the unique (user_id, recorded_on) index enforces.
 * The profile's current weight is kept in step so the plan maths stays honest.
 */
export async function recordBodyMetrics(input: unknown): Promise<MetricResult> {
  const parsed = metricsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Those numbers did not look right." };

  const values = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined && v !== null),
  );
  if (Object.keys(values).length === 0) {
    return { ok: false, error: "Enter at least one measurement." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase
    .from("body_metrics")
    .upsert(
      { user_id: user.id, recorded_on: todayISO(), ...values },
      { onConflict: "user_id,recorded_on" },
    );

  if (error) return { ok: false, error: "We could not save that. Please try again." };

  if (typeof values.weight_kg === "number") {
    await supabase
      .from("profiles")
      .update({ weight_kg: values.weight_kg })
      .eq("id", user.id);
  }

  revalidatePath("/progress");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}
