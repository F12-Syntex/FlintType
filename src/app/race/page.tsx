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

/** Layout: a single flex column that fills the AppChrome scroll
 *  region top-to-bottom. RaceControls sits at the top, the main row
 *  takes the remaining height and splits into a flex-1 racing column
 *  plus a fixed 320px sidebar on lg+. On smaller viewports the sidebar
 *  stacks below the racing column. Lanes have a fixed min-height
 *  (set inside the component); the passage grows to fill whatever
 *  height is left so the whole viewport is used instead of leaving
 *  empty space below. */
export default function RacePage() {
  return (
    <AppChrome>
      <RaceShell>
        <div className="flex flex-1 flex-col">
          <RaceControls />
          <main className="flex flex-1 flex-col gap-6 px-4 py-5 sm:px-10 sm:py-7 lg:flex-row lg:gap-8 lg:px-14 lg:py-8">
            <section className="flex flex-1 flex-col gap-6 lg:min-w-0">
              <RaceLanes />
              <RacePassage />
              <RaceResults />
            </section>
            <RaceSidebar />
          </main>
        </div>
      </RaceShell>
    </AppChrome>
  );
}
