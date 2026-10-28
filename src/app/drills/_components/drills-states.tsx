"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export type LoadError = { message: string; signIn: boolean };

/** Neutral status for the header: a count, not a call to action. */
export function ReadyCount({ ready, locked }: { ready: number; locked: number }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-pill border border-border bg-card px-3 text-xs font-medium text-muted-foreground tabular-nums">
      <span>
        <span className="text-foreground">{ready}</span> ready
      </span>
      {locked > 0 ? (
        <>
          <span aria-hidden>·</span>
          <span>{locked} locked</span>
        </>
      ) : null}
    </span>
  );
}

export function EmptyFilterState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 sm:items-center sm:text-center">
      <p className="text-sm text-muted-foreground">
        No drills match that filter yet.
      </p>
      <Button variant="outline" onClick={onReset}>
        Show all drills
      </Button>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: LoadError;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 sm:items-center sm:text-center">
      <p className="text-sm text-muted-foreground" role="alert">
        {error.message}
      </p>
      {error.signIn ? (
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      ) : (
        <Button variant="outline" size="lg" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
