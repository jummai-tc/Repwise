import type { AuthError } from "@supabase/supabase-js";

/**
 * Supabase writes its auth errors for developers ("email rate limit
 * exceeded"), so we never render them raw. Anything unmapped falls back to a
 * generic line and gets logged server-side, so a new failure mode turns into
 * a support question rather than jargon in the user's face.
 */
const MESSAGES: Record<string, string> = {
  // The built-in email service allows only a couple of messages per hour, so
  // this is the one users actually hit during a busy sign-up run.
  over_email_send_rate_limit:
    "We have sent too many confirmation emails in the last hour. Please wait a few minutes and try again, or continue with Google instead.",
  over_request_rate_limit:
    "Too many attempts from this device. Please wait a few minutes and try again.",
  user_already_exists:
    "That email already has an account. Try signing in instead.",
  email_exists: "That email already has an account. Try signing in instead.",
  email_address_invalid:
    "That email address was rejected. Please check it and try again.",
  email_address_not_authorized:
    "We cannot send email to that address right now. Please try a different one.",
  weak_password:
    "Please choose a stronger password — mix in numbers or symbols.",
  signup_disabled:
    "New sign-ups are paused at the moment. Please check back soon.",
  email_provider_disabled:
    "Email sign-up is unavailable right now. Please continue with Google instead.",
  email_not_confirmed:
    "Please confirm your email address first — check your inbox for the link we sent you.",
  // Deliberately vague: confirming which half was wrong helps account enumeration.
  invalid_credentials: "That email and password combination did not work.",
};

const FALLBACK = "Something went wrong on our end. Please try again in a moment.";

export function authErrorMessage(error: AuthError, fallback = FALLBACK) {
  const mapped = error.code && MESSAGES[error.code];
  if (mapped) return mapped;

  console.error("[auth] unmapped Supabase error", {
    code: error.code,
    status: error.status,
    message: error.message,
  });
  return fallback;
}
