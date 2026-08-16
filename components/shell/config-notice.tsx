import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FormAlert } from "@/components/auth/form-alert";

/**
 * Shown across the signed-in app while no Supabase project is connected. The
 * screens still render, but every number on them is empty — without this the
 * app looks like a real account with no data in it.
 */
export function ConfigNotice() {
  if (isSupabaseConfigured()) return null;

  return (
    <FormAlert tone="info">
      Preview mode — this deployment has no Supabase credentials, so nothing is
      loaded or saved. Set NEXT_PUBLIC_SUPABASE_URL and
      NEXT_PUBLIC_SUPABASE_ANON_KEY to connect your project.
    </FormAlert>
  );
}
