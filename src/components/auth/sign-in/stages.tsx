"use client";

import { KeyRound, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AuthStep } from "../auth-step";
import { Field, PasswordField } from "../fields";
import { ErrorLine, UtilityButton, UtilityRow } from "../form-controls";
import type { FactorKind } from "./factors";

/** The first sign-in stages: email, password, and the method picker for
 *  accounts without a password. Pure presentation; the orchestrator in
 *  `./index` owns the state and the Clerk calls. */

const WELCOME = "Welcome back";
const WELCOME_LINE = "Sign in to pick up your history, drills and personal bests.";

export function EmailStage({
  email,
  onEmailChange,
  onSubmit,
  busy,
  error,
  before,
}: {
  email: string;
  onEmailChange: (next: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
  /** The Discord shortcut and the "or" divider, above the form. */
  before?: ReactNode;
}) {
  return (
    <AuthStep title={WELCOME} description={WELCOME_LINE}>
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
            autoFocus
          />
          {error ? <ErrorLine message={error} /> : null}
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "Checking…" : "Continue"}
          </Button>
        </form>
      </div>
    </AuthStep>
  );
}

/** The entered email on every later stage, with a way back: a quiet
 *  inset block, "Signing in as" and a Change button on top, the email
 *  on its own full-width line so a long address rarely has to wrap. */
export function SigningInAs({
  email,
  onChange,
  disabled,
}: {
  email: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/60 pt-1.5 pr-1.5 pb-3 pl-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Signing in as</span>
        <UtilityButton onClick={onChange} disabled={disabled}>
          Change
        </UtilityButton>
      </div>
      <p className="-mt-1 pr-2.5 text-sm font-medium text-foreground wrap-anywhere">
        {email}
      </p>
    </div>
  );
}

export function PasswordStage({
  email,
  password,
  onPasswordChange,
  onSubmit,
  onChangeEmail,
  onForgot,
  alternative,
  busy,
  error,
}: {
  email: string;
  password: string;
  onPasswordChange: (next: string) => void;
  onSubmit: () => void;
  onChangeEmail: () => void;
  onForgot: () => void;
  /** The passwordless way in this account also supports, if any. */
  alternative: { label: string; onClick: () => void } | null;
  busy: "password" | "forgot" | "send" | null;
  error: string | null;
}) {
  const anyBusy = busy != null;
  return (
    <AuthStep title={WELCOME} description={WELCOME_LINE}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <SigningInAs email={email} onChange={onChangeEmail} disabled={anyBusy} />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={onPasswordChange}
          required
          autoFocus
        />
        {error ? <ErrorLine message={error} /> : null}
        <Button type="submit" size="lg" disabled={anyBusy} className="w-full">
          {busy === "password" ? "Signing in…" : "Sign in"}
        </Button>
        <UtilityRow>
          {alternative ? (
            <UtilityButton onClick={alternative.onClick} disabled={anyBusy}>
              {busy === "send" ? "Sending…" : alternative.label}
            </UtilityButton>
          ) : (
            <span />
          )}
          <UtilityButton onClick={onForgot} disabled={anyBusy}>
            {busy === "forgot" ? "Sending…" : "Forgot password?"}
          </UtilityButton>
        </UtilityRow>
      </form>
    </AuthStep>
  );
}

export function MethodStage({
  email,
  available,
  onPick,
  onChangeEmail,
  busyKind,
  error,
}: {
  email: string;
  available: FactorKind[];
  onPick: (kind: FactorKind) => void;
  onChangeEmail: () => void;
  busyKind: FactorKind | null;
  error: string | null;
}) {
  const busy = busyKind != null;
  return (
    <AuthStep
      title={WELCOME}
      description="This account has no password. We'll email you a way in."
    >
      <div className="flex flex-col gap-4">
        <SigningInAs email={email} onChange={onChangeEmail} disabled={busy} />
        <div className="flex flex-col gap-2">
          {available.includes("code") ? (
            <MethodButton
              icon={<KeyRound aria-hidden />}
              label={busyKind === "code" ? "Sending…" : "Email me a code"}
              onClick={() => onPick("code")}
              disabled={busy}
            />
          ) : null}
          {available.includes("link") ? (
            <MethodButton
              icon={<Link2 aria-hidden />}
              label="Email me a sign-in link"
              onClick={() => onPick("link")}
              disabled={busy}
            />
          ) : null}
        </div>
        {error ? <ErrorLine message={error} /> : null}
      </div>
    </AuthStep>
  );
}

/** One "choose one" row: icon and label. The whole row is the button. */
function MethodButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className="w-full justify-start gap-3 px-5 text-foreground"
    >
      {icon}
      {label}
    </Button>
  );
}
