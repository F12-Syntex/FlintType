import { IdentDot } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { RaceLanes } from "./_components/lanes";
import { RacePassage } from "./_components/passage";
import { RaceSidebar } from "./_components/sidebar";
import { RaceTrace } from "./_components/trace";

export const metadata = buildPageMetadata({
  title: "Race",
  description: "flinttype live race — 1v3 typing race with run trace, race feed, and season ladder.",
  path: "/app/race",
  noIndex: true,
});

export default function RacePage() {
  return (
    <AppChrome
      dark
      ident={<IdentDot emberDot>RACE #4081 · 1V3 · 50 WORDS</IdentDot>}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#221F1A] px-5 py-3.5 sm:px-14">
        <div className="flex flex-wrap items-baseline gap-3 sm:gap-8">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ft-ember">
            ● RACE LIVE · 0:14 ELAPSED
          </span>
          <span className="text-[11px] tracking-wide text-[#B5AF9F]">
            Round 1 of 3 · seasonal ladder · ranked
          </span>
        </div>
        <div className="hidden gap-6 text-[10px] uppercase tracking-[0.16em] text-[#B5AF9F] md:flex">
          <span>YOUR RANK · #1,284</span>
          <span>SEASON · 12 days left</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-7 px-5 py-9 sm:px-14">
          <RaceLanes />
          <RacePassage />
          <RaceTrace />
        </div>
        <RaceSidebar />
      </div>
    </AppChrome>
  );
}
