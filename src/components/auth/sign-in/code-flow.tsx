"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { extractClerkError } from "../clerk-error";
import { OtpField } from "../fields";
import { ErrorLine, UtilityButton, UtilityRow } from "../form-controls";
import { SigningInAs } from "./stages";
import { useFinishSignIn } from "./use-finish-sign-in";

/** "We emailed you a code" — the code was already sent by the
 *  orchestrator; this owns entering it, resending it and finishing. */
export function CodeFlow({
  email,
  emailAddressId,
  onChangeEmail,
  onBack,
  backLabel,
}: {
  email: string;
  emailAddressId: string;
  onChangeEmail: () => void;
  /** Back to the stage that sent the code (password or method). */
  onBack: () => void;
  backLabel: string;
}) {
  const { signIn, isLoaded } = useSignIn();
  const finish = useFinishSignIn();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `value` comes straight from the OTP input's onComplete so the last
  // digit is never lost to a not-yet-flushed state update.
  async function submit(value = code) {
    if (!isLoaded || busy) return;
    setBusy("verify");
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: value.trim(),
      });
      if (!(await finish(attempt))) {
        setError("That code didn't work. Try again or resend it.");
      }
    } catch (err) {
      setError(extractClerkError(err) ?? "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    if (!isLoaded || busy) return;
    setBusy("resend");
    setError(null);
    try {
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId });
      setResent(true);
    } catch (err) {
      setError(extractClerkError(err) ?? "Couldn't resend the code.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <SigningInAs email={email} onChange={onChangeEmail} disabled={busy != null} />
      <p className="text-sm text-muted-foreground">
        We emailed you a 6-digit code. Enter it below.
      </p>
      <OtpField
        id="sign-in-code"
        label="Verification code"
        value={code}
        onChange={setCode}
        onComplete={(value) => void submit(value)}
      />
      {error ? <ErrorLine message={error} /> : null}
      <Button type="submit" size="lg" disabled={busy != null} className="w-full">
        {busy === "verify" ? "Verifying…" : "Sign in"}
      </Button>
      <UtilityRow>
        <UtilityButton onClick={onBack} disabled={busy != null}>
          {backLabel}
        </UtilityButton>
        <UtilityButton onClick={() => void resend()} disabled={busy != null}>
          {busy === "resend" ? "Resending…" : resent ? "Sent again" : "Resend code"}
        </UtilityButton>
      </UtilityRow>
    </form>
  );
}
