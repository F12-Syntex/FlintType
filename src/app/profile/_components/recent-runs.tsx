"use client";

import { Crown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageSection, Surface } from "@/components/page-shell";
import { ShareRunButton } from "@/components/share-run-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/relative-time";
import { lengthLabel, modeLabel } from "@/lib/test-name";
import type { HistoryTest } from "@/types/history";
import type { PersonalBest } from "./derive-stats";
import { pickRecordRunIds } from "./record-runs";

const PAGE_SIZE = 10;

/** Every completed run, newest first, ten at a time. WPM stays ink; an
 *  orange crown marks a run that *is* one of the numbers in Personal
 *  bests (`pickRecordRunIds`), so crowns stay rare and always agree with
 *  that section. The share button reveals on row hover on desktop and
 *  is always there on phones.
 *
 *  `handle` is the profile owner's identifier, used to build the share
 *  image link (`/r/<handle>-<wpm>wpm-<id>`). */
export function RecentRuns({
  tests,
  bests,
  handle,
  isOwner,
}: {
  tests: readonly HistoryTest[];
  /** The merged personal bests shown above (incl. any MonkeyType
   *  import), so a crown never contradicts them. */
  bests: readonly PersonalBest[];
  handle: string;
  isOwner: boolean;
}) {
  const completed = tests.filter((t) => t.wasCompleted);
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = completed.slice(0, shown);
  const remaining = Math.max(0, completed.length - shown);
  const pbIds = useMemo(() => pickRecordRunIds(tests, bests), [tests, bests]);

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
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-6 text-sm text-muted-foreground sm:px-6">
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

function RunRow({
  test,
  pb,
  handle,
}: {
  test: HistoryTest;
  pb: boolean;
  handle: string;
}) {
  const length = lengthLabel(test.lengthMode, test.durationOrWordCount);
  const mode = modeLabel(test.mode);
  return (
    <li className="group/row flex items-center justify-between gap-3 py-2 pr-2 pl-5 sm:py-3 sm:pr-6 sm:pl-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        {/* The length is the title ("60 seconds"); a non-Casual run adds
            its mode as an outline badge (ui-law §18.5). The length never
            truncates (a cut "1,00…" reads as another number): on a narrow
            phone the badge wraps under it, and below 375px the length
            itself breaks between words rather than spilling over. */}
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">{length}</span>
          {mode !== "Casual" ? (
            <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[11px]">
              {mode}
            </Badge>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">
          {relativeTime(test.startedAtMs)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 tabular-nums sm:gap-5">
        {/* Fixed minimum widths keep the errors and accuracy columns
            aligned down the list whatever the digit count. */}
        <span className="hidden min-w-16 text-right text-xs text-muted-foreground sm:inline">
          {test.errorCount} {test.errorCount === 1 ? "error" : "errors"}
        </span>
        <span className="min-w-12 text-right text-xs text-muted-foreground">
          {test.accuracy.toFixed(1)}%
        </span>
        <span className="flex w-14 items-baseline justify-end gap-1.5 sm:w-24">
          {pb ? (
            <Crown
              size={14}
              aria-label="Personal best"
              role="img"
              className="shrink-0 self-center text-primary"
            />
          ) : null}
          <span className="text-lg font-semibold leading-none text-foreground">
            {Math.round(test.wpm)}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            WPM
          </span>
        </span>
        <ShareRunButton
          testId={test.id}
          handle={handle}
          wpm={test.wpm}
          className="size-11 sm:size-8 sm:opacity-0 sm:transition-opacity sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
        />
      </div>
    </li>
  );
}
