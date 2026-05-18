"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { UserTag } from "@/components/ft";
import { useBackend } from "@/lib/backend";
import { skillTierForNetWpm } from "@/lib/skill-tier";
import { cn } from "@/lib/utils";
import type { TopLevelPlayer, TopPlayer } from "@/types/leaderboard";

/** Full-pane user-centric leaderboards. Rendered by the main pane
 *  when the sidebar's "View" picker is set to `players` or `levels`
 *  instead of the per-run `table`.
 *
 *  Each component fetches its own slice on mount — the filter trio
 *  (Mode / Window / Length) doesn't shape these queries, so a
 *  filter swap doesn't refetch them.
 *
 *  Limit is 50 (the backend cap) so the user gets a meaningful
 *  ranked page instead of a five-card preview. */
const FETCH_LIMIT = 50;

export function TopPlayersView() {
  const backend = useBackend();
  const { user } = useUser();
  const youUserId = user?.id ?? null;
  const [data, setData] = useState<readonly TopPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    backend.leaderboard
      .topPlayers({ limit: FETCH_LIMIT })
      .then((r) => {
        if (!cancelled) setData(r.players);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  return (
    <Wrapper
      title="Top players"
      blurb="One row per user, ranked by lifetime peak net-WPM. Tier badge from the bot ladder."
      error={error}
      empty={data?.length === 0}
      loading={data == null}
    >
      <ol className="flex flex-col">
        {data?.map((p) => {
          const tier = skillTierForNetWpm(p.bestNetWpm);
          return (
            <Row
              key={p.userId}
              href={`/profile/${p.username ?? p.userId}`}
              rank={p.rank}
              username={p.username}
              name={p.name}
              tags={p.tags}
              isYou={p.userId === youUserId}
              headline={String(p.bestNetWpm)}
              headlineSuffix="wpm"
              badge={tier.label}
              hint={`${p.testsCompleted} runs`}
            />
          );
        })}
      </ol>
    </Wrapper>
  );
}

export function TopLevelsView() {
  const backend = useBackend();
  const { user } = useUser();
  const youUserId = user?.id ?? null;
  const [data, setData] = useState<readonly TopLevelPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    backend.leaderboard
      .topByLevel({ limit: FETCH_LIMIT })
      .then((r) => {
        if (!cancelled) setData(r.players);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  return (
    <Wrapper
      title="Top by level"
      blurb="One row per user, ranked by lifetime XP (sum of net-WPM across every completed run)."
      error={error}
      empty={data?.length === 0}
      loading={data == null}
    >
      <ol className="flex flex-col">
        {data?.map((p) => (
          <Row
            key={p.userId}
            href={`/profile/${p.username ?? p.userId}`}
            rank={p.rank}
            username={p.username}
            name={p.name}
            tags={p.tags}
            isYou={p.userId === youUserId}
            headline={`L${p.level}`}
            headlineSuffix=""
            badge={formatXp(p.xp) + " xp"}
            hint={`${p.testsCompleted} runs`}
          />
        ))}
      </ol>
    </Wrapper>
  );
}

/* ─── Shared shell ─────────────────────────────────────────────── */

function Wrapper({
  title,
  blurb,
  loading,
  empty,
  error,
  children,
}: {
  title: string;
  blurb: string;
  loading: boolean;
  empty: boolean | undefined;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <article className="flex w-full flex-col px-5 pt-8 pb-16 sm:px-12 sm:pt-10 sm:pb-20 lg:px-16">
      <header className="rounded-md border border-border bg-card px-6 py-7 sm:px-10 sm:py-10">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-7 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Leaderboard
          </span>
        </div>
        <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px] lg:text-[52px]">
          {title}
        </h1>
        <p className="mt-3 max-w-[55ch] text-sm leading-relaxed text-muted-foreground">
          {blurb}
        </p>
      </header>

      <section className="mt-6 rounded-md border border-border bg-card">
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

function Row({
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
  /** Raw Clerk username (no `@`). When present, we render `@<username>`
   *  to match the per-run leaderboard's display rule exactly. */
  username: string | null;
  /** Fallback display name from Clerk — already `@`-prefixed by the
   *  backend, so we render it as-is when no username is set. */
  name: string;
  tags: readonly string[];
  isYou: boolean;
  headline: string;
  headlineSuffix: string;
  badge: string;
  hint: string;
}) {
  // Same handle logic as leaderboard-view.tsx → Row, so the two
  // surfaces always render the same string for the same user.
  const handle = username ? `@${username}` : name;
  const leader = rank === 1;
  return (
    <li
      className={cn(
        "border-b border-border/50 last:border-b-0",
        // Own-row tint mirrors the per-run table so "find me" reads
        // identical across leaderboard surfaces.
        isYou && "bg-primary/[0.05]",
      )}
    >
      <Link
        href={href}
        className={cn(
          "flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4",
          "transition-colors hover:bg-accent/30",
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
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "min-w-0 truncate text-[14px] sm:text-[15px]",
              isYou
                ? "font-semibold text-primary"
                : leader
                  ? "font-semibold text-foreground"
                  : "text-foreground/90",
            )}
          >
            {handle}
          </span>
          {tags.map((t) => (
            <UserTag
              key={t}
              tag={t as never}
              size="sm"
              className="shrink-0"
            />
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
        <span className="hidden shrink-0 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary tabular-nums sm:inline-flex">
          {badge}
        </span>
        <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums sm:inline-block">
          {hint}
        </span>
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

function formatXp(xp: number): string {
  if (xp < 1_000) return String(xp);
  if (xp < 10_000) return `${(xp / 1_000).toFixed(1)}k`;
  if (xp < 1_000_000) return `${Math.round(xp / 1_000)}k`;
  return `${(xp / 1_000_000).toFixed(1)}M`;
}
