"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Plus,
  Repeat,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import type { PlanDay } from "@/lib/data/training";
import { ACHIEVEMENTS } from "@/lib/constants/achievements";
import { finishWorkout } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/ui/stat";
import { cn } from "@/lib/utils";

type SetLog = { reps: number | null; weight: number | null; done: boolean };

/** Short beep when the rest timer hits zero. Silently ignored if the browser
 *  blocks audio before the user has interacted with the page. */
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Not important enough to surface.
  }
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutPlayer({ day }: { day: PlanDay }) {
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  // Captured once so the saved session reflects when training actually began,
  // not when the finish button was pressed.
  const startedAt = useRef(new Date().toISOString());
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<{ left: number; total: number } | null>(null);

  // Pre-fill each set with what was lifted last time — logging is then one tap
  // when nothing has changed, which is the common case.
  const [logs, setLogs] = useState<SetLog[][]>(() =>
    day.exercises.map((ex) =>
      Array.from({ length: ex.sets }, () => ({
        reps: ex.last_reps ?? null,
        weight: ex.last_weight_kg ?? null,
        done: false,
      })),
    ),
  );

  const exercise = day.exercises[index];
  const isLastExercise = index === day.exercises.length - 1;

  const totalSets = logs.reduce((n, sets) => n + sets.length, 0);
  const doneSets = logs.reduce(
    (n, sets) => n + sets.filter((s) => s.done).length,
    0,
  );
  const volume = logs.reduce(
    (n, sets) =>
      n +
      sets
        .filter((s) => s.done)
        .reduce((m, s) => m + (s.reps ?? 0) * (s.weight ?? 0), 0),
    0,
  );

  /* --------------------------------------------------------- timers -- */
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      beep();
      setRest(null);
      return;
    }
    const t = setTimeout(
      () => setRest((r) => (r ? { ...r, left: r.left - 1 } : null)),
      1000,
    );
    return () => clearTimeout(t);
  }, [rest]);

  /* ----------------------------------------------------------- edit -- */
  const updateSet = useCallback(
    (setIdx: number, patch: Partial<SetLog>) => {
      setLogs((prev) => {
        const next = prev.map((s) => [...s]);
        next[index][setIdx] = { ...next[index][setIdx], ...patch };
        return next;
      });
    },
    [index],
  );

  const toggleSetDone = (setIdx: number) => {
    const wasDone = logs[index][setIdx].done;
    updateSet(setIdx, { done: !wasDone });

    // Completing a set starts the rest clock automatically — nobody remembers
    // to press start mid-session.
    if (!wasDone) {
      const lastSetOfLastExercise =
        isLastExercise && setIdx === logs[index].length - 1;
      if (!lastSetOfLastExercise) {
        setRest({ left: exercise.rest_seconds, total: exercise.rest_seconds });
      }
    }
  };

  const addSet = () =>
    setLogs((prev) => {
      const next = prev.map((s) => [...s]);
      const last = next[index][next[index].length - 1];
      next[index].push({ reps: last?.reps ?? null, weight: last?.weight ?? null, done: false });
      return next;
    });

  const go = (dir: 1 | -1) => {
    setRest(null);
    setIndex((i) => Math.min(Math.max(i + dir, 0), day.exercises.length - 1));
  };

  /* ----------------------------------------------------------- save -- */
  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);

    // Only completed sets are written — a half-entered row is not history.
    const sets = logs.flatMap((setsForExercise, exerciseIdx) =>
      setsForExercise
        .map((set, setIdx) => ({ set, setIdx }))
        .filter(({ set }) => set.done)
        .map(({ set, setIdx }) => ({
          exercise_id: day.exercises[exerciseIdx].exercise_id,
          exercise_name: day.exercises[exerciseIdx].name,
          set_number: setIdx + 1,
          reps: set.reps,
          weight_kg: set.weight,
          is_warmup: false,
        })),
    );

    const result = await finishWorkout({
      plan_day_id: day.id,
      title: day.title,
      started_at: startedAt.current,
      duration_seconds: elapsed,
      sets,
    });

    setSaving(false);
    if (result.ok) {
      setUnlocked(result.unlocked);
      setFinished(true);
    } else {
      setSaveError(result.error);
    }
  }, [day, elapsed, logs]);

  /* -------------------------------------------------------- summary -- */
  if (finished) {
    const prs = day.exercises
      .map((ex, i) => {
        const best = Math.max(
          0,
          ...logs[i].filter((s) => s.done).map((s) => s.weight ?? 0),
        );
        return { name: ex.name, best, previous: ex.last_weight_kg ?? 0 };
      })
      .filter((p) => p.best > 0 && p.best > p.previous);

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="mb-6 flex size-16 items-center justify-center rounded-[16px] bg-primary text-primary-foreground">
              <Check className="size-8" strokeWidth={3} />
            </span>

            <h1 className="text-page-title">
              {day.title} done
            </h1>
            <p className="mt-2 mb-7 text-muted">
              Saved to your log. That is {doneSets} of {totalSets} sets in the
              bank.
            </p>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <StatTile icon={Timer} label="Duration" value={formatClock(elapsed)} />
              <StatTile icon={Repeat} label="Sets" value={doneSets} tone="info" />
              <StatTile
                icon={Flame}
                label="Volume"
                value={Math.round(volume).toLocaleString()}
                unit="kg"
                tone="warning"
              />
            </div>

            {prs.length > 0 && (
              <Card className="mb-4">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="size-4 text-warning" />
                  <h2 className="text-card-title">
                    {prs.length} personal record{prs.length > 1 ? "s" : ""}
                  </h2>
                </div>
                <ul className="space-y-2">
                  {prs.map((p) => (
                    <li key={p.name} className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-muted">{p.name}</span>
                      <span className="shrink-0 tabular">
                        <span className="text-subtle line-through">
                          {p.previous}kg
                        </span>{" "}
                        <span className="font-medium text-warning">{p.best}kg</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {unlocked.length > 0 && (
              <Card className="mb-4">
                <div className="mb-3 flex items-center gap-2">
                  <Award className="size-4 text-primary" />
                  <h2 className="text-card-title">
                    {unlocked.length} achievement{unlocked.length > 1 ? "s" : ""} unlocked
                  </h2>
                </div>
                <ul className="space-y-2">
                  {unlocked.map((key) => {
                    const def = ACHIEVEMENTS.find((a) => a.key === key);
                    if (!def) return null;
                    return (
                      <li key={key} className="flex justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">{def.title}</span>
                        <span className="shrink-0 text-subtle">{def.description}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            <Link href="/dashboard">
              <Button size="lg" block>
                Back to home
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------- active -- */
  const restPct = rest ? rest.left / rest.total : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ------------------------------------------------------ header -- */}
      <header className="shrink-0 border-b border-border px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Link
            href={`/train/${day.day_index}`}
            aria-label="Leave workout"
            className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{day.title}</p>
            <p className="text-xs text-subtle tabular">
              {formatClock(elapsed)} · {doneSets}/{totalSets} sets
            </p>
          </div>

          <span className="shrink-0 text-xs text-subtle tabular">
            {index + 1}/{day.exercises.length}
          </span>
        </div>

        <div className="mx-auto mt-3 h-1 w-full max-w-md overflow-hidden rounded-full bg-surface-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${(doneSets / totalSets) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 28 }}
          />
        </div>
      </header>

      {/* ---------------------------------------------------- exercise -- */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-md">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              <Badge variant="primary" className="mb-3">
                {exercise.primary_muscle}
              </Badge>
              <h1 className="text-page-title">
                {exercise.name}
              </h1>
              <p className="mt-1 text-sm text-muted tabular">
                Target {exercise.sets} × {exercise.reps} · {exercise.rest_seconds}s rest
              </p>

              {exercise.cues.length > 0 && (
                <Card className="mt-4 mb-5 p-4">
                  <ul className="space-y-1.5">
                    {exercise.cues.map((cue) => (
                      <li
                        key={cue}
                        className="flex gap-2 text-xs leading-relaxed text-muted"
                      >
                        <span aria-hidden className="text-primary">•</span>
                        {cue}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* ------------------------------------------- set table -- */}
              <div className="mb-3 grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-1 text-[11px] font-medium tracking-wide text-subtle uppercase">
                <span>Set</span>
                <span>Weight</span>
                <span>Reps</span>
                <span />
              </div>

              <div className="space-y-2">
                {logs[index].map((set, i) => (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-xl border p-2 transition-colors",
                      set.done
                        ? "border-success/30 bg-success/[0.07]"
                        : "border-border bg-surface",
                    )}
                  >
                    <span className="text-center text-sm font-medium text-muted tabular">
                      {i + 1}
                    </span>

                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label={`Set ${i + 1} weight in kilograms`}
                      value={set.weight ?? ""}
                      step={2.5}
                      onChange={(e) =>
                        updateSet(i, {
                          weight: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="h-11 w-full rounded-[10px] border border-border bg-surface-muted px-3 text-center text-base tabular focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="kg"
                    />

                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={`Set ${i + 1} reps`}
                      value={set.reps ?? ""}
                      onChange={(e) =>
                        updateSet(i, {
                          reps: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="h-11 w-full rounded-[10px] border border-border bg-surface-muted px-3 text-center text-base tabular focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="reps"
                    />

                    <button
                      type="button"
                      onClick={() => toggleSetDone(i)}
                      aria-label={set.done ? `Undo set ${i + 1}` : `Complete set ${i + 1}`}
                      aria-pressed={set.done}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-lg transition-all active:scale-95",
                        set.done
                          ? "bg-success text-primary-foreground"
                          : "border border-border-strong text-subtle hover:text-foreground",
                      )}
                    >
                      <Check className="size-5" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSet}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-border-strong py-3 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <Plus className="size-4" /> Add a set
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ------------------------------------------------------ footer -- */}
      <footer className="shrink-0 border-t border-border px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-md gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous exercise"
          >
            <ChevronLeft />
          </Button>

          {isLastExercise ? (
            <Button size="lg" block onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check /> Finish workout
                </>
              )}
            </Button>
          ) : (
            <Button size="lg" block onClick={() => go(1)}>
              Next exercise <ChevronRight />
            </Button>
          )}
        </div>

        {saveError && (
          <p className="mx-auto mt-2 flex w-full max-w-md items-center justify-center gap-1.5 text-center text-[0.8125rem] text-danger">
            <AlertCircle className="size-3.5 shrink-0" />
            {saveError}
          </p>
        )}
      </footer>

      {/* ------------------------------------------------- rest timer -- */}
      <AnimatePresence>
        {rest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
              className="flex w-full max-w-xs flex-col items-center px-6 text-center"
            >
              <p className="mb-6 text-sm font-medium tracking-wide text-muted uppercase">
                Rest
              </p>

              <div className="relative mb-8 size-48">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="var(--surface-muted)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={2 * Math.PI * 45 * (1 - restPct)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold tabular">
                  {formatClock(rest.left)}
                </span>
              </div>

              <div className="flex w-full gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  block
                  onClick={() =>
                    setRest((r) =>
                      r ? { left: r.left + 30, total: r.total + 30 } : null,
                    )
                  }
                >
                  +30s
                </Button>
                <Button size="lg" block onClick={() => setRest(null)}>
                  Skip
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
