"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
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
    | { state: "loading" }
    | { state: "ready"; online: RaceShellOnline }
    | { state: "error"; kind: ChallengeErrorKind; message: string }
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
          ...classifyChallengeError(err),
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
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-1.5 rounded-sm bg-primary motion-safe:animate-pulse"
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Joining {slug}
          </span>
        </div>
      </div>
    );
  }
  if (resolved.state === "error") {
    return <ChallengeError slug={slug} kind={resolved.kind} />;
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

/* ─── Error UI ─────────────────────────────────────────────────── */

type ChallengeErrorKind = "missing" | "full" | "unknown";

function classifyChallengeError(err: unknown): {
  kind: ChallengeErrorKind;
  message: string;
} {
  if (err instanceof BackendError) {
    if (err.code === "NOT_FOUND") return { kind: "missing", message: err.message };
    if (err.code === "CONFLICT") return { kind: "full", message: err.message };
  }
  return {
    kind: "unknown",
    message: err instanceof Error ? err.message : "Unknown error",
  };
}

function ChallengeError({
  slug,
  kind,
}: {
  slug: string;
  kind: ChallengeErrorKind;
}) {
  const headline =
    kind === "missing"
      ? "This challenge link has expired"
      : kind === "full"
        ? "This race already started"
        : "Couldn't reach the challenge";
  const explainer =
    kind === "missing"
      ? "Challenges live for a few minutes after the host creates them. Ask whoever shared the link to spin up a fresh one, or start your own race against bots while you wait."
      : kind === "full"
        ? "The host has already kicked off the race or the lobby is full. You can hop into matchmaking against bots straight away while the host queues another."
        : "Something went wrong on our side reaching this challenge. Try again in a moment, or start a fresh race against bots.";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden
          className="inline-block size-1.5 rounded-[1px] bg-muted-foreground/60"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Challenge · {slug}
        </span>
      </div>
      <h1 className="font-mono text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {headline}
      </h1>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {explainer}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Link
          href="/race"
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3.5",
            "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
            "transition-colors hover:bg-primary/90 active:translate-y-[0.5px]",
          )}
        >
          Start a race
        </Link>
        <Link
          href="/"
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3",
            "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
            "transition-colors hover:border-foreground/40 hover:text-foreground",
          )}
        >
          Practice instead
        </Link>
      </div>
    </div>
  );
}
