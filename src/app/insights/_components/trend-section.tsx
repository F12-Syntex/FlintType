import Link from "next/link";
import { PageSection } from "@/components/page-shell";
import type { HistoryTest } from "@/types/history";
import { TREND_WINDOW, TrendPanel } from "./insights-trend";
import { TwoUp } from "./panel";
import { RecentTests } from "./recent-tests";

/** "Trend": the WPM chart beside the recent runs, once there's enough
 *  to draw. Never a half-empty card (ui-law §5 "Two-up cards"):
 *  - no runs: one dashed line with a link to take a test;
 *  - one run: the runs card alone, full width, and a muted line saying
 *    when the chart appears;
 *  - two or more: chart | runs two-up. */
export function TrendSection({ tests }: { tests: readonly HistoryTest[] }) {
  const completed = tests.filter((t) => t.wasCompleted).length;
  const plotted = Math.min(completed, TREND_WINDOW);

  return (
    <PageSection
      id="trend"
      title="Trend"
      description={
        plotted >= 2
          ? `Your last ${plotted} completed tests.`
          : "Your most recent completed tests."
      }
    >
      {completed === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-6 text-sm text-muted-foreground">
          No runs yet.{" "}
          <Link
            href="/"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Take a test
          </Link>{" "}
          and your trend shows up here.
        </p>
      ) : completed === 1 ? (
        <div className="flex flex-col gap-3">
          <RecentTests tests={tests} />
          <p className="text-sm text-muted-foreground">
            Your WPM chart appears after 2 tests.
          </p>
        </div>
      ) : (
        <TwoUp>
          <TrendPanel tests={tests} />
          <RecentTests tests={tests} />
        </TwoUp>
      )}
    </PageSection>
  );
}
