import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "./user";
import { iso, startOfWeek, todayIndex, weekdayLabel, WEEKDAY_LABELS } from "@/lib/date";
import type {
  ExerciseRow,
  Goal,
  PlanExerciseRow,
  TrainingLocation,
} from "@/lib/supabase/database.types";

export type SessionExercise = {
  id: string;
  exercise_id: string | null;
  slug: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
  primary_muscle: string;
  equipment: string;
  cues: string[];
  /** What was lifted the last time this movement was logged, for pre-filling. */
  last_weight_kg: number | null;
  last_reps: number | null;
};

export type PlanDay = {
  id: string;
  day_index: number;
  weekday: string;
  title: string;
  focus: string | null;
  est_minutes: number;
  is_rest_day: boolean;
  exercises: SessionExercise[];
};

export type Plan = {
  id: string;
  name: string;
  goal: Goal | null;
  location: TrainingLocation | null;
  weeks: number;
  week_number: number;
  ai_rationale: string | null;
  days: PlanDay[];
};

/**
 * The active plan with its days and exercises, plus the last logged weight for
 * each movement. Four queries rather than one nested select: the hand-written
 * Database type declares no relationships, so embedded selects lose their
 * types — and the row counts here are tiny either way.
 */
export async function getActivePlan(): Promise<Plan | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return null;

  const { data: days } = await supabase
    .from("plan_days")
    .select("*")
    .eq("plan_id", plan.id)
    .order("day_index");

  const dayRows = days ?? [];

  const { data: exercises } = await supabase
    .from("plan_exercises")
    .select("*")
    .in("plan_day_id", dayRows.map((d) => d.id))
    .order("order_index");

  const exerciseRows = exercises ?? [];

  // The shared library supplies the cues, muscle and equipment; plan_exercises
  // only carries the prescription.
  const libraryIds = [
    ...new Set(exerciseRows.map((e) => e.exercise_id).filter((id): id is string => Boolean(id))),
  ];
  const library = new Map<string, ExerciseRow>();
  if (libraryIds.length > 0) {
    const { data: rows } = await supabase
      .from("exercises")
      .select("*")
      .in("id", libraryIds);
    for (const row of rows ?? []) library.set(row.id, row);
  }

  const lastPerformance = await getLastPerformance(
    exerciseRows.map((e) => e.name),
  );

  const byDay = new Map<string, SessionExercise[]>();
  for (const row of exerciseRows) {
    const lib = row.exercise_id ? library.get(row.exercise_id) : undefined;
    const last = lastPerformance.get(row.name);
    const list = byDay.get(row.plan_day_id) ?? [];
    list.push(toSessionExercise(row, lib, last));
    byDay.set(row.plan_day_id, list);
  }

  const created = new Date(plan.created_at);
  const weeksElapsed = Math.floor(
    (Date.now() - created.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: plan.id,
    name: plan.name,
    goal: plan.goal,
    location: plan.location,
    weeks: plan.weeks,
    week_number: Math.min(weeksElapsed + 1, plan.weeks),
    ai_rationale: plan.ai_rationale,
    days: dayRows.map((d) => ({
      id: d.id,
      day_index: d.day_index,
      weekday: weekdayLabel(d.day_index),
      title: d.title,
      focus: d.focus,
      est_minutes: d.est_minutes ?? 0,
      is_rest_day: d.is_rest_day,
      exercises: byDay.get(d.id) ?? [],
    })),
  };
}

function toSessionExercise(
  row: PlanExerciseRow,
  lib: ExerciseRow | undefined,
  last: { weight_kg: number | null; reps: number | null } | undefined,
): SessionExercise {
  return {
    id: row.id,
    exercise_id: row.exercise_id,
    slug: lib?.slug ?? row.id,
    name: row.name,
    sets: row.sets,
    reps: row.reps,
    rest_seconds: row.rest_seconds,
    notes: row.notes,
    primary_muscle: lib?.primary_muscle ?? "",
    equipment: lib?.equipment ?? "",
    cues: lib?.cues ?? [],
    last_weight_kg: last?.weight_kg ?? null,
    last_reps: last?.reps ?? null,
  };
}

/** Most recent working set per exercise name. */
export async function getLastPerformance(names: string[]) {
  const result = new Map<string, { weight_kg: number | null; reps: number | null }>();
  const unique = [...new Set(names)];
  if (unique.length === 0) return result;

  const user = await getUser();
  if (!user) return result;

  const supabase = await createClient();
  const { data } = await supabase
    .from("set_logs")
    .select("exercise_name, weight_kg, reps, completed_at")
    .eq("user_id", user.id)
    .eq("is_warmup", false)
    .in("exercise_name", unique)
    .order("completed_at", { ascending: false })
    .limit(600);

  for (const row of data ?? []) {
    if (result.has(row.exercise_name)) continue;
    result.set(row.exercise_name, { weight_kg: row.weight_kg, reps: row.reps });
  }
  return result;
}

export function findDay(plan: Plan | null, dayIndex: number) {
  return plan?.days.find((d) => d.day_index === dayIndex) ?? null;
}

export function todaysDay(plan: Plan | null) {
  return findDay(plan, todayIndex());
}

/** The next training day after today, skipping rest days and wrapping the week. */
export function nextTrainingDay(plan: Plan | null) {
  if (!plan) return null;
  const start = todayIndex();
  for (let step = 1; step <= 7; step++) {
    const idx = ((start - 1 + step) % 7) + 1;
    const day = findDay(plan, idx);
    if (day && !day.is_rest_day) return day;
  }
  return null;
}

export type RecentWorkout = {
  id: string;
  title: string;
  focus: string;
  date: string;
  duration_min: number;
  volume_kg: number;
  sets: number;
};

export async function getRecentSessions(limit = 6): Promise<RecentWorkout[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  const rows = sessions ?? [];
  if (rows.length === 0) return [];

  // Set counts and the day's focus, both one query rather than one per row.
  const { data: setRows } = await supabase
    .from("set_logs")
    .select("session_id")
    .in("session_id", rows.map((s) => s.id));

  const setCounts = new Map<string, number>();
  for (const s of setRows ?? []) {
    setCounts.set(s.session_id, (setCounts.get(s.session_id) ?? 0) + 1);
  }

  const planDayIds = [
    ...new Set(rows.map((s) => s.plan_day_id).filter((id): id is string => Boolean(id))),
  ];
  const focusById = new Map<string, string>();
  if (planDayIds.length > 0) {
    const { data: days } = await supabase
      .from("plan_days")
      .select("id, focus")
      .in("id", planDayIds);
    for (const d of days ?? []) if (d.focus) focusById.set(d.id, d.focus);
  }

  return rows.map((s) => ({
    id: s.id,
    title: s.title ?? "Workout",
    focus: (s.plan_day_id ? focusById.get(s.plan_day_id) : null) ?? "",
    date: iso(new Date(s.started_at)),
    duration_min: Math.round((s.duration_seconds ?? 0) / 60),
    volume_kg: Math.round(s.total_volume_kg),
    sets: setCounts.get(s.id) ?? 0,
  }));
}

/** Sessions and minutes for the current week, Monday first. */
export async function getWeekTraining() {
  const empty = {
    completed: 0,
    minutes: 0,
    byDay: WEEKDAY_LABELS.map((day) => ({ day, minutes: 0 })),
  };

  const user = await getUser();
  if (!user) return empty;

  const supabase = await createClient();
  const monday = startOfWeek();
  const { data } = await supabase
    .from("workout_sessions")
    .select("started_at, duration_seconds")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .gte("started_at", monday.toISOString());

  const rows = data ?? [];
  const byDay = WEEKDAY_LABELS.map((day) => ({ day, minutes: 0 }));

  for (const row of rows) {
    const d = new Date(row.started_at);
    const idx = (d.getDay() === 0 ? 7 : d.getDay()) - 1;
    byDay[idx].minutes += Math.round((row.duration_seconds ?? 0) / 60);
  }

  return {
    completed: rows.length,
    minutes: byDay.reduce((n, d) => n + d.minutes, 0),
    byDay,
  };
}
