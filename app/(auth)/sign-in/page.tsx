import Link from "next/link";
import { signInWithGoogle } from "../actions";
import { SignInForm } from "./sign-in-form";
import { GoogleButton } from "@/components/auth/google-button";
import { FormAlert } from "@/components/auth/form-alert";
import { PreviewNotice } from "@/components/auth/preview-notice";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  oauth: "We could not start Google sign-in. Please try again.",
  callback: "That sign-in link has expired or was already used.",
  "missing-code": "That sign-in link looks incomplete. Please try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <h1 className="text-page-title">Welcome back</h1>
      <p className="text-caption mt-2 mb-8">
        Pick up where you left off — you're building momentum.
      </p>

      <PreviewNotice />

      {error && <FormAlert>{ERRORS[error] ?? "Something went wrong."}</FormAlert>}

      <form action={signInWithGoogle}>
        <GoogleButton label="Continue with Google" />
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-subtle">or continue with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <SignInForm next={next} />

      <p className="mt-8 text-center text-sm text-muted">
        New to Repwise?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
