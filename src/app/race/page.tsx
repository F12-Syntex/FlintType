import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { RaceControls } from "./_components/race-controls";
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

/** Layout mirrors `<TypingSurface>` on `/` so the race surface reads as
 *  the same product, not a side-mode with its own chrome:
 *    - AppChrome `compact` (footer hides on mobile, no extra scroll)
 *    - RaceControls as the top strip (matches practice's `<ModeBar>`)
 *    - Body uses the same `px-4 pt-4 pb-3 sm:px-12 sm:py-8 lg:px-20`
 *      vertical flex column the practice page lives in
 *    - Passage / burst surface sits flat on the page background (no
 *      card surround) so the typing area looks identical to /
 *    - Opponent positions strip mounts inside the surface — the
 *      practice page has nothing here, so we keep it slim
 *    - RaceResults takes over when finished (replaces the passage) */
export default function RacePage() {
  return (
    <AppChrome compact>
      <RaceShell>
        <RaceControls />
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-3 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <RaceSurface />
          </div>
          <RaceResults />
        </div>
      </RaceShell>
    </AppChrome>
  );
}
