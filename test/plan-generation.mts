/**
 * Exercises the three AI generators against a stubbed Gemini endpoint, so the
 * prompt assembly, JSON validation, slug mapping and fallback behaviour are
 * checked without spending free-tier quota.
 */
import { generateWorkoutPlan } from "@/lib/ai/workout";
import { generateDietPlan } from "@/lib/ai/diet";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

/** Stubs the Gemini endpoint with a canned candidate payload. */
let lastRequestBody: any = null;
function stub(payload: unknown, status = 200) {
  globalThis.fetch = (async (_url: string, init: any) => {
    lastRequestBody = JSON.parse(init.body);
    if (status !== 200) return { ok: false, status, json: async () => ({}) } as any;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [
          { thought: true, text: "internal reasoning that must not leak" },
          { text: JSON.stringify(payload) },
        ] } }],
      }),
    } as any;
  }) as any;
}

const profile: any = {
  id: "u1", full_name: "Test", email: null, phone: null,
  date_of_birth: "1995-06-12", sex: "female",
  height_cm: 168, weight_kg: 70, target_weight_kg: 64, units: "metric",
  experience_level: "beginner", years_training: 1, primary_goal: "lose_fat",
  training_location: "home", days_per_week: 3, session_minutes: 45,
  equipment: ["dumbbells", "bodyweight"],
  activity_level: "moderate", dietary_preference: "vegetarian",
  allergies: ["peanuts"], injuries: "left knee",
  onboarding_step: 6, onboarding_completed: true,
  created_at: "", updated_at: "",
};

const library: any[] = [
  { id: "e1", slug: "push-up", name: "Push-Up", primary_muscle: "chest", secondary_muscles: [], equipment: "bodyweight", location_tags: ["home","gym"], difficulty: "beginner", is_compound: true, instructions: "", cues: [], demo_url: null, created_at: "" },
  { id: "e2", slug: "dumbbell-row", name: "Single-Arm Dumbbell Row", primary_muscle: "back", secondary_muscles: [], equipment: "dumbbells", location_tags: ["home","gym"], difficulty: "beginner", is_compound: true, instructions: "", cues: [], demo_url: null, created_at: "" },
  { id: "e3", slug: "goblet-squat", name: "Goblet Squat", primary_muscle: "quads", secondary_muscles: [], equipment: "dumbbells", location_tags: ["home","gym"], difficulty: "beginner", is_compound: true, instructions: "", cues: [], demo_url: null, created_at: "" },
  { id: "e4", slug: "barbell-bench-press", name: "Barbell Bench Press", primary_muscle: "chest", secondary_muscles: [], equipment: "barbell", location_tags: ["gym"], difficulty: "intermediate", is_compound: true, instructions: "", cues: [], demo_url: null, created_at: "" },
];

const targets: any = {
  bmr: 1450, tdee: 2248, daily_calories: 1798,
  protein_g: 154, carbs_g: 174, fat_g: 50,
  water_ml_target: 2500, ai_rationale: "template rationale",
};

function workoutDays(trainingDays: any[]) {
  const rest = [1,2,3,4,5,6,7]
    .filter((i) => !trainingDays.some((d) => d.day_index === i))
    .map((day_index) => ({ day_index, title: "Rest", focus: null, is_rest_day: true, exercises: [] }));
  return [...trainingDays, ...rest];
}

console.log("\nNo API key configured");
delete process.env.GEMINI_API_KEY;
stub({});
check("workout generator returns null", (await generateWorkoutPlan(profile, library)) === null);
check("diet generator returns null", (await generateDietPlan(profile, targets)) === null);

process.env.GEMINI_API_KEY = "test-key";

console.log("\nWorkout plan — happy path");
stub({
  name: "Home Full Body",
  rationale: "Three full-body days suit a beginner training at home.",
  days: workoutDays([
    { day_index: 1, title: "Full Body A", focus: "Chest, back, legs", is_rest_day: false,
      exercises: [
        { slug: "push-up", sets: 3, reps: "10-15", rest_seconds: 60, notes: "Knees down if needed" },
        { slug: "dumbbell-row", sets: 3, reps: "10-15", rest_seconds: 60 },
      ] },
    { day_index: 3, title: "Full Body B", focus: "Legs, back", is_rest_day: false,
      exercises: [{ slug: "goblet-squat", sets: 3, reps: "12-15", rest_seconds: 60 }] },
    { day_index: 5, title: "Full Body C", focus: "Full body", is_rest_day: false,
      exercises: [{ slug: "push-up", sets: 3, reps: "10-15", rest_seconds: 60 }] },
  ]),
});
const plan = await generateWorkoutPlan(profile, library);
check("plan generated", plan !== null);
check("seven days returned", plan?.days.length === 7);
check("three training days", plan?.days.filter((d) => !d.is_rest_day).length === 3);
check("days_per_week matches", plan?.days_per_week === 3);
check("slug mapped to a real exercise id", plan?.days[0].exercises[0].exercise_id === "e1");
check("name comes from the library, not the model", plan?.days[0].exercises[0].name === "Push-Up");
check("rest day has no exercises", plan?.days[1].exercises.length === 0);
check("est_minutes computed", (plan?.days[0].est_minutes ?? 0) > 0);
check("rationale carried through", plan?.ai_rationale.includes("beginner") === true);
check("thinking part excluded from output", JSON.stringify(plan).includes("internal reasoning") === false);

console.log("\nWorkout plan — prompt safety");
const promptText = lastRequestBody.contents[0].parts[0].text;
check("home profile excludes barbell movement", !promptText.includes("barbell-bench-press"), "gym-only exercise leaked into home catalogue");
check("bodyweight movement offered", promptText.includes("push-up"));
check("injury reaches the prompt", promptText.includes("left knee"));
check("allergy reaches the prompt", promptText.includes("peanuts"));

console.log("\nWorkout plan — bad model output falls back");
stub({ name: "Bad", rationale: "x", days: workoutDays([
  { day_index: 1, title: "Day", focus: null, is_rest_day: false,
    exercises: [{ slug: "totally-made-up-exercise", sets: 3, reps: "8-12", rest_seconds: 90 }] },
]) });
check("hallucinated slugs leave no training days -> null", (await generateWorkoutPlan(profile, library)) === null);

stub({ name: "Wrong count", rationale: "x", days: workoutDays([
  { day_index: 1, title: "A", focus: null, is_rest_day: false, exercises: [{ slug: "push-up", sets: 3, reps: "8", rest_seconds: 60 }] },
  { day_index: 2, title: "B", focus: null, is_rest_day: false, exercises: [{ slug: "push-up", sets: 3, reps: "8", rest_seconds: 60 }] },
  { day_index: 3, title: "C", focus: null, is_rest_day: false, exercises: [{ slug: "push-up", sets: 3, reps: "8", rest_seconds: 60 }] },
  { day_index: 4, title: "D", focus: null, is_rest_day: false, exercises: [{ slug: "push-up", sets: 3, reps: "8", rest_seconds: 60 }] },
  { day_index: 5, title: "E", focus: null, is_rest_day: false, exercises: [{ slug: "push-up", sets: 3, reps: "8", rest_seconds: 60 }] },
]) });
check("5 training days when 3 asked -> null", (await generateWorkoutPlan(profile, library)) === null);

stub({ name: "Malformed" });
check("schema-invalid response -> null", (await generateWorkoutPlan(profile, library)) === null);

stub({}, 400);
check("HTTP 400 -> null", (await generateWorkoutPlan(profile, library)) === null);

console.log("\nDiet plan");
const meal = (meal_type: string, kcal: number) => ({
  meal_type, name: `${meal_type} dish`, description: "200g of something",
  calories: kcal, protein_g: 40, carbs_g: 45, fat_g: 12,
  ingredients: ["Tofu", "Rice"], recipe: "Cook it.",
});
stub({
  rationale: "A 450 kcal deficit against your maintenance.",
  menus: [1,2,3,4].map(() => ({
    // Deliberately out of eating order to prove they are re-sorted.
    meals: [meal("dinner", 540), meal("breakfast", 450), meal("snack", 268), meal("lunch", 540)],
  })),
});
const diet = await generateDietPlan(profile, targets);
check("diet generated", diet !== null);
check("four menus fill all seven days", diet?.meals.length === 28);
check("every weekday covered", new Set(diet?.meals.map((m) => m.day_index)).size === 7);
check("meals sorted into eating order", diet?.meals[0].meal_type === "breakfast" && diet?.meals[3].meal_type === "snack");
check("order_index runs 0..3 per day", JSON.stringify(diet?.meals.slice(0,4).map((m) => m.order_index)) === "[0,1,2,3]");
check("rationale carried through", diet?.rationale?.includes("deficit") === true);
check("recipe captured", diet?.meals[0].recipe === "Cook it.");

// Fewer menus than asked for is still a usable week — they just rotate sooner.
stub({ rationale: null, menus: [{ meals: [meal("breakfast", 450)] }, { meals: [meal("breakfast", 500)] }] });
const short = await generateDietPlan(profile, targets);
check("two menus still cover seven days", new Set(short?.meals.map((m) => m.day_index)).size === 7);
check("menus alternate across the week", short?.meals[0].calories !== short?.meals[1].calories);

stub({ rationale: null, menus: [] });
check("no menus -> null", (await generateDietPlan(profile, targets)) === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
