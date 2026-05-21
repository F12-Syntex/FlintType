"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar, UserTag } from "@/components/ft";
import type { LiveSubject } from "@/types/live";
import { LivePassage } from "./live-passage";
import { LiveStage } from "./live-stage";
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

  const watchable = state != null && state.live;
  return (
    <main className="safe-pt safe-pb flex min-h-dvh w-full flex-col bg-background text-foreground">
      <WatchHeader subject={subject} />
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {isLoaded && !isSignedIn ? (
          <Centered>
            <Notice>Sign in to watch friends practise.</Notice>
          </Centered>
        ) : state == null ? (
          <Centered>
            <Notice>Connecting…</Notice>
          </Centered>
        ) : !watchable ? (
          <Centered>
            <NotLive />
          </Centered>
        ) : state.snapshot.screen ? (
          <LiveStage
            words={state.snapshot.words}
            screen={state.snapshot.screen}
            wpm={state.snapshot.wpm}
            accuracy={state.snapshot.accuracy}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-8 sm:px-10">
            <LivePassage snapshot={state.snapshot} />
          </div>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center">{children}</div>
  );
}

/** Slim, editorial header. Identity sits on the left under a single coral
 *  "Spectating" eyebrow (the one spark + the live signal — no competing
 *  pills or dots); back + fullscreen are quiet icon affordances. */
function WatchHeader({ subject }: { subject: LiveSubject | null }) {
  return (
    <header className="safe-pt sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex w-full items-center gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
        <Link
          href="/"
          aria-label="Back to practice"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>

        {subject ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Avatar
              src={subject.imageUrl}
              alt={subject.name}
              size="sm"
              liven={false}
            />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
                />
                Spectating
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={`/profile/${subject.username ?? subject.userId}`}
                  className="truncate text-sm font-semibold text-foreground hover:text-primary"
                >
                  {subject.name}
                </Link>
                {subject.tags.map((t) => (
                  <UserTag key={t} tag={t} size="sm" />
                ))}
              </span>
            </span>
          </div>
        ) : (
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Watching live
          </span>
        )}

        <FullscreenButton />
      </div>
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
        href="/"
        className="mx-auto w-fit text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to practice
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
