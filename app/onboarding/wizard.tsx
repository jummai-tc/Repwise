"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { STEP_META, STEP_SCHEMAS } from "@/lib/validation/onboarding";
import { completeOnboarding, saveOnboardingStep } from "./actions";
import {
  BodyStep,
  ExperienceStep,
  GoalStep,
  IdentityStep,
  NutritionStep,
  TrainingStep,
  type Draft,
  type StepProps,
} from "./steps";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { FormAlert } from "@/components/auth/form-alert";

const STEPS: ((p: StepProps) => React.ReactNode)[] = [
  IdentityStep,
  BodyStep,
  ExperienceStep,
  GoalStep,
  TrainingStep,
  NutritionStep,
];

/** Which draft keys each step is responsible for validating and saving. */
const STEP_FIELDS: (keyof Draft)[][] = [
  ["full_name", "phone", "date_of_birth", "sex"],
  ["units", "height_cm", "weight_kg", "target_weight_kg"],
  ["experience_level", "years_training"],
  ["primary_goal"],
  ["training_location", "days_per_week", "session_minutes", "equipment"],
  ["activity_level", "dietary_preference", "allergies", "injuries"],
];

/** Group Zod issues by the field they belong to.
 *  STEP_SCHEMAS is a tuple of differently-shaped schemas, so the error type is
 *  a union that z.flattenError cannot narrow — reading issues directly avoids
 *  casting the schema away. */
function fieldErrorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Null means "not answered yet"; schemas expect absence, so translate. */
function slice(draft: Draft, keys: (keyof Draft)[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = draft[k];
    if (v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function OnboardingWizard({
  initialDraft,
  initialStep,
}: {
  initialDraft: Draft;
  initialStep: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(initialStep, STEPS.length - 1));
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const [pending, startTransition] = useTransition();

  const isLast = step === STEPS.length - 1;
  const Step = STEPS[step];
  const meta = STEP_META[step];

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    // Clear the errors for whatever the user just touched.
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const back = () => {
    setDirection(-1);
    setFormError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const next = () => {
    const fields = STEP_FIELDS[step];
    const parsed = STEP_SCHEMAS[step].safeParse(slice(draft, fields));

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }

    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const payload = { ...parsed.data, onboarding_step: step + 1 };
      const res = isLast
        ? await completeOnboarding(payload)
        : await saveOnboardingStep(payload);

      if (!res.ok) {
        setFormError(res.error);
        return;
      }

      if (isLast) {
        router.push("/dashboard");
        return;
      }

      setDirection(1);
      setStep((s) => s + 1);
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 py-6 sm:px-8">
      <header className="mx-auto w-full max-w-lg">
        <Logo />

        <div className="mt-6 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label="Onboarding progress"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 220, damping: 30 }}
            />
          </div>
          <span className="text-xs text-subtle tabular">
            {step + 1} / {STEPS.length}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <h1 className="text-page-title">{meta.title}</h1>
            <p className="text-caption mt-2 mb-7">{meta.blurb}</p>

            {formError && <FormAlert>{formError}</FormAlert>}

            <div className="card p-5 lg:p-6">
              <Step draft={draft} set={set} errors={errors} />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0 mx-auto w-full max-w-lg bg-background/90 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-lg">
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={back}
              disabled={pending}
              aria-label="Back"
            >
              <ArrowLeft />
            </Button>
          )}
          <Button size="lg" block onClick={next} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                {isLast ? "Building your plan…" : "Saving…"}
              </>
            ) : (
              <>
                {isLast ? "Finish and build my plan" : "Continue"}
                {!isLast && <ArrowRight />}
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
