"use client";

import { useState } from "react";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { useRace } from "./race-state";

/** Lobby card shown above the typing area during the lobby phase of
 *  a challenge room. Two variants:
 *    - host  → share link + Start race button
 *    - guest → "waiting on the host" hint
 *
 *  Returns null in every other phase or for matchmaking rooms (which
 *  don't have a host concept). Sits intentionally lightweight so it
 *  doesn't compete with the existing RacePoster behind it. */
export function ChallengeLobby() {
  const { onlineSnapshot, onlineSessionToken, onlineRoomId } = useRace();
  const snap = onlineSnapshot ?? null;
  if (!snap || snap.kind !== "challenge") return null;
  if (snap.phase !== "lobby") return null;

  const me = snap.racers.find((r) => r.id === onlineSessionToken);
  const isHost = me?.isHost ?? false;
  const slug = snap.slug ?? "";

  return (
    <div className="flex flex-col items-center gap-3 border-t border-border/60 pt-4 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Challenge · {slug}
      </span>
      {isHost ? (
        <HostBar slug={slug} roomId={onlineRoomId ?? ""} sessionToken={onlineSessionToken ?? ""} />
      ) : (
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Waiting on the host to start the race
        </span>
      )}
    </div>
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
          "font-mono text-[11px] tabular-nums text-foreground",
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
          "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
          "transition-colors hover:bg-primary/90 active:translate-y-[0.5px]",
          pending && "cursor-wait opacity-60",
        )}
      >
        {pending ? "Starting…" : "Start race"}
      </button>
    </div>
  );
}
