"use client";

import { useState } from "react";
import { useBackend } from "@/lib/backend";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { useRace } from "./race-state";

/** Lobby card shown above the typing area during the lobby phase of
 *  a challenge room. Renders in two shapes:
 *    - host  → share link + Start race button
 *    - guest → "waiting on the host" hint
 *
 *  Server snapshot is the source of truth — `onlineSnapshot.kind ===
 *  "challenge"` plus `onlineSnapshot.phase === "lobby"` is the only
 *  case this card renders. Returns null otherwise. */
export function ChallengeLobby() {
  const { onlineSnapshot, onlineSessionToken, onlineRoomId } = useRace();

  if (onlineSnapshot?.kind !== "challenge") return null;
  if (onlineSnapshot.phase !== "lobby") return null;
  const me = onlineSnapshot.racers.find((r) => r.id === onlineSessionToken);
  const isHost = me?.isHost ?? false;
  const slug = onlineSnapshot.slug ?? "";

  // Ready-up state (#26). Every present human who isn't the host must be
  // ready before the host's Start fires; bots are always ready and the
  // host readies implicitly by starting. Who-is-ready is shown per-lane
  // in the racetrack above (RaceLineupPanel); this card is just the
  // controls — share link, Ready toggle, Start.
  const humans = onlineSnapshot.racers.filter((r) => !r.isBot && !r.disconnected);
  const others = humans.filter((r) => !r.isHost);
  const readyCount = others.filter((r) => r.ready).length;
  const allReady = readyCount === others.length;

  return (
    <LobbyCard
      slug={slug}
      showHostBar={isHost}
      roomId={onlineRoomId ?? ""}
      sessionToken={onlineSessionToken ?? ""}
      meReady={me?.ready ?? false}
      readyCount={readyCount}
      otherCount={others.length}
      allReady={allReady}
    />
  );
}

/** Card body. `showHostBar=true` reveals the share-link + Start-race
 *  buttons (Start-race fires the server `challenge.start` route, gated
 *  on everyone being ready). Guests get a share-link + Ready toggle.
 *  The roster lives in the racetrack lanes above, not here. */
function LobbyCard({
  showHostBar,
  roomId,
  sessionToken,
  slug,
  meReady,
  readyCount,
  otherCount,
  allReady,
}: {
  slug: string;
  showHostBar: boolean;
  roomId: string;
  sessionToken: string;
  meReady: boolean;
  readyCount: number;
  otherCount: number;
  allReady: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-border/60 pt-4 text-center">
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Lobby · {slug}
      </span>
      {showHostBar ? (
        <HostBar
          slug={slug}
          roomId={roomId}
          sessionToken={sessionToken}
          allReady={allReady}
          otherCount={otherCount}
          readyCount={readyCount}
        />
      ) : (
        <div className="flex flex-col items-center gap-2.5">
          <ReadyToggle
            roomId={roomId}
            sessionToken={sessionToken}
            ready={meReady}
          />
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {meReady
              ? "Waiting for the host to start"
              : "Ready up so the host can start"}
          </span>
          <ShareLink slug={slug} />
        </div>
      )}
    </div>
  );
}

/** Non-host Ready toggle. Optimistic — flips instantly, then the
 *  setReady route + next snapshot confirm. */
function ReadyToggle({
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
  const toggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      await backend.race.setReady({ roomId, sessionToken, ready: !ready });
    } catch {
      // ignore — the snapshot stays authoritative
    } finally {
      setPending(false);
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={ready}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-md px-7 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors active:translate-y-[0.5px]",
        ready
          ? "border border-primary/40 bg-primary/[0.08] text-primary hover:bg-primary/[0.14]"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        pending && "cursor-wait opacity-60",
      )}
    >
      {ready ? "Ready ✓" : "Ready up"}
    </button>
  );
}

/** Absolute share URL for a lobby slug (falls back to a relative path
 *  during SSR where `window` is absent). */
function lobbyUrl(slug: string): string {
  return typeof window !== "undefined"
    ? `${window.location.origin}/race/c/${slug}`
    : `/race/c/${slug}`;
}

/** Share-link button: the lobby URL + a Copy/Copied affordance. Shared
 *  by the guest row and the host bar (clipboard via useCopyToClipboard). */
function CopyLinkButton({ url }: { url: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      type="button"
      onClick={() => copy(url)}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3",
        "text-[11px] tabular-nums text-foreground",
        "transition-colors hover:border-foreground/40 hover:bg-accent",
      )}
    >
      <span className="truncate max-w-[14rem]">{url}</span>
      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.18em]",
          copied ? "text-primary" : "text-muted-foreground",
        )}
      >
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

/** Share-link row (no Start button) — rendered for non-host viewers. */
function ShareLink({ slug }: { slug: string }) {
  return <CopyLinkButton url={lobbyUrl(slug)} />;
}

function HostBar({
  slug,
  roomId,
  sessionToken,
  allReady,
  otherCount,
  readyCount,
}: {
  slug: string;
  roomId: string;
  sessionToken: string;
  allReady: boolean;
  otherCount: number;
  readyCount: number;
}) {
  const backend = useBackend();
  const [pending, setPending] = useState(false);

  const start = async (force: boolean) => {
    if (pending || (!force && !allReady)) return;
    setPending(true);
    try {
      await backend.race.challenge.start({ roomId, sessionToken, force });
    } catch {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
    <div className="flex flex-wrap items-center justify-center gap-2">
      <CopyLinkButton url={lobbyUrl(slug)} />
      <button
        type="button"
        onClick={() => start(false)}
        disabled={pending || !allReady}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3.5",
          "text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
          "transition-colors hover:bg-primary/90 active:translate-y-[0.5px]",
          (pending || !allReady) && "cursor-not-allowed opacity-50",
        )}
      >
        {pending ? "Starting…" : "Start race"}
      </button>
    </div>
    {otherCount > 0 && !allReady ? (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Waiting for everyone to ready up · {readyCount}/{otherCount}
        </span>
        <button
          type="button"
          onClick={() => start(true)}
          disabled={pending}
          className={cn(
            "inline-flex h-8 items-center rounded-md border border-foreground/25 px-3.5",
            "text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground",
            "transition-colors hover:border-foreground/40 hover:bg-accent",
            pending && "cursor-not-allowed opacity-50",
          )}
        >
          {pending ? "Starting…" : "Force start now"}
        </button>
      </div>
    ) : null}
    </div>
  );
}
