"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";
import { estimateMeal, type MealEstimate } from "@/lib/ai/food";

export type FuelResult = { ok: true } | { ok: false; error: string };

const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const macroSchema = {
  calories: z.number().int().min(0).max(10_000),
  protein_g: z.number().min(0).max(1000),
  carbs_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(1000),
};

const planMealSchema = z.object({
  name: z.string().trim().min(1).max(160),
  meal_type: mealTypeSchema,
  ...macroSchema,
});

const foodSchema = z.object({
  name: z.string().trim().min(1).max(160),
  serving: z.string().trim().max(200).nullable(),
  meal_type: mealTypeSchema,
  source: z.enum(["ai_estimate", "manual"]).default("manual"),
  ...macroSchema,
});

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refresh() {
  revalidatePath("/fuel");
  revalidatePath("/dashboard");
}

export type EstimateResult =
  | { ok: true; estimate: MealEstimate }
  | { ok: false; error: string };

const descriptionSchema = z.string().trim().min(2).max(300);

/**
 * Estimates macros from a description so they do not have to be typed.
 *
 * The signed-in check is not ceremony here. A Server Action is reachable by a
 * direct POST, so without it this would be an open, unauthenticated proxy to
 * our Gemini key that a stranger could drain a free-tier quota through in a
 * couple of minutes.
 */
export async function estimateMealMacros(input: unknown): Promise<EstimateResult> {
  const parsed = descriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Describe what you ate first." };
  }

  const { user } = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const estimate = await estimateMeal(parsed.data);

  if (!estimate) {
    return {
      ok: false,
      error: "We could not work that one out — enter the numbers by hand.",
    };
  }

  return { ok: true, estimate };
}

/**
 * Ticking a planned meal copies it into food_logs with source 'plan'. The plan
 * stays a plan; only food_logs ever counts towards the day's totals.
 */
export async function logPlanMeal(input: unknown): Promise<FuelResult> {
  const parsed = planMealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That meal did not look right." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    log_date: todayISO(),
    meal_type: parsed.data.meal_type,
    name: parsed.data.name,
    serving: "From your plan",
    calories: parsed.data.calories,
    protein_g: parsed.data.protein_g,
    carbs_g: parsed.data.carbs_g,
    fat_g: parsed.data.fat_g,
    source: "plan",
  });

  if (error) return { ok: false, error: "We could not log that meal." };

  refresh();
  return { ok: true };
}

/** Unticking a planned meal removes today's log for it. */
export async function unlogPlanMeal(name: unknown): Promise<FuelResult> {
  const parsed = z.string().trim().min(1).max(160).safeParse(name);
  if (!parsed.success) return { ok: false, error: "That meal did not look right." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("log_date", todayISO())
    .eq("source", "plan")
    .eq("name", parsed.data);

  if (error) return { ok: false, error: "We could not undo that." };

  refresh();
  return { ok: true };
}

/** Anything eaten that was not on the plan. */
export async function addFoodLog(input: unknown): Promise<FuelResult> {
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Those numbers did not look right." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    log_date: todayISO(),
    ...parsed.data,
  });

  if (error) return { ok: false, error: "We could not save that meal." };

  refresh();
  return { ok: true };
}

export async function deleteFoodLog(id: unknown): Promise<FuelResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "That meal could not be found." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("id", parsed.data);

  if (error) return { ok: false, error: "We could not remove that meal." };

  refresh();
  return { ok: true };
}

/**
 * Water is stored as individual pours rather than a running total, so the
 * history stays honest. A negative amount undoes the last one.
 */
export async function addWater(ml: unknown): Promise<FuelResult> {
  const parsed = z.number().int().min(-2000).max(2000).safeParse(ml);
  if (!parsed.success) return { ok: false, error: "That amount did not look right." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const date = todayISO();

  if (parsed.data < 0) {
    const { data: last } = await supabase
      .from("water_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("log_date", date)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!last) return { ok: true };

    const { error } = await supabase.from("water_logs").delete().eq("id", last.id);
    if (error) return { ok: false, error: "We could not undo that." };
  } else {
    const { error } = await supabase.from("water_logs").insert({
      user_id: user.id,
      log_date: date,
      ml: parsed.data,
    });
    if (error) return { ok: false, error: "We could not save that." };
  }

  refresh();
  return { ok: true };
}
