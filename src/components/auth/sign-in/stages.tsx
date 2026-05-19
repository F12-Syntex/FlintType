"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { KeyRound, Link2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { BackLink, ErrorLine, Field } from "./shared";

/** Each stage is a pure presentational component — the orchestrator in
 *  `./index` owns the state and async work. Stages receive what they
 *  need to render and call back into the orchestrator on submit. */

export type FactorKind = "password" | "code" | "link";

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
        value={email}
        onChange={onEmailChange}
        required
        autoFocus
      />
      {error ? <ErrorLine message={error} /> : null}
      <Button
        type="submit"
        variant="default"
        size="default"
        disabled={busy}
        className="w-full"
      >
        {busy ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

export function MethodStage({
  email,
  available,
  onPick,
  onBack,
  busy,
  busyKind,
}: {
  email: string;
  available: FactorKind[];
  onPick: (kind: FactorKind) => void;
  onBack: () => void;
  busy: boolean;
  busyKind: FactorKind | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Signing in as{" "}
        <span className="text-foreground">{email}</span>. Pick how you want
        to verify.
      </p>
      <div className="flex flex-col gap-2">
        {available.includes("password") ? (
          <MethodButton
            icon={<Lock size={16} aria-hidden />}
            title="Use your password"
            subtitle="Sign in the usual way."
            onClick={() => onPick("password")}
            disabled={busy}
            busy={busyKind === "password"}
          />
        ) : null}
        {available.includes("code") ? (
          <MethodButton
            icon={<KeyRound size={16} aria-hidden />}
            title="Email me a code"
            subtitle="6-digit code, no password needed."
            onClick={() => onPick("code")}
            disabled={busy}
            busy={busyKind === "code"}
          />
        ) : null}
        {available.includes("link") ? (
          <MethodButton
            icon={<Link2 size={16} aria-hidden />}
            title="Email me a sign-in link"
            subtitle="Tap the link from your inbox."
            onClick={() => onPick("link")}
            disabled={busy}
            busy={busyKind === "link"}
          />
        ) : null}
      </div>
      <BackLink onClick={onBack}>Use a different email</BackLink>
    </div>
  );
}

function MethodButton({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/30 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {busy ? "Sending…" : title}
        </span>
        <span className="text-[12px] text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function PasswordStage({
  email,
  password,
  onPasswordChange,
  onSubmit,
  onBack,
  busy,
  error,
}: {
  email: string;
  password: string;
  onPasswordChange: (next: string) => void;
  onSubmit: () => void;
  onBack: () => void;
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
      <p className="text-sm leading-relaxed text-muted-foreground">
        Enter the password for{" "}
        <span className="text-foreground">{email}</span>.
      </p>
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={onPasswordChange}
        required
        autoFocus
      />
      {error ? <ErrorLine message={error} /> : null}
      <Button
        type="submit"
        variant="default"
        size="default"
        disabled={busy}
        className="w-full"
      >
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <BackLink onClick={onBack}>Choose a different method</BackLink>
    </form>
  );
}

export function CodeStage({
  email,
  code,
  onCodeChange,
  onSubmit,
  onResend,
  onBack,
  busy,
  resending,
  resentAt,
  error,
}: {
  email: string;
  code: string;
  onCodeChange: (next: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
  busy: boolean;
  resending: boolean;
  resentAt: number | null;
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
      <p className="text-sm leading-relaxed text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="text-foreground">{email}</span>.
      </p>
      <div className="flex flex-col items-center gap-3">
        <label
          htmlFor="sign-in-code"
          className="sr-only"
        >
          Verification code
        </label>
        <InputOTP
          id="sign-in-code"
          maxLength={6}
          value={code}
          onChange={onCodeChange}
          onComplete={onSubmit}
          autoFocus
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Verification code"
        >
          <InputOTPGroup className="gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="size-10 rounded-md border font-mono text-base sm:size-12 sm:text-lg"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error ? <ErrorLine message={error} /> : null}
      <Button
        type="submit"
        variant="default"
        size="default"
        disabled={busy}
        className="w-full"
      >
        {busy ? "Verifying…" : "Sign in"}
      </Button>
      <div className="flex items-center justify-between gap-3">
        <BackLink onClick={onBack}>Choose a different method</BackLink>
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending ? "Resending…" : resentAt ? "Sent" : "Resend code"}
        </button>
      </div>
    </form>
  );
}

export function LinkStage({
  email,
  onBack,
  error,
  cancelled,
}: {
  email: string;
  onBack: () => void;
  error: string | null;
  cancelled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        We sent a sign-in link to{" "}
        <span className="text-foreground">{email}</span>. Open it on this
        device and you'll be signed in automatically.
      </p>
      <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-[12px] text-muted-foreground">
        <span
          aria-hidden
          className="size-2 animate-pulse rounded-full bg-primary"
        />
        {cancelled
          ? "Cancelled — pick another method below."
          : "Waiting for you to tap the link…"}
      </div>
      {error ? <ErrorLine message={error} /> : null}
      <BackLink onClick={onBack}>Choose a different method</BackLink>
    </div>
  );
}
