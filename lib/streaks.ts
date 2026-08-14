import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { iso, todayISO } from "@/lib/date";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Moves the streak on after a session is logged. Training twice in one day
 * does not count twice, and a gap of more than a day starts again at one.
 */
export async function bumpStreak(supabase: Client, userId: string) {
  const today = todayISO();
  const yesterday = iso(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const { data: existing } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.last_active_date === today) {
    return { current: existing.current_streak, longest: existing.longest_streak };
  }

  const current =
    existing?.last_active_date === yesterday ? existing.current_streak + 1 : 1;
  const longest = Math.max(current, existing?.longest_streak ?? 0);

  await supabase.from("streaks").upsert({
    user_id: userId,
    current_streak: current,
    longest_streak: longest,
    last_active_date: today,
  });

  return { current, longest };
}
