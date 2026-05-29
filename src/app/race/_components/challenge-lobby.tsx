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

  // Ready-up state (#26). Every present human who isn't the host must be
  // ready before the host's Start fires; bots are always ready and the
  // host readies implicitly by starting.
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
      racers={humans}
      meReady={me?.ready ?? false}
      readyCount={readyCount}
      otherCount={others.length}
      allReady={allReady}
    />
  );
}

/** Card body. `showHostBar=true` reveals the share-link + Start-race
 *  buttons (Start-race fires the server `challenge.start` route, gated
 *  on everyone being ready). Guests get a share-link + Ready toggle. */
function LobbyCard({
  slug,
  showHostBar,
  roomId,
  sessionToken,
  racers,
  meReady,
  readyCount,
  otherCount,
  allReady,
}: {
  slug: string;
  showHostBar: boolean;
  roomId: string;
  sessionToken: string;
  racers: { id: string; name: string; isHost: boolean; ready: boolean }[];
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
      <RosterReady racers={racers} />
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
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ShareLink slug={slug} />
          <ReadyToggle
            roomId={roomId}
            sessionToken={sessionToken}
            ready={meReady}
          />
        </div>
      )}
    </div>
  );
}

/** Per-racer ready row so everyone sees who's set. A small dot + name;
 *  the host is marked, and a coral tick once a player is ready. */
function RosterReady({
  racers,
}: {
  racers: { id: string; name: string; isHost: boolean; ready: boolean }[];
}) {
  if (racers.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {racers.map((r) => (
        <li
          key={r.id}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              r.isHost || r.ready ? "bg-primary" : "bg-muted-foreground/40",
            )}
          />
          <span className="truncate max-w-[10rem] text-foreground">{r.name}</span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
            {r.isHost ? "host" : r.ready ? "ready" : "not ready"}
          </span>
        </li>
      ))}
    </ul>
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
        "inline-flex h-8 items-center gap-2 rounded-md px-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors active:translate-y-[0.5px]",
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
    if (pending || !allReady) return;
    setPending(true);
    try {
      await backend.race.challenge.start({ roomId, sessionToken });
    } catch {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={copy}
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
      <button
        type="button"
        onClick={start}
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
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Waiting for everyone to ready up · {readyCount}/{otherCount}
      </span>
    ) : null}
    </div>
  );
}
