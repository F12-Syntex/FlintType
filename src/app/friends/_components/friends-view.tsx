"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import type { Notification } from "@/types/notification";
import type { PresenceEntry } from "@/types/presence";
import { ActivityFeed } from "./feed";
import { PeoplePanel } from "./people-panel";
import { LiveNow, OnlineNow } from "./presence-sections";

/** Who's-live / online refresh cadence (live snapshots age out at 6s). */
const POLL_MS = 5_000;

type Lists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};
type MobileView = "activity" | "people";

/** /friends — a social page. The spine is an activity feed (who's live,
 *  friends' PBs, duels, new friendships); relationship management lives
 *  in an inline People panel (a desktop rail, a mobile tab). No popups. */
export function FriendsView() {
  const { isSignedIn, isLoaded } = useUser();
  const backend = useBackend();
  const [lists, setLists] = useState<Lists | null>(null);
  const [feed, setFeed] = useState<Notification[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [live, setLive] = useState<LiveFriend[]>([]);
  const [presenceById, setPresenceById] = useState<Map<string, PresenceEntry>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<MobileView>("activity");

  const loadLists = useCallback(async () => {
    setError(null);
    try {
      const [friends, following, followers] = await Promise.all([
        backend.friends.listFriends(),
        backend.friends.listFollowing(),
        backend.friends.listFollowers(),
      ]);
      setLists({
        friends: friends.users,
        following: following.users,
        followers: followers.users,
      });
    } catch (err) {
      if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
        setError("Sign in to see your friends.");
      } else {
        setError(err instanceof Error ? err.message : "Couldn't load friends.");
      }
    } finally {
      setLoading(false);
    }
  }, [backend]);

  const loadFeed = useCallback(() => {
    backend.notifications
      .list()
      .then((r) => setFeed(r.items))
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  }, [backend]);

  const pollPresence = useCallback(() => {
    backend.live
      .friendsLive()
      .then((r) => setLive(r.users))
      .catch(() => {});
    backend.presence
      .list()
      .then((p) =>
        setPresenceById(new Map(p.entries.map((e) => [e.userId, e]))),
      )
      .catch(() => {});
  }, [backend]);

  const pollRef = useRef(pollPresence);
  pollRef.current = pollPresence;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      setFeedLoading(false);
      return;
    }
    void loadLists();
    loadFeed();
    pollRef.current();
    const id = window.setInterval(() => pollRef.current(), POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoaded, isSignedIn, loadLists, loadFeed]);

  const followingIds = useMemo(
    () => new Set((lists?.following ?? []).map((u) => u.userId)),
    [lists],
  );
  const followerIds = useMemo(
    () => new Set((lists?.followers ?? []).map((u) => u.userId)),
    [lists],
  );
  const relationshipFor = useCallback(
    (userId: string): FriendRelationship => {
      const following = followingIds.has(userId);
      const followedBy = followerIds.has(userId);
      return {
        userId,
        following,
        followedBy,
        mutual: following && followedBy,
        blocking: false,
        blockedBy: false,
      };
    },
    [followingIds, followerIds],
  );

  const liveIds = useMemo(() => new Set(live.map((u) => u.userId)), [live]);
  const onlineIds = useMemo(
    () =>
      new Set(
        [...presenceById.values()].filter((e) => e.online).map((e) => e.userId),
      ),
    [presenceById],
  );
  const onlineUsers = useMemo(
    () =>
      (lists?.following ?? []).filter(
        (u) => onlineIds.has(u.userId) && !liveIds.has(u.userId),
      ),
    [lists, onlineIds, liveIds],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-1 py-6 sm:gap-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <Tag tone="dim">Friends</Tag>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          People you type with
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Who's typing right now, your friends' personal bests and duels, and
          everyone you follow. Follow each other to become friends and unlock
          duels and live spectating.
        </p>
        <Link
          href="/duels"
          className="mt-1 w-fit text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Your duels →
        </Link>
      </header>

      {isLoaded && !isSignedIn ? (
        <SignInPrompt />
      ) : error ? (
        <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : loading && !lists ? (
        <LoadingSkeleton />
      ) : (
        <>
          <MobileTabs view={view} onView={setView} />
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-8">
            <div
              className={cn(
                "flex flex-col gap-7",
                view === "people" && "hidden lg:flex",
              )}
            >
              <LiveNow users={live} />
              <OnlineNow users={onlineUsers} presenceById={presenceById} />
              <section className="flex flex-col gap-3">
                <Eyebrow>Activity</Eyebrow>
                <ActivityFeed items={feed} loading={feedLoading} />
              </section>
            </div>
            <aside
              className={cn(
                "mt-7 lg:mt-0",
                view === "activity" && "hidden lg:block",
              )}
            >
              <div className="flex flex-col gap-3 lg:sticky lg:top-6">
                <Eyebrow>People</Eyebrow>
                {lists ? (
                  <PeoplePanel
                    lists={lists}
                    relationshipFor={relationshipFor}
                    presenceById={presenceById}
                    onChange={() => void loadLists()}
                  />
                ) : null}
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </span>
  );
}

function MobileTabs({
  view,
  onView,
}: {
  view: MobileView;
  onView: (v: MobileView) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-1 lg:hidden">
      {(["activity", "people"] as const).map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            aria-pressed={active}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v === "activity" ? "Activity" : "People"}
          </button>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
        >
          <span className="size-10 shrink-0 rounded-full bg-muted" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-3 w-32 rounded-full bg-muted" />
            <span className="h-2 w-20 rounded-full bg-muted/70" />
          </span>
        </div>
      ))}
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-card px-4 py-6">
      <p className="text-sm text-muted-foreground">
        Sign in to follow people and see your friends.
      </p>
      <Link
        href="/sign-in"
        className="rounded-md bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
      >
        Sign in
      </Link>
    </div>
  );
}
