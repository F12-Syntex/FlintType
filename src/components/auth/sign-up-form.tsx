"use client";

// /legacy path — the stable resource-based hook (see sign-in/index for
// context on why we're not using the default signals export).
import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { extractClerkError } from "./clerk-error";
import { Field, OtpField, PasswordField } from "./fields";
import { ErrorLine, OrDivider, UtilityButton, UtilityRow } from "./form-controls";
import { DiscordButton } from "./oauth-buttons";

type Step = "credentials" | "verify";

/** Custom sign-up form — two steps:
 *    1. credentials: email + password → signUp.create + send code
 *    2. verify: 6-digit code → signUp.attemptEmailAddressVerification
 *  On complete, setActive promotes the new session and we route home.
 *
 *  OAuth (Discord) is a one-step shortcut — Clerk's hosted callback
 *  handles verification + session creation. */
export function SignUpForm() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "verify" | "resend" | "discord" | null>(
    null,
  );
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!isLoaded || busy) return;
    setBusy("create");
    setError(null);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCode("");
      setResent(false);
      setStep("verify");
    } catch (err) {
      setError(extractClerkError(err) ?? "Sign up failed.");
    } finally {
      setBusy(null);
    }
  }

  // `value` comes from the OTP input's onComplete so the last digit is
  // never lost to a not-yet-flushed state update.
  async function handleVerify(value = code) {
    if (!isLoaded || busy) return;
    setBusy("verify");
    setError(null);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: value.trim(),
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        router.push("/");
        router.refresh();
      } else if (
        // The installed types predate Clerk Protect's field name.
        (attempt.missingFields as readonly string[] | undefined)?.includes(
          "protect_check",
        )
      ) {
        // Clerk Protect wants its bot challenge, which this custom form
        // doesn't run yet. Say so instead of blaming the code.
        setError(
          "Your code is right, but sign-up needs an extra security check this page can't show yet. Continue with Discord instead, or try again later.",
        );
      } else {
        setError("Verification didn't complete. Try the code again.");
      }
    } catch (err) {
      setError(extractClerkError(err) ?? "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleResend() {
    if (!isLoaded || busy) return;
    setBusy("resend");
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResent(true);
    } catch (err) {
      setError(extractClerkError(err) ?? "Couldn't resend the code.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDiscord() {
    if (!isLoaded || busy) return;
    setBusy("discord");
    setError(null);
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_discord",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err) {
      setError(extractClerkError(err) ?? "Discord sign-up failed.");
      setBusy(null);
    }
  }

  if (step === "verify") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify();
        }}
      >
        <p className="text-sm text-muted-foreground">
          We emailed a 6-digit code to{" "}
          <span className="font-medium break-all text-foreground">{email}</span>.
          Enter it to finish creating your account.
        </p>
        <OtpField
          id="sign-up-code"
          label="Verification code"
          value={code}
          onChange={setCode}
          onComplete={(value) => void handleVerify(value)}
        />
        {error ? <ErrorLine message={error} /> : null}
        <Button
          type="submit"
          size="lg"
          disabled={!isLoaded || busy != null}
          className="w-full"
        >
          {busy === "verify" ? "Verifying…" : "Create account"}
        </Button>
        <UtilityRow>
          <UtilityButton
            onClick={() => {
              setStep("credentials");
              setCode("");
              setError(null);
            }}
            disabled={busy != null}
          >
            Use a different email
          </UtilityButton>
          <UtilityButton onClick={() => void handleResend()} disabled={busy != null}>
            {busy === "resend" ? "Resending…" : resent ? "Sent again" : "Resend code"}
          </UtilityButton>
        </UtilityRow>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DiscordButton onStart={handleDiscord} disabled={busy != null} />

      <OrDivider label="or use your email" />

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleCreate();
        }}
      >
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          required
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          hint="At least 8 characters."
        />
        {error ? <ErrorLine message={error} /> : null}
        {/* Clerk's bot protection mounts its challenge here in custom
            flows (CAPTCHA_ELEMENT_ID); without it sign-up can stall on a
            missing protection check. Empty unless Clerk needs it. */}
        <div id="clerk-captcha" className="empty:hidden" />
        <Button
          type="submit"
          size="lg"
          disabled={!isLoaded || busy != null}
          className="w-full"
        >
          {busy === "create" ? "Sending code…" : "Continue with email"}
        </Button>
      </form>
    </div>
  );
}
