"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AuthStep, EmailText } from "../auth-step";
import { Field, OtpField, PasswordField } from "../fields";
import { ErrorLine, UtilityButton, UtilityRow } from "../form-controls";

/** The sign-up steps. Pure presentation; `./index` owns the state and
 *  the Clerk calls. `check` is the human-check slot (`<ProtectSlot>`),
 *  rendered just above each step's submit button. */

export function CredentialsStep({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  passwordHint,
  onSubmit,
  submitLabel,
  disabled,
  error,
  before,
  check,
}: {
  email: string;
  onEmailChange: (next: string) => void;
  password: string;
  onPasswordChange: (next: string) => void;
  passwordHint: string;
  onSubmit: () => void;
  submitLabel: string;
  disabled: boolean;
  error: string | null;
  /** The Discord shortcut and the "or" divider, above the form. */
  before: ReactNode;
  check: ReactNode;
}) {
  return (
    <AuthStep
      title="Create your account"
      description="Keep your history on every device, unlock adaptive drills and bring your MonkeyType results with you."
    >
      <div className="flex flex-col gap-5">
        {before}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={onEmailChange}
            required
          />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={onPasswordChange}
            required
            hint={passwordHint}
          />
          {/* Clerk's smart CAPTCHA mounts here in custom flows when the
              instance turns it on; empty otherwise. */}
          <div id="clerk-captcha" className="empty:hidden" />
          {check}
          {error ? <ErrorLine message={error} /> : null}
          <Button type="submit" size="lg" disabled={disabled} className="w-full">
            {submitLabel}
          </Button>
        </form>
      </div>
    </AuthStep>
  );
}

export function VerifyStep({
  email,
  code,
  onCodeChange,
  onSubmit,
  submitLabel,
  disabled,
  error,
  check,
  onChangeEmail,
  changeDisabled,
  onResend,
  resendLabel,
}: {
  email: string;
  code: string;
  onCodeChange: (next: string) => void;
  /** Receives the full code from the OTP input's onComplete. */
  onSubmit: (value?: string) => void;
  submitLabel: string;
  disabled: boolean;
  error: string | null;
  check: ReactNode;
  onChangeEmail: () => void;
  changeDisabled: boolean;
  onResend: () => void;
  resendLabel: string;
}) {
  return (
    <AuthStep
      title="Check your email"
      description={
        <>
          Enter the 6-digit code we sent to <EmailText>{email}</EmailText> to
          finish creating your account.
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <OtpField
          id="sign-up-code"
          label="Verification code"
          value={code}
          onChange={onCodeChange}
          onComplete={(value) => onSubmit(value)}
        />
        {check}
        {error ? <ErrorLine message={error} /> : null}
        <Button type="submit" size="lg" disabled={disabled} className="w-full">
          {submitLabel}
        </Button>
        <UtilityRow>
          <UtilityButton onClick={onChangeEmail} disabled={changeDisabled}>
            Use a different email
          </UtilityButton>
          <UtilityButton onClick={onResend} disabled={disabled}>
            {resendLabel}
          </UtilityButton>
        </UtilityRow>
      </form>
    </AuthStep>
  );
}

/** Back from Discord with Clerk still owing a human check. */
export function ResumeStep({
  onContinue,
  label,
  disabled,
  error,
  check,
}: {
  onContinue: () => void;
  label: string;
  disabled: boolean;
  error: string | null;
  check: ReactNode;
}) {
  return (
    <AuthStep
      title="One more step"
      description="Confirm you're human to finish creating your account."
    >
      <div className="flex flex-col gap-4">
        {check}
        {error ? <ErrorLine message={error} /> : null}
        <Button
          type="button"
          size="lg"
          onClick={onContinue}
          disabled={disabled}
          className="w-full"
        >
          {label}
        </Button>
      </div>
    </AuthStep>
  );
}
