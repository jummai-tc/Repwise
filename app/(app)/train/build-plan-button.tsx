"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rebuildPlan } from "./actions";

/**
 * Builds the plan from the profile. Shared by the training page's empty state
 * and the "rebuild" control once a plan exists, so both go through the same
 * server action and the same error surface.
 */
export function BuildPlanButton({
  label = "Build my plan",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await rebuildPlan();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" variant={variant} onClick={run} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Building it…
          </>
        ) : (
          <>
            <Sparkles /> {label}
          </>
        )}
      </Button>
      {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
    </div>
  );
}
