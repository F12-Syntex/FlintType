"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { extractClerkError } from "../clerk-error";
import { OtpField, PasswordField } from "../fields";
import { ErrorLine, UtilityButton, UtilityRow } from "../form-controls";
import { useFinishSignIn } from "./use-finish-sign-in";

/** Forgot-password flow, after the orchestrator has sent the reset
 *  code (`signIn.create({ strategy: 'reset_password_email_code' })`):
 *
 *    code      → attemptFirstFactor verifies it; status flips to
 *                needs_new_password (or completes outright for an
 *                account that never had a password)
 *    password  → signIn.resetPassword saves it and returns a session */
export function ResetFlow({
  email,
  onCancel,
}: {
  email: string;
  onCancel: () => void;
}) {
  const { signIn, isLoaded } = useSignIn();
  const finish = useFinishSignIn();
  const [step, setStep] = useState<"code" | "password">("code");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"verify" | "resend" | "save" | null>(null);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(value = code) {
    if (!isLoaded || busy) return;
    setBusy("verify");
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: value.trim(),
      });
      if (attempt.status === "needs_new_password") {
        setStep("password");
      } else if (!(await finish(attempt))) {
        setError("That code didn't work. Try again or resend it.");
      }
    } catch (err) {
      setError(extractClerkError(err) ?? "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  // Creating the reset sign-in again sends a fresh code.
  async function resend() {
    if (!isLoaded || busy) return;
    setBusy("resend");
    setError(null);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setResent(true);
    } catch (err) {
      setError(extractClerkError(err) ?? "Couldn't resend the code.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!isLoaded || busy) return;
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const attempt = await signIn.resetPassword({ password });
      if (!(await finish(attempt))) {
        setError("Password saved, but sign-in didn't complete. Try signing in.");
      }
    } catch (err) {
      setError(extractClerkError(err) ?? "Couldn't save the new password.");
    } finally {
      setBusy(null);
    }
  }

  if (step === "password") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <p className="text-sm text-muted-foreground">
          Choose a new password. We&apos;ll sign you in once it&apos;s saved.
        </p>
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          autoFocus
          hint="At least 8 characters."
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          required
        />
        {error ? <ErrorLine message={error} /> : null}
        <Button type="submit" size="lg" disabled={busy != null} className="w-full">
          {busy === "save" ? "Saving…" : "Save and sign in"}
        </Button>
        <UtilityRow>
          <UtilityButton onClick={onCancel} disabled={busy != null}>
            Cancel
          </UtilityButton>
          <span />
        </UtilityRow>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
    >
      <p className="text-sm text-muted-foreground">
        We emailed a reset code to{" "}
        <span className="font-medium break-all text-foreground">{email}</span>.
        Enter it to choose a new password.
      </p>
      <OtpField
        id="sign-in-reset-code"
        label="Password reset code"
        value={code}
        onChange={setCode}
        onComplete={(value) => void verify(value)}
      />
      {error ? <ErrorLine message={error} /> : null}
      <Button type="submit" size="lg" disabled={busy != null} className="w-full">
        {busy === "verify" ? "Verifying…" : "Continue"}
      </Button>
      <UtilityRow>
        <UtilityButton onClick={onCancel} disabled={busy != null}>
          Back to sign in
        </UtilityButton>
        <UtilityButton onClick={() => void resend()} disabled={busy != null}>
          {busy === "resend" ? "Resending…" : resent ? "Sent again" : "Resend code"}
        </UtilityButton>
      </UtilityRow>
    </form>
  );
}
