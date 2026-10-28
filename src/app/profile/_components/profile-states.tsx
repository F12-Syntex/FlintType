import Link from "next/link";
import { Surface } from "@/components/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileLoadError } from "./profile-load-error";

/** Loading placeholders shaped like the sections below the hero, so the
 *  page doesn't jump when the history snapshot lands. */
export function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading profile"
      className="flex flex-col gap-10 sm:gap-12"
    >
      <SkeletonSection bodyClass="h-40" />
      <SkeletonSection bodyClass="h-72" />
      <SkeletonSection bodyClass="h-64" />
    </div>
  );
}

function SkeletonSection({ bodyClass }: { bodyClass: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="h-5 w-40 animate-pulse rounded-full bg-muted" />
        <span className="h-4 w-64 max-w-full animate-pulse rounded-full bg-muted/70" />
      </div>
      <Surface className={cn(bodyClass, "animate-pulse bg-muted/40")}>
        <span className="sr-only">Loading…</span>
      </Surface>
    </div>
  );
}

const COPY: Record<
  Exclude<ProfileLoadError["kind"], "notFound">,
  { title: string; body: string }
> = {
  signIn: {
    title: "Sign in to see your profile",
    body: "Your tests, bests and streak live with your account.",
  },
  rateLimited: {
    title: "Too many requests",
    body: "Wait a moment, then try again.",
  },
  other: {
    title: "Couldn't load this profile",
    body: "Something went wrong on our side. Try again in a moment.",
  },
};

/** Load failure: says what happened in plain words and offers the one
 *  useful next step (sign in, or try again). Never shows a raw server
 *  message, only a quiet error code. With `asPage` (a visitor's failed
 *  load, where there's no real identity to show a hero for) the title
 *  is the page's h1. */
export function ProfileErrorState({
  error,
  onRetry,
  asPage = false,
}: {
  error: Exclude<ProfileLoadError, { kind: "notFound" }>;
  onRetry: () => void;
  asPage?: boolean;
}) {
  const copy = COPY[error.kind];
  const code =
    error.kind === "other"
      ? error.code
      : error.kind === "rateLimited"
        ? "RATE_LIMITED"
        : null;
  const Title = asPage ? "h1" : "p";
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 sm:items-center sm:px-6 sm:text-center",
        asPage ? "py-12" : "py-8",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Title
          className={cn(
            "font-semibold tracking-tight text-foreground",
            asPage ? "text-2xl font-bold" : "text-base",
          )}
        >
          {copy.title}
        </Title>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        {code ? (
          <p className="text-xs text-muted-foreground/80">
            Error code: <span className="font-mono">{code}</span>
          </p>
        ) : null}
      </div>
      {error.kind === "signIn" ? (
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

/** No such user: the page's h1 lives here since there's no hero. */
export function ProfileNotFound({ username }: { username?: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-12 sm:items-center sm:px-6 sm:text-center">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Profile not found
        </h1>
        <p className="text-sm text-muted-foreground wrap-anywhere">
          {username
            ? `There's no flinttype profile for @${username}.`
            : "There's no flinttype profile here."}
        </p>
      </div>
      <Link
        href="/leaderboard"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Browse the leaderboard
      </Link>
    </div>
  );
}
