import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FormAlert } from "./form-alert";

/**
 * Shown on the auth screens while no Supabase project is connected. Sign-in
 * and sign-up still validate and still route onwards — nothing is stored, so
 * any details get you into the app for reviewing the interface.
 */
export function PreviewNotice() {
  if (isSupabaseConfigured()) return null;

  return (
    <FormAlert tone="info">
      Preview mode — no account is created yet. Enter any details and you will
      go straight through to the app.
    </FormAlert>
  );
}
