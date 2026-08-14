"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { authErrorMessage } from "@/lib/auth/errors";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const next = String(formData.get("next") || "/dashboard");
  const destination = next.startsWith("/") ? next : "/dashboard";

  // Preview mode: no Supabase project connected. Validation above still runs
  // so the form behaves exactly as it will once auth is wired up; we just
  // skip the credential check and let the reviewer into the app.
  if (!isSupabaseConfigured()) redirect(destination);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Wrong credentials stay vague (see the map); a rate limit or an
    // unconfirmed email is surfaced so the user knows what to do next.
    return { error: authErrorMessage(error) };
  }

  redirect(destination);
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // Preview mode: nothing is stored, so go straight to the wizard, which
  // already runs on an empty draft when there is no project connected.
  if (!isSupabaseConfigured()) redirect("/onboarding");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the handle_new_user() trigger to seed the profile row.
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  // Email confirmation is on: no session yet, so tell them to check their inbox.
  if (!data.session) {
    redirect("/sign-up?check-email=1");
  }

  redirect("/onboarding");
}

export async function signInWithGoogle() {
  // Preview mode: there is no OAuth provider to hand off to, so land where a
  // fresh Google sign-up would — onboarding.
  if (!isSupabaseConfigured()) redirect("/onboarding");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback` },
  });

  if (error || !data.url) redirect("/sign-in?error=oauth");
  redirect(data.url);
}
