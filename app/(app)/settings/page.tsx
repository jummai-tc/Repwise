import { redirect } from "next/navigation";
import { LogOut, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { draftFromProfile, EMPTY_DRAFT } from "@/lib/profile";
import { PageIntro } from "@/components/shell/page-intro";
import { SettingsForm } from "./settings-form";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Your Profile" };

export default async function SettingsPage() {
  let draft = EMPTY_DRAFT;
  let email: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/sign-in?next=/settings");
    email = user.email ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    draft = draftFromProfile(profile, user.user_metadata?.full_name ?? "");
  }

  return (
    <>
      <PageIntro
        title="Your Profile"
        description="Change any of this and your next plan is built around the new answers."
      />

      <div className="mx-auto max-w-3xl">
        <SettingsForm initialDraft={draft} />

        <Card className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Account</CardTitle>
            <p className="text-caption mt-1 flex items-center gap-1.5 truncate">
              <Mail className="size-3.5 shrink-0" />
              {email ?? "Not signed in — no Supabase project connected yet."}
            </p>
          </div>
          <form action="/auth/sign-out" method="post" className="shrink-0">
            <Button type="submit" variant="secondary">
              <LogOut /> Sign out
            </Button>
          </form>
        </Card>

        <p className="text-caption mt-6 pb-4 text-center">
          Repwisely gives general fitness and nutrition guidance, not medical
          advice. Speak to a doctor or registered dietitian about anything
          clinical.
        </p>
      </div>
    </>
  );
}
