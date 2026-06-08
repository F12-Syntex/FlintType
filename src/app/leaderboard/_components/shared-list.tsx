"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";

/** Shared shell + row primitives for every leaderboard view
 *  (recent-runs table, top-players list, top-by-level list). Owning
 *  the shape in one file is what keeps the three views reading as
 *  siblings — each view supplies its own header copy + per-row
 *  metric mapping, but the visual chrome (page header, ranked-list
 *  card, row layout) is identical.
 *
 *  Don't fork. If a new leaderboard view needs a different shape,
 *  amend this file rather than spawning a parallel renderer. */

export function LeaderboardWrapper({
  title,
  blurb,
  actions,
  loading,
  empty,
  error,
  children,
}: {
  title: string;
  blurb: ReactNode;
  /** Optional right-aligned action cluster (refresh, save image).
   *  Marked `data-no-export="true"` by callers so the screenshot
   *  helper filters them out. */
  actions?: ReactNode;
  loading: boolean;
  empty: boolean | undefined;
  error: string | null;
  children: ReactNode;
}) {
  // lg:pt-0 makes the header card's top edge sit flush with the
  // sidebar's top edge — both columns share the grid's lg:py-3 inset,
  // so dropping the article's own top padding at lg lines the two up.
  // Mobile keeps its breathing room under the sticky header strip.
  return (
    <article className="flex w-full flex-col px-5 pt-8 pb-16 sm:px-12 sm:pt-10 sm:pb-20 lg:px-16 lg:pt-0">
      <header className="rounded-md border border-border bg-card px-6 py-7 sm:px-10 sm:py-10">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-7 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Leaderboard
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px] lg:text-[52px]">
              {title}
            </h1>
            <p className="max-w-[55ch] text-sm leading-relaxed text-muted-foreground">
              {blurb}
            </p>
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-end sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </header>

      <section className="mt-6 overflow-hidden rounded-md border border-border bg-card">
        {error ? (
          <p className="p-6 text-sm text-muted-foreground">{error}</p>
        ) : loading ? (
          <ul className="flex flex-col">
            {Array.from({ length: 8 }, (_, i) => (
              <li
                key={i}
                className="h-14 border-b border-border/50 last:border-b-0 animate-pulse bg-muted/20"
              />
            ))}
          </ul>
        ) : empty ? (
          <p className="p-6 text-sm text-muted-foreground">
            No completed runs yet.
          </p>
        ) : (
          children
        )}
      </section>
    </article>
  );
}

export function LeaderboardRow({
  href,
  rank,
  username,
  name,
  tags,
  isYou,
  headline,
  headlineSuffix,
  badge,
  hint,
}: {
  href: string;
  rank: number;
  /** Raw Clerk username (no `@`). When present, we render
   *  `@<username>` to match the per-run leaderboard's display rule
   *  across every view. */
  username: string | null;
  /** Fallback display name from Clerk — already `@`-prefixed by the
   *  backend, so it renders as-is when no username is set. */
  name: string;
  tags: readonly UserTagId[];
  isYou: boolean;
  /** Headline metric (right-aligned, large). Per-run: net-WPM number.
   *  Top players: peak net-WPM number. Top by level: "L<n>". */
  headline: string;
  /** Small suffix next to the headline (e.g. "wpm"). Empty string
   *  renders nothing. */
  headlineSuffix: string;
  /** Small badge sitting before the hint (mode chip, tier label,
   *  XP total). Empty string renders nothing. */
  badge: string;
  /** Secondary metadata line (raw + acc, runs count, …). */
  hint: string;
}) {
  const handle = username ? `@${username}` : name;
  const leader = rank === 1;
  return (
    <li
      className={cn(
        "border-b border-border/50 last:border-b-0",
        isYou && "bg-primary/[0.05]",
      )}
    >
      <Link
        href={href}
        className={cn(
          "flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4",
          "transition-colors hover:bg-accent",
        )}
      >
        <span
          className={cn(
            "w-8 shrink-0 text-[12px] font-semibold tabular-nums sm:text-[13px]",
            leader ? "text-primary" : "text-muted-foreground",
          )}
        >
          {String(rank).padStart(2, "0")}
        </span>
        {/* Handle stacks above its tags on mobile, inline from sm+. Wide
            tags (WHITE HAT + OG) previously starved the truncating handle
            to zero width on a 375px row, dropping the @handle entirely
            (§10.2 — stack on mobile, inline on sm+). */}
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span
            className={cn(
              "min-w-0 max-w-full truncate text-[14px] sm:text-[15px]",
              isYou
                ? "font-semibold text-primary"
                : leader
                  ? "font-semibold text-foreground"
                  : "text-foreground/90",
            )}
          >
            {handle}
          </span>
          {tags.length > 0 || isYou ? (
            <span className="flex shrink-0 items-center gap-2">
              {tags.map((t) => (
                <UserTag key={t} tag={t} size="sm" className="shrink-0" />
              ))}
              {isYou ? (
                <span
                  aria-label="Your entry"
                  className="inline-flex h-5 shrink-0 items-center rounded-md border border-primary/40 bg-primary/[0.08] px-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-primary"
                >
                  You
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
        {badge ? (
          <span className="hidden shrink-0 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary tabular-nums sm:inline-flex">
            {badge}
          </span>
        ) : null}
        {hint ? (
          <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums sm:inline-block">
            {hint}
          </span>
        ) : null}
        <span className="flex shrink-0 items-baseline gap-1 text-right tabular-nums">
          <span className="text-lg font-bold text-foreground sm:text-xl">
            {headline}
          </span>
          {headlineSuffix ? (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {headlineSuffix}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
