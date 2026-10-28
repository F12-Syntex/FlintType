"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DrillHeader } from "./drill-header";
import type { DrillSpec } from "./drills-data";

export type LoadError = { message: string; signIn: boolean };

/** Header + passage-shaped bones, so the real runner lands without the
 *  title or the typing area jumping. */
export function RunnerSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading drill"
      className="flex min-h-0 flex-1 flex-col motion-safe:animate-pulse"
    >
      <div className="flex items-center gap-2 pt-3 sm:gap-3 sm:pt-5">
        <span className="size-11 rounded-pill bg-muted sm:h-9 sm:w-24" />
        <span className="h-6 w-px bg-border" />
        <div className="flex flex-col gap-1.5">
          <span className="h-3 w-20 rounded-full bg-muted/70" />
          <span className="h-5 w-44 rounded-full bg-muted" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 py-12">
        {[100, 92, 96].map((w) => (
          <span
            key={w}
            className="h-6 rounded-full bg-muted/70 sm:h-8"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Centred message block under the header, used by the error, 404 and
 *  locked states. */
function Notice({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="text-xs font-medium text-muted-foreground">{eyebrow}</span>
      <h2 className="max-w-xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {children}
      <div className="flex flex-wrap justify-center gap-2 pt-2">{action}</div>
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
    <>
      <DrillHeader
        title="Drill"
        subtitle={error.signIn ? "Signed out" : "Couldn't load"}
      />
      <Notice
        eyebrow={error.signIn ? "Account needed" : "Error"}
        title={
          error.signIn
            ? "Sign in to start this drill."
            : "Couldn't load this drill."
        }
        action={
          error.signIn ? (
            <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
              Sign in
            </Link>
          ) : (
            <Button size="lg" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      >
        <p className="max-w-md text-sm text-muted-foreground" role="alert">
          {error.signIn
            ? "Drills are built from your typing history, so they need an account."
            : error.message}
        </p>
      </Notice>
    </>
  );
}

export function NotFound({ id }: { id: string }) {
  return (
    <>
      <DrillHeader title="Drill not found" subtitle="Unknown drill" />
      <Notice
        eyebrow="404"
        title={`No drill called “${id}”.`}
        action={
          <Link href="/drills" className={buttonVariants({ size: "lg" })}>
            See all drills
          </Link>
        }
      >
        <p className="max-w-md text-sm text-muted-foreground">
          The link may be out of date. Pick a drill from the drills page.
        </p>
      </Notice>
    </>
  );
}

export function Locked({ drill }: { drill: DrillSpec }) {
  return (
    <>
      <DrillHeader title={drill.title} subtitle={drill.contextLabel} />
      <Notice
        eyebrow="Locked"
        title="Needs more of your typing first."
        action={
          <>
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              Go practise
            </Link>
            <Link
              href="/drills"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Other drills
            </Link>
          </>
        }
      >
        <p className="max-w-md text-sm text-balance text-muted-foreground">
          {drill.summary} A few practice tests usually do it.
        </p>
      </Notice>
    </>
  );
}
