import { Suspense } from "react";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { LeaderboardHeader } from "./_components/header";
import { LeaderboardView } from "./_components/leaderboard-view";
import { LeaderboardSidebar } from "./_components/sidebar";

export const metadata = buildPageMetadata({
  title: "Leaderboard — top WPM scores on flinttype",
  description:
    "Live global leaderboard of the fastest WPM typing-test runs on flinttype. Ranked by net WPM (raw WPM × accuracy), filterable by mode and time window. Race in and climb the table.",
  path: "/leaderboard",
});

/** /leaderboard. Two-column shell like /customise — a filter rail on
 *  the left (Mode + Window), full-width ranked table on the right.
 *  Mobile collapses to a single column with a sticky bottom-sheet
 *  picker in the header strip.
 *
 *  Suspense wrapping is non-optional: every client child below reads
 *  `useSearchParams()`, which Next requires to sit inside a Suspense
 *  boundary or the prerender bails. We wrap each sub-tree separately
 *  so a slow sidebar can't block the table's initial paint. */
export default function LeaderboardPage() {
  return (
    <AppChrome compact>
      <div className="grid h-full min-h-0 grid-cols-1 text-foreground lg:grid-cols-[var(--app-rail-width)_1fr] lg:gap-3 lg:py-3">
        <Suspense fallback={<SidebarFallback />}>
          <LeaderboardSidebar />
        </Suspense>

        <div
          data-bg-scope="content"
          className="relative min-h-0 overflow-hidden lg:rounded-md lg:border lg:border-border lg:bg-card"
        >
          <div className="absolute inset-0 overflow-y-auto">
            <Suspense fallback={null}>
              <LeaderboardHeader />
            </Suspense>
            <Suspense fallback={null}>
              <LeaderboardView />
            </Suspense>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

/** Static skeleton matching the LeaderboardSidebar frame. Renders on
 *  the server so the prerendered HTML still carries the rail
 *  structure; the live nav hydrates over it. */
function SidebarFallback() {
  return (
    <div
      aria-hidden
      className="hidden lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:rounded-md lg:border lg:border-border lg:bg-background/85"
    />
  );
}
