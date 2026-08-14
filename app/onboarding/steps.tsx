"use client";

import { useState } from "react";
import type {
  ActivityLevel,
  DietaryPreference,
  ExperienceLevel,
  Goal,
  Sex,
  TrainingLocation,
  UnitSystem,
} from "@/lib/supabase/database.types";
import {
  ACTIVITY_OPTIONS,
  COMMON_ALLERGENS,
  DAYS_PER_WEEK_OPTIONS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  LOCATION_OPTIONS,
  SESSION_MINUTES_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/constants/fitness";
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
} from "@/lib/calc/units";
import { ChoiceChip, NumberField, OptionCard, Segmented } from "@/components/ui/choice";
import { Input, Textarea } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export type Draft = {
  full_name: string;
  phone: string;
  date_of_birth: string;
  sex: Sex | null;
  units: UnitSystem;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  experience_level: ExperienceLevel | null;
  years_training: number | null;
  primary_goal: Goal | null;
  training_location: TrainingLocation | null;
  days_per_week: number | null;
  session_minutes: number | null;
  equipment: string[];
  activity_level: ActivityLevel | null;
  dietary_preference: DietaryPreference;
  allergies: string[];
  injuries: string;
};

export type StepProps = {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  errors: Record<string, string[] | undefined>;
};

const group = "space-y-2.5";

/* ------------------------------------------------------------ 1. identity */
export function IdentityStep({ draft, set, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          value={draft.full_name}
          onChange={(e) => set({ full_name: e.target.value })}
          placeholder="Alex Morgan"
          autoComplete="name"
          aria-invalid={Boolean(errors.full_name)}
        />
        <FieldError>{errors.full_name?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          value={draft.phone}
          onChange={(e) => set({ phone: e.target.value })}
          placeholder="+234 801 234 5678"
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
        />
        <FieldError>{errors.phone?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="dob">Date of birth</Label>
        <Input
          id="dob"
          type="date"
          value={draft.date_of_birth}
          onChange={(e) => set({ date_of_birth: e.target.value })}
          aria-invalid={Boolean(errors.date_of_birth)}
        />
        <p className="mt-1.5 text-[0.8125rem] text-subtle">
          Age affects your calorie needs, so this one matters.
        </p>
        <FieldError>{errors.date_of_birth?.[0]}</FieldError>
      </div>

      <div>
        <Label>Sex</Label>
        <div role="radiogroup" className={group}>
          {SEX_OPTIONS.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              selected={draft.sex === o.value}
              onSelect={() => set({ sex: o.value })}
            />
          ))}
        </div>
        <FieldError>{errors.sex?.[0]}</FieldError>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 2. body */
export function BodyStep({ draft, set, errors }: StepProps) {
  const imperial = draft.units === "imperial";
  const ftIn = draft.height_cm ? cmToFeetInches(draft.height_cm) : null;
  const [feet, setFeet] = useState<number | null>(ftIn?.feet ?? null);
  const [inches, setInches] = useState<number | null>(ftIn?.inches ?? null);

  const syncImperialHeight = (f: number | null, i: number | null) => {
    setFeet(f);
    setInches(i);
    set({ height_cm: f === null ? null : feetInchesToCm(f, i ?? 0) });
  };

  const toDisplayWeight = (kg: number | null) =>
    kg === null ? null : imperial ? Math.round(kgToLb(kg)) : Math.round(kg * 10) / 10;

  const fromDisplayWeight = (v: number | null) =>
    v === null ? null : imperial ? lbToKg(v) : v;

  return (
    <div className="space-y-6">
      <div>
        <Label>Units</Label>
        <Segmented<UnitSystem>
          label="Unit system"
          options={[
            { value: "metric", label: "Metric (kg / cm)" },
            { value: "imperial", label: "Imperial (lb / ft)" },
          ]}
          value={draft.units}
          onChange={(units) => set({ units })}
        />
      </div>

      <div>
        <Label htmlFor="height">Height</Label>
        {imperial ? (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              id="height"
              value={feet}
              onChange={(v) => syncImperialHeight(v, inches)}
              suffix="ft"
              min={3}
              max={8}
              invalid={Boolean(errors.height_cm)}
            />
            <NumberField
              value={inches}
              onChange={(v) => syncImperialHeight(feet, v)}
              suffix="in"
              min={0}
              max={11}
              invalid={Boolean(errors.height_cm)}
            />
          </div>
        ) : (
          <NumberField
            id="height"
            value={draft.height_cm === null ? null : Math.round(draft.height_cm)}
            onChange={(v) => set({ height_cm: v })}
            suffix="cm"
            placeholder="175"
            min={120}
            max={250}
            invalid={Boolean(errors.height_cm)}
          />
        )}
        <FieldError>{errors.height_cm?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="weight">Current weight</Label>
        <NumberField
          id="weight"
          value={toDisplayWeight(draft.weight_kg)}
          onChange={(v) => set({ weight_kg: fromDisplayWeight(v) })}
          suffix={imperial ? "lb" : "kg"}
          placeholder={imperial ? "165" : "75"}
          step={0.1}
          invalid={Boolean(errors.weight_kg)}
        />
        <FieldError>{errors.weight_kg?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="target">Target weight</Label>
        <NumberField
          id="target"
          value={toDisplayWeight(draft.target_weight_kg)}
          onChange={(v) => set({ target_weight_kg: fromDisplayWeight(v) })}
          suffix={imperial ? "lb" : "kg"}
          placeholder={imperial ? "155" : "70"}
          step={0.1}
          invalid={Boolean(errors.target_weight_kg)}
        />
        <p className="mt-1.5 text-[0.8125rem] text-subtle">
          Not sure? Put your current weight — you can change it any time.
        </p>
        <FieldError>{errors.target_weight_kg?.[0]}</FieldError>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- 3. experience */
export function ExperienceStep({ draft, set, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <div role="radiogroup" className={group}>
          {EXPERIENCE_OPTIONS.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              description={o.description}
              selected={draft.experience_level === o.value}
              onSelect={() => set({ experience_level: o.value })}
            />
          ))}
        </div>
        <FieldError>{errors.experience_level?.[0]}</FieldError>
      </div>

      {draft.experience_level && draft.experience_level !== "beginner" && (
        <div>
          <Label htmlFor="years">Roughly how many years?</Label>
          <NumberField
            id="years"
            value={draft.years_training}
            onChange={(v) => set({ years_training: v })}
            suffix="yrs"
            placeholder="2"
            step={0.5}
            min={0}
            max={60}
            invalid={Boolean(errors.years_training)}
          />
          <FieldError>{errors.years_training?.[0]}</FieldError>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- 4. goal */
export function GoalStep({ draft, set, errors }: StepProps) {
  return (
    <div>
      <div role="radiogroup" className={group}>
        {GOAL_OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            description={o.description}
            selected={draft.primary_goal === o.value}
            onSelect={() => set({ primary_goal: o.value })}
          />
        ))}
      </div>
      <FieldError>{errors.primary_goal?.[0]}</FieldError>
    </div>
  );
}

/* ------------------------------------------------------------ 5. training */
export function TrainingStep({ draft, set, errors }: StepProps) {
  const needsEquipment =
    draft.training_location === "home" || draft.training_location === "both";

  const toggleEquipment = (value: string) => {
    const has = draft.equipment.includes(value);
    // "Bodyweight only" is exclusive — picking it clears any kit, and picking
    // kit clears it.
    if (value === "bodyweight") {
      set({ equipment: has ? [] : ["bodyweight"] });
      return;
    }
    const next = has
      ? draft.equipment.filter((e) => e !== value)
      : [...draft.equipment.filter((e) => e !== "bodyweight"), value];
    set({ equipment: next });
  };

  return (
    <div className="space-y-7">
      <div>
        <Label>Where will you train?</Label>
        <div role="radiogroup" className={group}>
          {LOCATION_OPTIONS.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              description={o.description}
              selected={draft.training_location === o.value}
              onSelect={() => set({ training_location: o.value })}
            />
          ))}
        </div>
        <FieldError>{errors.training_location?.[0]}</FieldError>
      </div>

      <div>
        <Label>Days per week</Label>
        <Segmented<number>
          label="Days per week"
          options={DAYS_PER_WEEK_OPTIONS.map((d) => ({ value: d, label: String(d) }))}
          value={draft.days_per_week}
          onChange={(days_per_week) => set({ days_per_week })}
        />
        <FieldError>{errors.days_per_week?.[0]}</FieldError>
      </div>

      <div>
        <Label>Time per session</Label>
        <Segmented<number>
          label="Minutes per session"
          options={SESSION_MINUTES_OPTIONS.map((m) => ({
            value: m,
            label: `${m}m`,
          }))}
          value={draft.session_minutes}
          onChange={(session_minutes) => set({ session_minutes })}
        />
        <FieldError>{errors.session_minutes?.[0]}</FieldError>
      </div>

      {needsEquipment && (
        <div>
          <Label>What equipment do you have?</Label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((o) => (
              <ChoiceChip
                key={o.value}
                label={o.label}
                selected={draft.equipment.includes(o.value)}
                onToggle={() => toggleEquipment(o.value)}
              />
            ))}
          </div>
          <p className="mt-2 text-[0.8125rem] text-subtle">
            Only exercises you can actually do will appear in your plan.
          </p>
          <FieldError>{errors.equipment?.[0]}</FieldError>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- 6. nutrition */
export function NutritionStep({ draft, set, errors }: StepProps) {
  const [customAllergy, setCustomAllergy] = useState("");

  const toggleAllergy = (a: string) =>
    set({
      allergies: draft.allergies.includes(a)
        ? draft.allergies.filter((x) => x !== a)
        : [...draft.allergies, a],
    });

  const addCustomAllergy = () => {
    const v = customAllergy.trim();
    if (!v || draft.allergies.includes(v)) return;
    set({ allergies: [...draft.allergies, v] });
    setCustomAllergy("");
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>How active are you outside training?</Label>
        <div role="radiogroup" className={group}>
          {ACTIVITY_OPTIONS.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              description={o.description}
              selected={draft.activity_level === o.value}
              onSelect={() => set({ activity_level: o.value })}
            />
          ))}
        </div>
        <FieldError>{errors.activity_level?.[0]}</FieldError>
      </div>

      <div>
        <Label>Do you follow a particular diet?</Label>
        <div className="flex flex-wrap gap-2">
          {DIET_OPTIONS.map((o) => (
            <ChoiceChip
              key={o.value}
              label={o.label}
              selected={draft.dietary_preference === o.value}
              onToggle={() => set({ dietary_preference: o.value })}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Any allergies or foods to avoid?</Label>
        <div className="mb-3 flex flex-wrap gap-2">
          {COMMON_ALLERGENS.map((a) => (
            <ChoiceChip
              key={a}
              label={a}
              selected={draft.allergies.includes(a)}
              onToggle={() => toggleAllergy(a)}
            />
          ))}
          {draft.allergies
            .filter((a) => !COMMON_ALLERGENS.includes(a))
            .map((a) => (
              <ChoiceChip key={a} label={a} selected onToggle={() => toggleAllergy(a)} />
            ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customAllergy}
            onChange={(e) => setCustomAllergy(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomAllergy();
              }
            }}
            placeholder="Something else? Type it and press enter"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="injuries">Any injuries or limitations?</Label>
        <Textarea
          id="injuries"
          value={draft.injuries}
          onChange={(e) => set({ injuries: e.target.value })}
          placeholder="e.g. dodgy left knee, avoid overhead pressing"
          maxLength={500}
        />
        <p className="mt-1.5 text-[0.8125rem] text-subtle">
          Optional — but anything you write here becomes a hard exclusion in
          your plan.
        </p>
        <FieldError>{errors.injuries?.[0]}</FieldError>
      </div>
    </div>
  );
}
