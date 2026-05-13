"use client";

import { Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import { type LeaderboardEntry } from "@/types/leaderboard";
import {
  MODE_LABEL,
  parsePreset,
  parseScope,
  parseWindow,
  presetLabel,
  SCOPES,
  WINDOWS,
} from "./filters";
import { useLeaderboard } from "./use-leaderboard";

/** /leaderboard content area. Reads scope+window+preset from URL
 *  params (set by the sidebar). Data flows through `useLeaderboard`,
 *  which caches per (scope,window,preset) for 60s — instant paint
 *  on filter swaps, background refresh on stale, manual refresh on
 *  demand. No more network call per mount. */
export function LeaderboardView() {
  const params = useSearchParams();
  const scope = parseScope(params.get("scope"));
  const window_ = parseWindow(params.get("window"));
  const preset = parsePreset(params.get("preset"));

  const { data, error, loading, refreshing, refresh } = useLeaderboard(
    scope,
    window_,
    preset,
  );

  const entries = data?.entries ?? [];
  const scopeLabel = SCOPES.find((s) => s.id === scope)?.label ?? "All modes";
  const windowLabelText =
    WINDOWS.find((w) => w.id === window_)?.label ?? "All time";
  const presetText = preset === "any" ? null : presetLabel(preset);

  const generatedAt = data?.generatedAtMs ?? null;

  return (
    <article className="flex w-full flex-col px-5 pt-8 pb-16 sm:px-12 sm:pt-10 sm:pb-20 lg:px-16">
      <header className="rounded-md border border-border bg-card px-6 py-7 sm:px-10 sm:py-10">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-7 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Leaderboard
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-8">
          {/* Title + filter chips. Dropping the dot-joined subtitle in
           *  favour of inline filter chips reads at-a-glance without
           *  the "·" separator the old design leaned on. Each chip
           *  mirrors a sidebar control so the page tells you what
           *  slice you're looking at in one row. */}
          <div className="flex flex-col gap-4">
            <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px] lg:text-[52px]">
              Top scores
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip>{scopeLabel}</FilterChip>
              <FilterChip>{windowLabelText}</FilterChip>
              {presetText ? <FilterChip>{presetText}</FilterChip> : null}
            </div>
            <p className="max-w-prose text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
              Ranked by net WPM (raw × accuracy).
            </p>
          </div>
          {/* Action cluster — refresh + save image. Marked data-no-export
           *  so the cluster itself is filtered out when the screenshot
           *  helper captures the page. */}
          <div
            data-no-export="true"
            className="flex flex-wrap items-center gap-2 self-start sm:self-end sm:justify-end"
          >
            <RefreshButton
              onClick={refresh}
              refreshing={refreshing || loading}
              generatedAt={generatedAt}
            />
            <SaveImageButton />
          </div>
        </div>
      </header>

      <div className="pt-8 sm:pt-10">
        {loading && entries.length === 0 ? (
          <Skeleton />
        ) : error && entries.length === 0 ? (
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

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border border-border bg-background/40 px-2",
        "text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground",
      )}
    >
      {children}
    </span>
  );
}

/* ─── Save image ──────────────────────────────────────────────── */

function SaveImageButton() {
  const [exporting, setExporting] = useState(false);
  const onDownload = useCallback(async () => {
    if (exporting) return;
    const { findScreenshotRoot, naturalScreenshotSize, pickScreenshotBg } =
      await import("@/lib/screenshot");
    const node = findScreenshotRoot();
    if (!node) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const bg = pickScreenshotBg(node);
      const { width, height } = naturalScreenshotSize(node);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: bg,
        width,
        height,
        filter: (n) =>
          !(n instanceof HTMLElement && n.dataset.noExport === "true"),
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `flinttype-leaderboard-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("[leaderboard] screenshot failed", err);
    } finally {
      setExporting(false);
    }
  }, [exporting]);
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={exporting}
      aria-label="Save leaderboard as image"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors",
        "hover:bg-foreground/[0.04] hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <Download size={12} className="shrink-0" aria-hidden />
      <span>{exporting ? "Saving" : "Save image"}</span>
    </button>
  );
}

/* ─── Refresh control ─────────────────────────────────────────── */

function RefreshButton({
  onClick,
  refreshing,
  generatedAt,
}: {
  onClick: () => void;
  refreshing: boolean;
  generatedAt: number | null;
}) {
  const ageLabel = generatedAt ? formatAge(Date.now() - generatedAt) : "—";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      aria-label="Refresh leaderboard"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors",
        "hover:bg-foreground/[0.04] hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <RefreshCw
        size={12}
        className={cn("shrink-0", refreshing && "motion-safe:animate-spin")}
        aria-hidden
      />
      <span className="tabular-nums">{refreshing ? "Refreshing" : ageLabel}</span>
    </button>
  );
}

function formatAge(ms: number): string {
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / (60 * 60_000))}h ago`;
}

/* ─── Table ──────────────────────────────────────────────────── */

function Table({ entries }: { entries: readonly LeaderboardEntry[] }) {
  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "hidden items-baseline gap-4 border-b border-border pb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
          "sm:grid sm:grid-cols-[40px_minmax(0,1fr)_120px_72px_64px_64px]",
        )}
      >
        <span>#</span>
        <span>Racer</span>
        <span>Mode</span>
        <span className="text-right">Net</span>
        <span className="text-right">Raw</span>
        <span className="text-right">Acc</span>
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
  // Every row links somewhere — username is the pretty slug when the
  // racer set one, the Clerk user_id is the fallback for racers who
  // didn't. history.publicProfile accepts both.
  const linkHref = `/profile/${entry.username ?? entry.userId}`;
  const leader = entry.rank === 1;

  return (
    <li
      className={cn(
        "group/row border-b border-border/60 py-3 last:border-b-0",
        "grid grid-cols-[32px_minmax(0,1fr)_auto] items-baseline gap-x-3",
        "sm:grid-cols-[40px_minmax(0,1fr)_120px_72px_64px_64px] sm:gap-x-4 sm:py-3.5",
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

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={linkHref}
            className={cn(
              "min-w-0 truncate text-[14px] transition-colors hover:text-primary sm:text-[15px]",
              leader ? "font-semibold text-foreground" : "text-foreground/90",
            )}
          >
            {handle}
          </Link>
          {entry.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" className="shrink-0" />
          ))}
        </div>
        {/* Mobile sub-line: mode chip + raw + acc on one row beneath
         *  the handle so the table reads compactly at 375 px. The
         *  desktop variant fills the dedicated Mode column instead. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] tabular-nums text-muted-foreground sm:hidden">
          <ModeTag mode={entry.mode} amount={entry.durationOrWordCount} />
          <span>raw {entry.wpm}</span>
          <span>acc {Math.round(entry.accuracy)}%</span>
        </div>
      </div>

      <span className="hidden items-center sm:inline-flex">
        <ModeTag mode={entry.mode} amount={entry.durationOrWordCount} />
      </span>

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
    </li>
  );
}

/* ─── Mode tag ────────────────────────────────────────────────── */

/** Per-mode visual treatment for the mode tag chip. Race draws the
 *  brand spark (it's the competitive surface and deserves the eye);
 *  training is a higher-contrast neutral to read as "adaptive
 *  practice"; casual + reverse stay quietest so the chip doesn't
 *  shout across the table on the common cases. */
const MODE_TAG_STYLE: Record<string, string> = {
  race: "border-primary/40 bg-primary/[0.08] text-primary",
  training: "border-foreground/25 bg-foreground/[0.05] text-foreground",
  casual: "border-border bg-muted text-muted-foreground",
  reverse_adaptive: "border-foreground/15 bg-muted/50 text-muted-foreground",
};

/** Time-mode standard durations. WORDS lengths don't overlap with
 *  these (15/30/60/120 are all time-only in the shipping mode set)
 *  so a strict membership check is enough to pick the right suffix. */
const TIME_AMOUNTS = new Set([15, 30, 60, 120]);

function ModeTag({ mode, amount }: { mode: string; amount: number }) {
  const style = MODE_TAG_STYLE[mode] ?? MODE_TAG_STYLE.casual;
  const label = (MODE_LABEL[mode] ?? mode).toUpperCase();
  const suffix = TIME_AMOUNTS.has(amount) ? "s" : "";
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5",
        "text-[9px] font-semibold uppercase leading-none tracking-[0.18em]",
        style,
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <span className="tabular-nums">
        {amount}
        {suffix}
      </span>
    </span>
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
        or length on the left, or be the first to put up a number.
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
