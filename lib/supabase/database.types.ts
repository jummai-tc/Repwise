/**
 * Hand-maintained mirror of supabase/migrations/0001_init.sql.
 * Keep in sync when the schema changes — or regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 */

export type Sex = "male" | "female" | "other" | "prefer_not_to_say";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Goal =
  | "lose_fat"
  | "build_muscle"
  | "gain_strength"
  | "improve_endurance"
  | "maintain";
export type TrainingLocation = "home" | "gym" | "both";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "extra";
export type DietaryPreference =
  | "none"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "halal"
  | "kosher";
export type UnitSystem = "metric" | "imperial";
export type PlanStatus = "active" | "archived";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "ai_estimate" | "manual" | "plan";
export type ChatRole = "user" | "assistant";
export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Row plus Insert/Update derived from it; `Req` lists insert-required columns. */
type Table<Row, Req extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Req> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  units: UnitSystem;
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
  injuries: string | null;
  onboarding_step: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  location_tags: string[];
  difficulty: Difficulty;
  is_compound: boolean;
  instructions: string | null;
  cues: string[];
  demo_url: string | null;
  created_at: string;
};

export type WorkoutPlanRow = {
  id: string;
  user_id: string;
  name: string;
  goal: Goal | null;
  location: TrainingLocation | null;
  days_per_week: number | null;
  weeks: number;
  status: PlanStatus;
  generated_by: string;
  ai_rationale: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanDayRow = {
  id: string;
  plan_id: string;
  user_id: string;
  day_index: number;
  title: string;
  focus: string | null;
  est_minutes: number | null;
  is_rest_day: boolean;
};

export type PlanExerciseRow = {
  id: string;
  plan_day_id: string;
  user_id: string;
  exercise_id: string | null;
  name: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  tempo: string | null;
  notes: string | null;
};

export type WorkoutSessionRow = {
  id: string;
  user_id: string;
  plan_day_id: string | null;
  title: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_volume_kg: number;
  perceived_effort: number | null;
  notes: string | null;
};

export type SetLogRow = {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  is_warmup: boolean;
  completed_at: string;
};

export type DietPlanRow = {
  id: string;
  user_id: string;
  status: PlanStatus;
  bmr: number | null;
  tdee: number | null;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml_target: number;
  ai_rationale: string | null;
  created_at: string;
  updated_at: string;
};

export type DietPlanMealRow = {
  id: string;
  diet_plan_id: string;
  user_id: string;
  day_index: number | null;
  meal_type: MealType;
  name: string;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: unknown;
  recipe: string | null;
  order_index: number;
};

export type FoodLogRow = {
  id: string;
  user_id: string;
  logged_at: string;
  log_date: string;
  meal_type: MealType;
  name: string;
  serving: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodSource;
};

export type WaterLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  ml: number;
  logged_at: string;
};

export type BodyMetricRow = {
  id: string;
  user_id: string;
  recorded_on: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  photo_path: string | null;
  created_at: string;
};

export type StreakRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
};

export type AchievementRow = {
  id: string;
  user_id: string;
  key: string;
  unlocked_at: string;
};

export type ChatThreadRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      exercises: Table<ExerciseRow, "slug" | "name" | "primary_muscle" | "equipment">;
      workout_plans: Table<WorkoutPlanRow, "user_id" | "name">;
      plan_days: Table<PlanDayRow, "plan_id" | "user_id" | "day_index" | "title">;
      plan_exercises: Table<PlanExerciseRow, "plan_day_id" | "user_id" | "name">;
      workout_sessions: Table<WorkoutSessionRow, "user_id">;
      set_logs: Table<SetLogRow, "session_id" | "user_id" | "exercise_name" | "set_number">;
      diet_plans: Table<
        DietPlanRow,
        "user_id" | "daily_calories" | "protein_g" | "carbs_g" | "fat_g"
      >;
      diet_plan_meals: Table<DietPlanMealRow, "diet_plan_id" | "user_id" | "meal_type" | "name">;
      food_logs: Table<FoodLogRow, "user_id" | "meal_type" | "name">;
      water_logs: Table<WaterLogRow, "user_id" | "ml">;
      body_metrics: Table<BodyMetricRow, "user_id">;
      streaks: Table<StreakRow, "user_id">;
      achievements: Table<AchievementRow, "user_id" | "key">;
      chat_threads: Table<ChatThreadRow, "user_id">;
      chat_messages: Table<ChatMessageRow, "thread_id" | "user_id" | "role" | "content">;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      sex_t: Sex;
      experience_level_t: ExperienceLevel;
      goal_t: Goal;
      training_location_t: TrainingLocation;
      activity_level_t: ActivityLevel;
      dietary_pref_t: DietaryPreference;
      unit_system_t: UnitSystem;
      plan_status_t: PlanStatus;
      meal_type_t: MealType;
      food_source_t: FoodSource;
      chat_role_t: ChatRole;
      difficulty_t: Difficulty;
    };
    CompositeTypes: Record<never, never>;
  };
};
