"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UserTag } from "@/components/ft";
import { useBackend } from "@/lib/backend";
import type { WatchOutput } from "@/types/live";
import { LivePassage } from "./live-passage";

const POLL_MS = 700;

/** /live/[userId] — watch a friend practise in near-real-time. Polls
 *  `live.watch` every 700ms; the route returns `live: false` for any
 *  not-allowed / not-currently-practising case, which renders as a
 *  calm "not live right now" state. */
export function LiveWatchView({ userId }: { userId: string }) {
  const backend = useBackend();
  const { isLoaded, isSignedIn } = useUser();
  const [state, setState] = useState<WatchOutput | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const poll = () => {
      backend.live
        .watch({ userId })
        .then((s) => {
          if (!cancelled) setState(s);
        })
        .catch(() => {});
    };
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [backend, userId, isLoaded, isSignedIn]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 py-8 sm:py-12">
      {isLoaded && !isSignedIn ? (
        <Notice>Sign in to watch friends practise.</Notice>
      ) : state == null ? (
        <Notice>Connecting…</Notice>
      ) : !state.live ? (
        <NotLive />
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Watching live
            </span>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              <Link
                href={`/profile/${state.subject.username ?? state.subject.userId}`}
                className="hover:text-primary"
              >
                {state.subject.name}
              </Link>
              {state.subject.tags.map((t) => (
                <UserTag key={t} tag={t} size="sm" />
              ))}
            </h1>
          </header>
          <LivePassage snapshot={state.snapshot} />
        </>
      )}
    </main>
  );
}

function NotLive() {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        They&apos;re not practising right now, or aren&apos;t sharing their live
        sessions.
      </p>
      <Link
        href="/friends"
        className="mx-auto w-fit text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to friends
      </Link>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
