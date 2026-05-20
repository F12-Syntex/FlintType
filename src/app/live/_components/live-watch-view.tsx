"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Avatar, UserTag } from "@/components/ft";
import { LiveClone } from "./live-clone";
import { LivePassage } from "./live-passage";
import { useBufferedWatch } from "./use-buffered-watch";

/** /live/[userId] — watch a friend's practice screen, mirrored. Polls
 *  `live.watch` through a ~1s buffer (see useBufferedWatch) so the screen
 *  advances smoothly; the route returns `live: false` for any
 *  not-allowed / not-currently-practising case, which renders as a calm
 *  "not live right now" state. */
export function LiveWatchView({ userId }: { userId: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const state = useBufferedWatch(userId, isLoaded && !!isSignedIn);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-1 py-8 sm:py-12">
      {isLoaded && !isSignedIn ? (
        <Notice>Sign in to watch friends practise.</Notice>
      ) : state == null ? (
        <Notice>Connecting…</Notice>
      ) : !state.live ? (
        <NotLive />
      ) : (
        <>
          <header className="flex flex-col gap-4">
            <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span
                aria-hidden
                className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
              />
              Watching live
            </span>
            <div className="flex items-center gap-3">
              <Avatar
                src={state.subject.imageUrl}
                alt={state.subject.name}
                size="lg"
                status="live"
                liven={false}
                dotRing="ring-background"
              />
              <div className="flex min-w-0 flex-col gap-1">
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
                <span className="text-[11px] text-muted-foreground">
                  practising right now
                </span>
              </div>
            </div>
          </header>
          {state.snapshot.screen ? (
            <LiveClone
              words={state.snapshot.words}
              screen={state.snapshot.screen}
              wpm={state.snapshot.wpm}
              accuracy={state.snapshot.accuracy}
            />
          ) : (
            <LivePassage snapshot={state.snapshot} />
          )}
          <Link
            href="/friends"
            className="w-fit text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            ← Back to friends
          </Link>
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
