"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  RadioTower,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar, UserTag } from "@/components/ft";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
            <SignedOut userId={userId} />
          </Centered>
        ) : state == null ? (
          <Centered>
            <Notice busy>Connecting…</Notice>
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
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center px-4 py-8 sm:px-10">
            <LivePassage snapshot={state.snapshot} />
          </div>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      {children}
    </div>
  );
}

const ICON_BUTTON = cn(
  buttonVariants({ variant: "ghost", size: "icon-lg" }),
  "shrink-0 text-muted-foreground sm:size-9",
);

/** Slim header. While someone is being watched, their identity sits on
 *  the left over a single orange "Watching live" line (the one spark +
 *  the live signal, no competing pills). Every other state (connecting,
 *  signed out, not live) shows a neutral "Live" title with no live
 *  marker, so the header never contradicts the body. Back + fullscreen
 *  are quiet pill icon buttons. `subject` is only set while live. */
function WatchHeader({ subject }: { subject: LiveSubject | null }) {
  return (
    <header className="safe-pt sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex w-full items-center gap-2 px-2 py-2 sm:gap-3 sm:px-6 sm:py-3">
        <Link href="/" aria-label="Back to practice" className={ICON_BUTTON}>
          <ArrowLeft size={18} aria-hidden />
        </Link>

        {subject ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar
              src={subject.imageUrl}
              alt={subject.name}
              size="md"
              liven={false}
            />
            <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
              <span className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={`/profile/${subject.username ?? subject.userId}`}
                  className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {subject.name}
                </Link>
                {subject.tags.map((t) => (
                  <UserTag key={t} tag={t} size="sm" />
                ))}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
                />
                Watching live
              </span>
            </span>
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            Live
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
      className={ICON_BUTTON}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}

function NotLive() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RadioTower size={20} aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">
          Not live right now
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          They&apos;re not practising at the moment, or they aren&apos;t
          sharing their live sessions.
        </p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        Back to practice
      </Link>
    </div>
  );
}

/** Signed-out viewers get the same empty-state anatomy as NotLive, with
 *  sign-in as the screen's one orange action. It returns here after. */
function SignedOut({ userId }: { userId: string }) {
  const back = `/live/${userId}`;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Eye size={20} aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground">
          Sign in to watch
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Live sessions are shared with friends only. Sign in to see if
          they&apos;re practising now.
        </p>
      </div>
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(back)}`}
        className={buttonVariants({ size: "lg" })}
      >
        Sign in
      </Link>
    </div>
  );
}

function Notice({
  children,
  busy = false,
}: {
  children: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <div
      role="status"
      className="flex w-full max-w-md items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-5 py-6 text-center text-sm text-muted-foreground shadow-card"
    >
      {busy ? (
        <Loader2 size={16} aria-hidden className="shrink-0 motion-safe:animate-spin" />
      ) : null}
      {children}
    </div>
  );
}
