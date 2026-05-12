import { IdentDot } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { RaceControls } from "./_components/race-controls";
import { RaceLanes } from "./_components/lanes";
import { RacePassage } from "./_components/passage";
import { RaceResults } from "./_components/race-results";
import { RaceShell } from "./_components/race-shell";
import { RaceSidebar } from "./_components/sidebar";

export const metadata = buildPageMetadata({
  title: "Race",
  description:
    "Race against deterministic bots — pick your mode, share the same passage, race to the line.",
  path: "/race",
  noIndex: true,
});

export default function RacePage() {
  return (
    <AppChrome ident={<IdentDot emberDot>RACE · LIVE</IdentDot>}>
      <RaceShell>
        <RaceControls />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-7 px-5 py-9 sm:px-14">
            <RaceLanes />
            <RacePassage />
            <RaceResults />
          </div>
          <RaceSidebar />
        </div>
      </RaceShell>
    </AppChrome>
  );
}
