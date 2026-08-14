/**
 * Calorie and macro maths. Deliberately plain arithmetic — Mifflin-St Jeor for
 * resting burn, a standard activity multiplier for maintenance, then a goal
 * adjustment. Nothing here calls a model, so targets exist the moment someone
 * finishes onboarding.
 */

import type {
  ActivityLevel,
  Goal,
  ProfileRow,
  Sex,
} from "@/lib/supabase/database.types";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

/** Fraction of maintenance added or removed for each goal. */
const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose_fat: -0.2,
  build_muscle: 0.1,
  gain_strength: 0.05,
  improve_endurance: 0,
  maintain: 0,
};

/** Grams of protein per kg of bodyweight. */
const PROTEIN_PER_KG: Record<Goal, number> = {
  lose_fat: 2.2,
  build_muscle: 2,
  gain_strength: 2,
  improve_endurance: 1.6,
  maintain: 1.6,
};

export function ageFrom(dateOfBirth: string | null) {
  if (!dateOfBirth) return 30;
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return 30;
  const years = (Date.now() - born.getTime()) / 31_557_600_000;
  return Math.min(Math.max(Math.round(years), 13), 100);
}

/** Mifflin-St Jeor. Unstated sex uses the midpoint of the two constants. */
export function bmrFor(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex | null;
}) {
  const base = 10 * opts.weightKg + 6.25 * opts.heightCm - 5 * opts.age;
  const constant = opts.sex === "male" ? 5 : opts.sex === "female" ? -161 : -78;
  return Math.round(base + constant);
}

export type NutritionTargets = {
  bmr: number;
  tdee: number;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml_target: number;
  ai_rationale: string;
};

export function buildTargets(profile: ProfileRow): NutritionTargets {
  const weightKg = profile.weight_kg ?? 75;
  const heightCm = profile.height_cm ?? 172;
  const goal = profile.primary_goal ?? "maintain";
  const activity = profile.activity_level ?? "moderate";

  const bmr = bmrFor({
    weightKg,
    heightCm,
    age: ageFrom(profile.date_of_birth),
    sex: profile.sex,
  });

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activity]);

  // Never prescribe below a sane floor, however aggressive the deficit maths.
  const floor = profile.sex === "female" ? 1300 : 1500;
  const daily = Math.max(floor, Math.round(tdee * (1 + GOAL_ADJUSTMENT[goal])));

  const protein = Math.round(weightKg * PROTEIN_PER_KG[goal]);
  const fat = Math.round((daily * 0.25) / 9);
  const carbs = Math.max(50, Math.round((daily - protein * 4 - fat * 9) / 4));
  const water = Math.max(2000, Math.round((weightKg * 35) / 100) * 100);

  return {
    bmr,
    tdee,
    daily_calories: daily,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    water_ml_target: water,
    ai_rationale: rationale({ goal, tdee, daily, protein, weightKg }),
  };
}

function rationale(o: {
  goal: Goal;
  tdee: number;
  daily: number;
  protein: number;
  weightKg: number;
}) {
  const diff = o.daily - o.tdee;
  const direction =
    diff < -20
      ? `a deficit of about ${Math.abs(diff)} kcal`
      : diff > 20
        ? `a surplus of about ${diff} kcal`
        : "roughly maintenance";

  const gPerKg = Math.round((o.protein / o.weightKg) * 10) / 10;

  return (
    `Your maintenance works out at around ${o.tdee.toLocaleString()} kcal a day, ` +
    `so this sits at ${direction} — enough to move the needle without ` +
    `wrecking your recovery. Protein is set at ${gPerKg}g per kg of bodyweight, ` +
    `the range where the research stops showing extra benefit. Fat is held at a ` +
    `quarter of your calories for hormones, and carbohydrate takes the rest ` +
    `because that is what actually fuels your sessions. These numbers update ` +
    `whenever you change your weight or goal in your profile.`
  );
}
