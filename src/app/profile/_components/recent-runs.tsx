"use client";

import { Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HistoryTest } from "@/types/history";

/** How many runs to show on initial render, and how many to add on
 *  each Load more click. Ten matches the typical viewer's session
 *  span and keeps the section scannable without a scrolljack. */
const PAGE_SIZE = 10;

/** Recent runs ledger. Hairline-divided rows, no outer border. Each
 *  row is when · mode · WPM · accuracy, with a single Crown badge
 *  marking the PB for that (mode, length) bucket. Pagination loads
 *  more in-memory — the parent fetch already pulled up to 500 runs. */
export function RecentRuns({ tests }: { tests: readonly HistoryTest[] }) {
  const completed = tests.filter((t) => t.wasCompleted);
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = completed.slice(0, shown);
  const remaining = Math.max(0, completed.length - shown);
  const pbIds = pickPbIds(tests);

  return (
    <section className="mt-12 border-t border-border/60 pt-10 sm:mt-14 sm:pt-12">
      <SectionLabel>Recent runs</SectionLabel>

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
          <ul className="flex flex-col divide-y divide-border/60">
            {visible.map((t) => (
              <RunRow key={t.id} test={t} pb={pbIds.has(t.id)} />
            ))}
          </ul>
          {remaining > 0 ? (
            <button
              type="button"
              onClick={() => setShown((s) => s + PAGE_SIZE)}
              className={cn(
                "mt-2 self-start text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
                "transition-colors hover:text-foreground",
              )}
            >
              Load {Math.min(PAGE_SIZE, remaining)} more
              <span className="ml-2 text-muted-foreground/60 tabular-nums">
                {visible.length} / {completed.length}
              </span>
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

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
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:gap-x-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {formatWhen(test.startedAtMs)}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
            {prettyMode(test.mode)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {test.durationOrWordCount}
          </span>
        </div>
      </div>

      <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:inline">
        <span className="tabular-nums text-foreground">
          {test.errorCount}
        </span>{" "}
        err
      </span>

      <div className="flex items-baseline gap-3">
        {pb ? (
          <Crown
            size={14}
            aria-label="Personal best"
            className="self-center text-primary"
          />
        ) : null}
        <span className="text-xl font-bold tracking-[-0.02em] leading-none tabular-nums text-primary sm:text-2xl">
          {Math.round(test.wpm)}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
          {test.accuracy.toFixed(1)}%
        </span>
      </div>
    </li>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-4 bg-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Recent runs
      </span>
    </div>
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
