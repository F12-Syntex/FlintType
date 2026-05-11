"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileTotals } from "./derive-stats";

/** Profile hero. Avatar + name lockup on the left, settings on the
 *  right. Sizes follow ui-law §4 page-title scale (text-3xl /
 *  text-5xl / text-6xl) so it reads as the page anchor.
 *
 *  `username` is the canonical handle from the URL; display name and
 *  avatar still come from the signed-in Clerk session. */
export function ProfileHero({
  totals,
  username,
}: {
  totals: ProfileTotals;
  username?: string;
}) {
  const { user, isLoaded } = useUser();
  const displayName = !isLoaded
    ? "—"
    : (user?.firstName ??
        user?.username ??
        username ??
        user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
        "Anonymous");
  const handle =
    username ?? user?.username ?? user?.id?.slice(0, 8) ?? "you";
  const initial = (displayName.charAt(0) || "·").toUpperCase();
  const joined =
    user?.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        })
      : null;

  return (
    <header className="border-b border-border px-5 py-12 sm:px-12 sm:py-14 lg:px-16">
      <div className="mb-6 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <Tag>Public profile</Tag>
      </div>

      <div className="grid gap-8 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-8">
        <Avatar
          imageUrl={user?.imageUrl ?? null}
          initial={initial}
          isLoaded={isLoaded}
        />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {displayName}
          </h1>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="text-foreground">@{handle}</span>
            {joined ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>Member since {joined}</span>
              </>
            ) : null}
          </div>
          <LevelBadge totals={totals} />
        </div>

        <div className="flex items-start sm:items-end">
          <Link href="/app/customise" className="contents">
            <Button variant="outline" size="sm">
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Avatar({
  imageUrl,
  initial,
  isLoaded,
}: {
  imageUrl: string | null;
  initial: string;
  isLoaded: boolean;
}) {
  if (!isLoaded) {
    return (
      <span
        aria-hidden
        className="size-20 animate-pulse rounded-md border border-border bg-foreground/[0.04] sm:size-24"
      />
    );
  }
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="size-20 shrink-0 rounded-md border border-border object-cover sm:size-24"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-20 shrink-0 items-center justify-center rounded-md border border-border bg-card text-3xl font-bold tracking-tight text-primary sm:size-24 sm:text-4xl"
    >
      {initial}
    </span>
  );
}

function LevelBadge({ totals }: { totals: ProfileTotals }) {
  const pct = Math.round(totals.levelProgress * 100);
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Level
        </span>
        <span className="text-[22px] font-semibold tabular-nums leading-none text-primary">
          {totals.level}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-foreground tabular-nums">{pct}%</span> to next
        </span>
      </div>
      <span
        aria-hidden
        className="relative inline-block h-1 w-full max-w-xs overflow-hidden rounded-full bg-foreground/[0.08]"
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 origin-left rounded-full bg-primary",
          )}
          style={{
            transform: `scaleX(${totals.levelProgress})`,
            width: "100%",
          }}
        />
      </span>
    </div>
  );
}
