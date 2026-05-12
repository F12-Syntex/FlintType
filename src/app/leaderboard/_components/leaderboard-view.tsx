"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import {
  type LeaderboardEntry,
  type LeaderboardOutput,
} from "@/types/leaderboard";
import { MODE_LABEL, parseScope, parseWindow, SCOPES, WINDOWS } from "./filters";

/** /leaderboard content area. Reads scope+window from URL params (set
 *  by the sidebar), fetches a snapshot, renders a single full-width
 *  ranked table. No podium, no cards — a clean record sheet. */
export function LeaderboardView() {
  const backend = useBackend();
  const params = useSearchParams();
  const scope = parseScope(params.get("scope"));
  const window_ = parseWindow(params.get("window"));

  const [data, setData] = useState<LeaderboardOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    backend.leaderboard
      .list({ scope, window: window_ })
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof BackendError
            ? err.message
            : "Couldn't load the leaderboard. Try again in a moment.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, scope, window_]);

  const entries = data?.entries ?? [];
  const scopeLabel = SCOPES.find((s) => s.id === scope)?.label ?? "All modes";
  const windowLabel =
    WINDOWS.find((w) => w.id === window_)?.label ?? "All time";

  return (
    <article className="flex w-full flex-col px-5 pt-12 pb-16 sm:px-12 sm:pt-14 sm:pb-20 lg:px-16">
      <header className="border-b border-border pb-9 sm:pb-10">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-7 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Leaderboard · top scores
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
          <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px] lg:text-[52px]">
            Top of the pack.
            <br />
            <span className="text-foreground/60">
              {scopeLabel} · {windowLabel}.
            </span>
          </h1>
          <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground sm:text-right">
            Ranked by net WPM (raw × accuracy). Filter on the left.
          </p>
        </div>
      </header>

      <div className="pt-8 sm:pt-10">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : entries.length === 0 ? (
          <Empty />
        ) : (
          <Table entries={entries} />
        )}
      </div>
    </article>
  );
}

/* ─── Table ──────────────────────────────────────────────────── */

function Table({ entries }: { entries: readonly LeaderboardEntry[] }) {
  return (
    <div className="flex flex-col">
      {/* Column headers — desktop only. Mobile drops to a row of
       *  rank + handle + net WPM with secondary metrics underneath. */}
      <div
        className={cn(
          "hidden items-baseline gap-4 border-b border-border pb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
          "sm:grid sm:grid-cols-[40px_minmax(0,1fr)_72px_64px_64px_96px]",
        )}
      >
        <span>#</span>
        <span>Racer</span>
        <span className="text-right">Net</span>
        <span className="text-right">Raw</span>
        <span className="text-right">Acc</span>
        <span className="text-right">Mode</span>
      </div>
      <ol className="flex flex-col">
        {entries.map((e) => (
          <Row key={e.testId} entry={e} />
        ))}
      </ol>
    </div>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const handle = entry.username ? `@${entry.username}` : entry.name;
  const linkHref = entry.username ? `/u/${entry.username}` : null;
  const HandleEl: React.ElementType = linkHref ? Link : "span";
  const handleProps = linkHref ? { href: linkHref } : {};
  const leader = entry.rank === 1;

  return (
    <li
      className={cn(
        "group/row border-b border-border/60 py-3 last:border-b-0",
        "grid grid-cols-[32px_minmax(0,1fr)_auto] items-baseline gap-x-3",
        "sm:grid-cols-[40px_minmax(0,1fr)_72px_64px_64px_96px] sm:gap-x-4 sm:py-3.5",
      )}
    >
      <span
        className={cn(
          "text-[12px] font-semibold tabular-nums sm:text-[13px]",
          leader ? "text-primary" : "text-muted-foreground",
        )}
      >
        {entry.rank.toString().padStart(2, "0")}
      </span>

      <div className="flex min-w-0 flex-col gap-0.5">
        <HandleEl
          {...(handleProps as { href?: string })}
          className={cn(
            "min-w-0 truncate text-[14px] sm:text-[15px]",
            leader ? "font-semibold text-foreground" : "text-foreground/90",
            linkHref && "transition-colors hover:text-primary",
          )}
        >
          {handle}
        </HandleEl>
        <div className="flex items-baseline gap-3 text-[10px] uppercase tracking-[0.14em] tabular-nums text-muted-foreground sm:hidden">
          <span>raw {entry.wpm}</span>
          <span>acc {Math.round(entry.accuracy)}%</span>
          <span>{MODE_LABEL[entry.mode] ?? entry.mode}</span>
        </div>
      </div>

      {/* Net WPM — leader gets primary tint, rest stay foreground. */}
      <span
        className={cn(
          "text-right text-[16px] font-bold tabular-nums sm:text-[15px]",
          leader ? "text-primary" : "text-foreground",
        )}
      >
        {entry.netWpm}
      </span>

      <span className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:inline">
        {entry.wpm}
      </span>
      <span className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:inline">
        {Math.round(entry.accuracy)}%
      </span>
      <span className="hidden text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
        {MODE_LABEL[entry.mode] ?? entry.mode} · {entry.durationOrWordCount}
      </span>
    </li>
  );
}

/* ─── States ──────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[32px_minmax(0,1fr)_56px] items-center gap-3"
        >
          <span className="h-3 w-5 animate-pulse rounded-sm bg-foreground/[0.06]" />
          <span className="h-3 w-32 animate-pulse rounded-sm bg-foreground/[0.06]" />
          <span className="h-3 w-10 animate-pulse rounded-sm bg-foreground/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="max-w-prose text-[15px] leading-relaxed text-foreground/85">
        No completed runs in this slice yet. Pick a different window
        on the left, or be the first to put up a number.
      </p>
      <Link
        href="/race"
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Race now
      </Link>
    </div>
  );
}
