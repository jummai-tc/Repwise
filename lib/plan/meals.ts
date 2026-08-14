/**
 * A small, real meal library. Every entry carries per-serving macros and
 * ingredient tags; the tags are what dietary preferences and allergies filter
 * on, so adding a meal never means touching the filter logic.
 *
 * This is the fallback week now that lib/ai/diet writes the plan when a Gemini
 * key is configured. It stays because a plan has to exist without one — and
 * because a rotation of twenty known-good meals is a far better failure mode
 * than an empty fuel page.
 */

import type { DietaryPreference, MealType } from "@/lib/supabase/database.types";

export type Tag =
  | "meat"
  | "pork"
  | "fish"
  | "shellfish"
  | "dairy"
  | "eggs"
  | "gluten"
  | "peanuts"
  | "tree-nuts"
  | "soy";

export type MealTemplate = {
  meal_type: MealType;
  name: string;
  description: string;
  /** Per serving. Servings are scaled to fit the day's calorie split. */
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  tags: Tag[];
  ingredients: string[];
};

export const MEAL_LIBRARY: MealTemplate[] = [
  /* ------------------------------------------------------- breakfast -- */
  {
    meal_type: "breakfast",
    name: "Greek yoghurt, oats and berries",
    description: "200g Greek yoghurt, 60g oats, a handful of blueberries, drizzle of honey",
    calories: 520, protein_g: 34, carbs_g: 72, fat_g: 11,
    tags: ["dairy", "gluten"],
    ingredients: ["Greek yoghurt", "Rolled oats", "Blueberries", "Honey"],
  },
  {
    meal_type: "breakfast",
    name: "Scrambled eggs on toast",
    description: "Three eggs, two slices of wholemeal toast, grilled tomatoes",
    calories: 480, protein_g: 28, carbs_g: 42, fat_g: 22,
    tags: ["eggs", "gluten", "dairy"],
    ingredients: ["Eggs", "Wholemeal bread", "Butter", "Tomatoes"],
  },
  {
    meal_type: "breakfast",
    name: "Tofu scramble and avocado",
    description: "200g firm tofu with turmeric and spinach, half an avocado, sourdough",
    calories: 500, protein_g: 26, carbs_g: 40, fat_g: 26,
    tags: ["soy", "gluten"],
    ingredients: ["Firm tofu", "Spinach", "Avocado", "Sourdough"],
  },
  {
    meal_type: "breakfast",
    name: "Overnight oats with banana",
    description: "70g oats soaked in oat milk, banana, cinnamon, chia seeds",
    calories: 460, protein_g: 14, carbs_g: 78, fat_g: 11,
    tags: ["gluten"],
    ingredients: ["Rolled oats", "Oat milk", "Banana", "Chia seeds"],
  },
  {
    meal_type: "breakfast",
    name: "Smoked salmon and eggs",
    description: "Two poached eggs, 80g smoked salmon, rye toast",
    calories: 490, protein_g: 38, carbs_g: 32, fat_g: 22,
    tags: ["fish", "eggs", "gluten"],
    ingredients: ["Eggs", "Smoked salmon", "Rye bread", "Lemon"],
  },

  /* ----------------------------------------------------------- lunch -- */
  {
    meal_type: "lunch",
    name: "Chicken and rice bowl",
    description: "180g grilled chicken, 200g cooked rice, peppers, chilli sauce",
    calories: 780, protein_g: 52, carbs_g: 95, fat_g: 18,
    tags: ["meat"],
    ingredients: ["Chicken breast", "Jasmine rice", "Mixed peppers", "Chilli sauce"],
  },
  {
    meal_type: "lunch",
    name: "Tuna and butter bean salad",
    description: "Two tins of tuna, butter beans, red onion, olive oil, lemon",
    calories: 620, protein_g: 55, carbs_g: 44, fat_g: 22,
    tags: ["fish"],
    ingredients: ["Tinned tuna", "Butter beans", "Red onion", "Olive oil"],
  },
  {
    meal_type: "lunch",
    name: "Halloumi and quinoa salad",
    description: "120g grilled halloumi, 150g quinoa, roasted courgette, rocket",
    calories: 700, protein_g: 34, carbs_g: 62, fat_g: 34,
    tags: ["dairy"],
    ingredients: ["Halloumi", "Quinoa", "Courgette", "Rocket"],
  },
  {
    meal_type: "lunch",
    name: "Lentil and chickpea curry",
    description: "Red lentils, chickpeas, tomato and coconut sauce, brown rice",
    calories: 690, protein_g: 30, carbs_g: 104, fat_g: 16,
    tags: [],
    ingredients: ["Red lentils", "Chickpeas", "Coconut milk", "Brown rice"],
  },
  {
    meal_type: "lunch",
    name: "Beef and sweet potato bowl",
    description: "150g lean beef mince, 250g roasted sweet potato, broccoli",
    calories: 720, protein_g: 48, carbs_g: 68, fat_g: 24,
    tags: ["meat"],
    ingredients: ["Lean beef mince", "Sweet potato", "Broccoli", "Garlic"],
  },

  /* ---------------------------------------------------------- dinner -- */
  {
    meal_type: "dinner",
    name: "Salmon, potatoes and greens",
    description: "200g salmon fillet, 300g new potatoes, tenderstem broccoli",
    calories: 760, protein_g: 48, carbs_g: 62, fat_g: 32,
    tags: ["fish"],
    ingredients: ["Salmon fillet", "New potatoes", "Tenderstem broccoli", "Olive oil"],
  },
  {
    meal_type: "dinner",
    name: "Chicken stir fry with noodles",
    description: "180g chicken thigh, egg noodles, pak choi, soy and ginger",
    calories: 740, protein_g: 46, carbs_g: 84, fat_g: 22,
    tags: ["meat", "soy", "gluten", "eggs"],
    ingredients: ["Chicken thigh", "Egg noodles", "Pak choi", "Soy sauce"],
  },
  {
    meal_type: "dinner",
    name: "Black bean and veg chilli",
    description: "Black beans, kidney beans, peppers, rice, coriander",
    calories: 680, protein_g: 28, carbs_g: 110, fat_g: 12,
    tags: [],
    ingredients: ["Black beans", "Kidney beans", "Peppers", "Rice"],
  },
  {
    meal_type: "dinner",
    name: "Turkey meatballs and pasta",
    description: "180g turkey mince meatballs, 120g pasta, tomato sauce",
    calories: 780, protein_g: 54, carbs_g: 92, fat_g: 18,
    tags: ["meat", "gluten"],
    ingredients: ["Turkey mince", "Pasta", "Passata", "Basil"],
  },
  {
    meal_type: "dinner",
    name: "Cod, couscous and roasted veg",
    description: "220g cod loin, 150g couscous, roasted courgette and pepper",
    calories: 640, protein_g: 50, carbs_g: 72, fat_g: 12,
    tags: ["fish", "gluten"],
    ingredients: ["Cod loin", "Couscous", "Courgette", "Red pepper"],
  },

  /* ----------------------------------------------------------- snack -- */
  {
    meal_type: "snack",
    name: "Whey shake and a banana",
    description: "One scoop of whey in water, one medium banana",
    calories: 310, protein_g: 27, carbs_g: 38, fat_g: 3,
    tags: ["dairy"],
    ingredients: ["Whey protein", "Banana"],
  },
  {
    meal_type: "snack",
    name: "Cottage cheese and honey",
    description: "150g cottage cheese with a teaspoon of honey",
    calories: 190, protein_g: 20, carbs_g: 12, fat_g: 6,
    tags: ["dairy"],
    ingredients: ["Cottage cheese", "Honey"],
  },
  {
    meal_type: "snack",
    name: "Hummus and oatcakes",
    description: "80g hummus, four oatcakes, carrot sticks",
    calories: 340, protein_g: 11, carbs_g: 38, fat_g: 16,
    tags: ["gluten"],
    ingredients: ["Hummus", "Oatcakes", "Carrots"],
  },
  {
    meal_type: "snack",
    name: "Peanut butter on rice cakes",
    description: "Three rice cakes with 30g peanut butter",
    calories: 300, protein_g: 11, carbs_g: 30, fat_g: 16,
    tags: ["peanuts"],
    ingredients: ["Rice cakes", "Peanut butter"],
  },
  {
    meal_type: "snack",
    name: "Soya yoghurt and mixed berries",
    description: "200g soya yoghurt, 100g frozen berries",
    calories: 220, protein_g: 12, carbs_g: 28, fat_g: 6,
    tags: ["soy"],
    ingredients: ["Soya yoghurt", "Mixed berries"],
  },
];

/** Tags a diet rules out entirely. */
const DIET_EXCLUDES: Record<DietaryPreference, Tag[]> = {
  none: [],
  vegetarian: ["meat", "pork", "fish", "shellfish"],
  vegan: ["meat", "pork", "fish", "shellfish", "dairy", "eggs"],
  pescatarian: ["meat", "pork"],
  halal: ["pork", "shellfish"],
  kosher: ["pork", "shellfish"],
};

/** The allergy checkboxes in onboarding, mapped onto ingredient tags. */
const ALLERGEN_TAGS: Record<string, Tag[]> = {
  dairy: ["dairy"],
  eggs: ["eggs"],
  peanuts: ["peanuts"],
  "tree nuts": ["tree-nuts"],
  soy: ["soy"],
  gluten: ["gluten"],
  shellfish: ["shellfish"],
  fish: ["fish", "shellfish"],
};

export function allowedMeals(
  preference: DietaryPreference,
  allergies: string[],
): MealTemplate[] {
  const banned = new Set<Tag>(DIET_EXCLUDES[preference]);
  for (const allergy of allergies) {
    for (const tag of ALLERGEN_TAGS[allergy.trim().toLowerCase()] ?? []) {
      banned.add(tag);
    }
  }

  const usable = MEAL_LIBRARY.filter((m) => !m.tags.some((t) => banned.has(t)));

  // If a strict combination filters a meal type down to nothing, fall back to
  // the unfiltered list for that type rather than shipping an empty day.
  return (["breakfast", "lunch", "dinner", "snack"] as MealType[]).flatMap((type) => {
    const forType = usable.filter((m) => m.meal_type === type);
    return forType.length > 0
      ? forType
      : MEAL_LIBRARY.filter((m) => m.meal_type === type);
  });
}

/** Share of the day's calories each meal is built to cover. */
export const MEAL_SPLIT: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.3,
  snack: 0.15,
};
