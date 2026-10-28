import { Suspense } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { VIEW_DESCRIPTIONS } from "./_components/filters";
import { LeaderboardView } from "./_components/leaderboard-view";
import { BoardSkeleton } from "./_components/shared-list";
import { ViewDescription } from "./_components/view-description";

export const metadata = buildPageMetadata({
  title: "Leaderboard — top WPM scores on flinttype",
  description:
    "Live global leaderboard of the fastest WPM typing-test runs on flinttype. Ranked by net WPM (raw WPM × accuracy), filterable by mode and time window. Race in and climb the table.",
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
