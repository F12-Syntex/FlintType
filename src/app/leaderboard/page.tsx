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
 *  picker in the header strip. */
export default function LeaderboardPage() {
  return (
    <AppChrome compact>
      <div className="grid h-full min-h-0 grid-cols-1 text-foreground lg:grid-cols-[220px_1fr] lg:gap-3 lg:py-3">
        <LeaderboardSidebar />

        <div
          data-bg-scope="content"
          className="relative min-h-0 overflow-hidden lg:rounded-md lg:border lg:border-border lg:bg-card/40"
        >
          <div className="absolute inset-0 overflow-y-auto">
            <LeaderboardHeader />
            <LeaderboardView />
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
