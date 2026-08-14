import "server-only";

import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * Turns a profile row into the plain-English block every prompt starts with.
 *
 * Shared by all three AI features so a change to how someone is described —
 * a new profile field, a different way of phrasing a goal — lands in the
 * workout plan, the diet plan and the coach at the same time, instead of
 * drifting apart across three prompts.
 *
 * Only fields the user actually filled in are included. An omitted line reads
 * as "not known" to the model, which is true; a line saying "age: unknown"
 * invites it to make something up to fill the gap.
 */

const GOAL_TEXT: Record<string, string> = {
  lose_fat: "lose body fat while holding on to muscle",
  build_muscle: "build muscle",
  gain_strength: "get stronger",
  improve_endurance: "improve endurance and conditioning",
  maintain: "maintain their current physique",
};

const ACTIVITY_TEXT: Record<string, string> = {
  sedentary: "desk job, very little movement outside training",
  light: "lightly active day to day",
  moderate: "moderately active day to day",
  very: "very active day to day",
  extra: "physically demanding job or two-a-day training",
};

const DIET_TEXT: Record<string, string> = {
  none: "no dietary restriction",
  vegetarian: "vegetarian (no meat or fish)",
  vegan: "vegan (no animal products at all)",
  pescatarian: "pescatarian (fish yes, other meat no)",
  halal: "halal (no pork, no alcohol)",
  kosher: "kosher (no pork or shellfish, no meat with dairy)",
};

/**
 * Age, or null when it is not known.
 *
 * Not `ageFrom` from lib/plan/nutrition — that one substitutes 30 so the BMR
 * formula always has a number to work with. A prompt wants the opposite: say
 * nothing rather than state an age the user never gave.
 */
function knownAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return null;

  const years = (Date.now() - born.getTime()) / 31_557_600_000;
  const age = Math.floor(years);

  return age >= 13 && age <= 100 ? age : null;
}

/** The shared "who this person is" block. */
export function describeProfile(profile: ProfileRow): string {
  const lines: string[] = [];
  const age = knownAge(profile.date_of_birth);

  if (age) lines.push(`Age: ${age}`);
  if (profile.sex && profile.sex !== "prefer_not_to_say") {
    lines.push(`Sex: ${profile.sex}`);
  }
  if (profile.height_cm) lines.push(`Height: ${profile.height_cm}cm`);
  if (profile.weight_kg) lines.push(`Current weight: ${profile.weight_kg}kg`);
  if (profile.target_weight_kg) {
    lines.push(`Target weight: ${profile.target_weight_kg}kg`);
  }
  if (profile.primary_goal) {
    lines.push(
      `Primary goal: ${GOAL_TEXT[profile.primary_goal] ?? profile.primary_goal}`,
    );
  }
  if (profile.experience_level) {
    lines.push(
      `Training experience: ${profile.experience_level}` +
        (profile.years_training ? ` (${profile.years_training} years)` : ""),
    );
  }
  if (profile.days_per_week) {
    lines.push(`Days per week available to train: ${profile.days_per_week}`);
  }
  if (profile.session_minutes) {
    lines.push(`Time per session: about ${profile.session_minutes} minutes`);
  }
  if (profile.training_location) {
    lines.push(`Trains: ${profile.training_location}`);
  }
  if (profile.equipment.length > 0) {
    lines.push(`Equipment available: ${profile.equipment.join(", ")}`);
  }
  if (profile.activity_level) {
    lines.push(
      `Daily activity: ${ACTIVITY_TEXT[profile.activity_level] ?? profile.activity_level}`,
    );
  }
  lines.push(
    `Diet: ${DIET_TEXT[profile.dietary_preference] ?? profile.dietary_preference}`,
  );
  if (profile.allergies.length > 0) {
    lines.push(
      `Allergies and foods to avoid entirely: ${profile.allergies.join(", ")}`,
    );
  }
  if (profile.injuries?.trim()) {
    lines.push(`Injuries and limitations: ${profile.injuries.trim()}`);
  }

  return lines.join("\n");
}

/**
 * Rules that apply to anything the model says to a user of a fitness app,
 * regardless of which of the three features is asking. Appended to every
 * system prompt.
 */
export const SAFETY_RULES = `
Hard rules:
- Never diagnose, never treat, never contradict a doctor. If something sounds
  clinical — sharp or persistent pain, disordered eating, chest symptoms,
  pregnancy, a medication question — say plainly that it is outside what you
  can help with and that they should see a professional.
- Never prescribe below 1500 kcal a day for a man or 1300 for a woman.
- Never recommend supplements beyond ordinary protein powder, creatine and
  vitamin D, and never recommend anything requiring a prescription.
- Respect stated allergies absolutely. An allergy is not a preference.
- Work around stated injuries rather than through them.
`.trim();
