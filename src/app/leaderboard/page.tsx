import { Suspense } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { VIEW_DESCRIPTIONS } from "./_components/filters";
import { LeaderboardView } from "./_components/leaderboard-view";
import { BoardSkeleton } from "./_components/shared-list";
import { ViewDescription } from "./_components/view-description";

export const metadata = buildPageMetadata({
  title: "Leaderboard",
  description:
    "The fastest typing tests on flinttype, ranked by net WPM. Filter by Casual or Adapt mode, test length and time window, or compare with friends.",
  path: "/leaderboard",
});

/** /leaderboard. A normal scrolling page: header, one filter toolbar and
 *  the ranked board. Filters live in the URL.
 *
 *  Suspense is required: the client children read `useSearchParams()`,
 *  which Next wants inside a boundary or the prerender bails. */
export default function LeaderboardPage() {
  return (
    <AppChrome>
      <PageShell>
        <PageHeader
          title="Leaderboard"
          description={
            <Suspense fallback={VIEW_DESCRIPTIONS.table}>
              <ViewDescription />
            </Suspense>
          }
        />
        <Suspense fallback={<BoardSkeleton />}>
          <LeaderboardView />
        </Suspense>
      </PageShell>
    </AppChrome>
  );
}
