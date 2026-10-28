"use client";

import { useState } from "react";
import { Surface } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { AdaptTestSummary } from "@/types/adapt";

/* ─── Recent tests ─────────────────────────────────────────────── */

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Recent tests shown before "Show all", so the table doesn't run for
 *  dozens of rows. */
const RECENT_LIMIT = 10;

export function RecentTests({ tests }: { tests: AdaptTestSummary[] }) {
  const [showAll, setShowAll] = useState(false);
  if (tests.length === 0) {
    return <EmptyNote>No finished tests yet. Take one and refresh.</EmptyNote>;
  }
  const visible = showAll ? tests : tests.slice(0, RECENT_LIMIT);
  return (
    <div className="flex flex-col gap-3">
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-3 pl-5 pr-3 font-medium">When</th>
                <th className="py-3 pr-3 font-medium">Mode</th>
                <th className="py-3 pr-3 text-right font-medium">WPM</th>
                <th className="py-3 pr-3 text-right font-medium">Accuracy</th>
                <th className="py-3 pr-3 text-right font-medium">Errors</th>
                <th className="py-3 pr-5 text-right font-medium">Finished</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/50"
                >
                  <td className="whitespace-nowrap py-2.5 pl-5 pr-3 text-muted-foreground">
                    {relativeTime(t.startedAtMs)}
                  </td>
                  <td className="py-2.5 pr-3 capitalize text-foreground">
                    {t.mode.replace(/_/g, " ")}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-medium text-foreground">
                    {t.wpm.toFixed(0)}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-foreground">
                    {t.accuracy.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">
                    {t.errorCount}
                  </td>
                  <td className="py-2.5 pr-5 text-right">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          t.wasCompleted
                            ? "bg-foreground/40"
                            : "bg-muted-foreground/30",
                        )}
                      />
                      {t.wasCompleted ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
      <ShowAllToggle
        total={tests.length}
        limit={RECENT_LIMIT}
        showAll={showAll}
        onToggle={() => setShowAll((v) => !v)}
      />
    </div>
  );
}

/** Outline "Show all N" / "Show fewer" toggle under a capped list;
 *  finger-sized on phones. Renders nothing when the list fits. */
function ShowAllToggle({
  total,
  limit,
  showAll,
  onToggle,
}: {
  total: number;
  limit: number;
  showAll: boolean;
  onToggle: () => void;
}) {
  if (total <= limit) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-11 self-start sm:h-8"
      onClick={onToggle}
    >
      {showAll ? "Show fewer" : `Show all ${total}`}
    </Button>
  );
}

/* ─── Recency map ──────────────────────────────────────────────── */

/** How many held-back words show before "Show all". The full set can
 *  run to a few hundred chips, which would swamp the page on a phone. */
const RECENCY_LIMIT = 40;

export function RecencyMap({
  rows,
}: {
  rows: { word: string; testsAgo: number }[];
}) {
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0) {
    return <EmptyNote>Nothing held back right now.</EmptyNote>;
  }
  // Sort by recency (newest first) so the layout reads as a fade.
  const sorted = [...rows].sort((a, b) => a.testsAgo - b.testsAgo);
  const maxAgo = Math.max(...sorted.map((r) => r.testsAgo), 1);
  const visible = showAll ? sorted : sorted.slice(0, RECENCY_LIMIT);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-1.5">
        {visible.map((r) => {
          // Fresher words (lower testsAgo) sit closer to full opacity.
          const opacity = 1 - (r.testsAgo / (maxAgo + 1)) * 0.55;
          return (
            <li
              key={r.word}
              style={{ opacity }}
              title={`Shown ${r.testsAgo} test${r.testsAgo === 1 ? "" : "s"} ago`}
              className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border bg-card px-3 text-sm tabular-nums transition-opacity hover:opacity-100"
            >
              <span className="font-mono text-foreground">{r.word}</span>
              <span className="text-xs text-muted-foreground">
                {r.testsAgo}
              </span>
            </li>
          );
        })}
      </ul>
      <ShowAllToggle
        total={sorted.length}
        limit={RECENCY_LIMIT}
        showAll={showAll}
        onToggle={() => setShowAll((v) => !v)}
      />
    </div>
  );
}
