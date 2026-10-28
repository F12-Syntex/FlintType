import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { RaceBody } from "./_components/race-body";
import { RaceColumn } from "./_components/race-column";
import { RaceControls } from "./_components/race-controls";
import { RaceShell } from "./_components/race-shell";

export const metadata = buildPageMetadata({
  title: "Race",
  description:
    "Race other typists live on flinttype. Find a public race in one click, or open a private lobby and share the link so friends type the same passage with you.",
  path: "/race",
});

/** Layout mirrors `<TypingSurface>` on `/` so the race surface reads as
 *  the same product, not a side-mode with its own chrome:
 *    - AppChrome `compact` (footer hides on mobile, no extra scroll)
 *    - one centred max-w-5xl column (`<RaceColumn>`), the same column
 *      practice uses, so no edge moves between practice and races
 *    - RaceControls as the top strip in a room (a single Leave race);
 *      nothing while idle, where the body is the centred launcher
 *    - RaceBody routes by phase: launcher → lineup + lobby → passage →
 *      results card first once the race is over */
export default function RacePage() {
  return (
    <AppChrome compact>
      <RaceShell>
        <RaceColumn>
          <RaceControls />
          <RaceBody />
        </RaceColumn>
      </RaceShell>
    </AppChrome>
  );
}
