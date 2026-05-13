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
  return (
    <LobbyCard
      slug={slug}
      showHostBar={isHost}
      roomId={onlineRoomId ?? ""}
      sessionToken={onlineSessionToken ?? ""}
    />
  );
}

/** Card body. `showHostBar=true` reveals the share-link + Start-race
 *  buttons (Start-race fires the server `challenge.start` route).
 *  Guests get a share-link-only variant. */
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

/** Share-link row (no Start button) — rendered for non-host viewers. */
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
