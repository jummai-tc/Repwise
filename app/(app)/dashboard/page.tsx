import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Home,
  Moon,
  Plus,
  Scale,
  Timer,
  Utensils,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat";
import { SectionHeader } from "@/components/ui/section";
import { ScoreRing, Meter } from "@/components/ui/score-ring";
import { CalorieRing, MacroBar } from "@/components/ui/rings";
import { WeightChart } from "@/components/charts/weight-chart";
import { ActivityChart } from "@/components/charts/activity-chart";
import { SessionLog } from "@/components/dashboard/session-log";
import { EmptyState } from "@/components/ui/empty-state";
import { firstName, getProfile, requireUser } from "@/lib/data/user";
import {
  getActivePlan,
  getRecentSessions,
  getWeekTraining,
  nextTrainingDay,
  todaysDay,
} from "@/lib/data/training";
import { getNutritionToday, getProteinDaysThisWeek } from "@/lib/data/nutrition";
import { getPersonalRecords, getStreak, getWeightSeries } from "@/lib/data/progress";
import { todayIndex } from "@/lib/date";
import { BuildPlanButton } from "../train/build-plan-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Fitness Today" };

const QUICK_ACTIONS = [
  { href: "/fuel", icon: Utensils, label: "Log your meal" },
  { href: "/progress", icon: Scale, label: "Record weight" },
  { href: "/fuel", icon: Droplets, label: "Add water" },
  { href: "/train", icon: Home, label: "See your week" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** How well today is going, as one number: the mean of the capped ratios. */
function dailyScore(parts: { value: number; target: number }[]) {
  const usable = parts.filter((p) => p.target > 0);
  if (usable.length === 0) return 0;
  const sum = usable.reduce((n, p) => n + Math.min(p.value / p.target, 1), 0);
  return Math.round((sum / usable.length) * 100);
}

function verdict(score: number) {
  if (score >= 85) return "Dialled in";
  if (score >= 70) return "On track";
  if (score >= 50) return "Some ground to make up";
  return "Plenty of day left";
}

export default async function DashboardPage() {
  await requireUser("/dashboard");

  const [profile, plan, nutrition, weights, week, streak, recent, records] =
    await Promise.all([
      getProfile(),
      getActivePlan(),
      getNutritionToday(),
      getWeightSeries(),
      getWeekTraining(),
      getStreak(),
      getRecentSessions(4),
      getPersonalRecords(4),
    ]);

  const targets = nutrition.targets;
  const proteinDays = targets ? await getProteinDaysThisWeek(targets.protein_g) : 0;

  const day = todaysDay(plan);
  const upcoming = nextTrainingDay(plan);
  const eaten = nutrition.eaten;

  const now = weights.at(-1)?.kg ?? profile?.weight_kg ?? null;
  const start = weights[0]?.kg ?? null;
  const prev = weights.at(-2)?.kg ?? null;
  const goalWeight = profile?.target_weight_kg ?? null;

  const lost = start !== null && now !== null ? Math.round((start - now) * 10) / 10 : null;
  const toGo = now !== null && goalWeight !== null ? Math.round((now - goalWeight) * 10) / 10 : null;
  const weightDelta = now !== null && prev !== null ? Math.round((now - prev) * 10) / 10 : null;

  const sessionTarget = profile?.days_per_week ?? 3;
  const todayMinutes = week.byDay[todayIndex() - 1]?.minutes ?? 0;
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "short" });

  const score = dailyScore([
    { value: todayMinutes, target: day && !day.is_rest_day ? day.est_minutes : 0 },
    { value: eaten.calories, target: targets?.daily_calories ?? 0 },
    { value: eaten.protein_g, target: targets?.protein_g ?? 0 },
    { value: nutrition.waterMl, target: targets?.water_ml_target ?? 0 },
  ]);

  const totalSets = day?.exercises.reduce((n, e) => n + e.sets, 0) ?? 0;
  const caloriesLeft = targets ? Math.max(0, targets.daily_calories - eaten.calories) : 0;

  return (
    <>
      {/* ================================================= hero =========== */}
      <section className="panel-hero mb-5 p-6 lg:mb-7 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
          {/* ------------------------------------------- who and what next */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {streak.current > 0 && (
                <Badge variant="primary">
                  <Flame /> {streak.current} day streak
                </Badge>
              )}
              <Badge variant="outline">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Badge>
            </div>

            <h2 className="font-display text-[2rem] leading-[1.05] font-bold tracking-[-0.03em] text-balance lg:text-[2.75rem]">
              {greeting()}, {firstName(profile)}
            </h2>

            <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
              {!plan
                ? "You have not built a plan yet — do that and this page fills up with your own numbers."
                : day?.is_rest_day
                  ? "Nothing scheduled today. Recovery is where the training you already did actually turns into progress."
                  : day
                    ? `${day.title} is queued up — ${day.exercises.length} exercises, about ${day.est_minutes} minutes.`
                    : "No session scheduled for today."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {day && !day.is_rest_day && (
                <Link href={`/train/${day.day_index}/session`}>
                  <Button size="lg" className="glow">
                    <Dumbbell /> Start training
                  </Button>
                </Link>
              )}
              <Link href="/fuel">
                <Button size="lg" variant="secondary">
                  <Plus /> Log your meal
                </Button>
              </Link>
            </div>

            {/* Three numbers that frame the day, cut into the panel. */}
            <dl className="mt-7 grid max-w-lg grid-cols-3 gap-2.5">
              {[
                {
                  label: "Calories left",
                  value: targets ? caloriesLeft.toLocaleString() : "—",
                  unit: "kcal",
                },
                {
                  label: "Week's sessions",
                  value: `${week.completed}/${sessionTarget}`,
                  unit: "done",
                },
                { label: "Trained", value: week.minutes, unit: "min" },
              ].map((s) => (
                <div key={s.label} className="well px-3 py-3 sm:px-3.5">
                  <dt className="text-[0.625rem] leading-tight font-medium text-subtle sm:text-[0.6875rem]">
                    {s.label}
                  </dt>
                  <dd className="tabular mt-1 font-display text-lg font-bold sm:text-xl">
                    {s.value}
                    <span className="ml-1 text-[0.6875rem] font-medium text-subtle">
                      {s.unit}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* -------------------------------------------- the day's score */}
          <div className="flex flex-col items-center gap-6 lg:w-[19rem]">
            <ScoreRing
              value={score}
              size={224}
              label={`Daily score ${score} out of 100 — ${verdict(score)}`}
            >
              <span className="text-label mb-1 text-[0.625rem]">Daily score</span>
              <span className="text-hero-figure text-foreground">{score}</span>
              <span className="mt-1.5 text-[0.8125rem] font-medium text-primary">
                {verdict(score)}
              </span>
            </ScoreRing>

            {/* The three ratios doing the most work in that number. Same hue
                on every meter — the label says which is which. */}
            <div className="w-full space-y-3.5">
              <Meter
                label="Training"
                value={todayMinutes}
                target={day && !day.is_rest_day ? day.est_minutes : 0}
                unit="min"
              />
              <Meter
                label="Fuel"
                value={eaten.calories}
                target={targets?.daily_calories ?? 0}
                unit="kcal"
                display={`${Math.round(eaten.calories).toLocaleString()} / ${(targets?.daily_calories ?? 0).toLocaleString()} kcal`}
              />
              <Meter
                label="Water"
                value={nutrition.waterMl}
                target={targets?.water_ml_target ?? 0}
                display={`${(nutrition.waterMl / 1000).toFixed(1)} / ${((targets?.water_ml_target ?? 0) / 1000).toFixed(1)} L`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================== headline metrics == */}
      <section className="mb-6 lg:mb-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatTile
            icon={Flame}
            label="Calories today"
            value={Math.round(eaten.calories).toLocaleString()}
            unit={targets ? `/ ${targets.daily_calories.toLocaleString()}` : ""}
            progress={targets ? (eaten.calories / targets.daily_calories) * 100 : undefined}
            hint={targets ? `${caloriesLeft.toLocaleString()} kcal remaining` : "No targets yet"}
            href="/fuel"
          />
          <StatTile
            icon={Dumbbell}
            label="Sessions this week"
            value={week.completed}
            unit={`/ ${sessionTarget}`}
            tone="mid"
            progress={(week.completed / Math.max(sessionTarget, 1)) * 100}
            hint={
              week.completed >= sessionTarget
                ? "Target hit — anything else is a bonus"
                : `${sessionTarget - week.completed} to go this week`
            }
            href="/train"
          />
          <StatTile
            icon={Timer}
            label="Minutes trained"
            value={week.minutes}
            unit="min"
            tone="info"
            hint="Across this week's logged sessions"
            href="/progress"
          />
          <StatTile
            icon={Scale}
            label="Current weight"
            value={now ?? "—"}
            unit={now !== null ? "kg" : ""}
            tone="neutral"
            delta={
              weightDelta !== null
                ? { value: weightDelta, unit: " kg", invert: true }
                : undefined
            }
            hint={
              lost !== null && toGo !== null
                ? `${Math.abs(lost)} kg ${lost >= 0 ? "down" : "up"} · ${Math.abs(toGo)} kg to goal`
                : "Record a weigh-in to start tracking"
            }
            href="/progress"
          />
        </div>
      </section>

      {/* ================================= today's session + nutrition ==== */}
      <section className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-12">
        {/* ---------------------------------------------- today's session */}
        <div className="flex flex-col lg:col-span-7">
          <SectionHeader
            title="Today's session"
            action={{ label: "Full week", href: "/train" }}
          />

          {!plan || !day ? (
            <EmptyState
              icon={Dumbbell}
              title="No plan yet"
              description="Build your training week from your profile and today's session shows up here."
              action={<BuildPlanButton />}
            />
          ) : day.is_rest_day ? (
            <Card className="flex flex-1 flex-col justify-center">
              <span className="mb-4 flex size-11 items-center justify-center rounded-[12px] bg-info-soft text-info ring-1 ring-inset ring-white/5">
                <Moon className="size-5" />
              </span>
              <CardTitle>Rest day</CardTitle>
              <p className="text-caption mt-1.5 max-w-md">
                Nothing scheduled. Take a walk, hit your protein target, and come
                back strong tomorrow — recovery is when the adaptation happens.
              </p>
              <div className="mt-5 max-w-sm">
                <Meter
                  label="Protein today"
                  value={Math.round(eaten.protein_g)}
                  target={targets?.protein_g ?? 0}
                  unit="g"
                />
              </div>
            </Card>
          ) : (
            <Card className="flex flex-1 flex-col">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="primary" className="mb-2.5">
                    {day.weekday} · Day {day.day_index}
                  </Badge>
                  <h3 className="text-page-title">{day.title}</h3>
                  <p className="text-caption mt-1">{day.focus}</p>
                </div>
                <span className="hidden size-12 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft text-primary ring-1 ring-inset ring-white/5 sm:flex">
                  <Dumbbell className="size-5" />
                </span>
              </div>

              <dl className="mb-5 grid grid-cols-3 gap-2.5">
                {[
                  { label: "Duration", value: day.est_minutes, unit: "min" },
                  { label: "Exercises", value: day.exercises.length, unit: "" },
                  { label: "Total sets", value: totalSets, unit: "" },
                ].map((s) => (
                  <div key={s.label} className="well px-3 py-3 sm:px-3.5">
                    <dt className="text-[0.625rem] leading-tight font-medium text-subtle sm:text-[0.6875rem]">
                      {s.label}
                    </dt>
                    <dd className="tabular mt-1 font-display text-lg font-bold sm:text-xl">
                      {s.value}
                      {s.unit && (
                        <span className="ml-1 text-[0.6875rem] font-medium text-subtle">
                          {s.unit}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <ul className="mb-5">
                {day.exercises.slice(0, 4).map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm first:pt-0 last:border-0 last:pb-0"
                  >
                    <span className="truncate font-medium">{ex.name}</span>
                    <span className="tabular shrink-0 text-[0.8125rem] text-subtle">
                      {ex.sets} × {ex.reps}
                    </span>
                  </li>
                ))}
                {day.exercises.length > 4 && (
                  <li className="pt-2.5 text-[0.8125rem] text-subtle">
                    + {day.exercises.length - 4} more exercises
                  </li>
                )}
              </ul>

              <div className="mt-auto flex flex-wrap gap-2.5">
                <Link href={`/train/${day.day_index}/session`}>
                  <Button size="lg">
                    <Dumbbell /> Start training
                  </Button>
                </Link>
                <Link href={`/train/${day.day_index}`}>
                  <Button size="lg" variant="secondary">
                    View full session
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------------ nutrition */}
        <div className="flex flex-col lg:col-span-5">
          <SectionHeader
            title="Fuel"
            action={{ label: "Log a meal", href: "/fuel" }}
          />
          <Card className="flex flex-1 flex-col">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
              <CalorieRing
                consumed={eaten.calories}
                target={targets?.daily_calories ?? 0}
                size={152}
                stroke={12}
              />
              <div className="w-full flex-1 space-y-3.5">
                <MacroBar
                  macro="protein"
                  consumed={eaten.protein_g}
                  target={targets?.protein_g ?? 0}
                />
                <MacroBar
                  macro="carbs"
                  consumed={eaten.carbs_g}
                  target={targets?.carbs_g ?? 0}
                />
                <MacroBar
                  macro="fat"
                  consumed={eaten.fat_g}
                  target={targets?.fat_g ?? 0}
                />
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <Meter
                label="Water"
                value={nutrition.waterMl}
                target={targets?.water_ml_target ?? 0}
                display={`${(nutrition.waterMl / 1000).toFixed(1)} / ${((targets?.water_ml_target ?? 0) / 1000).toFixed(1)} L`}
              />
            </div>
          </Card>
        </div>
      </section>

      {/* ================================= weight trend + week's training = */}
      <section className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-7">
          <SectionHeader
            title="Weight trend"
            description="Every logged weigh-in, against your goal."
            action={{ label: "See all", href: "/progress" }}
          />
          <Card className="flex-1">
            {weights.length > 0 && now !== null ? (
              <>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-stat">
                      {now}
                      <span className="ml-1 text-sm font-medium text-subtle">kg</span>
                    </p>
                    {lost !== null && (
                      <p className="mt-1 text-[0.8125rem] text-muted">
                        <span className="font-semibold text-primary">
                          {Math.abs(lost)} kg
                        </span>{" "}
                        {lost >= 0 ? "down" : "up"} since you started
                      </p>
                    )}
                  </div>
                  {goalWeight !== null && (
                    <Badge variant="outline">Goal {goalWeight} kg</Badge>
                  )}
                </div>
                <WeightChart
                  data={weights}
                  targetKg={goalWeight ?? undefined}
                  height={210}
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <span className="mb-4 flex size-11 items-center justify-center rounded-[12px] bg-primary-soft text-primary">
                  <Scale className="size-5" />
                </span>
                <CardTitle>No weigh-ins yet</CardTitle>
                <p className="text-caption mt-1.5 max-w-xs">
                  Record your weight on the progress page and the trend line
                  starts here.
                </p>
                <Link href="/progress" className="mt-5">
                  <Button variant="secondary">Record weight</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col lg:col-span-5">
          <SectionHeader
            title="This week"
            description="Minutes trained each day."
          />
          <Card className="flex flex-1 flex-col">
            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-stat">{week.minutes}</span>
              <span className="text-sm text-subtle">minutes so far</span>
            </div>
            <ActivityChart data={week.byDay} todayLabel={todayLabel} height={168} />
            <div className="mt-5 border-t border-border pt-5">
              <Meter
                label="Weekly sessions"
                value={week.completed}
                target={sessionTarget}
                display={`${week.completed} / ${sessionTarget} done`}
              />
            </div>
          </Card>
        </div>
      </section>

      {/* ==================================== history + what's coming ===== */}
      <section className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col lg:col-span-8">
          <SectionHeader
            title="Your training log"
            description="Recent sessions, and the numbers you have beaten."
            action={{ label: "All progress", href: "/progress" }}
          />
          {recent.length > 0 ? (
            <Card padded={false} className="overflow-hidden">
              <SessionLog workouts={recent} records={records} />
            </Card>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="Nothing logged yet"
              description="Finish a session and it lands here, along with every personal best you set."
              action={
                day && !day.is_rest_day ? (
                  <Link href={`/train/${day.day_index}/session`}>
                    <Button size="lg">Start today's session</Button>
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>

        <div className="flex flex-col lg:col-span-4">
          <SectionHeader title="Up next" />
          {upcoming ? (
            <Card className="flex-1">
              <span className="mb-4 flex size-11 items-center justify-center rounded-[12px] bg-primary-soft text-primary ring-1 ring-inset ring-white/5">
                <CalendarDays className="size-5" />
              </span>
              <CardTitle>{upcoming.title}</CardTitle>
              <p className="text-caption mt-1">
                {upcoming.weekday} · {upcoming.focus}
              </p>

              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Duration</dt>
                  <dd className="tabular font-medium">{upcoming.est_minutes} min</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Exercises</dt>
                  <dd className="tabular font-medium">{upcoming.exercises.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Sets</dt>
                  <dd className="tabular font-medium">
                    {upcoming.exercises.reduce((n, e) => n + e.sets, 0)}
                  </dd>
                </div>
              </dl>

              <Link href={`/train/${upcoming.day_index}`} className="mt-auto block pt-5">
                <Button variant="secondary" block>
                  Preview session <ArrowRight />
                </Button>
              </Link>
            </Card>
          ) : null}
        </div>
      </section>

      {/* ==================================== quick actions =============== */}
      {/* A full-width strip rather than a sidebar list: it fills the row the
          log leaves short, and each action gets a real touch target. */}
      <section className="mb-6 lg:mb-8">
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {QUICK_ACTIONS.map(({ href, icon: Icon, label }) => (
            <Link
              key={label}
              href={href}
              className="card card-interactive group flex items-center gap-3 p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-primary-soft text-primary ring-1 ring-inset ring-white/5">
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-sm leading-tight font-medium text-balance">
                {label}
              </span>
              <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================== goals ============= */}
      <section>
        <SectionHeader
          title="Your goals"
          description="The longer arcs behind today's numbers."
        />
        <Card>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                id: "weight",
                label: goalWeight !== null ? `Reach ${goalWeight} kg` : "Set a goal weight",
                current: lost !== null && lost > 0 ? lost : 0,
                target:
                  lost !== null && toGo !== null ? Math.max(lost + Math.abs(toGo), 0.1) : 1,
                unit: "kg moved",
                hint:
                  toGo !== null
                    ? `${Math.abs(toGo)} kg to go`
                    : "Record a weigh-in and this starts tracking",
              },
              {
                id: "sessions",
                label: `Train ${sessionTarget} times a week`,
                current: week.completed,
                target: sessionTarget,
                unit: "sessions",
                hint:
                  week.completed >= sessionTarget
                    ? "Target hit for this week"
                    : `${sessionTarget - week.completed} more to hit this week's target`,
              },
              {
                id: "protein",
                label: targets ? `Hit ${targets.protein_g}g protein daily` : "Set your macros",
                current: proteinDays,
                target: 7,
                unit: "days this week",
                hint: targets
                  ? "Breakfast is where the gap usually opens up"
                  : "Build your plan to get a protein target",
              },
            ].map((g) => (
              <div key={g.id}>
                <Meter
                  label={g.label}
                  value={g.current}
                  target={g.target}
                  unit={g.unit}
                />
                <p className="mt-2 text-xs leading-relaxed text-subtle">{g.hint}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
