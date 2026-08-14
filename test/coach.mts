import { coachAnswer } from "@/lib/ai/coach";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

let calls = 0;
let bodies: any[] = [];
function stub(sequence: Array<{ status: number; text?: string; retryDelay?: string; finishReason?: string }>) {
  calls = 0; bodies = [];
  globalThis.fetch = (async (_u: string, init: any) => {
    bodies.push(JSON.parse(init.body));
    const step = sequence[Math.min(calls, sequence.length - 1)];
    calls++;
    if (step.status !== 200) {
      const body = step.retryDelay
        ? { error: { details: [
            { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: step.retryDelay },
          ] } }
        : {};
      return { ok: false, status: step.status, json: async () => body } as any;
    }
    return {
      ok: true, status: 200,
      json: async () => ({
        candidates: [{
          finishReason: step.finishReason ?? "STOP",
          content: { parts: step.text === undefined ? [] : [{ text: step.text }] },
        }],
      }),
    } as any;
  }) as any;
}

const snapshot: any = {
  profile: {
    date_of_birth: "1995-06-12", sex: "female", height_cm: 168, weight_kg: 70,
    target_weight_kg: 64, primary_goal: "lose_fat", experience_level: "beginner",
    years_training: 1, days_per_week: 3, session_minutes: 45,
    training_location: "home", equipment: ["dumbbells"], activity_level: "moderate",
    dietary_preference: "vegetarian", allergies: ["peanuts"], injuries: "left knee",
  },
  nutrition: {
    targets: { daily_calories: 1798, protein_g: 154, carbs_g: 174, fat_g: 50, water_ml_target: 2500 },
    meals: [], eaten: { calories: 900, protein_g: 62, carbs_g: 88, fat_g: 24 },
    waterMl: 1200, date: "2026-08-14",
  },
  weights: [
    { date: "2026-07-01", kg: 72 },
    { date: "2026-07-15", kg: 71.2 },
    { date: "2026-08-01", kg: 70 },
  ],
  plan: { id: "p1", name: "Home Full Body", goal: "lose_fat", location: "home", weeks: 4, week_number: 2, ai_rationale: null, days: [] },
  today: {
    id: "d1", day_index: 4, weekday: "Thu", title: "Full Body A", focus: "Chest, back",
    est_minutes: 45, is_rest_day: false,
    exercises: [
      { id: "x1", name: "Push-Up", sets: 3, reps: "10-15" },
      { id: "x2", name: "Goblet Squat", sets: 3, reps: "12-15" },
    ],
  },
  week: { completed: 2, minutes: 88 },
  streak: { current: 5, longest: 11 },
};

console.log("\nCoach — no key");
delete process.env.GEMINI_API_KEY;
stub([{ status: 200, text: "should not be reached" }]);
check("returns null without a key", (await coachAnswer("hi", snapshot)) === null);
check("no request made", calls === 0);

process.env.GEMINI_API_KEY = "test-key";

console.log("\nCoach — happy path");
stub([{ status: 200, text: "You are 92g of protein short today." }]);
const answer = await coachAnswer("am I hitting my protein?", snapshot, [
  { id: "m1", role: "user", content: "what should I eat?" },
  { id: "m2", role: "assistant", content: "More protein at breakfast." },
] as any);
check("answer returned", answer === "You are 92g of protein short today.");

const body = bodies[0];
const prompt = body.contents.at(-1).parts[0].text;
check("history sent as prior turns", body.contents.length === 3);
check("assistant history mapped to 'model' role", body.contents[1].role === "model");
check("system instruction sent separately", typeof body.systemInstruction.parts[0].text === "string");
check("protein target in prompt", prompt.includes("154g protein"));
check("logged intake in prompt", prompt.includes("62g protein"));
check("today's session in prompt", prompt.includes("Full Body A"));
check("exercise list in prompt", prompt.includes("Push-Up 3x10-15"));
check("weight trend in prompt", prompt.includes("-2kg"));
check("streak in prompt", prompt.includes("5 days"));
check("injury in prompt", prompt.includes("left knee"));
check("low thinking level for chat latency", body.generationConfig.thinkingConfig.thinkingLevel === "low");

console.log("\nCoach — transient failure is retried");
stub([{ status: 429 }, { status: 200, text: "recovered" }]);
check("429 then success -> answer", (await coachAnswer("q", snapshot)) === "recovered");
check("exactly two requests made", calls === 2, `made ${calls}`);

console.log("\nCoach — a model that rejects thinkingLevel still works");
// Gemini 3 flash-lite 400s on the thinkingBudget field, and older models 400
// on thinkingLevel. Either way the request should be retried without it
// rather than reported as a failure.
stub([{ status: 400 }, { status: 200, text: "answered without thinking config" }]);
check("400 on thinkingConfig -> retried without it", (await coachAnswer("q", snapshot)) === "answered without thinking config");
check("second attempt dropped thinkingConfig", bodies[1].generationConfig.thinkingConfig === undefined);
check("second attempt kept the prompt", bodies[1].contents.at(-1).parts[0].text.includes("Their question: q"));

console.log("\nCoach — rate limiting respects the server's cooldown");
// The free tier hands back a RetryInfo saying how long to wait. Anything
// longer than we are willing to sit on should stop immediately rather than
// spend more of the exhausted quota on retries that cannot succeed.
stub([{ status: 429, retryDelay: "51.666s" }]);
const t0 = Date.now();
check("long cooldown -> gives up at once", (await coachAnswer("q", snapshot)) === null);
check("does not keep hammering the quota", calls === 1, `made ${calls}`);
check("does not sit and wait", Date.now() - t0 < 2000, `waited ${Date.now() - t0}ms`);

stub([{ status: 429, retryDelay: "0.5s" }, { status: 200, text: "back under the limit" }]);
check("short cooldown -> waits and retries", (await coachAnswer("q", snapshot)) === "back under the limit");
check("exactly one retry", calls === 2, `made ${calls}`);

console.log("\nCoach — an empty 200 is a blip, not a verdict");
// Seen live: the API returns 200 with no text occasionally. Treating that as
// fatal silently downgrades the user to the keyword coach for no reason.
stub([{ status: 200 }, { status: 200, text: "second time lucky" }]);
check("empty 200 is retried", (await coachAnswer("q", snapshot)) === "second time lucky");
check("took two attempts", calls === 2, `made ${calls}`);

stub([{ status: 200 }]);
check("persistently empty -> null", (await coachAnswer("q", snapshot)) === null);
check("capped at 3 attempts", calls === 3, `made ${calls}`);

console.log("\nCoach — a refusal is not retried");
stub([{ status: 200, finishReason: "SAFETY" }]);
check("safety block -> null", (await coachAnswer("q", snapshot)) === null);
check("no retry on a refusal", calls === 1, `made ${calls}`);

console.log("\nCoach — permanent failure gives up");
stub([{ status: 400 }]);
check("persistent 400 -> null", (await coachAnswer("q", snapshot)) === null);
check("400 costs one thinking retry, then stops", calls === 2, `made ${calls}`);

stub([{ status: 503 }]);
check("persistent 503 -> null", (await coachAnswer("q", snapshot)) === null);
check("capped at 3 attempts", calls === 3, `made ${calls}`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
