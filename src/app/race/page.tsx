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

/** Layout: matches the customise screen so the user sees one chrome
 *  pattern across config-style surfaces.
 *    - RaceControls pinned to the top of the scroll region
 *    - lg+ splits into a 280px left rail (RaceSidebar — floating
 *      panel, rounded border, blurred background) and a 1fr column
 *      hosting Lanes, Passage, Results
 *    - <lg the sidebar collapses below the racing column so mobile
 *      keeps the typing area as the visual lead */
export default function RacePage() {
  return (
    <AppChrome>
      <RaceShell>
        <div className="flex flex-1 flex-col">
          <RaceControls />
          <main className="grid flex-1 grid-cols-1 gap-6 px-4 py-5 sm:px-10 sm:py-7 lg:grid-cols-[280px_1fr] lg:gap-6 lg:px-6 lg:py-6">
            <RaceSidebar />
            <section className="flex flex-col gap-6 lg:min-w-0">
              <RaceLanes />
              <RacePassage />
              <RaceResults />
            </section>
          </main>
        </div>
      </RaceShell>
    </AppChrome>
  );
}
