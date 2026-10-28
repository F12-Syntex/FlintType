"use client";

// /legacy path — the stable resource-based hook (see sign-in/index for
// context on why we're not using the default signals export).
import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractClerkError } from "../clerk-error";
import { OrDivider } from "../form-controls";
import { DiscordButton } from "../oauth-buttons";
import {
  needsProtectCheck,
  type ProtectableResource,
  protectCheckMessage,
} from "../protect-check";
import { usePasswordHint } from "../use-password-hint";
import { ProtectSlot, useProtectCheck } from "../use-protect-check";
import { CredentialsStep, ResumeStep, VerifyStep } from "./steps";

type Busy = "create" | "check" | "verify" | "resend" | "discord" | null;

/** Custom sign-up form:
 *    1. credentials: email + password → signUp.create, then Clerk
 *       Protect's human check if Clerk asks for one, then send the code
 *    2. verify: 6-digit code → attemptEmailAddressVerification (and the
 *       human check here instead, if Clerk only asks for it now)
 *  On complete, setActive promotes the new session and we route home.
 *
 *  Discord is a one-step shortcut through Clerk's hosted OAuth. If that
 *  round-trip still owes a human check, Clerk sends the user back here
 *  as /sign-up#/protect-check, which shows the resume step. */
export function SignUpForm() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();
  const protect = useProtectCheck();
  const passwordHint = usePasswordHint();

  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read once on the client; it only counts after Clerk has loaded, so
  // the server render (always the credentials step) still matches.
  const [fromOAuthCheck, setFromOAuthCheck] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#/protect-check",
  );
  const resuming =
    fromOAuthCheck &&
    isLoaded &&
    step === "credentials" &&
    needsProtectCheck(signUp as unknown as ProtectableResource);

  function fail(err: unknown, fallback: string) {
    const message = protectCheckMessage(err);
    if (message === "") return; // the user left on purpose
    setError(message ?? extractClerkError(err) ?? fallback);
  }

  /** The human check, if Clerk wants one, with "check" as the busy state. */
  async function passCheck(resource: unknown) {
    if (!needsProtectCheck(resource as ProtectableResource)) return;
    setBusy("check");
    await protect.pass(resource);
  }

  async function finish(): Promise<boolean> {
    if (!isLoaded || signUp.status !== "complete" || !signUp.createdSessionId) {
      return false;
    }
    await setActive({ session: signUp.createdSessionId });
    router.push("/");
    router.refresh();
    return true;
  }

  async function create() {
    if (!isLoaded || busy) return;
    setBusy("create");
    setError(null);
    try {
      const created = await signUp.create({ emailAddress: email.trim(), password });
      await passCheck(created);
      await created.prepareEmailAddressVerification({ strategy: "email_code" });
      setCode("");
      setResent(false);
      setStep("verify");
    } catch (err) {
      fail(err, "Sign up failed.");
    } finally {
      setBusy(null);
    }
  }

  // `value` comes from the OTP input's onComplete so the last digit is
  // never lost to a not-yet-flushed state update.
  async function verify(value = code) {
    if (!isLoaded || busy) return;
    setBusy("verify");
    setError(null);
    try {
      // Retrying after a failed human check: the code was already taken.
      const verified = signUp.verifications?.emailAddress?.status === "verified";
      const attempt = verified
        ? signUp
        : await signUp.attemptEmailAddressVerification({ code: value.trim() });
      await passCheck(attempt);
      if (!(await finish())) setError("Verification didn't complete. Try the code again.");
    } catch (err) {
      fail(err, "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  async function resume() {
    if (!isLoaded || busy) return;
    setError(null);
    try {
      await passCheck(signUp);
      if (!(await finish())) {
        setFromOAuthCheck(false);
        setError("Sign-up didn't finish. Try again with Discord or your email.");
      }
    } catch (err) {
      fail(err, "Sign-up didn't finish. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
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

  async function discord() {
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

  const disabled = !isLoaded || busy != null;
  const checking = busy === "check";
  const checkLabel = protect.visible ? "Waiting for the check…" : "Checking…";
  const check = <ProtectSlot boxRef={protect.boxRef} visible={protect.visible} />;

  if (resuming) {
    return (
      <ResumeStep
        onContinue={() => void resume()}
        label={checking ? checkLabel : "Continue"}
        disabled={disabled}
        error={error}
        check={check}
      />
    );
  }

  if (step === "verify") {
    return (
      <VerifyStep
        email={email}
        code={code}
        onCodeChange={setCode}
        onSubmit={(value) => void verify(value)}
        submitLabel={checking ? checkLabel : busy === "verify" ? "Verifying…" : "Create account"}
        disabled={disabled}
        error={error}
        check={check}
        onChangeEmail={() => {
          protect.cancel();
          setStep("credentials");
          setCode("");
          setError(null);
        }}
        changeDisabled={busy != null && !checking}
        onResend={() => void resend()}
        resendLabel={busy === "resend" ? "Resending…" : resent ? "Sent again" : "Resend code"}
      />
    );
  }

  return (
    <CredentialsStep
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      passwordHint={passwordHint}
      onSubmit={() => void create()}
      submitLabel={checking ? checkLabel : busy === "create" ? "Sending code…" : "Continue with email"}
      disabled={disabled}
      error={error}
      check={check}
      before={
        <>
          <DiscordButton onStart={discord} disabled={busy != null} />
          <OrDivider label="or use your email" />
        </>
      }
    />
  );
}
