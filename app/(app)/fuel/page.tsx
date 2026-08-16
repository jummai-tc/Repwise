import { Utensils } from "lucide-react";
import { PageIntro } from "@/components/shell/page-intro";
import { EmptyState } from "@/components/ui/empty-state";
import { getNutritionToday } from "@/lib/data/nutrition";
import { requireUser } from "@/lib/data/user";
import { isAIConfigured } from "@/lib/ai/gemini";
import { BuildPlanButton } from "../train/build-plan-button";
import { FuelClient } from "./fuel-client";

export const dynamic = "force-dynamic";
// Plan generation makes two Gemini calls and takes roughly 45 seconds on the
// free tier. Server Actions inherit their timeout from the page that invokes
// them, and the platform default is well under that.
export const maxDuration = 120;
export const metadata = { title: "Nutrition" };

export default async function FuelPage() {
  await requireUser("/fuel");
  const { targets, meals, eaten, waterMl } = await getNutritionToday();

  // Formatted on the server and passed down as a string. Doing this inside the
  // client component renders it twice — once with the server's locale, once
  // with the browser's — which trips a hydration mismatch.
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (!targets) {
    return (
      <>
        <PageIntro eyebrow={today} title="Nutrition" />
        <EmptyState
          icon={Utensils}
          title="No targets yet"
          description="Build your plan and Repwisely works out your calories, macros and water target from your profile — then this page tracks what you actually eat against them."
          action={<BuildPlanButton />}
        />
      </>
    );
  }

  return (
    <FuelClient
      today={today}
      targets={targets}
      meals={meals}
      eaten={eaten}
      waterMl={waterMl}
      // Read on the server: the key must never reach the browser, so the
      // client is told whether the feature exists, not what configures it.
      canEstimate={isAIConfigured()}
    />
  );
}
