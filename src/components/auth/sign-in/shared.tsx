"use client";

import { Input } from "@/components/ui/input";

/** Shared form primitives used across every sign-in stage. Kept
 *  private to the folder — outside callers reach for the orchestrator
 *  in `./index`, not these. */

export function Field({
  label,
  type,
  autoComplete,
  inputMode,
  value,
  onChange,
  required,
  hint,
  mono,
  autoFocus,
}: {
  label: string;
  type: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email";
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  hint?: string;
  mono?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <Input
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        className={mono ? "font-mono tracking-[0.2em]" : undefined}
      />
      {hint ? (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ErrorLine({ message }: { message: string }) {
  return (
    <p className="text-sm text-primary" role="alert">
      {message}
    </p>
  );
}

export function BackLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** Pulls the most user-readable message out of a Clerk APIResponseError. */
export function extractError(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown }).errors)
  ) {
    const first = (err as { errors: { longMessage?: string; message?: string }[] })
      .errors[0];
    return first?.longMessage ?? first?.message ?? null;
  }
  if (err instanceof Error) return err.message;
  return null;
}
