import { z } from "zod";

/**
 * One schema per wizard step. The wizard validates client-side for instant
 * feedback and the server action re-validates the same schema before writing —
 * a client can always be bypassed, so the server is the real gate.
 */

export const identitySchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z
    .string()
    .trim()
    .min(6, "That phone number looks too short")
    .max(20)
    .regex(/^[+()\-\s\d]+$/, "Use digits, spaces and + ( ) - only"),
  date_of_birth: z
    .string()
    .min(1, "Please enter your date of birth")
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / 31_557_600_000;
      return age >= 13 && age <= 100;
    }, "You must be between 13 and 100 to use Repwisely"),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    error: "Please choose an option",
  }),
});

export const bodySchema = z
  .object({
    units: z.enum(["metric", "imperial"], { error: "Please choose your units" }),
    height_cm: z
      .number({ error: "Please enter your height" })
      .min(120, "That height looks too low")
      .max(250, "That height looks too high"),
    weight_kg: z
      .number({ error: "Please enter your weight" })
      .min(30, "That weight looks too low")
      .max(300, "That weight looks too high"),
    target_weight_kg: z
      .number()
      .min(30, "That target looks too low")
      .max(300, "That target looks too high"),
  })
  .refine(
    (v) => Math.abs(v.target_weight_kg - v.weight_kg) <= 60,
    {
      error:
        "That target is a very long way from your current weight — double-check it",
      path: ["target_weight_kg"],
    },
  );

export const experienceSchema = z.object({
  experience_level: z.enum(["beginner", "intermediate", "advanced"], {
    error: "Please pick the option that sounds most like you",
  }),
  years_training: z
    .number()
    .min(0)
    .max(60, "That is a lot of years — please check")
    .optional(),
});

export const goalSchema = z.object({
  primary_goal: z.enum(
    [
      "lose_fat",
      "build_muscle",
      "gain_strength",
      "improve_endurance",
      "maintain",
    ],
    { error: "Please choose a goal — the whole plan is built around it" },
  ),
});

export const trainingSchema = z
  .object({
    training_location: z.enum(["home", "gym", "both"], {
      error: "Please tell us where you will be training",
    }),
    days_per_week: z
      .number({ error: "Please choose how many days a week you can train" })
      .int()
      .min(1, "Pick at least one day")
      .max(7, "Seven days a week leaves no room to recover"),
    session_minutes: z
      .number({ error: "Please choose how long you have per session" })
      .int()
      .min(10)
      .max(240),
    equipment: z.array(z.string()).default([]),
  })
  .refine(
    (v) => v.training_location === "gym" || v.equipment.length > 0,
    {
      error: "Pick at least one option — choose bodyweight only if you have no kit",
      path: ["equipment"],
    },
  );

export const nutritionSchema = z.object({
  activity_level: z.enum(
    ["sedentary", "light", "moderate", "very", "extra"],
    { error: "Please choose how active you are day to day" },
  ),
  dietary_preference: z.enum(
    ["none", "vegetarian", "vegan", "pescatarian", "halal", "kosher"],
    { error: "Please choose an option" },
  ),
  allergies: z.array(z.string()).default([]),
  injuries: z.string().trim().max(500).optional(),
});

/** Every field the wizard collects, used by the server action on save. */
export const onboardingPatchSchema = z.object({
  full_name: identitySchema.shape.full_name.optional(),
  phone: identitySchema.shape.phone.optional(),
  date_of_birth: identitySchema.shape.date_of_birth.optional(),
  sex: identitySchema.shape.sex.optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  height_cm: z.number().min(120).max(250).optional(),
  weight_kg: z.number().min(30).max(300).optional(),
  target_weight_kg: z.number().min(30).max(300).optional(),
  experience_level: experienceSchema.shape.experience_level.optional(),
  years_training: z.number().min(0).max(60).optional(),
  primary_goal: goalSchema.shape.primary_goal.optional(),
  training_location: z.enum(["home", "gym", "both"]).optional(),
  days_per_week: z.number().int().min(1).max(7).optional(),
  session_minutes: z.number().int().min(10).max(240).optional(),
  equipment: z.array(z.string()).optional(),
  activity_level: nutritionSchema.shape.activity_level.optional(),
  dietary_preference: nutritionSchema.shape.dietary_preference.optional(),
  allergies: z.array(z.string()).optional(),
  injuries: z.string().trim().max(500).optional(),
  onboarding_step: z.number().int().min(0).max(6).optional(),
});

export type OnboardingPatch = z.infer<typeof onboardingPatchSchema>;

export const STEP_SCHEMAS = [
  identitySchema,
  bodySchema,
  experienceSchema,
  goalSchema,
  trainingSchema,
  nutritionSchema,
] as const;

export const STEP_META = [
  { title: "About you", blurb: "The basics, so your plan has a name on it." },
  { title: "Your body", blurb: "Used to work out your calories and starting loads." },
  { title: "Experience", blurb: "This sets how much volume your plan starts with." },
  { title: "Your goal", blurb: "Everything else is built around this answer." },
  { title: "Where you train", blurb: "We only program exercises you can actually do." },
  { title: "Food & health", blurb: "So your meals and exercises fit your life." },
] as const;
