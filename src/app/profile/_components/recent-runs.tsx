"use client";

import { Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageSection, Surface } from "@/components/page-shell";
import { ShareRunButton } from "@/components/share-run-button";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/relative-time";
import { shareLengthLabel } from "@/lib/share-length-label";
import type { HistoryTest } from "@/types/history";

const PAGE_SIZE = 10;

const MODE_LABEL: Record<string, string> = {
  race: "Race",
  training: "Adapt",
  reverse_adaptive: "Adapt",
  casual: "Casual",
};

/** Every completed run, newest first, ten at a time. WPM stays ink; an
 *  orange crown marks the fastest run at each mode + length. The share
 *  button reveals on row hover on desktop and is always there on phones.
 *
 *  `handle` is the profile owner's identifier, used to build the share
 *  image link (`/r/<handle>-<wpm>wpm-<id>`). */
export function RecentRuns({
  tests,
  handle,
  isOwner,
}: {
  tests: readonly HistoryTest[];
  handle: string;
  isOwner: boolean;
}) {
  const completed = tests.filter((t) => t.wasCompleted);
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = completed.slice(0, shown);
  const remaining = Math.max(0, completed.length - shown);
  const pbIds = pickPbIds(tests);

  return (
    <PageSection
      id="recent-runs"
      title="Recent runs"
      description={
        completed.length > 0
          ? `${completed.length} completed ${completed.length === 1 ? "test" : "tests"}`
          : undefined
      }
    >
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-6 text-sm text-muted-foreground">
          {isOwner ? (
            <>
              No completed runs yet.{" "}
              <Link
                href="/"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Take a test
              </Link>{" "}
              and it lands here.
            </>
          ) : (
            "No completed runs yet."
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Surface as="ul" className="divide-y divide-border/60 overflow-hidden">
            {visible.map((t) => (
              <RunRow
                key={t.id}
                test={t}
                pb={pbIds.has(t.id)}
                handle={handle}
              />
            ))}
          </Surface>
          {remaining > 0 ? (
            <Button
              variant="outline"
              onClick={() => setShown((s) => s + PAGE_SIZE)}
              className="h-11 w-full sm:h-9 sm:w-auto sm:self-center"
            >
              Show {Math.min(PAGE_SIZE, remaining)} more
              <span className="tabular-nums text-muted-foreground">
                {visible.length} of {completed.length}
              </span>
            </Button>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}

function pickPbIds(tests: readonly HistoryTest[]): Set<string> {
  const best = new Map<string, HistoryTest>();
  for (const t of tests) {
    if (!t.wasCompleted) continue;
    const key = `${t.mode}|${t.lengthMode ?? "legacy"}|${t.durationOrWordCount}`;
    const cur = best.get(key);
    if (!cur || t.wpm > cur.wpm) best.set(key, t);
  }
  return new Set(Array.from(best.values()).map((t) => t.id));
}

function RunRow({
  test,
  pb,
  handle,
}: {
  test: HistoryTest;
  pb: boolean;
  handle: string;
}) {
  const length = shareLengthLabel(test.lengthMode, test.durationOrWordCount);
  return (
    <li className="group/row flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {MODE_LABEL[test.mode] ?? "Casual"} · {length}
        </span>
        <span className="text-xs text-muted-foreground">
          {relativeTime(test.startedAtMs)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 tabular-nums sm:gap-5">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {test.errorCount} {test.errorCount === 1 ? "error" : "errors"}
        </span>
        <span className="text-xs text-muted-foreground">
          {test.accuracy.toFixed(1)}%
        </span>
        <span className="flex w-14 items-baseline justify-end gap-1.5 sm:w-24">
          {pb ? (
            <Crown
              size={14}
              aria-label="Personal best"
              className="shrink-0 self-center text-primary"
            />
          ) : null}
          <span className="text-lg font-semibold leading-none text-foreground">
            {Math.round(test.wpm)}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            wpm
          </span>
        </span>
        <ShareRunButton
          testId={test.id}
          handle={handle}
          wpm={test.wpm}
          className="size-9 sm:size-8 sm:opacity-0 sm:transition-opacity sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
        />
      </div>
    </li>
  );
}
