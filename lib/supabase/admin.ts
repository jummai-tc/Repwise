import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses Row Level Security entirely — only ever use it
 * in server code for trusted work (seeding, admin scripts). Never in a path
 * that returns data straight to a user without an explicit ownership check.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // A value still carrying the .env.example placeholder is as unset as a
  // missing one, but Supabase would accept it and fail later with a bare
  // "Invalid API key" from the REST layer. Same placeholder convention as
  // isSupabaseConfigured() in ./config.
  if (!key || key.startsWith("your-")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy the secret key from " +
        "Project Settings -> API Keys into .env.local.",
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
