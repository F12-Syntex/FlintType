import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { LeaderboardView } from "./_components/leaderboard-view";

export const metadata = buildPageMetadata({
  title: "Leaderboard — top WPM scores on flinttype",
  description:
    "Live global leaderboard of the fastest WPM typing-test runs on flinttype. Ranked by net WPM (raw WPM × accuracy), filterable by mode and time window. Race in and climb the table.",
  path: "/leaderboard",
});

export default function LeaderboardPage() {
  return (
    <AppChrome>
      <LeaderboardView />
    </AppChrome>
  );
}
