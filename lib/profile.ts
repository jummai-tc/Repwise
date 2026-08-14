import type { ProfileRow } from "@/lib/supabase/database.types";
import type { Draft } from "@/app/onboarding/steps";

export const EMPTY_DRAFT: Draft = {
  full_name: "",
  phone: "",
  date_of_birth: "",
  sex: null,
  units: "metric",
  height_cm: null,
  weight_kg: null,
  target_weight_kg: null,
  experience_level: null,
  years_training: null,
  primary_goal: null,
  training_location: null,
  days_per_week: null,
  session_minutes: null,
  equipment: [],
  activity_level: null,
  dietary_preference: "none",
  allergies: [],
  injuries: "",
};

/** Profile row -> the shape the onboarding/settings inputs work with. */
export function draftFromProfile(
  profile: Partial<ProfileRow> | null | undefined,
  fallbackName = "",
): Draft {
  return {
    ...EMPTY_DRAFT,
    full_name: profile?.full_name ?? fallbackName,
    phone: profile?.phone ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    sex: profile?.sex ?? null,
    units: profile?.units ?? "metric",
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
    target_weight_kg: profile?.target_weight_kg ?? null,
    experience_level: profile?.experience_level ?? null,
    years_training: profile?.years_training ?? null,
    primary_goal: profile?.primary_goal ?? null,
    training_location: profile?.training_location ?? null,
    days_per_week: profile?.days_per_week ?? null,
    session_minutes: profile?.session_minutes ?? null,
    equipment: profile?.equipment ?? [],
    activity_level: profile?.activity_level ?? null,
    dietary_preference: profile?.dietary_preference ?? "none",
    allergies: profile?.allergies ?? [],
    injuries: profile?.injuries ?? "",
  };
}
