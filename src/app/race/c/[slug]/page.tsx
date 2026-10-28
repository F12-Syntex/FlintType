import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../../../_components/app-chrome";
import { RaceBody } from "../../_components/race-body";
import { RaceColumn } from "../../_components/race-column";
import { RaceControls } from "../../_components/race-controls";
import { ChallengeShell } from "./_components/challenge-shell";

export const metadata = buildPageMetadata({
  title: "Race · Lobby",
  description: "Join a flinttype race lobby via your invite link.",
  path: "/race/c",
  noIndex: true,
});

/** Private-lobby join page — same chrome and body as /race, but the
 *  shell mounts in private-lobby mode: it asks the server for the room
 *  handle by slug (or pulls the host's pre-issued token from
 *  sessionStorage when the host created the lobby in this same
 *  browser). RaceBody is shared so the finished layout (results card
 *  first) is identical to a public race. */
export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <AppChrome compact>
      <RaceColumn>
        <ChallengeShell slug={slug}>
          <RaceControls />
          <RaceBody />
        </ChallengeShell>
      </RaceColumn>
    </AppChrome>
  );
}
