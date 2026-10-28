"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ShareRunButton } from "@/components/share-run-button";
import { buttonVariants } from "@/components/ui/button";
import { relativeTime } from "@/lib/relative-time";
import { shareLengthLabel } from "@/lib/share-length-label";
import { cn } from "@/lib/utils";
import type { HistoryTest } from "@/types/history";
import { Panel } from "./panel";

const MODE_LABEL: Record<string, string> = {
  race: "Race",
  training: "Adapt",
  reverse_adaptive: "Reverse",
  casual: "Casual",
};

/** "98.4%", or "100%" rather than "100.0%". */
function formatAccuracy(accuracy: number): string {
  return `${Number(accuracy.toFixed(1))}%`;
}

/** The latest six completed runs. WPM stays ink (the trend line is the
 *  page's data spark); "View all" hands off to the profile's full list. */
export function RecentTests({ tests }: { tests: readonly HistoryTest[] }) {
  // Insights only ever renders the signed-in user's own data, so the
  // share slug handle is the viewer's own Clerk handle.
  const { user } = useUser();
  const handle =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    "racer";
  const completed = tests.filter((t) => t.wasCompleted).slice(0, 6);

  return (
    <Panel
      title="Recent runs"
      aside={
        completed.length > 0 ? (
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-mr-2 h-9 sm:h-8",
            )}
          >
            View all
          </Link>
        ) : null
      }
      bodyClassName="px-0 pt-1 pb-1 sm:px-0 sm:pb-1"
    >
      {completed.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-5">
          No runs yet.{" "}
          <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
            Take a test
          </Link>{" "}
          and your results land here.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {completed.map((t) => (
            <li
              key={t.id}
              className="group/row flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">
                  {MODE_LABEL[t.mode] ?? "Casual"} ·{" "}
                  {shareLengthLabel(t.lengthMode, t.durationOrWordCount)}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {relativeTime(t.startedAtMs)} · {formatAccuracy(t.accuracy)} acc
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 tabular-nums">
                <span className="min-w-16 text-right">
                  <span className="text-base font-semibold text-foreground">
                    {Math.round(t.wpm)}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">wpm</span>
                </span>
                <ShareRunButton
                  testId={t.id}
                  handle={handle}
                  wpm={t.wpm}
                  className="size-9 sm:size-7 sm:opacity-0 sm:transition-opacity sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
