"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { EN_COMMON_1000 } from "@/data/en-common-1000";
import { useDrillProgress } from "@/lib/drill-progress";
import { cn } from "@/lib/utils";
import { BurstSurface } from "./burst-surface";
import { DrillHeader } from "./drill-header";

/** Words per sitting: more than a regular burst so a session racks up
 *  several discoveries, few enough to clear in a few minutes. */
const BURST_1000_PER_SESSION = 30;

/** The next `count` words the user hasn't cleared, in frequency order. */
function nextUndiscovered(
  discovered: ReadonlySet<string>,
  count: number,
): readonly string[] {
  const out: string[] = [];
  for (const w of EN_COMMON_1000) {
    if (discovered.has(w.toLowerCase())) continue;
    out.push(w);
    if (out.length >= count) break;
  }
  return out;
}

/** Burst 1000: a burst over the next 30 undiscovered words of the 1,000
 *  most common English words. Every clear is saved to the user's
 *  drill-progress slice, and a 1000-cell grid under the word shows the
 *  long-running total. "Run again" picks the next 30. */
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
  // Clears from this sitting, so the grid lights instantly without
  // waiting for the prefs round-trip. Lit = saved ∪ session.
  const [sessionDiscovered, setSessionDiscovered] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const discovered = useMemo(
    () => new Set([...discoveredSet, ...sessionDiscovered]),
    [discoveredSet, sessionDiscovered],
  );
  // Picked once per round, so a word just cleared isn't pulled out
  // from under the user mid-run.
  const [sessionItems, setSessionItems] = useState(() =>
    nextUndiscovered(discoveredSet, BURST_1000_PER_SESSION),
  );

  const handleCleared = useCallback(
    (word: string) => {
      const lower = word.toLowerCase();
      setSessionDiscovered((prev) =>
        prev.has(lower) ? prev : new Set([...prev, lower]),
      );
      markDiscovered(lower);
    },
    [markDiscovered],
  );

  const total = EN_COMMON_1000.length;
  const lit = Math.min(total, discovered.size);

  if (sessionItems.length === 0) {
    return (
      <>
        <DrillHeader title={title} subtitle={subtitle} />
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-primary">Drill complete</span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Every word cleared
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            You&apos;ve cleared all {total.toLocaleString("en")} of the most
            common English words. Try Pangram sprint or Tongue-twister
            gauntlet next.
          </p>
          <Link href="/drills" className={buttonVariants({ size: "lg" })}>
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
      unit="word"
      onItemCleared={handleCleared}
      onRestart={() =>
        setSessionItems(nextUndiscovered(discovered, BURST_1000_PER_SESSION))
      }
      itemStat={{ value: `${lit}/${total}`, caption: "Discovered" }}
      progressSlot={
        <DiscoveryGrid discovered={discovered} session={sessionDiscovered} lit={lit} />
      }
    />
  );
}

/** One cell per word in `EN_COMMON_1000`, lit once the user has ever
 *  cleared it; this sitting's clears are full primary. Each cell's
 *  `title` names its word for anyone curious enough to hover. The
 *  "Discovered" stat card above carries the count. */
function DiscoveryGrid({
  discovered,
  session,
  lit,
}: {
  discovered: ReadonlySet<string>;
  session: ReadonlySet<string>;
  lit: number;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/40 p-3 sm:p-4">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={EN_COMMON_1000.length}
        aria-valuenow={lit}
        aria-label="Words discovered"
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(8px, 1fr))" }}
      >
        {EN_COMMON_1000.map((word, i) => {
          const lower = word.toLowerCase();
          return (
            <span
              key={`${i}-${word}`}
              aria-hidden
              title={word}
              className={cn(
                "h-2 rounded-[1px] transition-colors",
                session.has(lower)
                  ? "bg-primary"
                  : discovered.has(lower)
                    ? "bg-primary/60"
                    : "bg-foreground/[0.07]",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
