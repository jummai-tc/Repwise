import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Dumbbell, Repeat, Target, Timer } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findDay, getActivePlan } from "@/lib/data/training";
import { requireUser } from "@/lib/data/user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Workout" };

export default async function DayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  await requireUser(`/train/${day}`);

  const plan = await getActivePlan();
  const planDay = findDay(plan, Number(day));

  if (!planDay || planDay.is_rest_day) notFound();

  const totalSets = planDay.exercises.reduce((n, e) => n + e.sets, 0);

  return (
    <>
      <Link
        href="/train"
        className="mb-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Your training week
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
        <div className="min-w-0">
          <Badge variant="primary" className="mb-2.5">
            {planDay.weekday} · Day {planDay.day_index}
          </Badge>
          <h2 className="text-page-title">{planDay.title}</h2>
          <p className="text-caption mt-1.5">{planDay.focus}</p>
        </div>

        <Link href={`/train/${planDay.day_index}/session`} className="shrink-0">
          <Button size="lg">
            <Dumbbell /> Start Training
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 lg:mb-8 lg:gap-4">
        {[
          { icon: Clock, label: "Duration", value: `${planDay.est_minutes}`, unit: "min" },
          { icon: Dumbbell, label: "Exercises", value: `${planDay.exercises.length}`, unit: "" },
          { icon: Repeat, label: "Total sets", value: `${totalSets}`, unit: "" },
        ].map(({ icon: Icon, label, value, unit }) => (
          <Card key={label} className="p-4 lg:p-5">
            <span className="mb-3 flex size-8 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
              <Icon className="size-4" />
            </span>
            <p className="text-[0.8125rem] text-muted">{label}</p>
            <p className="text-stat mt-0.5">
              {value}
              {unit && <span className="ml-1 text-sm font-medium text-subtle">{unit}</span>}
            </p>
          </Card>
        ))}
      </div>

      <div className="mb-6 space-y-3">
        {planDay.exercises.map((ex, i) => (
          <Card key={ex.id}>
            <div className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted font-display text-sm font-bold text-muted">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <CardTitle>{ex.name}</CardTitle>
                  <span className="text-[0.8125rem] font-semibold text-primary tabular">
                    {ex.sets} × {ex.reps}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-muted">
                  <span className="flex items-center gap-1 tabular">
                    <Timer className="size-3.5" />
                    {ex.rest_seconds}s rest
                  </span>
                  {ex.primary_muscle && (
                    <span className="flex items-center gap-1">
                      <Target className="size-3.5" />
                      {ex.primary_muscle}
                    </span>
                  )}
                  {ex.last_weight_kg ? (
                    <span className="tabular text-subtle">
                      Last time: {ex.last_weight_kg}kg × {ex.last_reps}
                    </span>
                  ) : null}
                </div>

                {ex.cues.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-[12px] bg-surface-muted p-3">
                    {ex.cues.map((cue) => (
                      <li key={cue} className="flex gap-2 text-[0.8125rem] leading-relaxed text-muted">
                        <span aria-hidden className="text-primary">•</span>
                        {cue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-24 z-30 sm:bottom-20">
        <Link href={`/train/${planDay.day_index}/session`}>
          <Button size="lg" block>
            <Dumbbell /> Start Training
          </Button>
        </Link>
      </div>
    </>
  );
}
