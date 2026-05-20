"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar, UserTag } from "@/components/ft";
import type { LiveSubject } from "@/types/live";
import { LiveClone } from "./live-clone";
import { LivePassage } from "./live-passage";
import { useBufferedWatch } from "./use-buffered-watch";

/** /live/[userId] — a fullscreen, immersive mirror of a friend's practice
 *  screen. No app chrome: a slim header (back · who · fullscreen) over the
 *  cloned screen, which fills the viewport. Polls `live.watch` through a
 *  ~1s buffer (useBufferedWatch) so it advances smoothly; `live: false`
 *  (not allowed / not practising) renders as a calm "not live" state. */
export function LiveWatchView({ userId }: { userId: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const state = useBufferedWatch(userId, isLoaded && !!isSignedIn);
  const subject = state?.live ? state.subject : null;

  return (
    <main className="safe-pt safe-pb flex min-h-dvh w-full flex-col bg-background text-foreground">
      <WatchHeader subject={subject} />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-3 py-4 sm:px-6 sm:py-6">
        {isLoaded && !isSignedIn ? (
          <Notice>Sign in to watch friends practise.</Notice>
        ) : state == null ? (
          <Notice>Connecting…</Notice>
        ) : !state.live ? (
          <NotLive />
        ) : state.snapshot.screen ? (
          <LiveClone
            words={state.snapshot.words}
            screen={state.snapshot.screen}
            wpm={state.snapshot.wpm}
            accuracy={state.snapshot.accuracy}
          />
        ) : (
          <LivePassage snapshot={state.snapshot} />
        )}
      </div>
    </main>
  );
}

function WatchHeader({ subject }: { subject: LiveSubject | null }) {
  return (
    <header className="safe-pt sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur sm:px-5">
      <Link
        href="/friends"
        aria-label="Back to friends"
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden />
        <span className="hidden sm:inline">Friends</span>
      </Link>

      {subject ? (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar
            src={subject.imageUrl}
            alt={subject.name}
            size="sm"
            status="live"
            liven={false}
            dotRing="ring-background"
          />
          <Link
            href={`/profile/${subject.username ?? subject.userId}`}
            className="truncate text-sm font-semibold text-foreground hover:text-primary"
          >
            {subject.name}
          </Link>
          {subject.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
          <span className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
            />
            Live
          </span>
        </div>
      ) : (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Watching live
        </span>
      )}

      <FullscreenButton />
    </header>
  );
}

/** Toggles the browser Fullscreen API for a truly fullscreen watch.
 *  Gesture-triggered (click), so it complements the always-on immersive
 *  layout rather than forcing fullscreen on load. */
function FullscreenButton() {
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);
  const Icon = isFs ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}

function NotLive() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center">
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
    <p className="mx-auto max-w-md rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
