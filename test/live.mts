/**
 * Hits the real Gemini API with the key in .env.local.
 *
 * Excluded from `npm run test:ai` because it costs quota and needs a network.
 * Run it with `npm run test:live` after changing a prompt or GEMINI_MODEL, to
 * confirm the model still returns something the validators accept.
 */
import { readFileSync } from "node:fs";
import { generateWorkoutPlan } from "@/lib/ai/workout";
import { generateDietPlan } from "@/lib/ai/diet";
import { coachAnswer } from "@/lib/ai/coach";
import { estimateMeal } from "@/lib/ai/food";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

console.log(`\nModel: ${process.env.GEMINI_MODEL}\n`);

/**
 * The free tier allows 20 requests a minute and this script makes six, each of
 * which may retry. Run back-to-back with any other calls it trips its own
 * limit and every section fails for a reason that has nothing to do with the
 * code. Pausing between sections costs a minute and removes that false signal.
 *
 * The app deliberately does not do this — see MAX_HONOURED_RETRY_MS. A user
 * waiting on a spinner gets the fallback; a diagnostic can afford to wait.
 */
const PACE_MS = Number(process.env.LIVE_PACE_MS ?? 15_000);
const pace = () => new Promise((r) => setTimeout(r, PACE_MS));

const profile: any = {
  id: "u1", full_name: "Test", email: null, phone: null,
  date_of_birth: "1995-06-12", sex: "female",
  height_cm: 168, weight_kg: 70, target_weight_kg: 64, units: "metric",
  experience_level: "beginner", years_training: 1, primary_goal: "lose_fat",
  training_location: "home", days_per_week: 3, session_minutes: 45,
  equipment: ["dumbbells", "bodyweight"], activity_level: "moderate",
  dietary_preference: "vegetarian", allergies: ["peanuts"],
  injuries: "left knee gets sore on deep squats",
  onboarding_step: 6, onboarding_completed: true, created_at: "", updated_at: "",
};

const library: any[] = [
  ["push-up", "Push-Up", "chest", "bodyweight", true],
  ["incline-push-up", "Incline Push-Up", "chest", "bodyweight", true],
  ["dumbbell-row", "Single-Arm Dumbbell Row", "back", "dumbbells", true],
  ["goblet-squat", "Goblet Squat", "quads", "dumbbells", true],
  ["romanian-deadlift-db", "Dumbbell Romanian Deadlift", "hamstrings", "dumbbells", true],
  ["dumbbell-shoulder-press", "Dumbbell Shoulder Press", "shoulders", "dumbbells", true],
  ["dumbbell-curl", "Dumbbell Curl", "biceps", "dumbbells", false],
  ["plank", "Plank", "core", "bodyweight", false],
  ["glute-bridge", "Glute Bridge", "glutes", "bodyweight", false],
  ["barbell-squat", "Barbell Back Squat", "quads", "barbell", true],
].map(([slug, name, primary_muscle, equipment, is_compound], i) => ({
  id: `e${i}`, slug, name, primary_muscle, secondary_muscles: [], equipment,
  location_tags: equipment === "barbell" ? ["gym"] : ["home", "gym"],
  difficulty: "beginner", is_compound, instructions: "", cues: [],
  demo_url: null, created_at: "",
}));

const targets: any = {
  bmr: 1450, tdee: 2248, daily_calories: 1798, protein_g: 154,
  carbs_g: 174, fat_g: 50, water_ml_target: 2500, ai_rationale: "template",
};

/* ------------------------------------------------------------- workout -- */
console.log("1. Workout plan");
let t = Date.now();
const plan = await generateWorkoutPlan(profile, library);
console.log(`   (${Date.now() - t}ms)`);
check("plan returned", plan !== null);
if (plan) {
  const training = plan.days.filter((d) => !d.is_rest_day);
  const slugs = new Set(library.map((e) => e.id));
  check("seven days", plan.days.length === 7);
  check("three training days", training.length === 3, `got ${training.length}`);
  check("every exercise maps to the library", plan.days.every((d) => d.exercises.every((e) => slugs.has(e.exercise_id!))));
  check("no barbell work for a home profile", !JSON.stringify(plan).includes("Barbell Back Squat"));
  check("has a rationale", plan.ai_rationale.length > 40);
  console.log(`   → "${plan.name}" | ${training.map((d) => d.title).join(", ")}`);
  console.log(`   → day 1: ${training[0]?.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}`).join(", ")}`);
}

/* ---------------------------------------------------------------- diet -- */
await pace();
console.log("\n2. Diet plan");
t = Date.now();
const diet = await generateDietPlan(profile, targets);
console.log(`   (${Date.now() - t}ms)`);
check("diet returned", diet !== null);
if (diet) {
  check("full week of meals", diet.meals.length >= 28, `got ${diet.meals.length}`);
  const day1 = diet.meals.filter((m) => m.day_index === 1);
  const kcal = day1.reduce((n, m) => n + m.calories, 0);
  const protein = day1.reduce((n, m) => n + m.protein_g, 0);
  check("day 1 calories within 10% of target", Math.abs(kcal - targets.daily_calories) / targets.daily_calories < 0.1, `${kcal} vs ${targets.daily_calories}`);
  check("day 1 protein within 25g of target", Math.abs(protein - targets.protein_g) <= 25, `${protein} vs ${targets.protein_g}`);
  const text = JSON.stringify(diet.meals).toLowerCase();
  check("no peanuts (declared allergy)", !text.includes("peanut"));
  const MEAT = /\b(chicken|beef|pork|bacon|turkey|salmon|tuna|prawn|ham)\b/;
  const meaty = diet.meals.filter((m) =>
    MEAT.test(`${m.name} ${m.description} ${m.ingredients.join(" ")}`.toLowerCase()),
  );
  check("no meat (vegetarian)", meaty.length === 0,
    "\n      " + meaty.map((m) => `${m.name} :: ${m.description} :: ${m.ingredients.join(", ")}`).join("\n      "));
  check("week is varied", new Set(diet.meals.map((m) => m.name)).size > 8);
  console.log(`   → day 1: ${day1.map((m) => m.name).join(" | ")}`);
  console.log(`   → ${kcal} kcal, ${protein}g protein`);
}

/* --------------------------------------------------------------- coach -- */
await pace();
console.log("\n3. AI coach");
const snapshot: any = {
  profile,
  nutrition: {
    targets: { daily_calories: 1798, protein_g: 154, carbs_g: 174, fat_g: 50, water_ml_target: 2500 },
    meals: [], eaten: { calories: 900, protein_g: 62, carbs_g: 88, fat_g: 24 },
    waterMl: 1200, date: "2026-08-14",
  },
  weights: [
    { date: "2026-07-01", kg: 72 }, { date: "2026-07-15", kg: 71.2 }, { date: "2026-08-01", kg: 70 },
  ],
  plan: { id: "p1", name: "Home Full Body", goal: "lose_fat", location: "home", weeks: 4, week_number: 2, ai_rationale: null, days: [] },
  today: { id: "d1", day_index: 4, weekday: "Thu", title: "Full Body A", focus: "Chest, back",
    est_minutes: 45, is_rest_day: false,
    exercises: [{ id: "x1", name: "Push-Up", sets: 3, reps: "10-15" }, { id: "x2", name: "Goblet Squat", sets: 3, reps: "12-15" }] },
  week: { completed: 2, minutes: 88 },
  streak: { current: 5, longest: 11 },
};

t = Date.now();
const answer = await coachAnswer("am I on track with my protein today?", snapshot);
console.log(`   (${Date.now() - t}ms)`);
check("answer returned", answer !== null);
if (answer) {
  // Leading \b only. The model writes "62g", and digit-to-letter is not a word
  // boundary, so a trailing \b would reject the very phrasing we want.
  check("uses their real protein numbers", /\b(154|62|92)/.test(answer), answer.slice(0, 120));
  check("no markdown headings", !answer.includes("##"));
  check("reasonably short", answer.length < 1200, `${answer.length} chars`);
  console.log(`   → ${answer.replace(/\n+/g, " ").slice(0, 220)}…`);
}

await pace();
console.log("\n   follow-up with history");
const followUp = await coachAnswer("and what about my weight?", snapshot, [
  { id: "m1", role: "user", content: "am I on track with my protein today?" },
  { id: "m2", role: "assistant", content: answer ?? "You are short on protein." },
] as any);
check("follow-up answered", followUp !== null);
if (followUp) {
  // Leading \b only, for the same reason as the protein check above: the model
  // writes "70kg", and there is no word boundary between a digit and a letter.
  check("picks up the weight trend", /\b(70|72)/.test(followUp), followUp.slice(0, 120));
  console.log(`   → ${followUp.replace(/\n+/g, " ").slice(0, 200)}…`);
}

/* ------------------------------------------------------------ estimate -- */
await pace();
console.log("\n4. Meal macro estimate");
t = Date.now();
const est = await estimateMeal("two scrambled eggs on two slices of wholemeal toast with butter");
console.log(`   (${Date.now() - t}ms)`);
check("estimate returned", est !== null);
if (est) {
  check("calories in a sane range", est.calories > 250 && est.calories < 700, `${est.calories}`);
  check("protein in a sane range", est.protein_g > 10 && est.protein_g < 40, `${est.protein_g}`);
  const derived = est.protein_g * 4 + est.carbs_g * 4 + est.fat_g * 9;
  check("macros roughly match the calories", Math.abs(derived - est.calories) / est.calories < 0.2, `${derived} vs ${est.calories}`);
  check("states the portion assumed", est.serving.length > 10);
  console.log(`   → ${est.name}: ${est.calories} kcal, ${est.protein_g}P ${est.carbs_g}C ${est.fat_g}F`);
  console.log(`   → assumed: ${est.serving}`);
}

await pace();
const junk = await estimateMeal("qwertyuiop asdfgh");
check("gibberish rejected", junk === null, JSON.stringify(junk));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
