import { estimateMeal } from "@/lib/ai/food";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

let bodies: any[] = [];
function stub(payload: unknown, status = 200) {
  bodies = [];
  globalThis.fetch = (async (_u: string, init: any) => {
    bodies.push(JSON.parse(init.body));
    if (status !== 200) return { ok: false, status, json: async () => ({}) } as any;
    return {
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
    } as any;
  }) as any;
}

console.log("\nMeal estimate — no key");
delete process.env.GEMINI_API_KEY;
stub({ recognised: true, calories: 400 });
check("returns null without a key", (await estimateMeal("two eggs")) === null);
check("no request made", bodies.length === 0);

process.env.GEMINI_API_KEY = "test-key";

console.log("\nMeal estimate — happy path");
stub({
  recognised: true,
  name: "Scrambled Eggs on Toast",
  serving: "2 large eggs, 2 slices wholemeal toast, 10g butter",
  calories: 438.6, protein_g: 24.4, carbs_g: 33.2, fat_g: 22.9,
});
const est = await estimateMeal("two eggs on toast");
check("estimate returned", est !== null);
check("name tidied", est?.name === "Scrambled Eggs on Toast");
check("assumed portion surfaced", est?.serving.includes("2 large eggs") === true);
check("calories rounded", est?.calories === 439);
check("macros rounded", est?.protein_g === 24 && est?.carbs_g === 33 && est?.fat_g === 23);
check("description reaches the prompt", bodies[0].contents[0].parts[0].text.includes("two eggs on toast"));
check("JSON mode requested", bodies[0].generationConfig.responseMimeType === "application/json");

console.log("\nMeal estimate — unusable answers give up");
stub({ recognised: false });
check("unrecognised input -> null", (await estimateMeal("asdfgh")) === null);

stub({ recognised: true, name: "Something", serving: "a plate" });
check("recognised but no calories -> null", (await estimateMeal("food")) === null);

stub({ recognised: true, calories: 999999 });
check("absurd calories fail validation -> null", (await estimateMeal("food")) === null);

stub({ recognised: true, calories: 300, name: null, serving: null });
const bare = await estimateMeal("  a mystery snack  ");
check("missing name falls back to the description", bare?.name === "a mystery snack");
check("missing serving gets a placeholder", bare?.serving === "Estimated portion");
check("missing macros default to zero", bare?.protein_g === 0 && bare?.fat_g === 0);

stub({}, 400);
check("HTTP 400 -> null", (await estimateMeal("two eggs")) === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
