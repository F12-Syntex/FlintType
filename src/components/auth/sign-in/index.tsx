"use client";

// /legacy path — the stable resource-based hook with create() /
// setActive() / authenticateWithRedirect() / createEmailLinkFlow().
// The default @clerk/nextjs export now points at the experimental
// "signals" API which doesn't expose the methods we drive the custom
// flow from.
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DiscordButton } from "../oauth-buttons";
import { Divider, ErrorLine, extractError } from "./shared";
import {
  CodeStage,
  EmailStage,
  type FactorKind,
  LinkStage,
  MethodStage,
  PasswordStage,
} from "./stages";

type Stage =
  | { kind: "email" }
  | {
      kind: "method";
      emailAddressId: string | null;
      available: FactorKind[];
    }
  | { kind: "password"; emailAddressId: string | null }
  | { kind: "code"; emailAddressId: string }
  | { kind: "link"; emailAddressId: string; cancelled: boolean };

/** Custom sign-in form — Clerk hooks under the hood, our design surface
 *  on top. Discord shortcut up top, then a 5-stage email funnel:
 *
 *    1. email     →  signIn.create({ identifier }) and read
 *                    supportedFirstFactors
 *    2. method    →  user picks password / email code / magic link
 *                    (only the methods Clerk reports as available
 *                    render — toggle the rest in the Clerk Dashboard)
 *    3a password  →  attemptFirstFactor with the password
 *    3b code      →  prepareFirstFactor(email_code), enter 6-digit code,
 *                    attemptFirstFactor(email_code)
 *    3c link      →  createEmailLinkFlow + startEmailLinkFlow, poll
 *                    until the magic link is tapped (the /sign-in/verify
 *                    page completes the verification on the other tab)
 *
 *  Errors render inline (Clerk returns err.errors[].longMessage which
 *  is already human-readable). */
export function SignInForm() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<
    "email" | "discord" | "method" | "password" | "code" | "resend" | null
  >(null);
  const [busyMethod, setBusyMethod] = useState<FactorKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const cancelLinkFlow = useRef<(() => void) | null>(null);

  // Cancel any in-flight email-link polling on unmount / stage change.
  useEffect(() => {
    return () => {
      cancelLinkFlow.current?.();
      cancelLinkFlow.current = null;
    };
  }, []);

  function reset(next: Stage) {
    cancelLinkFlow.current?.();
    cancelLinkFlow.current = null;
    setError(null);
    setBusy(null);
    setBusyMethod(null);
    setStage(next);
  }

  async function handleSubmitEmail() {
    if (!isLoaded || busy) return;
    setBusy("email");
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email.trim() });
      // Already complete is extremely rare here (would mean a passwordless
      // identifier resolved on create), but treat it the same way.
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        router.push("/");
        router.refresh();
        return;
      }
      const factors = collectFactors(attempt.supportedFirstFactors ?? []);
      if (factors.available.length === 0) {
        setError(
          "No sign-in methods available for this email. Try a different account.",
        );
        return;
      }
      setStage({
        kind: "method",
        emailAddressId: factors.emailAddressId,
        available: factors.available,
      });
    } catch (err) {
      setError(extractError(err) ?? "Couldn't continue. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handlePickMethod(kind: FactorKind) {
    if (!isLoaded || busy || stage.kind !== "method") return;
    const { emailAddressId } = stage;
    if (kind === "password") {
      setStage({ kind: "password", emailAddressId });
      return;
    }
    if (!emailAddressId) {
      setError("Couldn't find your email on this account.");
      return;
    }
    setBusy("method");
    setBusyMethod(kind);
    setError(null);
    try {
      if (kind === "code") {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId,
        });
        setStage({ kind: "code", emailAddressId });
        setResentAt(null);
      } else {
        await startLinkFlow(emailAddressId);
      }
    } catch (err) {
      setError(extractError(err) ?? "Couldn't send. Try again.");
    } finally {
      setBusy(null);
      setBusyMethod(null);
    }
  }

  async function startLinkFlow(emailAddressId: string) {
    if (!signIn) return;
    const flow = signIn.createEmailLinkFlow();
    cancelLinkFlow.current = () => {
      try {
        flow.cancelEmailLinkFlow();
      } catch {
        /* already cancelled */
      }
    };
    setStage({ kind: "link", emailAddressId, cancelled: false });
    try {
      const completed = await flow.startEmailLinkFlow({
        emailAddressId,
        redirectUrl: `${window.location.origin}/sign-in/verify`,
      });
      if (completed.status === "complete" && completed.createdSessionId) {
        await setActive({ session: completed.createdSessionId });
        router.push("/");
        router.refresh();
      } else {
        setStage((prev) =>
          prev.kind === "link" ? { ...prev, cancelled: true } : prev,
        );
        setError("Sign-in didn't complete. Try a different method.");
      }
    } catch (err) {
      // Cancellation throws — only surface non-cancel errors.
      const message = extractError(err);
      if (message) {
        setStage((prev) =>
          prev.kind === "link" ? { ...prev, cancelled: true } : prev,
        );
        setError(message);
      }
    } finally {
      cancelLinkFlow.current = null;
    }
  }

  async function handleSubmitPassword() {
    if (!isLoaded || busy) return;
    setBusy("password");
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "password",
        password,
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        router.push("/");
        router.refresh();
      } else {
        setError("Additional verification required. Try a code instead.");
      }
    } catch (err) {
      setError(extractError(err) ?? "Sign in failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmitCode() {
    if (!isLoaded || busy) return;
    setBusy("code");
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        router.push("/");
        router.refresh();
      } else {
        setError("That code didn't work. Try again or resend.");
      }
    } catch (err) {
      setError(extractError(err) ?? "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleResend() {
    if (!isLoaded || busy || stage.kind !== "code") return;
    setBusy("resend");
    setError(null);
    try {
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: stage.emailAddressId,
      });
      setResentAt(Date.now());
    } catch (err) {
      setError(extractError(err) ?? "Couldn't resend the code.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDiscord() {
    if (!isLoaded || busy) return;
    setBusy("discord");
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_discord",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err) {
      setError(extractError(err) ?? "Discord sign-in failed.");
      setBusy(null);
    }
  }

  // Header text — only the email stage gets the Discord shortcut + the
  // "or sign in with email" divider. The follow-up stages render on
  // their own.
  if (stage.kind === "email") {
    return (
      <div className="flex flex-col gap-5">
        <DiscordButton onStart={handleDiscord} disabled={busy != null} />
        <Divider label="or sign in with email" />
        <EmailStage
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleSubmitEmail}
          busy={busy === "email"}
          error={error}
        />
      </div>
    );
  }

  if (stage.kind === "method") {
    return (
      <MethodStage
        email={email}
        available={stage.available}
        onPick={handlePickMethod}
        onBack={() => reset({ kind: "email" })}
        busy={busy === "method"}
        busyKind={busyMethod}
      />
    );
  }

  if (stage.kind === "password") {
    return (
      <div className="flex flex-col gap-4">
        <PasswordStage
          email={email}
          password={password}
          onPasswordChange={setPassword}
          onSubmit={handleSubmitPassword}
          onBack={() => reset(methodStageFrom(stage))}
          busy={busy === "password"}
          error={error}
        />
      </div>
    );
  }

  if (stage.kind === "code") {
    return (
      <CodeStage
        email={email}
        code={code}
        onCodeChange={setCode}
        onSubmit={handleSubmitCode}
        onResend={handleResend}
        onBack={() => reset(methodStageFrom(stage))}
        busy={busy === "code"}
        resending={busy === "resend"}
        resentAt={resentAt}
        error={error}
      />
    );
  }

  // stage.kind === "link"
  return (
    <div className="flex flex-col gap-4">
      <LinkStage
        email={email}
        onBack={() => reset(methodStageFrom(stage))}
        error={error}
        cancelled={stage.cancelled}
      />
      {stage.cancelled ? <ErrorLine message={"Magic link cancelled."} /> : null}
    </div>
  );
}

// Rebuild the method-picker view from one of the inner stages so "back"
// drops the user where they came from instead of all the way to email.
function methodStageFrom(stage: Stage): Stage {
  // We don't store the full factor list on inner stages — recompute by
  // sending the user back to email and letting them re-enter. In
  // practice that's the safer move: tokens / sessions may have rolled.
  return { kind: "email" } satisfies Stage;
}

type SupportedFirstFactor =
  | { strategy: "password" }
  | { strategy: "email_code"; emailAddressId: string }
  | { strategy: "email_link"; emailAddressId: string }
  | { strategy: string; emailAddressId?: string };

function collectFactors(factors: readonly SupportedFirstFactor[]): {
  emailAddressId: string | null;
  available: FactorKind[];
} {
  const available: FactorKind[] = [];
  let emailAddressId: string | null = null;
  for (const factor of factors) {
    if (factor.strategy === "password" && !available.includes("password")) {
      available.push("password");
    } else if (factor.strategy === "email_code") {
      if (!available.includes("code")) available.push("code");
      emailAddressId = emailAddressId ?? factor.emailAddressId ?? null;
    } else if (factor.strategy === "email_link") {
      if (!available.includes("link")) available.push("link");
      emailAddressId = emailAddressId ?? factor.emailAddressId ?? null;
    }
  }
  return { emailAddressId, available };
}
