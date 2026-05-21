"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import type { Duel } from "@/types/duel";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import type { PresenceEntry } from "@/types/presence";
import { ChallengesSection } from "./challenges-section";
import {
  withDummyDuels,
  withDummyLists,
  withDummyLive,
  withDummyPresence,
} from "./dev-dummy";
import { PeoplePanel } from "./people-panel";
import { LiveNow, OnlineNow } from "./presence-sections";

/** Who's-live / online refresh cadence (live snapshots age out at 6s). */
const POLL_MS = 5_000;

/** Dev-only: inject fake friends/presence/activity so the hub can be
 *  exercised without a real follow graph. Eliminated from prod builds. */
const DEV_DUMMY = process.env.NODE_ENV === "development";

type Lists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};

/** /friends — a calm, single-column social page. A challenges entry sits
 *  up top; who's live and who's online appear only when there's actually
 *  someone there; the People list (friends-first) is the spine; recent
 *  activity is tucked into a collapsed, scrollable section so it never
 *  overwhelms. No popups, no chunky tabs. */
export function FriendsView() {
  const { isSignedIn, isLoaded } = useUser();
  const backend = useBackend();
  const [lists, setLists] = useState<Lists | null>(null);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [live, setLive] = useState<LiveFriend[]>([]);
  const [presenceById, setPresenceById] = useState<Map<string, PresenceEntry>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLists = useCallback(async () => {
    setError(null);
    try {
      const [friends, following, followers] = await Promise.all([
        backend.friends.listFriends(),
        backend.friends.listFollowing(),
        backend.friends.listFollowers(),
      ]);
      const next = {
        friends: friends.users,
        following: following.users,
        followers: followers.users,
      };
      setLists(DEV_DUMMY ? withDummyLists(next) : next);
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

  const loadDuels = useCallback(() => {
    backend.duels
      .list()
      .then((r) => setDuels(DEV_DUMMY ? withDummyDuels(r.incoming) : r.incoming))
      .catch(() => {
        if (DEV_DUMMY) setDuels(withDummyDuels([]));
      });
  }, [backend]);

  const pollPresence = useCallback(() => {
    backend.live
      .friendsLive()
      .then((r) => setLive(DEV_DUMMY ? withDummyLive(r.users) : r.users))
      .catch(() => {
        if (DEV_DUMMY) setLive(withDummyLive([]));
      });
    backend.presence
      .list()
      .then((p) => {
        const map = new Map(p.entries.map((e) => [e.userId, e]));
        setPresenceById(DEV_DUMMY ? withDummyPresence(map) : map);
      })
      .catch(() => {
        if (DEV_DUMMY) setPresenceById(withDummyPresence(new Map()));
      });
  }, [backend]);

  const pollRef = useRef(pollPresence);
  pollRef.current = pollPresence;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    void loadLists();
    loadDuels();
    pollRef.current();
    const id = window.setInterval(() => pollRef.current(), POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoaded, isSignedIn, loadLists, loadDuels]);

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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:gap-7 sm:py-10">
      <header className="flex flex-col gap-2">
        <Tag tone="dim">Friends</Tag>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          People you type with
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          See who&apos;s typing right now, your friends, and everyone you follow.
        </p>
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
          <LiveNow users={live} />
          <ChallengesSection duels={duels} />
          <OnlineNow users={onlineUsers} presenceById={presenceById} />
          {lists ? (
            <PeoplePanel
              lists={lists}
              relationshipFor={relationshipFor}
              presenceById={presenceById}
              onChange={() => void loadLists()}
            />
          ) : null}
        </>
      )}
    </main>
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
