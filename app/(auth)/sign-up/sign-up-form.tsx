"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormAlert } from "@/components/auth/form-alert";

export function SignUpForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(signUp, {});

  return (
    <form action={formAction} noValidate>
      {state.error && <FormAlert>{state.error}</FormAlert>}

      <div className="mb-4">
        <Label htmlFor="full_name">Your name</Label>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder="Alex Morgan"
          required
          aria-invalid={Boolean(state.fieldErrors?.full_name)}
        />
        <FieldError>{state.fieldErrors?.full_name?.[0]}</FieldError>
      </div>

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
      </div>

      <SubmitButton pendingLabel="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}
