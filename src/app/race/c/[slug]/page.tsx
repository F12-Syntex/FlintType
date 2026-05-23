import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../../../_components/app-chrome";
import { RaceControls } from "../../_components/race-controls";
import { RaceResults } from "../../_components/race-results";
import { RaceSurface } from "../../_components/race-surface";
import { ChallengeShell } from "./_components/challenge-shell";

export const metadata = buildPageMetadata({
  title: "Race · Lobby",
  description: "Join a flinttype race lobby via your invite link.",
  path: "/race/c",
  noIndex: true,
});

/** Private-lobby join page — same chrome as /race, but the shell mounts
 *  in private-lobby mode: it asks the server for the room handle by slug
 *  (or pulls the host's pre-issued token from sessionStorage when
 *  the host created the lobby in this same browser). */
export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <AppChrome compact>
      <ChallengeShell slug={slug}>
        <RaceControls />
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-3 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <RaceSurface />
          </div>
          <RaceResults />
        </div>
      </ChallengeShell>
    </AppChrome>
  );
}
