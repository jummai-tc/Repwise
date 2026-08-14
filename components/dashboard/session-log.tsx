"use client";

import { useState } from "react";
import { Dumbbell, Trophy } from "lucide-react";
import type { RecentWorkout } from "@/lib/data/training";
import { cn } from "@/lib/utils";

type PR = {
  exercise: string;
  weight_kg: number;
  reps: number;
  achieved_on: string;
  delta_kg: number;
};

const TABS = [
  { id: "sessions", label: "Sessions" },
  { id: "records", label: "Personal bests" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * The dashboard's log. Two views of the same history — what you did, and what
 * you beat — behind one set of tabs, so the panel answers both questions
 * without doubling the page length.
 *
 * The numbers live in a real table on wide screens and collapse to stacked
 * rows on narrow ones; nothing scrolls sideways either way.
 */
export function SessionLog({
  workouts,
  records,
}: {
  workouts: RecentWorkout[];
  records: PR[];
}) {
  const [tab, setTab] = useState<TabId>("sessions");

  return (
    <div className="flex h-full flex-col">
      <div
        role="tablist"
        aria-label="Training history"
        className="flex gap-1 border-b border-border px-4 pt-3 sm:px-5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative -mb-px px-3 py-2.5 text-[0.8125rem] font-medium transition-colors",
              tab === t.id
                ? "text-foreground"
                : "text-subtle hover:text-muted",
            )}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "sessions" ? (
        <ul className="flex-1">
          {workouts.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-3.5 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-hover sm:px-5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary ring-1 ring-inset ring-white/5">
                <Dumbbell className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{w.title}</p>
                <p className="truncate text-[0.8125rem] text-subtle">
                  {shortDate(w.date)} · {w.focus}
                </p>
              </div>

              <dl className="hidden shrink-0 gap-6 text-right sm:flex">
                {[
                  { k: "Time", v: `${w.duration_min}m` },
                  { k: "Volume", v: `${(w.volume_kg / 1000).toFixed(1)}k` },
                  { k: "Sets", v: `${w.sets}` },
                ].map((c) => (
                  <div key={c.k}>
                    <dt className="text-[0.6875rem] text-subtle">{c.k}</dt>
                    <dd className="tabular text-sm font-semibold">{c.v}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex-1">
          {records.map((r) => (
            <li
              key={r.exercise}
              className="flex items-center gap-3.5 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-hover sm:px-5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-warning-soft text-warning ring-1 ring-inset ring-white/5">
                <Trophy className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.exercise}</p>
                <p className="truncate text-[0.8125rem] text-subtle">
                  {shortDate(r.achieved_on)} · {r.reps} reps
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular text-sm font-semibold">
                  {r.weight_kg} kg
                </span>
                <span className="tabular rounded-full bg-success-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-success">
                  +{r.delta_kg} kg
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
