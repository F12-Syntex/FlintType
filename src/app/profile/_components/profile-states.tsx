import Link from "next/link";
import { Surface } from "@/components/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";

/** Loading placeholders shaped like the sections below the hero, so the
 *  page doesn't jump when the history snapshot lands. */
export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile" className="flex flex-col gap-10 sm:gap-12">
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
      <Surface className={`${bodyClass} animate-pulse bg-muted/40`}>
        <span className="sr-only">Loading…</span>
      </Surface>
    </div>
  );
}

export type ProfileLoadError =
  | { kind: "signIn"; message: string }
  | { kind: "notFound"; message: string }
  | { kind: "other"; message: string; detail?: string };

/** Load failure under the hero: says what happened and offers the one
 *  useful next step (sign in, or try again). */
export function ProfileErrorState({
  error,
  onRetry,
}: {
  error: ProfileLoadError;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 sm:items-center sm:text-center">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground" role="alert">
          {error.message}
        </p>
        {error.kind === "other" && error.detail ? (
          <p className="text-xs text-muted-foreground">{error.detail}</p>
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
export function ProfileNotFound({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-12 sm:items-center sm:text-center">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Profile not found
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
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
