/**
 * The catalogue lives in code; `achievements` in the database only stores the
 * keys a user has unlocked and when. Adding a badge here is therefore safe —
 * it shows as locked until the rule in lib/achievements.ts unlocks it.
 */
export type AchievementDef = {
  key: string;
  title: string;
  description: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_session", title: "First rep", description: "Log your very first workout" },
  { key: "streak_7", title: "Seven strong", description: "Keep a 7 day streak alive" },
  { key: "sessions_10", title: "Ten in the bank", description: "Log 10 workouts" },
  { key: "volume_25k", title: "Heavy week", description: "Move 25,000 kg in a single week" },
  { key: "pr_x5", title: "Five PRs", description: "Set five personal records" },
  { key: "streak_30", title: "Month made", description: "Keep a 30 day streak alive" },
  { key: "sessions_100", title: "Century", description: "Log 100 workouts" },
];
