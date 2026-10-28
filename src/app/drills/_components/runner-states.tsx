"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DrillHeader } from "./drill-header";
import type { DrillSpec } from "./drills-data";
import type { LoadError } from "./use-drills";

/** The runner's fallback message when a load fails without a message. */
const GENERIC_ERROR = "Couldn't load this drill.";

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

/** Centred message under the header: a title, one plain line, actions.
 *  `level="h1"` when the header has no title of its own (error, 404),
 *  so every runner screen still has exactly one h1. */
function Notice({
  title,
  level = "h2",
  children,
  action,
}: {
  title: string;
  level?: "h1" | "h2";
  children?: ReactNode;
  action: ReactNode;
}) {
  const Heading = level;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
      <Heading className="max-w-xl text-2xl font-bold tracking-tight text-balance wrap-anywhere text-foreground sm:text-3xl">
        {title}
      </Heading>
      {children}
      <div className="flex flex-wrap justify-center gap-2 pt-2">{action}</div>
    </div>
  );
}

const lead = "max-w-md text-sm text-balance text-muted-foreground";

export function ErrorState({
  error,
  onRetry,
}: {
  error: LoadError;
  onRetry: () => void;
}) {
  return (
    <>
      <DrillHeader />
      {error.signIn ? (
        <Notice
          level="h1"
          title="Sign in to start this drill."
          action={
            <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
              Sign in
            </Link>
          }
        >
          <p className={lead}>
            Drills are built from your typing history, so they need an account.
          </p>
        </Notice>
      ) : (
        <Notice
          level="h1"
          title={GENERIC_ERROR}
          action={
            <Button size="lg" onClick={onRetry}>
              Try again
            </Button>
          }
        >
          {error.message && error.message !== GENERIC_ERROR ? (
            <p className={lead} role="alert">
              {error.message}
            </p>
          ) : null}
        </Notice>
      )}
    </>
  );
}

/** Long or junk ids are echoed short so the title never runs off a
 *  phone screen. */
function shortId(id: string): string {
  return id.length > 40 ? `${id.slice(0, 39)}…` : id;
}

export function NotFound({ id }: { id: string }) {
  return (
    <>
      <DrillHeader />
      <Notice
        level="h1"
        title={`No drill called “${shortId(id)}”.`}
        action={
          <Link href="/drills" className={buttonVariants({ size: "lg" })}>
            See all drills
          </Link>
        }
      >
        <p className={lead}>The link may be out of date.</p>
      </Notice>
    </>
  );
}

export function Locked({ drill }: { drill: DrillSpec }) {
  return (
    <>
      <DrillHeader title={drill.title} subtitle={drill.contextLabel} />
      <Notice
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
        <p className={lead}>{drill.summary} A few practice tests usually do it.</p>
      </Notice>
    </>
  );
}
