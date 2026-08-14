import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Dumbbell,
  Moon,
  Sparkles,
  Target,
} from "lucide-react";
import { PageIntro } from "@/components/shell/page-intro";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section";
import { getActivePlan, getWeekTraining } from "@/lib/data/training";
import { getProfile, requireUser } from "@/lib/data/user";
import { todayIndex } from "@/lib/date";
import { BuildPlanButton } from "./build-plan-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
// Plan generation makes two Gemini calls and takes roughly 45 seconds on the
// free tier. Server Actions inherit their timeout from the page that invokes
// them, and the platform default is well under that.
export const maxDuration = 120;
export const metadata = { title: "Today's Training" };

export default async function TrainPage() {
  await requireUser("/train");

  const [plan, week, profile] = await Promise.all([
    getActivePlan(),
    getWeekTraining(),
    getProfile(),
  ]);

  if (!plan) {
    return (
      <>
        <PageIntro
          title="Your Training Week"
          description="Built around your goal, your equipment and the time you have."
        />
        <EmptyState
          icon={Dumbbell}
          title="No plan yet"
          description="Build one from your profile and it will be waiting here — split, exercises, sets and rest, all matched to how you answered the wizard."
          action={<BuildPlanButton />}
        />
      </>
    );
  }

  const today = todayIndex();
  const trainingDays = plan.days.filter((d) => !d.is_rest_day);
  const totalSets = trainingDays.reduce(
    (n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0),
    0,
  );
  const todayDay = plan.days.find((d) => d.day_index === today);
  const typicalMinutes = trainingDays[0]?.est_minutes ?? 0;

  return (
    <>
      <PageIntro
        eyebrow={`${plan.name} · week ${plan.week_number} of ${plan.weeks}`}
        title="Your Training Week"
        description="Built around your goal, your equipment and the time you have. Stay consistent — every session counts."
        actions={
          todayDay && !todayDay.is_rest_day ? (
            <Link href={`/train/${todayDay.day_index}/session`}>
              <Button size="lg">
                <Dumbbell /> Start Today's Session
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* ------------------------------------------------- plan summary -- */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:mb-8 lg:grid-cols-4 lg:gap-4">
        {[
          { icon: CalendarDays, label: "Sessions a week", value: String(trainingDays.length) },
          { icon: Target, label: "Sets a week", value: String(totalSets) },
          { icon: Clock, label: "Typical session", value: `${typicalMinutes} min` },
          {
            icon: Dumbbell,
            label: "This week",
            value: `${week.completed}/${profile?.days_per_week ?? trainingDays.length} done`,
          },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4 lg:p-5">
            <span className="mb-3 flex size-8 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
              <Icon className="size-4" />
            </span>
            <p className="text-[0.8125rem] text-muted">{label}</p>
            <p className="mt-0.5 font-display text-lg font-bold tabular">{value}</p>
          </Card>
        ))}
      </div>

      {/* ----------------------------------------------- why this plan -- */}
      {plan.ai_rationale && (
        <Card className="mb-6 lg:mb-8">
          <div className="flex gap-4">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary sm:flex">
              <Sparkles className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <CardTitle>Why this plan</CardTitle>
              <p className="text-caption mt-2 leading-relaxed">{plan.ai_rationale}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ---------------------------------------------------- week list -- */}
      <SectionHeader
        title="Your Week"
        description="Tap any session to see the full breakdown."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plan.days.map((day) => {
          const isToday = day.day_index === today;
          const sets = day.exercises.reduce((n, e) => n + e.sets, 0);

          const body = (
            <Card
              interactive={!day.is_rest_day}
              className={cn(
                "flex h-full flex-col",
                isToday && "border-primary ring-1 ring-primary/20",
                day.is_rest_day && "bg-surface-muted/60 shadow-none",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 flex-col items-center justify-center rounded-[12px] text-[0.6875rem] font-semibold",
                    day.is_rest_day
                      ? "bg-surface text-subtle"
                      : isToday
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary-soft text-primary",
                  )}
                >
                  {day.is_rest_day ? (
                    <Moon className="size-[18px]" />
                  ) : (
                    <>
                      <span className="opacity-80">{day.weekday}</span>
                      <span className="font-display text-sm font-bold">{day.day_index}</span>
                    </>
                  )}
                </span>

                {isToday && <Badge variant="primary">Today</Badge>}
                {day.is_rest_day && !isToday && <Badge>Rest</Badge>}
              </div>

              <CardTitle className="truncate">{day.title}</CardTitle>
              <p className="text-caption mt-1 min-h-10">
                {day.is_rest_day
                  ? "No session planned. Let the work land."
                  : day.focus}
              </p>

              {!day.is_rest_day && (
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-[0.8125rem] text-muted">
                  <span className="tabular">
                    {day.exercises.length} exercises · {sets} sets
                  </span>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <Clock className="size-3.5" />
                    {day.est_minutes}m
                    <ChevronRight className="size-3.5" />
                  </span>
                </div>
              )}
            </Card>
          );

          return day.is_rest_day ? (
            <div key={day.day_index}>{body}</div>
          ) : (
            <Link key={day.day_index} href={`/train/${day.day_index}`} className="h-full">
              {body}
            </Link>
          );
        })}
      </div>

      {/* Answers change; the plan should be able to change with them. */}
      <div className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-8">
        <p className="text-caption text-center">
          Changed your goal, equipment or how often you train?
        </p>
        <BuildPlanButton label="Rebuild from my profile" variant="secondary" />
      </div>
    </>
  );
}
