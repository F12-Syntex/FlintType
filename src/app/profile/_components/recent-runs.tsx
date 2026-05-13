"use client";

import { Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HistoryTest } from "@/types/history";
import { ProfileSection } from "./profile-section";

/** How many runs to show on initial render, and how many to add on
 *  each Load more click. Ten matches the typical viewer's session
 *  span and keeps the section scannable without a scrolljack. */
const PAGE_SIZE = 10;

/** Recent-runs list. One row per completed test, hairline-divided.
 *  Each row reads as a small editorial summary: when it ran (left),
 *  mode + length pill (middle), big primary WPM + tiny accuracy
 *  (right). The single highest WPM for each (mode, length) bucket
 *  carries a Crown badge so a PB stands out at a glance — the same
 *  bucketing used by /personal-bests.
 *
 *  Pagination is client-side: the parent fetch (`history.summary`)
 *  already pulls up to 500 recent runs, so a Load more click is a
 *  free in-memory slice rather than another network round-trip. */
export function RecentRuns({ tests }: { tests: readonly HistoryTest[] }) {
  const completed = tests.filter((t) => t.wasCompleted);
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = completed.slice(0, shown);
  const remaining = Math.max(0, completed.length - shown);
  const pbIds = pickPbIds(tests);

  return (
    <ProfileSection label="Recent runs" noBorder>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No completed runs yet — kick one off at{" "}
          <Link href="/" className="text-primary hover:underline">
            /app
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {visible.map((t) => (
              <RunRow key={t.id} test={t} pb={pbIds.has(t.id)} />
            ))}
          </ul>
          {remaining > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShown((s) => s + PAGE_SIZE)}
              className="self-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Load {Math.min(PAGE_SIZE, remaining)} more
              <span className="ml-2 text-muted-foreground/60 tabular-nums">
                {visible.length} / {completed.length}
              </span>
            </Button>
          ) : null}
        </div>
      )}
    </ProfileSection>
  );
}

/** Walks the full history once and returns the test id with the
 *  highest WPM for each (mode, durationOrWordCount) bucket. Ties
 *  resolve to the earlier run — once the bucket is claimed it stays
 *  until someone clearly beats the number. */
function pickPbIds(tests: readonly HistoryTest[]): Set<string> {
  const best = new Map<string, HistoryTest>();
  for (const t of tests) {
    if (!t.wasCompleted) continue;
    const key = `${t.mode}|${t.durationOrWordCount}`;
    const cur = best.get(key);
    if (!cur || t.wpm > cur.wpm) best.set(key, t);
  }
  return new Set(Array.from(best.values()).map((t) => t.id));
}

function RunRow({ test, pb }: { test: HistoryTest; pb: boolean }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.02] sm:grid-cols-[1fr_auto_auto] sm:gap-6 sm:px-5 sm:py-4">
      {/* Left: when + mode pill */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {formatWhen(test.startedAtMs)}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md border border-border bg-card px-2 py-0.5",
              "text-[10px] font-medium uppercase tracking-[0.16em] text-foreground",
            )}
          >
            {prettyMode(test.mode)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {test.durationOrWordCount}
          </span>
        </div>
      </div>

      {/* Middle (sm+): error count, quiet */}
      <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
        <span className="tabular-nums text-foreground">
          {test.errorCount}
        </span>{" "}
        err
      </span>

      {/* Right: WPM big + accuracy small + PB crown when applicable */}
      <div className="flex items-baseline gap-3">
        {pb ? (
          <Crown
            size={16}
            aria-label="Personal best"
            className="self-center text-primary"
          />
        ) : null}
        <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums leading-none text-primary sm:text-[28px]">
          {Math.round(test.wpm)}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
          {test.accuracy.toFixed(1)}%
        </span>
      </div>
    </li>
  );
}

function prettyMode(m: string): string {
  if (m === "training" || m === "reverse_adaptive") return "training";
  return m;
}

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diff = (now - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d ago`;
  return d.toLocaleDateString();
}
