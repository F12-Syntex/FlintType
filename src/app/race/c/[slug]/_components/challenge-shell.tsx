"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useBackend } from "@/lib/backend";
import { RaceShell, type RaceShellOnline } from "../../../_components/race-shell";
import type { RaceModeId } from "../../../_components/race-data";

const HOST_STORAGE_PREFIX = "flinttype.challenge.host.";

export function readHostStorage(slug: string): RaceShellOnline | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(HOST_STORAGE_PREFIX + slug);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RaceShellOnline;
  } catch {
    return null;
  }
}

export function writeHostStorage(slug: string, online: RaceShellOnline): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    HOST_STORAGE_PREFIX + slug,
    JSON.stringify(online),
  );
}

export function clearHostStorage(slug: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(HOST_STORAGE_PREFIX + slug);
}

/** Resolves the challenge room before mounting the RaceShell.
 *
 *  Two paths:
 *    1. Host arrived from /race after creating the challenge — their
 *       sessionToken + words are cached in sessionStorage (keyed by
 *       slug). We pick that up so the host doesn't double-join.
 *    2. Joiner arrived via a shared link — call challenge.join,
 *       which returns a new sessionToken + the room's words. */
export function ChallengeShell({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const backend = useBackend();
  const [resolved, setResolved] = useState<
    { state: "loading" }
    | { state: "ready"; online: RaceShellOnline }
    | { state: "error"; message: string }
  >({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const cached = readHostStorage(slug);
    if (cached) {
      setResolved({ state: "ready", online: cached });
      return;
    }
    (async () => {
      try {
        const res = await backend.race.challenge.join({ slug });
        if (cancelled) return;
        setResolved({
          state: "ready",
          online: {
            roomId: res.roomId,
            sessionToken: res.sessionToken,
            words: res.words,
            totalChars: res.totalChars,
            modeId: res.modeId as RaceModeId,
          },
        });
      } catch (err) {
        if (cancelled) return;
        setResolved({
          state: "error",
          message: err instanceof Error ? err.message : "challenge not found",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backend, slug]);

  if (resolved.state === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Joining challenge · {slug}…
        </span>
      </div>
    );
  }
  if (resolved.state === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Challenge unavailable
        </span>
        <p className="text-sm text-foreground/85">{resolved.message}</p>
      </div>
    );
  }
  return (
    <RaceShell
      initialOnline={resolved.online}
      initialModeId={resolved.online.modeId}
    >
      {children}
    </RaceShell>
  );
}
