import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { startOfWeek } from "@/lib/date";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Re-checks every badge after a workout is logged and unlocks whatever now
 * qualifies. Cheap enough to run on every finish, and idempotent — the unique
 * (user_id, key) index means an already-unlocked badge is simply ignored.
 */
export async function evaluateAchievements(
  supabase: Client,
  userId: string,
  streak: { current: number },
) {
  const [{ count: sessions }, { data: weekSessions }, { data: setRows }] =
    await Promise.all([
      supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("completed_at", "is", null),
      supabase
        .from("workout_sessions")
        .select("total_volume_kg")
        .eq("user_id", userId)
        .gte("started_at", startOfWeek().toISOString()),
      supabase
        .from("set_logs")
        .select("exercise_name, weight_kg, completed_at")
        .eq("user_id", userId)
        .eq("is_warmup", false)
        .not("weight_kg", "is", null)
        .order("completed_at", { ascending: true })
        .limit(4000),
    ]);

  const sessionCount = sessions ?? 0;
  const weekVolume = (weekSessions ?? []).reduce(
    (n, s) => n + Number(s.total_volume_kg),
    0,
  );

  // A "personal record" is any set that beat the previous best for that lift.
  const best = new Map<string, number>();
  let prCount = 0;
  for (const row of setRows ?? []) {
    const weight = Number(row.weight_kg);
    if (weight <= 0) continue;
    const previous = best.get(row.exercise_name);
    if (previous !== undefined && weight > previous) prCount++;
    if (previous === undefined || weight > previous) best.set(row.exercise_name, weight);
  }

  const earned = [
    sessionCount >= 1 && "first_session",
    sessionCount >= 10 && "sessions_10",
    sessionCount >= 100 && "sessions_100",
    streak.current >= 7 && "streak_7",
    streak.current >= 30 && "streak_30",
    weekVolume >= 25000 && "volume_25k",
    prCount >= 5 && "pr_x5",
  ].filter((k): k is string => Boolean(k));

  if (earned.length === 0) return [];

  const { data } = await supabase
    .from("achievements")
    .upsert(
      earned.map((key) => ({ user_id: userId, key })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    )
    .select("key");

  return (data ?? []).map((row) => row.key);
}
