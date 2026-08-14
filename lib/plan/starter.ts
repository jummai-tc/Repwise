/**
 * Builds a training week from the profile and the shared exercise library.
 *
 * This is a rules engine, not a model call: the split comes from how many days
 * someone trains, the exercise choice from their location and equipment, and
 * the sets, reps and rest from their goal. That means a plan exists the second
 * onboarding finishes, with no API key and no network call.
 *
 * When GEMINI_API_KEY is set, lib/ai/workout writes the plan instead and this
 * becomes the fallback — it returns the same `StarterPlan` shape, so nothing
 * downstream can tell the two apart.
 */

import type {
  ExerciseRow,
  Goal,
  ProfileRow,
  TrainingLocation,
} from "@/lib/supabase/database.types";
import { weekdayLabel } from "@/lib/date";

export type PlannedExercise = {
  exercise_id: string | null;
  name: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
};

export type PlannedDay = {
  day_index: number;
  title: string;
  focus: string | null;
  est_minutes: number;
  is_rest_day: boolean;
  exercises: PlannedExercise[];
};

export type StarterPlan = {
  name: string;
  goal: Goal | null;
  location: TrainingLocation | null;
  days_per_week: number;
  weeks: number;
  ai_rationale: string;
  days: PlannedDay[];
};

type Slot = { title: string; focus: string; muscles: string[] };

/** Which weekdays the sessions land on, spread to leave recovery between them. */
const WEEK_LAYOUT: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

const FULL_BODY_A: Slot = {
  title: "Full Body A",
  focus: "Chest, back, legs",
  muscles: ["chest", "back", "quads", "hamstrings", "shoulders", "core"],
};
const FULL_BODY_B: Slot = {
  title: "Full Body B",
  focus: "Back, legs, arms",
  muscles: ["back", "chest", "quads", "glutes", "biceps", "core"],
};
const PUSH: Slot = {
  title: "Push",
  focus: "Chest, shoulders, triceps",
  muscles: ["chest", "shoulders", "chest", "triceps", "shoulders", "triceps"],
};
const PULL: Slot = {
  title: "Pull",
  focus: "Back and biceps",
  muscles: ["back", "back", "rear-delts", "biceps", "biceps", "core"],
};
const LEGS: Slot = {
  title: "Legs",
  focus: "Quads, hamstrings, glutes",
  muscles: ["quads", "hamstrings", "glutes", "quads", "calves", "core"],
};
const UPPER_A: Slot = {
  title: "Upper Body A",
  focus: "Chest, back, shoulders",
  muscles: ["chest", "back", "shoulders", "back", "shoulders", "triceps"],
};
const UPPER_B: Slot = {
  title: "Upper Body B",
  focus: "Back, chest, arms",
  muscles: ["back", "chest", "shoulders", "biceps", "triceps", "rear-delts"],
};
const LOWER_A: Slot = {
  title: "Lower Body A",
  focus: "Quads, glutes, calves",
  muscles: ["quads", "hamstrings", "quads", "calves", "core", "glutes"],
};
const LOWER_B: Slot = {
  title: "Lower Body B",
  focus: "Glutes, hamstrings, core",
  muscles: ["hamstrings", "glutes", "quads", "core", "calves", "core"],
};

const SPLITS: Record<number, Slot[]> = {
  1: [FULL_BODY_A],
  2: [FULL_BODY_A, FULL_BODY_B],
  3: [PUSH, PULL, LEGS],
  4: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  5: [PUSH, PULL, LEGS, UPPER_A, LOWER_A],
  6: [PUSH, PULL, LEGS, UPPER_A, LOWER_A, FULL_BODY_B],
  7: [PUSH, PULL, LEGS, UPPER_A, LOWER_A, FULL_BODY_A, FULL_BODY_B],
};

/** Sets, reps and rest that suit each goal. */
const PRESCRIPTION: Record<
  Goal,
  { sets: number; reps: string; rest: number; compoundRest: number }
> = {
  lose_fat: { sets: 3, reps: "10-15", rest: 60, compoundRest: 90 },
  build_muscle: { sets: 3, reps: "8-12", rest: 90, compoundRest: 150 },
  gain_strength: { sets: 4, reps: "4-6", rest: 120, compoundRest: 180 },
  improve_endurance: { sets: 3, reps: "12-20", rest: 45, compoundRest: 75 },
  maintain: { sets: 3, reps: "8-12", rest: 75, compoundRest: 120 },
};

/** Muscles to fall back on when the library has nothing for the slot. */
const MUSCLE_FALLBACK: Record<string, string[]> = {
  glutes: ["hamstrings", "quads"],
  hamstrings: ["glutes", "quads"],
  calves: ["quads", "core"],
  "rear-delts": ["shoulders", "back"],
  core: ["full-body", "obliques"],
  triceps: ["chest", "shoulders"],
  biceps: ["back"],
};

/**
 * The movements this person can actually perform, best-suited first.
 *
 * Exported because the AI generator (lib/ai/workout) offers the model the same
 * filtered pool. Equipment and location are a hard constraint either way — a
 * barbell row is the wrong answer for someone training at home with a pair of
 * dumbbells, however good the reasoning behind it.
 */
export function candidatesFor(
  library: ExerciseRow[],
  profile: ProfileRow,
): ExerciseRow[] {
  const location = profile.training_location ?? "gym";
  const owned = new Set([...(profile.equipment ?? []), "bodyweight"]);

  const usable = library.filter((ex) => {
    if (location === "home") {
      return ex.location_tags.includes("home") && owned.has(ex.equipment);
    }
    // Gym members can also use anything that needs nothing, and "both" simply
    // means neither list is off limits.
    return ex.location_tags.includes("gym") || ex.location_tags.includes("home");
  });

  const level = profile.experience_level ?? "beginner";
  const difficultyRank = (ex: ExerciseRow) => {
    if (level === "advanced") return ex.difficulty === "advanced" ? 0 : 1;
    if (level === "intermediate") return ex.difficulty === "advanced" ? 1 : 0;
    return ex.difficulty === "beginner" ? 0 : ex.difficulty === "intermediate" ? 1 : 2;
  };

  // Compounds first — they carry most of the stimulus and belong at the front
  // of a session while the user is fresh.
  return usable.sort(
    (a, b) =>
      difficultyRank(a) - difficultyRank(b) ||
      Number(b.is_compound) - Number(a.is_compound) ||
      a.name.localeCompare(b.name),
  );
}

export function buildStarterPlan(
  profile: ProfileRow,
  library: ExerciseRow[],
): StarterPlan {
  const goal = profile.primary_goal ?? "maintain";
  const daysPerWeek = Math.min(Math.max(profile.days_per_week ?? 3, 1), 7);
  const sessionMinutes = profile.session_minutes ?? 60;
  const prescription = PRESCRIPTION[goal];

  // Roughly 11 minutes per exercise once warm-up and rest are counted.
  const perSession = Math.min(Math.max(Math.round(sessionMinutes / 11), 3), 6);

  const pool = candidatesFor(library, profile);
  const slots = SPLITS[daysPerWeek] ?? SPLITS[3];
  const layout = WEEK_LAYOUT[daysPerWeek] ?? WEEK_LAYOUT[3];

  const trainingDays: PlannedDay[] = slots.map((slot, slotIndex) => {
    const used = new Set<string>();
    const chosen: ExerciseRow[] = [];

    for (const muscle of slot.muscles) {
      if (chosen.length >= perSession) break;
      const pick = pickForMuscle(pool, muscle, used, slotIndex);
      if (pick) {
        used.add(pick.id);
        chosen.push(pick);
      }
    }

    // Top up with anything unused if the library was thin for these muscles.
    for (const ex of pool) {
      if (chosen.length >= perSession) break;
      if (!used.has(ex.id)) {
        used.add(ex.id);
        chosen.push(ex);
      }
    }

    const exercises = chosen.map((ex, i) => {
      const rest = ex.is_compound ? prescription.compoundRest : prescription.rest;
      return {
        exercise_id: ex.id,
        name: ex.name,
        order_index: i,
        // The first movement of the day gets the extra set.
        sets: i === 0 ? prescription.sets + 1 : prescription.sets,
        reps: prescription.reps,
        rest_seconds: rest,
        notes: null,
      };
    });

    const estimated = exercises.reduce(
      (n, ex) => n + (ex.sets * (ex.rest_seconds + 45)) / 60,
      0,
    );

    return {
      day_index: layout[slotIndex],
      title: slot.title,
      focus: slot.focus,
      est_minutes: Math.max(15, Math.min(sessionMinutes, Math.round(estimated))),
      is_rest_day: false,
      exercises,
    };
  });

  const restDays: PlannedDay[] = [1, 2, 3, 4, 5, 6, 7]
    .filter((i) => !layout.includes(i))
    .map((day_index) => ({
      day_index,
      title: "Rest",
      focus: null,
      est_minutes: 0,
      is_rest_day: true,
      exercises: [],
    }));

  const days = [...trainingDays, ...restDays].sort(
    (a, b) => a.day_index - b.day_index,
  );

  return {
    name: planName(slots, daysPerWeek, goal),
    goal,
    location: profile.training_location,
    days_per_week: daysPerWeek,
    weeks: 4,
    ai_rationale: planRationale(profile, daysPerWeek, prescription, days),
    days,
  };
}

function pickForMuscle(
  pool: ExerciseRow[],
  muscle: string,
  used: Set<string>,
  rotation: number,
) {
  const wanted = [muscle, ...(MUSCLE_FALLBACK[muscle] ?? [])];
  for (const target of wanted) {
    const matches = pool.filter(
      (ex) => ex.primary_muscle === target && !used.has(ex.id),
    );
    if (matches.length === 0) continue;
    // Rotate the entry point per day so day two does not repeat day one's picks.
    return matches[rotation % matches.length];
  }
  return null;
}

function planName(slots: Slot[], daysPerWeek: number, goal: Goal) {
  const shape =
    slots[0].title.startsWith("Full")
      ? "Full Body"
      : slots.some((s) => s.title === "Push")
        ? "Push / Pull / Legs"
        : "Upper / Lower";

  const flavour: Record<Goal, string> = {
    lose_fat: "Fat Loss",
    build_muscle: "Hypertrophy",
    gain_strength: "Strength",
    improve_endurance: "Conditioning",
    maintain: "Maintenance",
  };

  return `${shape} ${flavour[goal]} · ${daysPerWeek} days`;
}

function planRationale(
  profile: ProfileRow,
  daysPerWeek: number,
  prescription: { sets: number; reps: string; rest: number },
  days: PlannedDay[],
) {
  const trainingDays = days.filter((d) => !d.is_rest_day);
  const totalSets = trainingDays.reduce(
    (n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0),
    0,
  );
  const where =
    profile.training_location === "home"
      ? "with the equipment you told us you have at home"
      : profile.training_location === "both"
        ? "mixing gym and home equipment"
        : "with full gym access";

  const goalLine: Record<Goal, string> = {
    lose_fat:
      "Reps sit higher and rest shorter to keep the heart rate up, but the load still progresses — that is what protects your muscle while you lose fat.",
    build_muscle:
      "Sets sit in the 8-12 range with real rest on the compounds, which is where most of the growth signal comes from.",
    gain_strength:
      "Reps stay low and rest stays long so every working set is genuinely heavy rather than a test of your conditioning.",
    improve_endurance:
      "Higher reps and short rest build work capacity, with enough load to keep the muscle you already have.",
    maintain:
      "Moderate volume across the whole body — enough to hold onto what you have built without eating your week.",
  };

  return (
    `You train ${daysPerWeek} ${daysPerWeek === 1 ? "day" : "days"} a week ${where}, ` +
    `so this runs as a ${trainingDays.map((d) => d.title).join(" / ")} split — ` +
    `${totalSets} working sets a week, spread across ${trainingDays
      .map((d) => weekdayLabel(d.day_index))
      .join(", ")}. ` +
    `${goalLine[profile.primary_goal ?? "maintain"]} ` +
    `Start a notch below what you could grind out today: the point is to add ` +
    `weight or reps each week rather than stall in week two. Every session you ` +
    `log feeds the numbers on your progress page.`
  );
}
