import { IdentDot } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { RaceControls } from "./_components/race-controls";
import { RaceLanes } from "./_components/lanes";
import { RacePassage } from "./_components/passage";
import { RaceProvider } from "./_components/race-state";
import { RaceResults } from "./_components/race-results";
import { RaceSidebar } from "./_components/sidebar";
import { RaceTrace } from "./_components/trace";

export const metadata = buildPageMetadata({
  title: "Race",
  description:
    "flinttype 1v3 race against deterministic bots — live lane leaderboard, run trace, and live event feed.",
  path: "/race",
  noIndex: true,
});

export default function RacePage() {
  return (
    <AppChrome
      dark
      ident={<IdentDot emberDot>RACE · 1V3 · 50 WORDS</IdentDot>}
    >
      <RaceProvider>
        <RaceControls />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-7 px-5 py-9 sm:px-14">
            <RaceLanes />
            <RacePassage />
            <RaceResults />
            <RaceTrace />
          </div>
          <RaceSidebar />
        </div>
      </RaceProvider>
    </AppChrome>
  );
}
