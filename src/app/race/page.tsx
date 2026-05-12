import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { RaceHud } from "./_components/race-hud";
import { RaceResults } from "./_components/race-results";
import { RaceShell } from "./_components/race-shell";
import { RaceSurface } from "./_components/race-surface";

export const metadata = buildPageMetadata({
  title: "Race",
  description:
    "Race against deterministic bots — pick your mode, share the same passage, race to the line.",
  path: "/race",
  noIndex: true,
});

/** Simplified single-column layout. Client feedback was that the older
 *  three-section grid (sidebar + lanes + passage + controls) read as
 *  too admin-panel-y. The new shape is one HUD strip, the passage,
 *  and the results — closer to /app, less to scan. The opponent
 *  positions still appear, just as a thin pip strip inside the
 *  surface itself instead of a full leaderboard column. */
export default function RacePage() {
  return (
    <AppChrome>
      <RaceShell>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10 lg:px-16">
          <div className="mx-auto flex max-w-4xl flex-col gap-5">
            <RaceHud />
            <RaceSurface />
            <RaceResults />
          </div>
        </main>
      </RaceShell>
    </AppChrome>
  );
}
