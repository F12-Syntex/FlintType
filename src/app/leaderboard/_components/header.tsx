import { MobileLeaderboardPicker } from "./sidebar";

/** Sticky mobile header strip. Carries the bottom-sheet picker
 *  trigger so mobile users can change Mode / Window without the
 *  desktop rail. Hidden at lg+ — the sidebar covers everything. */
export function LeaderboardHeader() {
  return (
    <header
      data-ft-chrome
      data-no-export="true"
      className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur-md sm:px-8 sm:py-3 lg:hidden"
    >
      <MobileLeaderboardPicker />
    </header>
  );
}
