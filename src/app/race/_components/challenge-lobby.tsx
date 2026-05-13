"use client";

import { useState } from "react";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { useRace } from "./race-state";

/** Lobby card shown above the typing area during the lobby phase of
 *  a challenge room. Renders in two shapes:
 *    - host  → share link + Start race button
 *    - guest → "waiting on the host" hint
 *
 *  Two providers feed it:
 *    - passage (online) — `onlineSnapshot.kind === "challenge"` + the
 *      server tells us the host identity and phase.
 *    - burst (offline) — no online snapshot exists; the URL is the
 *      slug, the host is always the local user, and the lobby phase
 *      comes from the offline reducer's `state.phase`. The
 *      `isChallenge` flag on the ctx tells us when we're in the
 *      offline-challenge variant.
 *
 *  Returns null in every other phase, and for matchmaking rooms
 *  (which don't have a host concept). Sits intentionally lightweight
 *  so it doesn't compete with the existing RacePoster behind it. */
export function ChallengeLobby() {
  const {
    state,
    onlineSnapshot,
    onlineSessionToken,
    onlineRoomId,
    isChallenge,
    challengeSlug,
  } = useRace();

  // Passage-online challenge path — snapshot is the source of truth.
  if (onlineSnapshot?.kind === "challenge") {
    if (onlineSnapshot.phase !== "lobby") return null;
    const me = onlineSnapshot.racers.find((r) => r.id === onlineSessionToken);
    const isHost = me?.isHost ?? false;
    const slug = onlineSnapshot.slug ?? "";
    return (
      <LobbyCard
        slug={slug}
        showHostBar={isHost}
        roomId={onlineRoomId ?? ""}
        sessionToken={onlineSessionToken ?? ""}
      />
    );
  }

  // Burst-offline challenge path — no snapshot, just the local
  // reducer. The local user is always the host (joiners would land
  // as spectators since burst rooms don't support multi-user
  // gameplay yet).
  if (isChallenge && challengeSlug && state.phase === "lobby") {
    return (
      <LobbyCard
        slug={challengeSlug}
        showHostBar={false}
        roomId=""
        sessionToken=""
      />
    );
  }

  return null;
}

/** Shared card body used by both the online and offline challenge
 *  paths. `showHostBar=true` reveals the share-link + Start-race
 *  buttons (Start-race fires the server `challenge.start` route).
 *  Offline-burst challenges pass `showHostBar=false` because the
 *  Start-race button for them already lives in the top action
 *  strip (`<ActionButton phase="lobby" isChallenge />` → fires the
 *  offline `startCountdown` action) — duplicating it here would
 *  read as two competing CTAs on the same surface. */
function LobbyCard({
  slug,
  showHostBar,
  roomId,
  sessionToken,
}: {
  slug: string;
  showHostBar: boolean;
  roomId: string;
  sessionToken: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-border/60 pt-4 text-center">
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Challenge · {slug}
      </span>
      {showHostBar ? (
        <HostBar slug={slug} roomId={roomId} sessionToken={sessionToken} />
      ) : (
        <ShareLink slug={slug} />
      )}
    </div>
  );
}

/** Just the share-link row (no Start button). Used by the offline
 *  burst-challenge path where the action button at the top of the
 *  surface already owns Start. */
function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/race/c/${slug}`
      : `/race/c/${slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Share this link", url);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3",
        "text-[11px] tabular-nums text-foreground",
        "transition-colors hover:border-foreground/40 hover:bg-accent/40",
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

function HostBar({
  slug,
  roomId,
  sessionToken,
}: {
  slug: string;
  roomId: string;
  sessionToken: string;
}) {
  const backend = useBackend();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/race/c/${slug}`
      : `/race/c/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (older browsers / iframe) — fall
      // back to a window.prompt so the user can still grab the URL.
      window.prompt("Share this link", url);
    }
  };

  const start = async () => {
    if (pending) return;
    setPending(true);
    try {
      await backend.race.challenge.start({ roomId, sessionToken });
    } catch {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={copy}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3",
          "text-[11px] tabular-nums text-foreground",
          "transition-colors hover:border-foreground/40 hover:bg-accent/40",
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
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3.5",
          "text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
          "transition-colors hover:bg-primary/90 active:translate-y-[0.5px]",
          pending && "cursor-wait opacity-60",
        )}
      >
        {pending ? "Starting…" : "Start race"}
      </button>
    </div>
  );
}
