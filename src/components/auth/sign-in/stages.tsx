"use client";

import { ChevronRight, KeyRound, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "../fields";
import { ErrorLine, UtilityButton, UtilityRow } from "../form-controls";
import type { FactorKind } from "./factors";

/** The first sign-in stages: email, password, and the method picker for
 *  accounts without a password. Pure presentation; the orchestrator in
 *  `./index` owns the state and the Clerk calls. */

export function EmailStage({
  email,
  onEmailChange,
  onSubmit,
  busy,
  error,
}: {
  email: string;
  onEmailChange: (next: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
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
  );
}

/** "Signing in as you@example.com · Change" — the one line that keeps
 *  the entered email visible on every later stage, with a way back. */
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
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
      <span>
        Signing in as{" "}
        <span className="font-medium break-all text-foreground">{email}</span>
      </span>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="rounded-pill font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
      >
        Change
      </button>
    </p>
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
    <div className="flex flex-col gap-4">
      <SigningInAs email={email} onChange={onChangeEmail} disabled={busy} />
      <p className="text-sm text-muted-foreground">
        This account has no password. Choose how we should send you in.
      </p>
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
  );
}

/** One "choose one" row: icon, label, chevron. */
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
      className="w-full justify-between px-5"
    >
      <span className="flex items-center gap-3 text-foreground">
        {icon}
        {label}
      </span>
      <ChevronRight aria-hidden className="text-muted-foreground" />
    </Button>
  );
}
