import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "./user";
import { addDays, iso, startOfWeek } from "@/lib/date";
import { ACHIEVEMENTS } from "@/lib/constants/achievements";

export type WeightPoint = { date: string; kg: number };

export async function getWeightSeries(limit = 90): Promise<WeightPoint[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("body_metrics")
    .select("recorded_on, weight_kg")
    .eq("user_id", user.id)
    .not("weight_kg", "is", null)
    .order("recorded_on", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((r) => ({ date: r.recorded_on, kg: Number(r.weight_kg) }))
    .reverse();
}

export type VolumePoint = { week: string; volume: number };

/** Total weight moved per week, oldest first, labelled W1…Wn. */
export async function getVolumeByWeek(weeks = 8): Promise<VolumePoint[]> {
  const user = await getUser();
  if (!user) return [];

  const firstMonday = addDays(startOfWeek(), -(weeks - 1) * 7);

  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("started_at, total_volume_kg")
    .eq("user_id", user.id)
    .gte("started_at", firstMonday.toISOString());

  const buckets = Array.from({ length: weeks }, (_, i) => ({
    week: `W${i + 1}`,
    volume: 0,
  }));

  for (const row of data ?? []) {
    const offsetWeeks = Math.floor(
      (new Date(row.started_at).getTime() - firstMonday.getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );
    if (offsetWeeks >= 0 && offsetWeeks < weeks) {
      buckets[offsetWeeks].volume += Math.round(Number(row.total_volume_kg));
    }
  }

  return buckets;
}

/** Dates with a completed session, for the consistency calendar. */
export async function getTrainedDates(days = 84): Promise<Set<string>> {
  const trained = new Set<string>();
  const user = await getUser();
  if (!user) return trained;

  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .gte("started_at", addDays(new Date(), -days).toISOString());

  for (const row of data ?? []) trained.add(iso(new Date(row.started_at)));
  return trained;
}

export async function getStreak() {
  const user = await getUser();
  if (!user) return { current: 0, longest: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    current: data?.current_streak ?? 0,
    longest: data?.longest_streak ?? 0,
  };
}

export async function getSessionCount() {
  const user = await getUser();
  if (!user) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("completed_at", "is", null);

  return count ?? 0;
}

export type PersonalRecord = {
  exercise: string;
  weight_kg: number;
  reps: number;
  achieved_on: string;
  delta_kg: number;
};

/**
 * Heaviest working set per exercise, with how much it beat the previous best
 * by. Computed by replaying the logs in order rather than stored, so it stays
 * correct if a set is edited or deleted.
 */
export async function getPersonalRecords(limit = 6): Promise<PersonalRecord[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("set_logs")
    .select("exercise_name, weight_kg, reps, completed_at")
    .eq("user_id", user.id)
    .eq("is_warmup", false)
    .not("weight_kg", "is", null)
    .gt("weight_kg", 0)
    .order("completed_at", { ascending: true })
    .limit(4000);

  const best = new Map<string, PersonalRecord>();

  for (const row of data ?? []) {
    const weight = Number(row.weight_kg);
    const current = best.get(row.exercise_name);
    if (!current || weight > current.weight_kg) {
      best.set(row.exercise_name, {
        exercise: row.exercise_name,
        weight_kg: weight,
        reps: row.reps ?? 0,
        achieved_on: iso(new Date(row.completed_at)),
        delta_kg: current ? Math.round((weight - current.weight_kg) * 10) / 10 : 0,
      });
    }
  }

  return [...best.values()]
    .sort((a, b) => b.achieved_on.localeCompare(a.achieved_on))
    .slice(0, limit);
}

export type Measurement = {
  label: string;
  value: number;
  unit: string;
  delta: number;
};

const MEASUREMENT_FIELDS = [
  { key: "chest_cm", label: "Chest" },
  { key: "waist_cm", label: "Waist" },
  { key: "arm_cm", label: "Arm" },
  { key: "thigh_cm", label: "Thigh" },
] as const;

/** Latest tape measurements, against the first ones ever recorded. */
export async function getMeasurements(): Promise<Measurement[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("body_metrics")
    .select("recorded_on, chest_cm, waist_cm, arm_cm, thigh_cm")
    .eq("user_id", user.id)
    .order("recorded_on", { ascending: true });

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const out: Measurement[] = [];
  for (const { key, label } of MEASUREMENT_FIELDS) {
    const withValue = rows.filter((r) => r[key] !== null);
    if (withValue.length === 0) continue;

    const latest = Number(withValue[withValue.length - 1][key]);
    const first = Number(withValue[0][key]);
    out.push({
      label,
      value: latest,
      unit: "cm",
      delta: Math.round((latest - first) * 10) / 10,
    });
  }
  return out;
}

export type Achievement = {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlocked_on?: string;
};

export async function getAchievements(): Promise<Achievement[]> {
  const user = await getUser();

  const unlocked = new Map<string, string>();
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("achievements")
      .select("key, unlocked_at")
      .eq("user_id", user.id);
    for (const row of data ?? []) {
      unlocked.set(row.key, iso(new Date(row.unlocked_at)));
    }
  }

  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlocked.has(a.key),
    unlocked_on: unlocked.get(a.key),
  }));
}
