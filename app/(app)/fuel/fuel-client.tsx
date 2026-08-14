"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Droplets,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { DietPlanRow, MealType } from "@/lib/supabase/database.types";
import type { MealItem, Totals } from "@/lib/data/nutrition";
import { PageIntro } from "@/components/shell/page-intro";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { CalorieRing, MacroBar } from "@/components/ui/rings";
import { SectionHeader } from "@/components/ui/section";
import {
  addFoodLog,
  addWater,
  deleteFoodLog,
  estimateMealMacros,
  logPlanMeal,
  unlogPlanMeal,
} from "./actions";
import type { MealEstimate } from "@/lib/ai/food";
import { cn } from "@/lib/utils";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const BLANK_FORM = {
  name: "",
  calories: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
};

export function FuelClient({
  today,
  targets,
  meals,
  eaten,
  waterMl,
  canEstimate,
}: {
  today: string;
  targets: DietPlanRow;
  meals: MealItem[];
  eaten: Totals;
  waterMl: number;
  /** Whether a Gemini key is configured, decided on the server. */
  canEstimate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Ticking a meal is a network round trip; the checkbox should not wait for it.
  const [optimisticMeals, toggleOptimistic] = useOptimistic(
    meals,
    (state: MealItem[], id: string) =>
      state.map((m) => (m.id === id ? { ...m, logged: !m.logged } : m)),
  );
  const [optimisticWater, addOptimisticWater] = useOptimistic(
    waterMl,
    (state: number, ml: number) => Math.max(0, state + ml),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [form, setForm] = useState(BLANK_FORM);

  // Estimating is a read, not a mutation, so it stays out of the transition
  // that drives the optimistic rings — otherwise the totals would flicker
  // while nothing has actually been logged.
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);

  // Totals follow the optimistic list so the rings move with the checkbox.
  const optimisticEaten = optimisticMeals
    .filter((m) => m.logged)
    .reduce(
      (a, m) => ({
        calories: a.calories + m.calories,
        protein_g: a.protein_g + m.protein_g,
        carbs_g: a.carbs_g + m.carbs_g,
        fat_g: a.fat_g + m.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } as Totals,
    );

  const showEaten = pending ? optimisticEaten : eaten;

  const run = (
    optimistic: () => void,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) => {
    setError(null);
    startTransition(async () => {
      optimistic();
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  const toggleMeal = (meal: MealItem) => {
    if (!meal.from_plan) return;
    run(
      () => toggleOptimistic(meal.id),
      () =>
        meal.logged
          ? unlogPlanMeal(meal.name)
          : logPlanMeal({
              name: meal.name,
              meal_type: meal.meal_type,
              calories: meal.calories,
              protein_g: meal.protein_g,
              carbs_g: meal.carbs_g,
              fat_g: meal.fat_g,
            }),
    );
  };

  const removeMeal = (meal: MealItem) =>
    run(
      () => toggleOptimistic(meal.id),
      () => deleteFoodLog(meal.id),
    );

  const water = (ml: number) =>
    run(
      () => addOptimisticWater(ml),
      () => addWater(ml),
    );

  const submitFood = () => {
    const calories = Number(form.calories);
    if (!form.name.trim() || !Number.isFinite(calories)) {
      setError("A name and a calorie figure are the minimum.");
      return;
    }

    run(
      () => {},
      async () => {
        const result = await addFoodLog({
          name: form.name,
          serving: estimate?.serving ?? null,
          meal_type: mealType,
          source: estimate ? "ai_estimate" : "manual",
          calories: Math.round(calories),
          protein_g: Number(form.protein_g) || 0,
          carbs_g: Number(form.carbs_g) || 0,
          fat_g: Number(form.fat_g) || 0,
        });
        if (result.ok) {
          closeAdd();
        }
        return result;
      },
    );
  };

  const closeAdd = () => {
    setAddOpen(false);
    setForm(BLANK_FORM);
    setEstimate(null);
  };

  /**
   * Any hand edit drops the row back to a manual log. The numbers are no
   * longer the ones the model gave, so the assumed portion no longer describes
   * them and neither does the 'ai_estimate' source.
   */
  const editForm = (patch: Partial<typeof BLANK_FORM>) => {
    setEstimate(null);
    setForm({ ...form, ...patch });
  };

  const runEstimate = async () => {
    const description = form.name.trim();
    if (description.length < 2) {
      setError("Describe what you ate first.");
      return;
    }

    setError(null);
    setEstimating(true);
    const result = await estimateMealMacros(description);
    setEstimating(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEstimate(result.estimate);
    setForm({
      name: result.estimate.name,
      calories: String(result.estimate.calories),
      protein_g: String(result.estimate.protein_g),
      carbs_g: String(result.estimate.carbs_g),
      fat_g: String(result.estimate.fat_g),
    });
  };

  const waterPct = Math.min((optimisticWater / targets.water_ml_target) * 100, 100);

  return (
    <>
      <PageIntro
        eyebrow={today}
        title="Nutrition"
        description="Hit your targets and the training takes care of itself."
        actions={
          <Button size="lg" onClick={() => setAddOpen(true)}>
            <Plus /> Log Your Meal
          </Button>
        }
      />

      {error && (
        <p className="mb-4 flex items-center gap-1.5 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-[0.8125rem] text-danger">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {/* ------------------------------------------------ left column -- */}
        <div className="space-y-4 lg:col-span-1 lg:space-y-6">
          <Card>
            <CardTitle className="mb-5">Calories Today</CardTitle>
            <div className="flex flex-col items-center gap-6">
              <CalorieRing
                consumed={showEaten.calories}
                target={targets.daily_calories}
                size={168}
              />
              <div className="w-full space-y-4">
                <MacroBar macro="protein" consumed={showEaten.protein_g} target={targets.protein_g} />
                <MacroBar macro="carbs" consumed={showEaten.carbs_g} target={targets.carbs_g} />
                <MacroBar macro="fat" consumed={showEaten.fat_g} target={targets.fat_g} />
              </div>
              <p className="w-full border-t border-border pt-4 text-center text-[0.8125rem] text-subtle tabular">
                {Math.round(showEaten.calories).toLocaleString()} eaten ·{" "}
                {targets.daily_calories.toLocaleString()} target
              </p>
            </div>
          </Card>

          {/* ------------------------------------------------------ water */}
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="size-4 text-info" /> Water Intake
              </CardTitle>
              <span className="text-[0.8125rem] tabular text-muted">
                {(optimisticWater / 1000).toFixed(2)} /{" "}
                {(targets.water_ml_target / 1000).toFixed(1)} L
              </span>
            </div>

            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-info transition-[width] duration-500"
                style={{ width: `${waterPct}%` }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => water(-250)}
                aria-label="Undo the last drink"
              >
                <Minus />
              </Button>
              <Button variant="secondary" size="sm" block onClick={() => water(250)}>
                <Plus /> 250 ml
              </Button>
              <Button variant="secondary" size="sm" block onClick={() => water(500)}>
                <Plus /> 500 ml
              </Button>
            </div>
          </Card>

          {/* ------------------------------------------------ why these -- */}
          {targets.ai_rationale && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle>Why these targets</CardTitle>
              </div>
              <p className="text-caption leading-relaxed">{targets.ai_rationale}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[12px] bg-surface-muted p-3">
                  <p className="text-xs text-subtle">Resting burn</p>
                  <p className="mt-0.5 font-display text-lg font-bold tabular">
                    {targets.bmr?.toLocaleString() ?? "—"}
                  </p>
                </div>
                <div className="rounded-[12px] bg-surface-muted p-3">
                  <p className="text-xs text-subtle">Maintenance</p>
                  <p className="mt-0.5 font-display text-lg font-bold tabular">
                    {targets.tdee?.toLocaleString() ?? "—"}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ----------------------------------------------- right column -- */}
        <div className="lg:col-span-2">
          <SectionHeader
            title="Today's Meals"
            description="Tick a planned meal once you've eaten it."
          />

          <div className="space-y-6">
            {MEAL_ORDER.map((type) => {
              const group = optimisticMeals.filter((m) => m.meal_type === type);
              if (group.length === 0) return null;

              return (
                <div key={type}>
                  <div className="mb-2.5 flex items-baseline justify-between px-1">
                    <h3 className="text-card-title">{MEAL_LABEL[type]}</h3>
                    <span className="text-[0.8125rem] tabular text-subtle">
                      {group.filter((m) => m.logged).reduce((n, m) => n + m.calories, 0)} kcal
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {group.map((meal) => (
                      <Card
                        key={meal.id}
                        className={cn(
                          "p-4 transition-colors",
                          meal.logged && "border-primary/30 bg-primary-soft/40",
                        )}
                      >
                        <div className="flex items-start gap-3.5">
                          <button
                            type="button"
                            onClick={() => toggleMeal(meal)}
                            disabled={!meal.from_plan}
                            aria-pressed={meal.logged}
                            aria-label={
                              meal.logged
                                ? `Mark ${meal.name} as not eaten`
                                : `Mark ${meal.name} as eaten`
                            }
                            className={cn(
                              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                              meal.logged
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border-strong text-transparent hover:border-primary",
                              !meal.from_plan && "cursor-default",
                            )}
                          >
                            <Check className="size-3.5" strokeWidth={3} />
                          </button>

                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-[0.9375rem] font-medium",
                                meal.logged && meal.from_plan && "text-muted line-through",
                              )}
                            >
                              {meal.name}
                            </p>
                            <p className="text-caption mt-0.5">{meal.description}</p>
                            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] tabular text-subtle">
                              <span className="font-semibold text-foreground">
                                {meal.calories} kcal
                              </span>
                              <span>P {meal.protein_g}g</span>
                              <span>C {meal.carbs_g}g</span>
                              <span>F {meal.fat_g}g</span>
                            </div>
                          </div>

                          {!meal.from_plan && (
                            <button
                              type="button"
                              onClick={() => removeMeal(meal)}
                              aria-label={`Remove ${meal.name}`}
                              className="shrink-0 rounded-lg p-1.5 text-subtle transition-colors hover:bg-surface-hover hover:text-danger"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Button size="lg" block className="mt-6" onClick={() => setAddOpen(true)}>
            <Plus /> Log Your Meal
          </Button>
        </div>
      </div>

      {/* --------------------------------------------------- add sheet -- */}
      <Sheet
        open={addOpen}
        onClose={closeAdd}
        title="Log Your Meal"
        description="Anything you ate that wasn't on the plan."
      >
        <div className="space-y-5">
          <div>
            <Label htmlFor="meal-name">What did you eat?</Label>
            <Input
              id="meal-name"
              value={form.name}
              onChange={(e) => editForm({ name: e.target.value })}
              placeholder="Two eggs on toast"
              autoFocus
            />

            {canEstimate && (
              <Button
                variant="secondary"
                size="sm"
                block
                className="mt-2"
                onClick={runEstimate}
                disabled={estimating || pending}
              >
                {estimating ? (
                  <>
                    <Loader2 className="animate-spin" /> Working it out…
                  </>
                ) : (
                  <>
                    <Sparkles /> Estimate the macros for me
                  </>
                )}
              </Button>
            )}

            {estimate && (
              <p className="mt-2 text-xs leading-relaxed text-subtle">
                Estimated from{" "}
                <span className="text-muted">{estimate.serving}</span>. Change
                any number below if that is not what you had.
              </p>
            )}
          </div>

          <div>
            <Label>Which meal?</Label>
            <div className="flex flex-wrap gap-2">
              {MEAL_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMealType(t)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-all",
                    mealType === t
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {MEAL_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["calories", "Calories (kcal)"],
                ["protein_g", "Protein (g)"],
                ["carbs_g", "Carbs (g)"],
                ["fat_g", "Fat (g)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={`meal-${key}`}>{label}</Label>
                <Input
                  id={`meal-${key}`}
                  type="number"
                  inputMode="numeric"
                  value={form[key]}
                  onChange={(e) => editForm({ [key]: e.target.value })}
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <Button size="lg" block onClick={submitFood} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check /> Add to today
              </>
            )}
          </Button>

          <p className="text-center text-xs leading-relaxed text-subtle">
            Macros are optional — calories alone still count towards your day.
          </p>
        </div>
      </Sheet>
    </>
  );
}
