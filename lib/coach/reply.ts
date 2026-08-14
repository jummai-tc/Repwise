import "server-only";

import { getProfile } from "@/lib/data/user";
import { getNutritionToday } from "@/lib/data/nutrition";
import { getWeightSeries, getStreak } from "@/lib/data/progress";
import { getActivePlan, getWeekTraining, todaysDay } from "@/lib/data/training";
import { coachAnswer, type CoachSnapshot } from "@/lib/ai/coach";
import type { CoachMessage } from "@/lib/data/coach";

/**
 * The coach's answer.
 *
 * Gemini writes it when GEMINI_API_KEY is set. When it is not — or the request
 * fails, or the free-tier quota is spent — the keyword responder below answers
 * instead. Both read the same rows, so the fallback is a genuinely useful
 * answer about this person's training rather than an error message; it just
 * handles a handful of common questions rather than any question.
 *
 * The conversation is stored either way (see app/(app)/coach/actions.ts).
 */
export async function coachReply(
  question: string,
  history: CoachMessage[] = [],
): Promise<string> {
  const [profile, nutrition, weights, plan, week, streak] = await Promise.all([
    getProfile(),
    getNutritionToday(),
    getWeightSeries(),
    getActivePlan(),
    getWeekTraining(),
    getStreak(),
  ]);

  const snapshot: CoachSnapshot = {
    profile,
    nutrition,
    weights,
    plan,
    today: todaysDay(plan),
    week,
    streak,
  };

  const answer = await coachAnswer(question, snapshot, history);
  return answer ?? keywordReply(question, snapshot);
}

/**
 * The no-key path: a small set of the questions people actually ask, answered
 * from their own rows. Every number below is read from Supabase, so this is
 * still about this person's training — it simply cannot handle anything
 * outside the branches it knows.
 */
function keywordReply(question: string, snapshot: CoachSnapshot): string {
  const q = question.toLowerCase();
  const { profile, nutrition, weights, plan, week, streak } = snapshot;

  const targets = nutrition.targets;
  const latest = weights.at(-1);
  const earliest = weights[0];
  const today = snapshot.today;

  /* ------------------------------------------------------------ protein -- */
  if (q.includes("protein") || q.includes("macro")) {
    if (!targets) {
      return "You haven't got nutrition targets yet. Finish your profile and rebuild your plan, and I can tell you exactly what to aim for.";
    }
    const perKg = profile?.weight_kg
      ? Math.round((targets.protein_g / profile.weight_kg) * 10) / 10
      : null;
    const eaten = Math.round(nutrition.eaten.protein_g);
    const gap = targets.protein_g - eaten;

    return (
      `You're aiming for ${targets.protein_g}g of protein a day` +
      (perKg ? `, about ${perKg}g per kilo of bodyweight. Past that the research stops showing much extra benefit.` : ".") +
      `\n\nYou've logged ${eaten}g so far today` +
      (gap > 0
        ? `, so there's ${gap}g still to find. A scoop of whey or 200g of Greek yoghurt covers most of that in one go.`
        : `, so you're already there. Nothing to fix.`) +
      `\n\nIf you're short most days, look at breakfast first. That's usually where the gap opens up.`
    );
  }

  /* ------------------------------------------------------------- weight -- */
  if (
    q.includes("stall") ||
    q.includes("plateau") ||
    q.includes("weight") ||
    q.includes("not losing")
  ) {
    if (!latest || !earliest || weights.length < 2) {
      return "I can't read a trend off what's logged yet. Weigh in a few times a week on the progress page and I'll be able to tell you whether you've genuinely stalled or it's just water.";
    }
    const change = Math.round((latest.kg - earliest.kg) * 10) / 10;
    const direction = change < 0 ? "down" : change > 0 ? "up" : "level";
    const goal = profile?.target_weight_kg;

    return (
      `You're at ${latest.kg}kg, ${direction === "level" ? "level with" : `${Math.abs(change)}kg ${direction} on`} your first weigh-in of ${earliest.kg}kg` +
      (goal ? `, so there's ${Math.round(Math.abs(latest.kg - goal) * 10) / 10}kg between you and the ${goal}kg you're after.` : ".") +
      `\n\nRead the trend line rather than the daily number. Water alone moves you a kilo either way, and that's enough to hide a real change for a week at a time.` +
      `\n\nIf it's still flat after three weeks and you're training ${week.completed} ${week.completed === 1 ? "session" : "sessions"} a week, I'd change calories slightly before adding cardio. Recovery is the thing worth protecting.`
    );
  }

  /* -------------------------------------------------------- today's plan -- */
  if (q.includes("today") || q.includes("session") || q.includes("workout")) {
    if (!plan) {
      return "No training plan yet. Build one on the training page. It takes a second, and everything else here keys off it.";
    }
    if (!today || today.is_rest_day) {
      return `Rest day on your ${plan.name} plan. Take a walk, hit your protein, let the work land. Recovery is when the adaptation actually happens.`;
    }
    const sets = today.exercises.reduce((n, e) => n + e.sets, 0);
    return (
      `Today's ${today.title}: ${today.exercises.length} exercises, ${sets} working sets, about ${today.est_minutes} minutes.` +
      `\n\nIt opens with ${today.exercises[0]?.name ?? "your first compound"}, so that's where I'd put your best effort. Everything after it is accessory work and can go if you're short on time.` +
      `\n\nYou're ${streak.current} ${streak.current === 1 ? "day" : "days"} into your streak. Log the session and the numbers on your progress page stay honest.`
    );
  }

  /* ------------------------------------------------------- short on time -- */
  if (q.includes("30 min") || q.includes("short") || q.includes("time") || q.includes("busy")) {
    const first = today && !today.is_rest_day ? today.exercises.slice(0, 3) : [];
    if (first.length === 0) {
      return "Nothing's scheduled today, so a short session is a free win. Pick any three compound movements, three sets each, and you're done inside half an hour.";
    }
    return (
      `Cut it to the first three exercises and keep the rest periods honest.` +
      `\n\nFor ${today!.title} that's ${first.map((e) => e.name).join(", ")}. The compounds carry nearly all of the stimulus, so drop the isolation work. That's the first thing that should go when time is short.` +
      `\n\nThree sets each puts you at about 28 minutes. That's a genuinely good session, not a compromise.`
    );
  }

  /* -------------------------------------------------------------- injury -- */
  if (q.includes("knee") || q.includes("shoulder") || q.includes("back") || q.includes("hurt") || q.includes("pain")) {
    return (
      `Work around it rather than through it. Swap whatever provokes it for something that loads the same muscle over a shorter range: a leg press instead of a squat, a machine press instead of a barbell one, a hip hinge instead of pulling from the floor.` +
      `\n\nKeep training everything that doesn't hurt. Stopping altogether costs you more than the swap does.` +
      `\n\nIf it's sharp rather than achy, or it's been there more than a fortnight, get it looked at properly. That's past what I can help with.`
    );
  }

  /* ------------------------------------------------------------- default -- */
  const bits = [
    plan ? `you're on ${plan.name}` : "you haven't got a plan yet",
    `${week.completed} of ${profile?.days_per_week ?? 3} sessions done this week`,
    targets ? `${Math.round(nutrition.eaten.calories)} of ${targets.daily_calories} kcal logged today` : "no nutrition targets set",
  ];

  return (
    `Where you actually are: ${bits.join(", ")}.` +
    `\n\nAsk me about your protein, your weight trend, today's session or training around an injury, and I'll answer from your own logs rather than in general terms.` +
    `\n\nGeneral fitness guidance only. Anything clinical is a conversation for a doctor.`
  );
}
