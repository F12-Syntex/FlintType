"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Tag } from "@/components/ft";
import { EN_COMMON_1000 } from "@/data/en-common-1000";
import { useDrillProgress } from "@/lib/drill-progress";
import { cn } from "@/lib/utils";
import { BurstSurface } from "./burst-surface";
import { DrillHeader } from "./drill-header";

/** Per-session item count drawn from the user's outstanding (un-
 *  discovered) words. Bigger than the 25-item generic burst so the
 *  user can rack up multiple words per session, but small enough that
 *  a sitting clears in a few minutes. */
const BURST_1000_PER_SESSION = 30;

/** Burst-1000 wrapper. Reaches into the persisted drill-progress
 *  slice to figure out which words the user has cleared, picks the
 *  next slug of unseen words for this session, hands them to the
 *  shared `BurstSurface`, and persists every clear back to the slice
 *  via `markDiscovered`.
 *
 *  The bottom of the surface gets a 1000-cell discovery grid (one
 *  cell per word in `EN_COMMON_1000`). Each cell lights primary the
 *  moment the user has ever cleared the word — so progress reads as
 *  an honest, slow accumulation across many sessions. */
export function Burst1000Surface({
  title,
  subtitle,
  thresholdWpm,
  repsPerItem,
}: {
  title: string;
  subtitle: string;
  thresholdWpm: number;
  repsPerItem: number;
}) {
  const { discoveredSet, markDiscovered } = useDrillProgress();
  // Track session-local clears separately so the discovery grid
  // updates instantly on each clear without waiting for the prefs
  // round-trip; merged with the persisted set when computing what's
  // lit.
  const [sessionDiscovered, setSessionDiscovered] = useState<Set<string>>(
    () => new Set(),
  );

  // Items the user hasn't cleared yet, in frequency order. Computed
  // once at mount so the session's word list stays stable while the
  // user types — we don't want a freshly-cleared word being yanked
  // mid-attempt because it just landed in the discovered set.
  const sessionItems = useMemo<readonly string[]>(() => {
    const out: string[] = [];
    for (const w of EN_COMMON_1000) {
      const lower = w.toLowerCase();
      if (discoveredSet.has(lower)) continue;
      out.push(w);
      if (out.length >= BURST_1000_PER_SESSION) break;
    }
    return out;
    // discoveredSet only changes between sessions in practice (a fresh
    // mount of this surface). Capturing once on mount is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCleared = useCallback(
    (word: string) => {
      const lower = word.toLowerCase();
      setSessionDiscovered((prev) => {
        if (prev.has(lower)) return prev;
        const next = new Set(prev);
        next.add(lower);
        return next;
      });
      markDiscovered(lower);
    },
    [markDiscovered],
  );

  const totalDiscovered = discoveredSet.size + sessionDiscovered.size;
  const litCount = Math.min(EN_COMMON_1000.length, totalDiscovered);

  // Already-cleared the whole 1000? Surface a celebration card and a
  // back-link instead of mounting BurstSurface against an empty list.
  if (sessionItems.length === 0) {
    return (
      <>
        <DrillHeader title={title} subtitle={subtitle} />
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-5 py-16 text-center">
          <Tag>Drill complete</Tag>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Every word cleared.
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            All {EN_COMMON_1000.length} of the most common English words
            sit in your discovered set — there's nothing left to drill
            here. Try Pangram sprint or Tongue-twister gauntlet for a
            fresh challenge.
          </p>
          <Link
            href="/drills"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to drills
          </Link>
        </section>
      </>
    );
  }

  return (
    <BurstSurface
      title={title}
      subtitle={subtitle}
      items={sessionItems}
      thresholdWpm={thresholdWpm}
      repsPerItem={repsPerItem}
      onItemCleared={handleCleared}
      itemStat={{
        top: `${litCount}/${EN_COMMON_1000.length}`,
        caption: "Discovered",
      }}
      progressSlot={
        <DiscoveryGrid
          discovered={discoveredSet}
          sessionDiscovered={sessionDiscovered}
        />
      }
    />
  );
}

/** Long-running discovery grid. One cell per word in
 *  `EN_COMMON_1000`, lit when the user has ever cleared that word.
 *  The cell labels itself with the underlying word as a `title` so a
 *  user can hover to see exactly which word the cell tracks (a small
 *  affordance — the cells are too small for inline labels). */
function DiscoveryGrid({
  discovered,
  sessionDiscovered,
}: {
  discovered: ReadonlySet<string>;
  sessionDiscovered: ReadonlySet<string>;
}) {
  const total = EN_COMMON_1000.length;
  const lit = Array.from(discovered).length + Array.from(sessionDiscovered).length;
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="rounded-md border border-border bg-card/40 p-3 sm:p-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(total, lit)}
          aria-label="Words discovered"
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(8px, 1fr))",
          }}
        >
          {EN_COMMON_1000.map((word, i) => {
            const lower = word.toLowerCase();
            const isLit =
              discovered.has(lower) || sessionDiscovered.has(lower);
            const isSession = sessionDiscovered.has(lower);
            return (
              <span
                key={`${i}-${word}`}
                aria-hidden
                title={word}
                className={cn(
                  "h-2 rounded-[1px] transition-colors",
                  isLit
                    ? isSession
                      ? "bg-primary motion-safe:animate-pulse"
                      : "bg-primary/85"
                    : "bg-foreground/[0.07]",
                )}
              />
            );
          })}
        </div>
      </div>
      <div
        aria-hidden
        className="relative mt-2 flex items-center justify-center"
      >
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <span className="relative bg-background px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
          Discovered · {Math.min(total, lit)}/{total}
        </span>
      </div>
    </div>
  );
}
