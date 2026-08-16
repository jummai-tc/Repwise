import Link from "next/link";
import { signInWithGoogle } from "../actions";
import { SignUpForm } from "./sign-up-form";
import { GoogleButton } from "@/components/auth/google-button";
import { FormAlert } from "@/components/auth/form-alert";
import { PreviewNotice } from "@/components/auth/preview-notice";

export const metadata = { title: "Create your account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ "check-email"?: string }>;
}) {
  const params = await searchParams;
  const checkEmail = params["check-email"] === "1";

  return (
    <>
      <h1 className="text-page-title">Start your fitness journey</h1>
      <p className="text-caption mt-2 mb-8">
        Six quick questions and your plan is ready.
      </p>

      <PreviewNotice />

      {checkEmail && (
        <FormAlert tone="success">
          Check your inbox — we have sent you a link to confirm your email
          address. Once you click it you will land straight in onboarding.
        </FormAlert>
      )}

      <form action={signInWithGoogle}>
        <GoogleButton label="Continue with Google" />
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-subtle">or sign up with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <SignUpForm />

      <p className="text-caption mt-6 text-center text-xs">
        Repwisely gives general fitness and nutrition guidance, not medical
        advice. Check with a doctor before starting a new programme.
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
