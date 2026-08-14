import "server-only";

import { z } from "zod";
import { generateJSON, isAIConfigured, type ResponseSchema } from "./gemini";

/**
 * Estimates the macros of a meal from a plain-English description.
 *
 * This is the one AI feature with no deterministic fallback, and that is fine:
 * the macro fields on the fuel page are optional and already typed by hand.
 * Without a key the button simply is not offered, and logging works exactly as
 * it did before.
 *
 * The estimate comes back with the portion it assumed, which is shown to the
 * user. That matters more than the accuracy of any single number — "2 large
 * eggs, 2 slices of wholemeal toast, 10g butter" lets someone see at a glance
 * whether the guess matches what they actually ate, and correct it if not.
 */

export type MealEstimate = {
  name: string;
  serving: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const validator = z.object({
  // False for anything that is not food — the model is better at saying "that
  // is not a meal" than we are at pattern-matching it out of the input.
  recognised: z.boolean(),
  name: z.string().trim().max(160).nullish(),
  serving: z.string().trim().max(200).nullish(),
  calories: z.number().min(0).max(10_000).nullish(),
  protein_g: z.number().min(0).max(1000).nullish(),
  carbs_g: z.number().min(0).max(1000).nullish(),
  fat_g: z.number().min(0).max(1000).nullish(),
});

const RESPONSE_SCHEMA: ResponseSchema = {
  type: "object",
  properties: {
    recognised: {
      type: "boolean",
      description:
        "True if the text describes food or drink you can estimate. False " +
        "for anything else, including gibberish and empty descriptions.",
    },
    name: {
      type: "string",
      description:
        "A tidy name for the meal, e.g. 'Scrambled eggs on toast'. Title " +
        "case, no portion sizes — those go in serving.",
    },
    serving: {
      type: "string",
      description:
        "The exact portion you assumed, with weights. e.g. '2 large eggs, " +
        "2 slices wholemeal toast, 10g butter'.",
    },
    calories: { type: "integer" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
  },
  required: ["recognised"],
  propertyOrdering: [
    "recognised",
    "name",
    "serving",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
  ],
};

const SYSTEM = `
You estimate the calories and macronutrients of a described meal.

- Where a portion is not given, assume an ordinary adult serving and say in
  'serving' exactly what you assumed. Never ask a follow-up question; make a
  sensible assumption and state it.
- Where a brand is named, use that brand's figures. Otherwise use generic
  supermarket values.
- Assume normal preparation — cooked in a little oil, milk in tea — unless
  told otherwise.
- Macros must be roughly consistent with the calorie figure: protein and carbs
  are 4 kcal per gram, fat is 9. Check that before answering.
- Round to whole numbers. False precision helps nobody.
- Return numbers only. Do not comment on the food, do not judge it, and do not
  suggest a healthier alternative. You are a nutrition label, not a coach.
`.trim();

export async function estimateMeal(
  description: string,
): Promise<MealEstimate | null> {
  if (!isAIConfigured()) return null;

  const result = await generateJSON({
    system: SYSTEM,
    prompt: `Estimate the macros for: ${description}`,
    schema: RESPONSE_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 2000,
    // A macro lookup does not need deliberation, and this one blocks a button.
    thinkingLevel: "low",
    timeoutMs: 20_000,
    validate: (value) => {
      const parsed = validator.safeParse(value);
      return parsed.success ? parsed.data : null;
    },
  });

  // A recognised meal with no calorie figure is not an estimate. Treated as a
  // failure so the user gets the manual fields rather than a row of zeroes.
  if (!result?.recognised || result.calories == null) return null;

  return {
    name: result.name?.trim() || description.trim().slice(0, 160),
    serving: result.serving?.trim() || "Estimated portion",
    calories: Math.round(result.calories),
    protein_g: Math.round(result.protein_g ?? 0),
    carbs_g: Math.round(result.carbs_g ?? 0),
    fat_g: Math.round(result.fat_g ?? 0),
  };
}
