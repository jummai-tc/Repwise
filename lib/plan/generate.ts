import "server-only";

import { createClient } from "@/lib/supabase/server";
import { buildStarterPlan } from "./starter";
import { buildTargets } from "./nutrition";
import { allowedMeals, MEAL_SPLIT } from "./meals";
import { generateWorkoutPlan } from "@/lib/ai/workout";
import { generateDietPlan, type GeneratedMeal } from "@/lib/ai/diet";
import type { StarterPlan } from "./starter";
import type { NutritionTargets } from "./nutrition";
import type {
  ExerciseRow,
  MealType,
  ProfileRow,
} from "@/lib/supabase/database.types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export type GenerateResult = { ok: true } | { ok: false; error: string };

/**
 * Creates (or replaces) the signed-in user's training plan and diet plan from
 * their profile. Called when onboarding finishes and from the "rebuild my
 * plan" button, so changing an answer in the profile can be reflected in the
 * plan without leaving the app.
 *
 * Both plans are written by Gemini when GEMINI_API_KEY is set, and by the
 * rules engines in ./starter and ./meals when it is not — or when the model is
 * unreachable, out of free-tier quota, or returns something that fails
 * validation. That fallback is not a nicety: a user who finishes onboarding
 * must end up with a plan, and "the AI was busy" is not an acceptable reason
 * to leave them with an empty app.
 *
 * The previous plan is archived rather than deleted — logged sessions point at
 * its days, and history should survive a rebuild.
 */
export async function generatePlanForUser(): Promise<GenerateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { ok: false, error: "We could not find your profile." };

  const { data: library, error: libraryError } = await supabase
    .from("exercises")
    .select("*");

  if (libraryError || !library || library.length === 0) {
    return {
      ok: false,
      error:
        "The exercise library is empty — run supabase/migrations/0002_exercise_library.sql first.",
    };
  }

  // Macro targets are arithmetic, not judgement, so they are settled before
  // either model call and the diet generator writes meals to fit them.
  const targets = buildTargets(profile);

  // Two independent requests, so they go together rather than one after the
  // other — this runs while someone waits on the last step of onboarding.
  const [aiPlan, aiDiet] = await Promise.all([
    generateWorkoutPlan(profile, library),
    generateDietPlan(profile, targets),
  ]);

  const workoutResult = await writeWorkoutPlan(
    supabase,
    user.id,
    profile,
    library,
    aiPlan,
  );
  if (!workoutResult.ok) return workoutResult;

  return writeDietPlan(supabase, user.id, profile, targets, aiDiet);
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function writeWorkoutPlan(
  supabase: Client,
  userId: string,
  profile: ProfileRow,
  library: ExerciseRow[],
  aiPlan: StarterPlan | null,
): Promise<GenerateResult> {
  const plan = aiPlan ?? buildStarterPlan(profile, library);

  await supabase
    .from("workout_plans")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: planRow, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      name: plan.name,
      goal: plan.goal,
      location: plan.location,
      days_per_week: plan.days_per_week,
      weeks: plan.weeks,
      status: "active",
      generated_by: aiPlan ? "gemini" : "template",
      ai_rationale: plan.ai_rationale,
    })
    .select("id")
    .single();

  if (planError || !planRow) {
    return { ok: false, error: "We could not build your training plan." };
  }

  const { data: dayRows, error: daysError } = await supabase
    .from("plan_days")
    .insert(
      plan.days.map((d) => ({
        plan_id: planRow.id,
        user_id: userId,
        day_index: d.day_index,
        title: d.title,
        focus: d.focus,
        est_minutes: d.est_minutes,
        is_rest_day: d.is_rest_day,
      })),
    )
    .select("id, day_index");

  if (daysError || !dayRows) {
    return { ok: false, error: "We could not build your training week." };
  }

  const dayIdByIndex = new Map(dayRows.map((d) => [d.day_index, d.id]));
  const exercises = plan.days.flatMap((day) =>
    day.exercises.map((ex) => ({
      plan_day_id: dayIdByIndex.get(day.day_index)!,
      user_id: userId,
      exercise_id: ex.exercise_id,
      name: ex.name,
      order_index: ex.order_index,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes,
    })),
  );

  if (exercises.length > 0) {
    const { error } = await supabase.from("plan_exercises").insert(exercises);
    if (error) return { ok: false, error: "We could not save your exercises." };
  }

  return { ok: true };
}

async function writeDietPlan(
  supabase: Client,
  userId: string,
  profile: ProfileRow,
  targets: NutritionTargets,
  aiDiet: { meals: GeneratedMeal[]; rationale: string | null } | null,
): Promise<GenerateResult> {
  await supabase
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: dietRow, error: dietError } = await supabase
    .from("diet_plans")
    .insert({
      user_id: userId,
      status: "active",
      ...targets,
      // The numbers are always ours; only the explanation of them is the
      // model's, and only when it produced one.
      ai_rationale: aiDiet?.rationale ?? targets.ai_rationale,
    })
    .select("id")
    .single();

  if (dietError || !dietRow) {
    return { ok: false, error: "We could not work out your nutrition targets." };
  }

  const meals = (aiDiet?.meals ?? buildLibraryMeals(profile, targets)).map((m) => ({
    diet_plan_id: dietRow.id,
    user_id: userId,
    ...m,
  }));

  if (meals.length > 0) {
    const { error } = await supabase.from("diet_plan_meals").insert(meals);
    if (error) return { ok: false, error: "We could not save your meal plan." };
  }

  return { ok: true };
}

/**
 * The fallback week, rotated out of the static meal library. Used when there
 * is no API key, or when the model call did not produce a usable seven days.
 */
function buildLibraryMeals(
  profile: ProfileRow,
  targets: NutritionTargets,
): GeneratedMeal[] {
  const pool = allowedMeals(profile.dietary_preference, profile.allergies ?? []);
  const meals: GeneratedMeal[] = [];

  for (let day = 1; day <= 7; day++) {
    let order = 0;
    for (const type of MEAL_TYPES) {
      const options = pool.filter((m) => m.meal_type === type);
      if (options.length === 0) continue;

      // Rotate through the library across the week so it is not the same
      // breakfast seven days running.
      const template = options[(day - 1) % options.length];
      const wanted = targets.daily_calories * MEAL_SPLIT[type];

      // Quarter-serving steps: fine enough to hit the target, coarse enough
      // that the portion is still something a person can actually weigh out.
      const servings = Math.min(
        2.5,
        Math.max(0.5, Math.round((wanted / template.calories) * 4) / 4),
      );

      meals.push({
        day_index: day,
        meal_type: type,
        name: template.name,
        description:
          servings === 1
            ? template.description
            : `${template.description} (×${servings} serving)`,
        calories: Math.round(template.calories * servings),
        protein_g: Math.round(template.protein_g * servings),
        carbs_g: Math.round(template.carbs_g * servings),
        fat_g: Math.round(template.fat_g * servings),
        ingredients: template.ingredients,
        recipe: null,
        order_index: order++,
      });
    }
  }

  return meals;
}
