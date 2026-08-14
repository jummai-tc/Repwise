"use server";

import { revalidatePath } from "next/cache";
import { generatePlanForUser } from "@/lib/plan/generate";

/**
 * Rebuilds the training and nutrition plans from the current profile. Used by
 * the empty state on the training page and after a profile change, so answers
 * given in settings can be reflected without waiting for anything else.
 */
export async function rebuildPlan() {
  const result = await generatePlanForUser();

  if (result.ok) {
    revalidatePath("/train");
    revalidatePath("/fuel");
    revalidatePath("/dashboard");
  }

  return result;
}
