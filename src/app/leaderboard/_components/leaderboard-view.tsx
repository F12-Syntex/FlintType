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
  { id: "month", label: "Past month" },
  { id: "week", label: "Past week" },
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

  // URL-deep-linkable filters. Defaults match the route's defaults so
  // a bare /leaderboard URL stays clean (no params written until the
  // user picks something off-default).
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

  const generated = data ? new Date(data.generatedAtMs) : null;
  const entries = data?.entries ?? [];

  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12 lg:gap-10 lg:py-16">
      <Header generatedAt={generated} count={entries.length} />

      <div className="flex flex-col gap-3">
        <FilterRow
          label="mode"
          options={SCOPES}
          value={scope}
          onChange={(id) => updateParams({ scope: id })}
        />
        <FilterRow
          label="window"
          options={WINDOWS}
          value={window_}
          onChange={(id) => updateParams({ window: id })}
        />
      </div>

      <Ledger entries={entries} loading={loading} error={error} />
    </article>
  );
}

/* ─── Header ──────────────────────────────────────────────────── */

function Header({
  generatedAt,
  count,
}: {
  generatedAt: Date | null;
  count: number;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-7 sm:gap-4">
      <div className="flex items-baseline gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Leaderboard
        </span>
        {generatedAt ? (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 tabular-nums">
            updated {formatTime(generatedAt)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Top of the pack.
        </h1>
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          Ranked by net WPM (raw WPM weighted by accuracy). One run per
          racer per bucket so the table reads as people, not retries.
          {count > 0 ? ` Showing ${count}.` : ""}
        </p>
      </div>
    </header>
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
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={cn(
                "h-7 rounded-md px-2.5 text-[11px] font-medium uppercase tracking-[0.14em]",
                "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
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

/* ─── Ledger table ────────────────────────────────────────────── */

function Ledger({
  entries,
  loading,
  error,
}: {
  entries: readonly LeaderboardEntry[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <SkeletonRows />;
  if (error) {
    return (
      <div className="border-t border-border pt-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (entries.length === 0) return <EmptyState />;
  return (
    <div className="flex flex-col">
      {/* Header row — uses the same grid template as the data rows
       *  so columns line up perfectly. Hidden on mobile (the data
       *  rows render as their own readable layout there). */}
      <div className="hidden grid-cols-[28px_minmax(0,1fr)_64px_56px_56px_minmax(56px,72px)] items-baseline gap-3 border-b border-border pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:grid">
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
  const isTop = entry.rank === 1;
  const linkHref = entry.username ? `/u/${entry.username}` : null;
  const handleNode = (
    <span
      className={cn(
        "truncate text-[14px] font-semibold sm:text-[15px]",
        isTop ? "text-primary" : "text-foreground",
      )}
    >
      {entry.name}
    </span>
  );
  return (
    <li
      className={cn(
        "border-b border-border/70 py-3 last:border-b-0",
        // Mobile: stack into two rows. Desktop: single grid line.
        "grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-x-3",
        "sm:grid-cols-[28px_minmax(0,1fr)_64px_56px_56px_minmax(56px,72px)]",
        isTop && "bg-primary/[0.04]",
      )}
    >
      <span
        className={cn(
          "text-[13px] font-bold tabular-nums sm:text-[12px]",
          isTop ? "text-primary" : "text-muted-foreground",
        )}
      >
        {entry.rank.toString().padStart(2, "0")}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {linkHref ? (
          <Link
            href={linkHref}
            className="min-w-0 truncate transition-colors hover:text-primary"
          >
            {handleNode}
          </Link>
        ) : (
          handleNode
        )}
        {/* Mobile sub-row: net wpm + raw + accuracy + mode all in one
         *  compact line. Hidden on sm+ where the column layout takes
         *  over and renders each metric in its own slot. */}
        <div className="flex items-baseline gap-3 text-[11px] tabular-nums text-muted-foreground sm:hidden">
          <span>
            <span className="font-semibold text-foreground">{entry.netWpm}</span>
            <span className="ml-0.5 text-[9px] uppercase tracking-[0.16em]">net</span>
          </span>
          <span>· {entry.wpm} raw</span>
          <span>· {Math.round(entry.accuracy)}%</span>
          <span className="uppercase tracking-[0.14em]">
            · {MODE_LABEL[entry.mode] ?? entry.mode}
          </span>
        </div>
      </div>
      {/* Mobile: just a single accent net column on the right */}
      <span
        className={cn(
          "text-right text-[18px] font-extrabold tabular-nums leading-none sm:hidden",
          isTop ? "text-primary" : "text-foreground",
        )}
      >
        {entry.netWpm}
      </span>
      {/* Desktop columns */}
      <span
        className={cn(
          "hidden text-right text-[14px] font-bold tabular-nums sm:inline",
          isTop ? "text-primary" : "text-foreground",
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
        {MODE_LABEL[entry.mode] ?? entry.mode}
      </span>
    </li>
  );
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
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

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3 border-t border-border pt-8">
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

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
