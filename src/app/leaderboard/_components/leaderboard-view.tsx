"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import {
  type LeaderboardEntry,
  type LeaderboardOutput,
  type LeaderboardScope,
  type LeaderboardWindow,
} from "@/types/leaderboard";

const SCOPES: readonly { id: LeaderboardScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "race", label: "Race" },
  { id: "training", label: "Training" },
  { id: "casual", label: "Casual" },
];

const WINDOWS: readonly { id: LeaderboardWindow; label: string }[] = [
  { id: "all_time", label: "All time" },
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Today" },
];

const MODE_LABEL: Record<string, string> = {
  race: "race",
  training: "training",
  casual: "casual",
  reverse_adaptive: "reverse",
};

export function LeaderboardView() {
  const backend = useBackend();
  const router = useRouter();
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

  const updateParams = useCallback(
    (next: Partial<{ scope: LeaderboardScope; window: LeaderboardWindow }>) => {
      const sp = new URLSearchParams(params.toString());
      const nextScope = next.scope ?? scope;
      const nextWindow = next.window ?? window_;
      if (nextScope === "all") sp.delete("scope");
      else sp.set("scope", nextScope);
      if (nextWindow === "all_time") sp.delete("window");
      else sp.set("window", nextWindow);
      const qs = sp.toString();
      router.replace(`/leaderboard${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, router, scope, window_],
  );

  const entries = data?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Leaderboard
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Top of the pack.
        </h1>
      </header>

      <div className="flex flex-col gap-2.5 border-y border-border/70 py-4">
        <FilterRow
          label="Mode"
          options={SCOPES}
          value={scope}
          onChange={(id) => updateParams({ scope: id })}
        />
        <FilterRow
          label="Window"
          options={WINDOWS}
          value={window_}
          onChange={(id) => updateParams({ window: id })}
        />
      </div>

      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={error} />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          {podium.length > 0 ? <Podium entries={podium} /> : null}
          {rest.length > 0 ? <Ledger entries={rest} /> : null}
        </div>
      )}
    </article>
  );
}

/* ─── Filter chips ────────────────────────────────────────────── */

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={cn(
                "h-7 rounded-sm px-2.5 text-[12px] tracking-tight outline-none transition-colors",
                "focus-visible:ring-1 focus-visible:ring-primary/40",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Top three — podium card ────────────────────────────────── */

function Podium({ entries }: { entries: readonly LeaderboardEntry[] }) {
  // Visual order: silver (rank 2), gold (rank 1), bronze (rank 3).
  // Gold sits in the middle taller than the flanks. On mobile the
  // grid collapses to a vertical stack ranked 1 → 2 → 3 so the
  // primary read still leads with the winner.
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  const winner = byRank.get(1) ?? entries[0]!;
  const second = byRank.get(2);
  const third = byRank.get(3);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end sm:gap-4">
      {second ? (
        <PodiumCard entry={second} height="sm:min-h-[180px]" tone="silver" />
      ) : (
        <span className="hidden sm:block" />
      )}
      <PodiumCard entry={winner} height="sm:min-h-[220px]" tone="gold" />
      {third ? (
        <PodiumCard entry={third} height="sm:min-h-[160px]" tone="bronze" />
      ) : (
        <span className="hidden sm:block" />
      )}
    </div>
  );
}

function PodiumCard({
  entry,
  height,
  tone,
}: {
  entry: LeaderboardEntry;
  height: string;
  tone: "gold" | "silver" | "bronze";
}) {
  const handle = entry.username ? `@${entry.username}` : entry.name;
  const link = entry.username ? `/u/${entry.username}` : null;
  const badge = tone === "gold" ? "1st" : tone === "silver" ? "2nd" : "3rd";
  const Wrapper: React.ElementType = link ? Link : "div";
  const wrapperProps = link ? { href: link } : {};
  return (
    <Wrapper
      {...(wrapperProps as { href?: string })}
      className={cn(
        "group flex flex-col justify-between gap-4 rounded-md border border-border bg-card px-5 py-4 transition-colors",
        height,
        tone === "gold"
          ? "ring-1 ring-primary/40 hover:border-primary/40"
          : "hover:border-foreground/30",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.2em]",
            tone === "gold" ? "text-primary" : "text-muted-foreground",
          )}
        >
          {badge}
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
          {MODE_LABEL[entry.mode] ?? entry.mode} · {entry.durationOrWordCount}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "truncate text-[15px] font-semibold",
            tone === "gold" ? "text-primary" : "text-foreground",
          )}
        >
          {handle}
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-[34px] font-extrabold leading-none tracking-tight tabular-nums",
              tone === "gold" ? "text-primary" : "text-foreground",
            )}
          >
            {entry.netWpm}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            net wpm
          </span>
        </div>
        <div className="flex items-baseline gap-3 text-[11px] tabular-nums text-muted-foreground">
          <span>{entry.wpm} raw</span>
          <span>·</span>
          <span>{Math.round(entry.accuracy)}% acc</span>
        </div>
      </div>
    </Wrapper>
  );
}

/* ─── Rest of the leaderboard — ledger ───────────────────────── */

function Ledger({ entries }: { entries: readonly LeaderboardEntry[] }) {
  return (
    <div className="flex flex-col">
      <div className="hidden grid-cols-[28px_minmax(0,1fr)_64px_56px_56px_72px] items-baseline gap-3 border-b border-border pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:grid">
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
  const linkHref = entry.username ? `/u/${entry.username}` : null;
  const handle = entry.username ? `@${entry.username}` : entry.name;
  const handleNode = (
    <span className="truncate text-[14px] text-foreground transition-colors group-hover/row:text-primary">
      {handle}
    </span>
  );
  return (
    <li
      className={cn(
        "group/row border-b border-border/60 py-2.5 last:border-b-0",
        "grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-x-3",
        "sm:grid-cols-[28px_minmax(0,1fr)_64px_56px_56px_72px]",
      )}
    >
      <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
        {entry.rank.toString().padStart(2, "0")}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        {linkHref ? <Link href={linkHref}>{handleNode}</Link> : handleNode}
        <div className="flex items-baseline gap-3 text-[11px] tabular-nums text-muted-foreground sm:hidden">
          <span>{entry.wpm} raw</span>
          <span>·</span>
          <span>{Math.round(entry.accuracy)}%</span>
          <span>·</span>
          <span className="uppercase tracking-[0.14em]">
            {MODE_LABEL[entry.mode] ?? entry.mode}
          </span>
        </div>
      </div>
      <span className="text-right text-[16px] font-bold tabular-nums text-foreground sm:hidden">
        {entry.netWpm}
      </span>
      <span className="hidden text-right text-[14px] font-bold tabular-nums text-foreground sm:inline">
        {entry.netWpm}
      </span>
      <span className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:inline">
        {entry.wpm}
      </span>
      <span className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:inline">
        {Math.round(entry.accuracy)}%
      </span>
      <span className="hidden text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
        {MODE_LABEL[entry.mode] ?? entry.mode}
      </span>
    </li>
  );
}

/* ─── States ──────────────────────────────────────────────────── */

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[28px_minmax(0,1fr)_56px] items-center gap-3"
        >
          <span className="h-3 w-5 animate-pulse rounded-sm bg-foreground/[0.06]" />
          <span className="h-3 w-32 animate-pulse rounded-sm bg-foreground/[0.06]" />
          <span className="h-3 w-10 animate-pulse rounded-sm bg-foreground/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Nothing here yet
      </span>
      <p className="max-w-prose text-[14px] leading-relaxed text-foreground/85">
        No completed runs in this slice. Pick a different window above,
        or be the first to put up a number.
      </p>
      <Link
        href="/race"
        className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Race now
      </Link>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function parseScope(s: string | null): LeaderboardScope {
  if (s === "race" || s === "training" || s === "casual" || s === "all") return s;
  return "all";
}
function parseWindow(s: string | null): LeaderboardWindow {
  if (s === "month" || s === "week" || s === "day" || s === "all_time") return s;
  return "all_time";
}
