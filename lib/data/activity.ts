import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "./user";
import { relativeTime } from "@/lib/date";
import { ACHIEVEMENTS } from "@/lib/constants/achievements";

export type ActivityItem = {
  id: string;
  title: string;
  body: string;
  when: string;
  read: boolean;
};

/**
 * The bell menu. There is no notifications table — these are derived from what
 * actually happened, so nothing can go stale or need clearing down. Anything
 * from the last day counts as unread.
 */
export async function getRecentActivity(limit = 6): Promise<ActivityItem[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const [{ data: sessions }, { data: unlocked }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, title, completed_at, total_volume_kg")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(limit),
    supabase
      .from("achievements")
      .select("id, key, unlocked_at")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: false })
      .limit(limit),
  ]);

  const items: (ActivityItem & { at: number })[] = [];

  for (const s of sessions ?? []) {
    const at = new Date(s.completed_at!).getTime();
    items.push({
      id: `s-${s.id}`,
      title: `${s.title ?? "Workout"} logged`,
      body: `${Math.round(Number(s.total_volume_kg)).toLocaleString()} kg moved in that session.`,
      when: relativeTime(s.completed_at!),
      read: at < dayAgo,
      at,
    });
  }

  for (const a of unlocked ?? []) {
    const def = ACHIEVEMENTS.find((d) => d.key === a.key);
    if (!def) continue;
    const at = new Date(a.unlocked_at).getTime();
    items.push({
      id: `a-${a.id}`,
      title: `Achievement unlocked — ${def.title}`,
      body: def.description,
      when: relativeTime(a.unlocked_at),
      read: at < dayAgo,
      at,
    });
  }

  return items
    .sort((x, y) => y.at - x.at)
    .slice(0, limit)
    .map(({ at: _at, ...item }) => item);
}
