/**
 * Repwise is built to be runnable before Supabase credentials exist, so the
 * UI can be developed in phases 1-2 without an account. Anything auth-gated
 * checks this first and no-ops when the project is not wired up yet.
 */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      // Values still carrying the .env.example placeholders don't count.
      !url.includes("your-project-ref") &&
      !key.startsWith("your-"),
  );
}
