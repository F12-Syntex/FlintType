"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBackend } from "@/lib/backend";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { raceErrorMessage } from "./race-errors";
import { useRace } from "./race-state";

/** Private-lobby controls, shown under the lineup card during the lobby
 *  phase of a challenge room. Two shapes:
 *    - host  → share link + Start race (+ Force start while people are
 *              still readying up)
 *    - guest → Ready up toggle + share link
 *
 *  Who is ready is shown per lane in the lineup above, so this block is
 *  only the controls. The primary action is always a `size="lg"` button
 *  (44px touch target) and any failure shows as a visible destructive
 *  line under it (ui-law §6.3).
 *
 *  Server snapshot is the source of truth — `onlineSnapshot.kind ===
 *  "challenge"` plus `onlineSnapshot.phase === "lobby"` is the only
 *  case this renders. Returns null otherwise. */
export function ChallengeLobby() {
  const { onlineSnapshot, onlineSessionToken, onlineRoomId } = useRace();

  if (onlineSnapshot?.kind !== "challenge") return null;
  if (onlineSnapshot.phase !== "lobby") return null;
  const me = onlineSnapshot.racers.find((r) => r.id === onlineSessionToken);
  const isHost = me?.isHost ?? false;
  const slug = onlineSnapshot.slug ?? "";

  // Ready-up state (#26). Every present human who isn't the host must be
  // ready before the host's Start fires; bots are always ready and the
  // host readies implicitly by starting.
  const humans = onlineSnapshot.racers.filter((r) => !r.isBot && !r.disconnected);
  const others = humans.filter((r) => !r.isHost);
  const readyCount = others.filter((r) => r.ready).length;
  const allReady = readyCount === others.length;
  const roomId = onlineRoomId ?? "";
  const sessionToken = onlineSessionToken ?? "";

  return (
    <section
      aria-label="Lobby controls"
      className="flex shrink-0 flex-col items-center gap-4 text-center"
    >
      {isHost ? (
        <HostControls
          roomId={roomId}
          sessionToken={sessionToken}
          allReady={allReady}
          otherCount={others.length}
          readyCount={readyCount}
        />
      ) : (
        <GuestControls
          roomId={roomId}
          sessionToken={sessionToken}
          ready={me?.ready ?? false}
        />
      )}
      <ShareLink slug={slug} />
    </section>
  );
}

/** Host: Start race (orange, lg). Disabled until every guest is ready;
 *  while they aren't, a counter + an outline "Force start" escape hatch
 *  sit underneath. With nobody else in the lobby it starts at once. */
function HostControls({
  roomId,
  sessionToken,
  allReady,
  otherCount,
  readyCount,
}: {
  roomId: string;
  sessionToken: string;
  allReady: boolean;
  otherCount: number;
  readyCount: number;
}) {
  const backend = useBackend();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (force: boolean) => {
    if (pending || (!force && !allReady)) return;
    setPending(true);
    setError(null);
    try {
      await backend.race.challenge.start({ roomId, sessionToken, force });
      // Success: the next snapshot moves the room into the countdown and
      // this block unmounts, so `pending` never needs resetting here.
    } catch (err) {
      setPending(false);
      setError(raceErrorMessage(err, "Couldn't start the race. Try again."));
    }
  };

  const waiting = otherCount > 0 && !allReady;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <Button
        size="lg"
        onClick={() => start(false)}
        disabled={pending || !allReady}
        className="w-full px-8 sm:w-auto"
      >
        {pending ? "Starting…" : "Start race"}
      </Button>
      {waiting ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Waiting for everyone to ready up.{" "}
            <span className="tabular-nums text-foreground">
              {readyCount} of {otherCount}
            </span>{" "}
            ready.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => start(true)}
            disabled={pending}
            className="h-11 px-4 sm:h-8 sm:px-3"
          >
            Force start now
          </Button>
        </div>
      ) : otherCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Share the link to invite people, or start on your own.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Guest: Ready up toggle. Not ready → the orange primary "Ready up".
 *  Ready → an orange-outlined pressed state ("Ready") that un-readies on
 *  click — still the brand colour, never a neutral grey. The setReady
 *  route + next snapshot confirm; a failure shows under the button. */
function GuestControls({
  roomId,
  sessionToken,
  ready,
}: {
  roomId: string;
  sessionToken: string;
  ready: boolean;
}) {
  const backend = useBackend();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await backend.race.setReady({ roomId, sessionToken, ready: !ready });
    } catch (err) {
      setError(
        raceErrorMessage(
          err,
          ready ? "Couldn't un-ready. Try again." : "Couldn't ready up. Try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <Button
        size="lg"
        variant={ready ? "outline" : "default"}
        aria-pressed={ready}
        onClick={toggle}
        disabled={pending}
        className={cn(
          "w-full px-8 sm:w-auto",
          ready &&
            "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        )}
      >
        {ready ? (
          <>
            <Check aria-hidden />
            Ready
          </>
        ) : (
          "Ready up"
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        {ready
          ? "Waiting for the host to start."
          : "Ready up so the host can start the race."}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Absolute share URL for a lobby slug (falls back to a relative path
 *  during SSR where `window` is absent). */
function lobbyUrl(slug: string): string {
  return typeof window !== "undefined"
    ? `${window.location.origin}/race/c/${slug}`
    : `/race/c/${slug}`;
}

/** The lobby's invite link as a single pill: the URL (truncated) and a
 *  Copy / Copied affordance, all one click target. The "Lobby code"
 *  label above it names the room. */
function ShareLink({ slug }: { slug: string }) {
  const { copied, copy } = useCopyToClipboard();
  const url = lobbyUrl(slug);
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <span className="text-xs text-muted-foreground">
        Lobby code <span className="font-mono font-medium text-foreground">{slug}</span>
      </span>
      <Button
        variant="outline"
        onClick={() => copy(url)}
        aria-label={copied ? "Invite link copied" : `Copy invite link ${url}`}
        className="h-11 w-full max-w-full justify-between gap-3 pr-3 font-normal sm:h-9"
      >
        <span className="min-w-0 truncate tabular-nums text-muted-foreground">
          {url}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
            copied ? "text-primary" : "text-foreground",
          )}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy link"}
        </span>
      </Button>
    </div>
  );
}
