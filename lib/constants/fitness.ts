import type {
  ActivityLevel,
  DietaryPreference,
  ExperienceLevel,
  Goal,
  Sex,
  TrainingLocation,
} from "@/lib/supabase/database.types";

type Option<T> = { value: T; label: string; description?: string };

export const SEX_OPTIONS: Option<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const EXPERIENCE_OPTIONS: Option<ExperienceLevel>[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to training, or back after a long break",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Training consistently for 6 months or more",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Years of structured training behind you",
  },
];

export const GOAL_OPTIONS: Option<Goal>[] = [
  {
    value: "lose_fat",
    label: "Lose fat",
    description: "Drop body fat while holding on to muscle",
  },
  {
    value: "build_muscle",
    label: "Build muscle",
    description: "Add size with progressive overload",
  },
  {
    value: "gain_strength",
    label: "Get stronger",
    description: "Move heavier weight on the big lifts",
  },
  {
    value: "improve_endurance",
    label: "Improve endurance",
    description: "Better conditioning and stamina",
  },
  {
    value: "maintain",
    label: "Stay healthy",
    description: "Keep it ticking over and feel good",
  },
];

export const LOCATION_OPTIONS: Option<TrainingLocation>[] = [
  {
    value: "home",
    label: "At home",
    description: "Bodyweight and whatever equipment you own",
  },
  {
    value: "gym",
    label: "At the gym",
    description: "Full access to barbells, machines and cables",
  },
  {
    value: "both",
    label: "A bit of both",
    description: "Gym when you can, home when you cannot",
  },
];

export const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Desk job, little movement outside training",
  },
  {
    value: "light",
    label: "Lightly active",
    description: "On your feet some of the day",
  },
  {
    value: "moderate",
    label: "Moderately active",
    description: "Regular walking or an active job",
  },
  { value: "very", label: "Very active", description: "On your feet all day" },
  {
    value: "extra",
    label: "Extremely active",
    description: "Physical job plus hard training",
  },
];

export const DIET_OPTIONS: Option<DietaryPreference>[] = [
  { value: "none", label: "No restrictions" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
];

/** Values here are matched against exercises.equipment when building home plans. */
export const EQUIPMENT_OPTIONS: Option<string>[] = [
  { value: "bodyweight", label: "Bodyweight only" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "resistance-bands", label: "Resistance bands" },
  { value: "pull-up-bar", label: "Pull-up bar" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bench", label: "Bench" },
  { value: "barbell", label: "Barbell + plates" },
  { value: "jump-rope", label: "Jump rope" },
  { value: "ab-wheel", label: "Ab wheel" },
  { value: "bike", label: "Exercise bike" },
];

export const COMMON_ALLERGENS = [
  "Dairy",
  "Eggs",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Gluten",
  "Shellfish",
  "Fish",
];

export const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6] as const;
export const SESSION_MINUTES_OPTIONS = [20, 30, 45, 60, 90] as const;
