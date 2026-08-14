"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { STEP_SCHEMAS } from "@/lib/validation/onboarding";
import {
  BodyStep,
  ExperienceStep,
  GoalStep,
  IdentityStep,
  NutritionStep,
  TrainingStep,
  type Draft,
} from "@/app/onboarding/steps";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FormAlert } from "@/components/auth/form-alert";

/** Mirrors STEP_FIELDS in the wizard — the same groupings, reused here. */
const SECTIONS: {
  title: string;
  schemaIndex: number;
  fields: (keyof Draft)[];
  Body: (p: {
    draft: Draft;
    set: (p: Partial<Draft>) => void;
    errors: Record<string, string[] | undefined>;
  }) => React.ReactNode;
}[] = [
  {
    title: "About you",
    schemaIndex: 0,
    fields: ["full_name", "phone", "date_of_birth", "sex"],
    Body: IdentityStep,
  },
  {
    title: "Your body",
    schemaIndex: 1,
    fields: ["units", "height_cm", "weight_kg", "target_weight_kg"],
    Body: BodyStep,
  },
  {
    title: "Experience",
    schemaIndex: 2,
    fields: ["experience_level", "years_training"],
    Body: ExperienceStep,
  },
  {
    title: "Your goal",
    schemaIndex: 3,
    fields: ["primary_goal"],
    Body: GoalStep,
  },
  {
    title: "Where you train",
    schemaIndex: 4,
    fields: [
      "training_location",
      "days_per_week",
      "session_minutes",
      "equipment",
    ],
    Body: TrainingStep,
  },
  {
    title: "Food & health",
    schemaIndex: 5,
    fields: ["activity_level", "dietary_preference", "allergies", "injuries"],
    Body: NutritionStep,
  },
];

function slice(draft: Draft, keys: (keyof Draft)[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = draft[k];
    if (v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function SettingsForm({ initialDraft }: { initialDraft: Draft }) {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const save = () => {
    const allErrors: Record<string, string[]> = {};
    const payload: Record<string, unknown> = {};

    for (const section of SECTIONS) {
      const parsed = STEP_SCHEMAS[section.schemaIndex].safeParse(
        slice(draft, section.fields),
      );
      if (parsed.success) {
        Object.assign(payload, parsed.data);
      } else {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "_form");
          (allErrors[key] ??= []).push(issue.message);
        }
      }
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setFormError("Some fields need attention — see the highlights below.");
      return;
    }

    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const res = await updateProfile(payload);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setSaved(true);
    });
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {formError && <FormAlert>{formError}</FormAlert>}
      {saved && <FormAlert tone="success">Your profile has been saved.</FormAlert>}

      {SECTIONS.map(({ title, Body }) => (
        <Card key={title}>
          <CardTitle className="mb-5 border-b border-border pb-4">{title}</CardTitle>
          <Body draft={draft} set={set} errors={errors} />
        </Card>
      ))}

      {/* Sticky so the save button is always reachable on a long form. */}
      <div className="sticky bottom-24 z-30 sm:bottom-20">
        <Button size="lg" block onClick={save} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Saving…
            </>
          ) : saved ? (
            <>
              <Check /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}
