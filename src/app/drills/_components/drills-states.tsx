"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LoadError } from "./use-drills";

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

const DASHED =
  "rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8";

export function EmptyFilterState({ onReset }: { onReset: () => void }) {
  return (
    <div className={cn(DASHED, "flex flex-col items-start gap-4 sm:items-center sm:text-center")}>
      <p className="text-sm text-muted-foreground">
        No drills match that filter yet.
      </p>
      <Button variant="outline" onClick={onReset}>
        Show all drills
      </Button>
    </div>
  );
}

const LIST = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** Every tailored drill still locked (a new account): one compact row
 *  naming them, instead of a column of dashed cards ahead of the drills
 *  the user can actually start. */
export function LockedSummary({ titles }: { titles: readonly string[] }) {
  const n = titles.length;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-muted text-muted-foreground [&_svg]:size-4">
          <Lock aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">
            {n === 1 ? "1 drill unlocks" : `${n} drills unlock`} as you practise
          </p>
          <p className="text-sm text-muted-foreground">
            {LIST.format(titles)} {n === 1 ? "needs" : "need"} a few practice
            tests first.
          </p>
        </div>
      </div>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "outline" }), "h-11 shrink-0 sm:h-9")}
      >
        Go practise
      </Link>
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
  const title = error.signIn
    ? "Sign in to see your drills."
    : "Couldn't load your drills.";
  return (
    <div className={cn(DASHED, "flex flex-col items-start gap-4 sm:items-center sm:text-center")}>
      <div className="flex flex-col gap-1.5 sm:items-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground" role="alert">
          {error.signIn
            ? "Drills are built from your typing history, so they need an account."
            : error.message}
        </p>
      </div>
      {error.signIn ? (
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      ) : (
        <Button size="lg" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
