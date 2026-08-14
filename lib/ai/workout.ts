import "server-only";

import { z } from "zod";
import { generateJSON, isAIConfigured, type ResponseSchema } from "./gemini";
import { describeProfile, SAFETY_RULES } from "./context";
import { candidatesFor, type PlannedDay, type StarterPlan } from "@/lib/plan/starter";
import type { ExerciseRow, ProfileRow } from "@/lib/supabase/database.types";

/**
 * Writes a training week with Gemini.
 *
 * The model chooses the split, which movements go in which session, and the
 * sets, reps and rest — the parts that genuinely benefit from judgement about
 * a specific person. It does not get to invent exercises: it picks slugs from
 * the seeded library, so every row still points at a real `exercises.id` with
 * real instructions and cues behind it, and the session player keeps working.
 *
 * Returns null on any failure. The caller falls back to `buildStarterPlan`,
 * which is why nothing here tries very hard to rescue a bad response.
 */

const dayValidator = z.object({
  day_index: z.number().int().min(1).max(7),
  title: z.string().trim().min(1).max(60),
  focus: z.string().trim().max(80).nullish(),
  is_rest_day: z.boolean(),
  exercises: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        sets: z.number().int().min(1).max(10),
        // Free text because a plan legitimately says "8-12", "5" or "30s".
        reps: z.string().trim().min(1).max(20),
        rest_seconds: z.number().int().min(15).max(300),
        notes: z.string().trim().max(160).nullish(),
      }),
    )
    .max(10),
});

const planValidator = z.object({
  name: z.string().trim().min(1).max(60),
  rationale: z.string().trim().min(1).max(1200),
  days: z.array(dayValidator).min(1).max(7),
});

type AIPlan = z.infer<typeof planValidator>;

/** The shape handed to Gemini's JSON mode. Zod above is what actually gates it. */
const RESPONSE_SCHEMA: ResponseSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Short plan name, e.g. 'Push Pull Legs — Hypertrophy'",
    },
    rationale: {
      type: "string",
      description:
        "2-4 sentences addressed to the user explaining why this split, " +
        "these rep ranges and this weekly layout suit them specifically.",
    },
    days: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          day_index: {
            type: "integer",
            description: "1 = Monday through 7 = Sunday. Each appears once.",
          },
          title: {
            type: "string",
            description: "e.g. 'Upper Body A', or 'Rest' on a rest day.",
          },
          focus: {
            type: "string",
            description: "Muscles trained, e.g. 'Chest, shoulders, triceps'.",
          },
          is_rest_day: { type: "boolean" },
          exercises: {
            type: "array",
            description: "Empty on a rest day. In the order to perform them.",
            items: {
              type: "object",
              properties: {
                slug: {
                  type: "string",
                  description: "Must be copied exactly from the catalogue.",
                },
                sets: { type: "integer" },
                reps: {
                  type: "string",
                  description: "A range like '8-12', or '30s' for a hold.",
                },
                rest_seconds: { type: "integer" },
                notes: {
                  type: "string",
                  description:
                    "Optional one-line coaching cue specific to this user.",
                },
              },
              required: ["slug", "sets", "reps", "rest_seconds"],
              propertyOrdering: ["slug", "sets", "reps", "rest_seconds", "notes"],
            },
          },
        },
        required: ["day_index", "title", "is_rest_day", "exercises"],
        propertyOrdering: [
          "day_index",
          "title",
          "focus",
          "is_rest_day",
          "exercises",
        ],
      },
    },
  },
  required: ["name", "rationale", "days"],
  propertyOrdering: ["name", "rationale", "days"],
};

const SYSTEM = `
You are a strength and conditioning coach writing a one-week training plan
that will repeat for four weeks. You write for the person in front of you, not
for a magazine.

How to think about the plan:
- Pick the split from how many days they can actually train, not from what is
  fashionable. Two days means full body. Three often means push/pull/legs or
  full body. Four or more can justify an upper/lower or body-part split.
- Space sessions across the week so the same muscles get 48 hours between hard
  work. Do not stack every session on consecutive days if there is a choice.
- Open each session with its hardest compound movement, while they are fresh,
  then work outwards to isolation.
- Match sets, reps and rest to the goal: heavy and low-rep with long rest for
  strength, moderate reps with moderate rest for muscle, higher reps with
  short rest for fat loss and endurance.
- Fit the session into the time they said they have. Roughly 11 minutes per
  exercise once warm-up and rest are counted. Fewer exercises done properly
  beats more exercises rushed.
- A beginner needs fewer movements and simpler ones. Do not put an advanced
  movement in a beginner's week just because it is effective.

Absolute constraints:
- Every exercise slug MUST be copied exactly from the catalogue you are given.
  Never invent a slug, never guess one, never modify one. The catalogue has
  already been filtered to what this person owns and can reach.
- Return exactly 7 day objects, day_index 1 through 7, each exactly once.
- Days they do not train are rest days: is_rest_day true, empty exercises.
- The number of training days must equal the days per week they gave you.

${SAFETY_RULES}
`.trim();

function catalogue(pool: ExerciseRow[]): string {
  return pool
    .map(
      (ex) =>
        `${ex.slug} | ${ex.name} | ${ex.primary_muscle} | ${ex.equipment} | ` +
        `${ex.difficulty}${ex.is_compound ? " | compound" : ""}`,
    )
    .join("\n");
}

export async function generateWorkoutPlan(
  profile: ProfileRow,
  library: ExerciseRow[],
): Promise<StarterPlan | null> {
  if (!isAIConfigured()) return null;

  const pool = candidatesFor(library, profile);
  if (pool.length === 0) return null;

  const daysPerWeek = Math.min(Math.max(profile.days_per_week ?? 3, 1), 7);

  const prompt = `
Write this person's training week.

ABOUT THEM
${describeProfile(profile)}

EXERCISE CATALOGUE
Format: slug | name | primary muscle | equipment | difficulty | compound
Use only these slugs, copied character for character.

${catalogue(pool)}

Return ${daysPerWeek} training ${daysPerWeek === 1 ? "day" : "days"} and ${7 - daysPerWeek} rest ${7 - daysPerWeek === 1 ? "day" : "days"}.
`.trim();

  const plan = await generateJSON({
    system: SYSTEM,
    prompt,
    schema: RESPONSE_SCHEMA,
    temperature: 0.6,
    // Thinking tokens count against this budget, and a truncated plan is
    // indistinguishable from a failed one. Headroom is free; the cap is 65k.
    maxOutputTokens: 12_000,
    validate: (value) => {
      const parsed = planValidator.safeParse(value);
      return parsed.success ? parsed.data : null;
    },
  });

  if (!plan) return null;

  return assemble(plan, pool, profile, daysPerWeek);
}

/**
 * Maps the model's answer onto the same shape `buildStarterPlan` produces, so
 * everything downstream — the writer, the training page, the session player —
 * cannot tell which path produced the plan.
 *
 * Returns null rather than a thin plan if too little survived: a week where
 * half the sessions came back empty is worse than the template, and the
 * template is right there.
 */
function assemble(
  plan: AIPlan,
  pool: ExerciseRow[],
  profile: ProfileRow,
  daysPerWeek: number,
): StarterPlan | null {
  const bySlug = new Map(pool.map((ex) => [ex.slug, ex]));
  const byIndex = new Map<number, PlannedDay>();

  for (const day of plan.days) {
    // A repeated day_index is a malformed week, not two sessions on one day.
    if (byIndex.has(day.day_index)) continue;

    const exercises = day.is_rest_day
      ? []
      : day.exercises
          // Anything not in the catalogue is dropped rather than guessed at.
          // A hallucinated slug would break the exercise_id foreign key and
          // leave the session player with no instructions to show.
          .flatMap((ex) => {
            const match = bySlug.get(ex.slug);
            if (!match) return [];
            return [{ ...ex, match }];
          })
          .map((ex, i) => ({
            exercise_id: ex.match.id,
            name: ex.match.name,
            order_index: i,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes?.trim() || null,
          }));

    const isRest = day.is_rest_day || exercises.length === 0;

    byIndex.set(day.day_index, {
      day_index: day.day_index,
      title: isRest ? "Rest" : day.title,
      focus: isRest ? null : (day.focus?.trim() || null),
      est_minutes: isRest ? 0 : estimateMinutes(exercises, profile),
      is_rest_day: isRest,
      exercises,
    });
  }

  const trainingDays = [...byIndex.values()].filter((d) => !d.is_rest_day);

  // Tolerate being one session out — the model sometimes folds two muscle
  // groups into one day — but not a week that bears no relation to the ask.
  if (trainingDays.length === 0 || Math.abs(trainingDays.length - daysPerWeek) > 1) {
    return null;
  }

  const days: PlannedDay[] = [];
  for (let i = 1; i <= 7; i++) {
    days.push(
      byIndex.get(i) ?? {
        day_index: i,
        title: "Rest",
        focus: null,
        est_minutes: 0,
        is_rest_day: true,
        exercises: [],
      },
    );
  }

  return {
    name: plan.name,
    goal: profile.primary_goal,
    location: profile.training_location,
    days_per_week: trainingDays.length,
    weeks: 4,
    ai_rationale: plan.rationale,
    days,
  };
}

/** Same arithmetic the template uses, so the two paths report time alike. */
function estimateMinutes(
  exercises: { sets: number; rest_seconds: number }[],
  profile: ProfileRow,
): number {
  const total = exercises.reduce(
    (n, ex) => n + (ex.sets * (ex.rest_seconds + 45)) / 60,
    0,
  );
  return Math.max(15, Math.min(profile.session_minutes ?? 60, Math.round(total)));
}
