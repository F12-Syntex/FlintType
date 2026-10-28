"use client";

// /legacy path — the stable resource-based hook with create() /
// attemptFirstFactor() / authenticateWithRedirect() /
// createEmailLinkFlow(). The default @clerk/nextjs export now points at
// the experimental "signals" API, which doesn't expose the methods this
// custom flow is driven from.
import { useSignIn } from "@clerk/nextjs/legacy";
import { useState } from "react";
import { extractClerkError } from "../clerk-error";
import { OrDivider } from "../form-controls";
import { DiscordButton } from "../oauth-buttons";
import { CodeFlow } from "./code-flow";
import { collectFactors, type FactorKind } from "./factors";
import { LinkStage, useEmailLinkFlow } from "./link-flow";
import { ResetFlow } from "./reset-flow";
import { EmailStage, MethodStage, PasswordStage } from "./stages";
import { useFinishSignIn } from "./use-finish-sign-in";

type Factors = { emailAddressId: string | null; available: FactorKind[] };

type Stage =
  | { kind: "email" }
  | ({ kind: "password" } & Factors)
  | ({ kind: "method" } & Factors)
  | { kind: "code"; emailAddressId: string; from: Stage }
  | { kind: "link"; emailAddressId: string; from: Stage }
  | { kind: "reset" };

/** Custom sign-in form — Clerk hooks under the hood, our design on top.
 *  Discord shortcut first, then an email-first funnel:
 *
 *    1. email     →  signIn.create({ identifier }) and read
 *                    supportedFirstFactors
 *    2. password  →  straight here when the account has a password, with
 *                    "Email me a code instead" and "Forgot password?"
 *                    (the reset lives in ./reset-flow)
 *       method    →  only for passwordless accounts: code or magic link
 *    3. code      →  ./code-flow (prepareFirstFactor already sent it)
 *       link      →  ./link-flow polls until the emailed link is opened
 *
 *  Errors render inline (Clerk's longMessage is already human-readable). */
export function SignInForm() {
  const { signIn, isLoaded } = useSignIn();
  const finish = useFinishSignIn();
  const link = useEmailLinkFlow();
  const [stage, setStage] = useState<Stage>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<
    "email" | "discord" | "password" | "forgot" | "send" | null
  >(null);
  const [sendingKind, setSendingKind] = useState<FactorKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  function goTo(next: Stage) {
    link.cancel();
    setError(null);
    setBusy(null);
    setSendingKind(null);
    setStage(next);
  }
  const changeEmail = () => goTo({ kind: "email" });

  async function submitEmail() {
    if (!isLoaded || busy) return;
    setBusy("email");
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email.trim() });
      if (await finish(attempt)) return;
      const factors = collectFactors(attempt.supportedFirstFactors ?? []);
      if (factors.available.length === 0) {
        setError("No sign-in methods are available for this email. Try another account.");
        return;
      }
      setPassword("");
      setStage({
        kind: factors.available.includes("password") ? "password" : "method",
        ...factors,
      });
    } catch (err) {
      setError(extractClerkError(err) ?? "Couldn't continue. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function submitPassword() {
    if (!isLoaded || busy) return;
    setBusy("password");
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({ strategy: "password", password });
      if (!(await finish(attempt))) {
        setError("This account needs another check. Try emailing yourself a code.");
      }
    } catch (err) {
      setError(extractClerkError(err) ?? "Sign in failed.");
    } finally {
      setBusy(null);
    }
  }

  /** Send a code or a magic link; `from` is where "back" returns to. */
  async function sendVia(kind: "code" | "link", from: Stage & Factors) {
    if (!isLoaded || busy) return;
    const { emailAddressId } = from;
    if (!emailAddressId) {
      setError("Couldn't find your email on this account.");
      return;
    }
    if (kind === "link") {
      goTo({ kind: "link", emailAddressId, from });
      void link.start(emailAddressId);
      return;
    }
    setBusy("send");
    setSendingKind("code");
    setError(null);
    try {
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId });
      goTo({ kind: "code", emailAddressId, from });
    } catch (err) {
      setError(extractClerkError(err) ?? "Couldn't send the email. Try again.");
      setBusy(null);
      setSendingKind(null);
    }
  }

  // Creating a reset sign-in both starts the flow and emails the code.
  async function forgotPassword() {
    if (!isLoaded || busy) return;
    setBusy("forgot");
    setError(null);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      goTo({ kind: "reset" });
    } catch (err) {
      setError(extractClerkError(err) ?? "Couldn't start a password reset.");
      setBusy(null);
    }
  }

  async function signInWithDiscord() {
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
      setError(extractClerkError(err) ?? "Discord sign-in failed.");
      setBusy(null);
    }
  }

  switch (stage.kind) {
    case "email":
      return (
        <EmailStage
          email={email}
          onEmailChange={setEmail}
          onSubmit={submitEmail}
          busy={busy === "email"}
          error={error}
          before={
            <>
              <DiscordButton onStart={signInWithDiscord} disabled={busy != null} />
              <OrDivider label="or use your email" />
            </>
          }
        />
      );
    case "password": {
      const alt = stage.available.includes("code")
        ? { kind: "code" as const, label: "Email me a code instead" }
        : stage.available.includes("link")
          ? { kind: "link" as const, label: "Email me a link instead" }
          : null;
      return (
        <PasswordStage
          email={email}
          password={password}
          onPasswordChange={setPassword}
          onSubmit={submitPassword}
          onChangeEmail={changeEmail}
          onForgot={forgotPassword}
          alternative={
            alt ? { label: alt.label, onClick: () => void sendVia(alt.kind, stage) } : null
          }
          busy={busy === "password" || busy === "forgot" || busy === "send" ? busy : null}
          error={error}
        />
      );
    }
    case "method":
      return (
        <MethodStage
          email={email}
          available={stage.available}
          onPick={(kind) => {
            if (kind === "code" || kind === "link") void sendVia(kind, stage);
          }}
          onChangeEmail={changeEmail}
          busyKind={sendingKind}
          error={error}
        />
      );
    case "code":
      return (
        <CodeFlow
          email={email}
          emailAddressId={stage.emailAddressId}
          onChangeEmail={changeEmail}
          onBack={() => goTo(stage.from)}
          backLabel={stage.from.kind === "password" ? "Use my password" : "Try another way"}
        />
      );
    case "link":
      return (
        <LinkStage
          email={email}
          status={link.status}
          onChangeEmail={changeEmail}
          onBack={() => goTo(stage.from)}
        />
      );
    case "reset":
      return <ResetFlow email={email} onCancel={changeEmail} />;
  }
}
