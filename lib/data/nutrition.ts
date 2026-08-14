import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "./user";
import { iso, startOfWeek, todayISO, todayIndex } from "@/lib/date";
import type { DietPlanRow, MealType } from "@/lib/supabase/database.types";

export type MealItem = {
  /** plan meal id, or the food_logs id for anything logged ad hoc. */
  id: string;
  meal_type: MealType;
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged: boolean;
  /** Plan meals can be ticked and unticked; a logged food is already eaten. */
  from_plan: boolean;
};

export type Totals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type NutritionToday = {
  targets: DietPlanRow | null;
  meals: MealItem[];
  eaten: Totals;
  waterMl: number;
  date: string;
};

const EMPTY_TOTALS: Totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/**
 * Today's plate: the meals the diet plan suggests for this weekday, plus
 * anything logged on top. Ticking a suggested meal writes a food_log with
 * source 'plan', so "what was planned" and "what was eaten" stay separate
 * tables and the totals only ever come from food_logs.
 */
export async function getNutritionToday(): Promise<NutritionToday> {
  const date = todayISO();
  const user = await getUser();
  if (!user) {
    return { targets: null, meals: [], eaten: EMPTY_TOTALS, waterMl: 0, date };
  }

  const supabase = await createClient();

  const { data: targets } = await supabase
    .from("diet_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: planMeals }, { data: foodLogs }, { data: water }] = await Promise.all([
    targets
      ? supabase
          .from("diet_plan_meals")
          .select("*")
          .eq("diet_plan_id", targets.id)
          .or(`day_index.eq.${todayIndex()},day_index.is.null`)
          .order("order_index")
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", date)
      .order("logged_at"),
    supabase
      .from("water_logs")
      .select("ml")
      .eq("user_id", user.id)
      .eq("log_date", date),
  ]);

  const logs = foodLogs ?? [];
  const loggedPlanNames = new Set(
    logs.filter((l) => l.source === "plan").map((l) => l.name),
  );

  const meals: MealItem[] = [
    ...(planMeals ?? []).map((m) => ({
      id: m.id,
      meal_type: m.meal_type,
      name: m.name,
      description: m.description ?? "",
      calories: m.calories,
      protein_g: Number(m.protein_g),
      carbs_g: Number(m.carbs_g),
      fat_g: Number(m.fat_g),
      logged: loggedPlanNames.has(m.name),
      from_plan: true,
    })),
    ...logs
      .filter((l) => l.source !== "plan")
      .map((l) => ({
        id: l.id,
        meal_type: l.meal_type,
        name: l.name,
        description: l.serving ?? "Logged by you",
        calories: l.calories,
        protein_g: Number(l.protein_g),
        carbs_g: Number(l.carbs_g),
        fat_g: Number(l.fat_g),
        logged: true,
        from_plan: false,
      })),
  ];

  return {
    targets: targets ?? null,
    meals,
    eaten: sumTotals(logs),
    waterMl: (water ?? []).reduce((n, w) => n + w.ml, 0),
    date,
  };
}

export function sumTotals(rows: Totals[]): Totals {
  return rows.reduce(
    (a, r) => ({
      calories: a.calories + Number(r.calories),
      protein_g: a.protein_g + Number(r.protein_g),
      carbs_g: a.carbs_g + Number(r.carbs_g),
      fat_g: a.fat_g + Number(r.fat_g),
    }),
    { ...EMPTY_TOTALS },
  );
}

/** How many days this week hit the protein target — one of the dashboard goals. */
export async function getProteinDaysThisWeek(targetG: number) {
  const user = await getUser();
  if (!user || targetG <= 0) return 0;

  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select("log_date, protein_g")
    .eq("user_id", user.id)
    .gte("log_date", iso(startOfWeek()));

  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    byDate.set(row.log_date, (byDate.get(row.log_date) ?? 0) + Number(row.protein_g));
  }
  return [...byDate.values()].filter((g) => g >= targetG).length;
}
