"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "../actions";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormAlert } from "@/components/auth/form-alert";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <form action={formAction} noValidate>
      {state.error && <FormAlert>{state.error}</FormAlert>}

      {next && <input type="hidden" name="next" value={next} />}

      <div className="mb-4">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
      </div>

      <div className="mb-6">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
      </div>

      <SubmitButton pendingLabel="Signing you in…">Sign in</SubmitButton>
    </form>
  );
}
