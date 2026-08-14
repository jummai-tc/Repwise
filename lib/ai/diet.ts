import "server-only";

import { z } from "zod";
import { generateJSON, isAIConfigured, type ResponseSchema } from "./gemini";
import { describeProfile, SAFETY_RULES } from "./context";
import { MEAL_SPLIT } from "@/lib/plan/meals";
import type { NutritionTargets } from "@/lib/plan/nutrition";
import type { MealType, ProfileRow } from "@/lib/supabase/database.types";

/**
 * Writes a week of meals with Gemini.
 *
 * Note what the model is and is not asked to do. The calorie and macro targets
 * stay with `buildTargets` — Mifflin-St Jeor plus an activity multiplier is
 * arithmetic, it is auditable, and it enforces the minimum-calorie floor. A
 * language model is not better at that, and being wrong there is the one thing
 * in this app that could actually harm someone.
 *
 * What the model is good at is the part the old meal library could never do:
 * real food this specific person will eat, respecting their diet, their
 * allergies and their goal, without serving the same seven breakfasts on
 * rotation. So it gets the targets as a constraint and writes meals to fit.
 *
 * It asks for four distinct daily menus rather than seven, and rotates them
 * across the week. That is partly latency — seven days of JSON took about a
 * minute to generate, and this call blocks the last step of onboarding — and
 * partly that nobody shops for twenty-eight different meals. Four menus on
 * rotation is what a real week looks like.
 *
 * Returns null on failure; the caller falls back to the static library.
 */

/** Distinct daily menus requested, then rotated across the seven days. */
const MENU_COUNT = 4;

export type GeneratedMeal = {
  day_index: number;
  meal_type: MealType;
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
  recipe: string | null;
  order_index: number;
};

export type GeneratedDiet = {
  meals: GeneratedMeal[];
  rationale: string | null;
};

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const validator = z.object({
  rationale: z.string().trim().max(1200).nullish(),
  menus: z
    .array(
      z.object({
        meals: z
          .array(
            z.object({
              meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
              name: z.string().trim().min(1).max(160),
              description: z.string().trim().min(1).max(400),
              calories: z.number().int().min(0).max(3000),
              protein_g: z.number().min(0).max(300),
              carbs_g: z.number().min(0).max(500),
              fat_g: z.number().min(0).max(200),
              ingredients: z.array(z.string().trim().min(1).max(80)).max(15),
              recipe: z.string().trim().max(400).nullish(),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .min(1)
    .max(MENU_COUNT),
});

const RESPONSE_SCHEMA: ResponseSchema = {
  type: "object",
  properties: {
    rationale: {
      type: "string",
      description:
        "2-4 sentences addressed to the user, explaining why these calorie " +
        "and protein numbers suit their goal and how to use the plan.",
    },
    menus: {
      type: "array",
      description: `Exactly ${MENU_COUNT} distinct daily menus, each a full day of eating.`,
      minItems: MENU_COUNT,
      maxItems: MENU_COUNT,
      items: {
        type: "object",
        properties: {
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                meal_type: {
                  type: "string",
                  enum: ["breakfast", "lunch", "dinner", "snack"],
                },
                name: { type: "string", description: "e.g. 'Chicken burrito bowl'" },
                description: {
                  type: "string",
                  description:
                    "The portion, in weights a person can measure. e.g. " +
                    "'150g chicken thigh, 80g rice (dry), black beans, salsa'",
                },
                calories: { type: "integer" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                ingredients: {
                  type: "array",
                  description: "Shopping-list items, no quantities.",
                  items: { type: "string" },
                },
                recipe: {
                  type: "string",
                  description: "One or two sentences on how to make it.",
                },
              },
              required: [
                "meal_type",
                "name",
                "description",
                "calories",
                "protein_g",
                "carbs_g",
                "fat_g",
                "ingredients",
              ],
              propertyOrdering: [
                "meal_type",
                "name",
                "description",
                "calories",
                "protein_g",
                "carbs_g",
                "fat_g",
                "ingredients",
                "recipe",
              ],
            },
          },
        },
        required: ["meals"],
        propertyOrdering: ["meals"],
      },
    },
  },
  required: ["menus"],
  propertyOrdering: ["rationale", "menus"],
};

const SYSTEM = `
You are a sports dietitian writing one week of meals for a specific person.

The calorie and macro targets have already been calculated and are not yours
to change. Your job is to write food that hits them.

How to write the week:
- Every day must land within 5% of the daily calorie target and within 10g of
  the protein target. Check your own arithmetic before you answer: the meals
  in a day must add up.
- Describe portions in grams or standard household measures, so the number can
  actually be hit. "150g chicken breast" is useful; "some chicken" is not.
- Give macros per portion as described, not per 100g.
- Every menu must be genuinely different from the others. They will be rotated
  across the week, so four near-identical menus means eating the same thing
  every day.
- Keep it ordinary and cheap to shop for. Everyday ingredients from a normal
  supermarket, nothing that needs a specialist shop or an hour of prep.
- Respect the stated diet absolutely, and treat every stated allergy as a
  total exclusion including traces and derivatives. If they are allergic to
  nuts, no nut butters, no nut oils, no marzipan.
- Protein at every main meal. That is the target people miss.

${SAFETY_RULES}
`.trim();

export async function generateDietPlan(
  profile: ProfileRow,
  targets: NutritionTargets,
): Promise<GeneratedDiet | null> {
  if (!isAIConfigured()) return null;

  const split = MEAL_ORDER.map(
    (type) =>
      `- ${type}: about ${Math.round(targets.daily_calories * MEAL_SPLIT[type])} kcal`,
  ).join("\n");

  const prompt = `
Write ${MENU_COUNT} distinct daily menus for this person. Each menu is one full
day of eating, and they will be rotated across the week.

ABOUT THEM
${describeProfile(profile)}

DAILY TARGETS — every day must hit these
- Calories: ${targets.daily_calories} kcal
- Protein: ${targets.protein_g}g
- Carbohydrate: ${targets.carbs_g}g
- Fat: ${targets.fat_g}g

Suggested split across the day (adjust if it suits them better, but the daily
total is what matters):
${split}

Give each menu breakfast, lunch, dinner and one snack.
`.trim();

  const result = await generateJSON({
    system: SYSTEM,
    prompt,
    schema: RESPONSE_SCHEMA,
    temperature: 0.8,
    // Four menus of JSON plus the model's thinking, which shares this budget.
    maxOutputTokens: 24_000,
    timeoutMs: 60_000,
    validate: (value) => {
      const parsed = validator.safeParse(value);
      return parsed.success ? parsed.data : null;
    },
  });

  if (!result || result.menus.length === 0) return null;

  const meals: GeneratedMeal[] = [];

  for (let day = 1; day <= 7; day++) {
    const menu = result.menus[(day - 1) % result.menus.length];

    // Sort into eating order so the fuel page reads top to bottom through the
    // day regardless of the order the model happened to emit them in.
    const ordered = [...menu.meals].sort(
      (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type),
    );

    ordered.forEach((meal, i) => {
      meals.push({
        day_index: day,
        meal_type: meal.meal_type,
        name: meal.name,
        description: meal.description,
        calories: Math.round(meal.calories),
        protein_g: Math.round(meal.protein_g * 10) / 10,
        carbs_g: Math.round(meal.carbs_g * 10) / 10,
        fat_g: Math.round(meal.fat_g * 10) / 10,
        ingredients: meal.ingredients,
        recipe: meal.recipe?.trim() || null,
        order_index: i,
      });
    });
  }

  return { meals, rationale: result.rationale?.trim() || null };
}
