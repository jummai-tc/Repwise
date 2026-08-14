import {
  Award,
  Flame,
  Lock,
  Ruler,
  Scale,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { PageIntro } from "@/components/shell/page-intro";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/ui/stat";
import { SectionHeader } from "@/components/ui/section";
import { WeightChart } from "@/components/charts/weight-chart";
import { VolumeChart } from "@/components/charts/volume-chart";
import { ConsistencyCalendar } from "@/components/progress/consistency-calendar";
import { getProfile, requireUser } from "@/lib/data/user";
import {
  getAchievements,
  getMeasurements,
  getPersonalRecords,
  getSessionCount,
  getStreak,
  getTrainedDates,
  getVolumeByWeek,
  getWeightSeries,
} from "@/lib/data/progress";
import { RecordMetrics } from "./record-metrics";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Progress" };

export default async function ProgressPage() {
  await requireUser("/progress");

  const [
    profile,
    weights,
    volume,
    trained,
    streak,
    sessions,
    records,
    measurements,
    achievements,
  ] = await Promise.all([
    getProfile(),
    getWeightSeries(),
    getVolumeByWeek(),
    getTrainedDates(),
    getStreak(),
    getSessionCount(),
    getPersonalRecords(),
    getMeasurements(),
    getAchievements(),
  ]);

  const start = weights[0]?.kg ?? null;
  const now = weights.at(-1)?.kg ?? profile?.weight_kg ?? null;
  const goal = profile?.target_weight_kg ?? null;

  const lost = start !== null && now !== null ? Math.round((start - now) * 10) / 10 : null;
  const toGo = now !== null && goal !== null ? Math.round((now - goal) * 10) / 10 : null;

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const latestVolume = volume.at(-1)?.volume ?? 0;
  const priorVolume = volume.at(-2)?.volume ?? 0;

  return (
    <>
      <PageIntro
        eyebrow="Last 12 weeks"
        title="Your Progress"
        description="Every number here comes from what you have logged."
        actions={<RecordMetrics currentWeightKg={now} />}
      />

      {/* ---------------------------------------------------- headline -- */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:mb-8 lg:grid-cols-4 lg:gap-4">
        <StatTile
          icon={TrendingDown}
          label="Weight Change"
          value={lost === null ? "—" : lost > 0 ? `-${lost}` : String(Math.abs(lost))}
          unit={lost === null ? "" : "kg"}
        />
        <StatTile
          icon={Target}
          label="To Your Goal"
          value={toGo === null ? "—" : Math.abs(toGo)}
          unit={toGo === null ? "" : "kg"}
          tone="mid"
          progress={
            lost !== null && toGo !== null && lost + Math.abs(toGo) > 0
              ? (lost / (lost + Math.abs(toGo))) * 100
              : undefined
          }
        />
        <StatTile
          icon={Flame}
          label="Current Streak"
          value={streak.current}
          unit="days"
          tone="warning"
          hint={`Best: ${streak.longest} days`}
        />
        <StatTile icon={Trophy} label="Sessions Logged" value={sessions} tone="info" />
      </div>

      {/* --------------------------------------- weight + volume charts -- */}
      <section className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-2 lg:gap-6">
        <div>
          <SectionHeader title="Weight" description="Judge it on the trend, not the daily number." />
          <Card>
            {weights.length > 0 && now !== null ? (
              <>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-stat-lg">
                      {now}
                      <span className="ml-1.5 text-base font-medium text-subtle">kg</span>
                    </p>
                    {lost !== null && lost !== 0 && (
                      <p className="mt-1 text-[0.8125rem] font-medium text-primary tabular">
                        {Math.abs(lost)} kg {lost > 0 ? "down" : "up"} since starting
                      </p>
                    )}
                  </div>
                  {goal !== null && <Badge variant="outline">Goal {goal} kg</Badge>}
                </div>
                <WeightChart data={weights} targetKg={goal ?? undefined} />
              </>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="mb-4 flex size-11 items-center justify-center rounded-[12px] bg-primary-soft text-primary">
                  <Scale className="size-5" />
                </span>
                <CardTitle>No weigh-ins yet</CardTitle>
                <p className="text-caption mt-1.5 max-w-xs">
                  Record your weight and this chart starts building the trend
                  line you can actually judge progress on.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div>
          <SectionHeader
            title="Training Volume"
            description="Total weight moved each week."
          />
          <Card>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-stat-lg">
                  {(latestVolume / 1000).toFixed(1)}
                  <span className="ml-1.5 text-base font-medium text-subtle">t</span>
                </p>
                <p className="mt-1 text-[0.8125rem] font-medium text-primary">
                  {latestVolume === 0
                    ? "Log a session to start the count"
                    : latestVolume >= priorVolume
                      ? "Trending up — that's progressive overload"
                      : "Down on last week — a deload week is fine"}
                </p>
              </div>
            </div>
            <VolumeChart data={volume} height={240} />
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------- consistency -- */}
      <SectionHeader
        title="Your Consistency"
        description="Twelve weeks of training history."
      />
      <Card className="mb-6 lg:mb-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-stat">{streak.current}</span>
            <span className="text-sm text-muted">day streak</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-subtle">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px] bg-primary" /> Trained
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px] bg-surface-muted ring-1 ring-border" /> Rest
            </span>
          </div>
        </div>
        <ConsistencyCalendar trained={trained} />
        <p className="mt-5 border-t border-border pt-4 text-[0.8125rem] text-muted tabular">
          Longest streak: {streak.longest} days · {sessions} sessions logged
        </p>
      </Card>

      {/* ------------------------------------------ PRs + measurements -- */}
      <section className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-2 lg:gap-6">
        <div>
          <SectionHeader title="Personal Records" description="Your best lifts so far." />
          <Card padded={records.length > 0 ? false : undefined} className="overflow-hidden">
            {records.length > 0 ? (
              <ul>
                {records.map((pr) => (
                  <li
                    key={pr.exercise}
                    className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-warning-soft text-warning">
                      <Trophy className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{pr.exercise}</p>
                      <p className="text-[0.8125rem] text-subtle">
                        {new Date(pr.achieved_on).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-base font-bold tabular">{pr.weight_kg} kg</p>
                      <p className="text-[0.8125rem] font-medium text-primary tabular">
                        {pr.delta_kg > 0 ? `+${pr.delta_kg} kg · ` : ""}
                        {pr.reps} reps
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption py-8 text-center">
                Log a workout with weights and your bests show up here.
              </p>
            )}
          </Card>
        </div>

        <div>
          <SectionHeader title="Measurements" description="Since you started tracking." />
          <Card>
            {measurements.length > 0 ? (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {measurements.map((m) => (
                  <div key={m.label}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] text-muted">
                      <Ruler className="size-3.5" /> {m.label}
                    </p>
                    <p className="text-stat">
                      {m.value}
                      <span className="ml-1 text-xs font-medium text-subtle">{m.unit}</span>
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[0.8125rem] font-medium tabular",
                        // Waist shrinking and everything else growing are both
                        // wins when the goal is building muscle.
                        (m.label === "Waist" ? m.delta < 0 : m.delta > 0)
                          ? "text-primary"
                          : "text-subtle",
                      )}
                    >
                      {m.delta > 0 ? "+" : ""}
                      {m.delta} {m.unit}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption py-8 text-center">
                Add a tape measurement with your next weigh-in and the changes
                show up here.
              </p>
            )}
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------- achievements -- */}
      <SectionHeader
        title="Your Achievements"
        description={`${unlocked} of ${achievements.length} unlocked.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {achievements.map((a) => (
          <Card
            key={a.key}
            className={cn("flex items-center gap-4", !a.unlocked && "bg-surface-muted/60 shadow-none")}
          >
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-[12px]",
                a.unlocked ? "bg-primary text-primary-foreground" : "bg-surface text-subtle ring-1 ring-border",
              )}
            >
              {a.unlocked ? <Award className="size-5" /> : <Lock className="size-4" />}
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate">{a.title}</CardTitle>
              <p className="text-caption truncate">{a.description}</p>
              {a.unlocked && a.unlocked_on && (
                <p className="mt-0.5 text-xs text-primary">
                  Unlocked{" "}
                  {new Date(a.unlocked_on).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
