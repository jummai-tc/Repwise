import { STEP_SCHEMAS } from "./lib/validation/onboarding.ts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const msgs = (r: any) => r.success ? [] : r.error.issues.map((i: any) => `${i.path[0]}: ${i.message}`);

console.log("\nStep 1 — identity");
let r = STEP_SCHEMAS[0].safeParse({});
check("empty is rejected", !r.success);
check("all four fields flagged", new Set(msgs(r).map((m: string) => m.split(":")[0])).size === 4, JSON.stringify(msgs(r)));
r = STEP_SCHEMAS[0].safeParse({ full_name: "Alex Morgan", phone: "+234 801 234 5678", date_of_birth: "1995-06-12", sex: "female" });
check("valid identity accepted", r.success, JSON.stringify(msgs(r)));
r = STEP_SCHEMAS[0].safeParse({ full_name: "Alex", phone: "abc-def", date_of_birth: "1995-06-12", sex: "male" });
check("letters in phone rejected", !r.success);
r = STEP_SCHEMAS[0].safeParse({ full_name: "Alex", phone: "+2348012345678", date_of_birth: "2020-01-01", sex: "male" });
check("age under 13 rejected", !r.success, JSON.stringify(msgs(r)));

console.log("\nStep 2 — body");
r = STEP_SCHEMAS[1].safeParse({ units: "metric", height_cm: 175, weight_kg: 82, target_weight_kg: 75 });
check("realistic body stats accepted", r.success, JSON.stringify(msgs(r)));
r = STEP_SCHEMAS[1].safeParse({ units: "metric", height_cm: 40, weight_kg: 82, target_weight_kg: 75 });
check("40cm height rejected", !r.success);
r = STEP_SCHEMAS[1].safeParse({ units: "metric", height_cm: 175, weight_kg: 82, target_weight_kg: 20 });
check("20kg target rejected", !r.success);
r = STEP_SCHEMAS[1].safeParse({ units: "metric", height_cm: 175, weight_kg: 150, target_weight_kg: 60 });
check("90kg swing flagged as implausible", !r.success, JSON.stringify(msgs(r)));

console.log("\nStep 3 — experience");
check("beginner without years accepted", STEP_SCHEMAS[2].safeParse({ experience_level: "beginner" }).success);
check("advanced with years accepted", STEP_SCHEMAS[2].safeParse({ experience_level: "advanced", years_training: 6 }).success);
check("missing level rejected", !STEP_SCHEMAS[2].safeParse({}).success);

console.log("\nStep 4 — goal");
check("valid goal accepted", STEP_SCHEMAS[3].safeParse({ primary_goal: "build_muscle" }).success);
r = STEP_SCHEMAS[3].safeParse({});
check("missing goal gives friendly message", !r.success && msgs(r)[0].includes("built around it"), JSON.stringify(msgs(r)));

console.log("\nStep 5 — training");
r = STEP_SCHEMAS[4].safeParse({ training_location: "gym", days_per_week: 4, session_minutes: 60, equipment: [] });
check("gym needs no equipment", r.success, JSON.stringify(msgs(r)));
r = STEP_SCHEMAS[4].safeParse({ training_location: "home", days_per_week: 3, session_minutes: 30, equipment: [] });
check("home with no equipment rejected", !r.success, JSON.stringify(msgs(r)));
r = STEP_SCHEMAS[4].safeParse({ training_location: "home", days_per_week: 3, session_minutes: 30, equipment: ["bodyweight"] });
check("home + bodyweight accepted", r.success, JSON.stringify(msgs(r)));

console.log("\nStep 6 — nutrition");
r = STEP_SCHEMAS[5].safeParse({ activity_level: "moderate", dietary_preference: "vegan", allergies: ["Peanuts"], injuries: "left knee" });
check("full nutrition step accepted", r.success, JSON.stringify(msgs(r)));
r = STEP_SCHEMAS[5].safeParse({ activity_level: "moderate", dietary_preference: "none" });
check("allergies/injuries optional", r.success, JSON.stringify(msgs(r)));
check("missing activity level rejected", !STEP_SCHEMAS[5].safeParse({ dietary_preference: "none" }).success);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
