import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { OnboardingWizard } from "./wizard";
import { draftFromProfile, EMPTY_DRAFT } from "@/lib/profile";

// Plan generation makes two Gemini calls and takes roughly 45 seconds on the
// free tier. Server Actions inherit their timeout from the page that invokes
// them, and the platform default is well under that.
export const maxDuration = 120;


export default async function OnboardingPage() {
  // Preview mode with no Supabase project: run the wizard on an empty draft
  // so the flow can still be walked end to end.
  if (!isSupabaseConfigured()) {
    return <OnboardingWizard initialDraft={EMPTY_DRAFT} initialStep={0} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/dashboard");

  // Resume from whatever was already answered.
  const initialDraft = draftFromProfile(
    profile,
    user.user_metadata?.full_name ?? "",
  );

  return (
    <OnboardingWizard
      initialDraft={initialDraft}
      initialStep={profile?.onboarding_step ?? 0}
    />
  );
}
