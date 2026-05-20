"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import { Directory } from "./directory";
import { LiveNow, OnlineNow } from "./presence-sections";

/** How often "who's live / online" refreshes. Live snapshots age out at
 *  6s server-side, so a 5s poll keeps the section honest; the friend
 *  lists themselves change rarely and load once (and on follow change). */
const POLL_MS = 5_000;

type Lists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};

/** /friends — a presence-first hub. "Live now" (watch a friend type) and
 *  "Online" sit up top; the full graph lives in a docked Directory that
 *  springs open. Lists load once and follow-back state is computed
 *  locally from set membership (no per-row relationship call). */
export function FriendsView() {
  const { isSignedIn, isLoaded } = useUser();
  const backend = useBackend();
  const [lists, setLists] = useState<Lists | null>(null);
  const [live, setLive] = useState<LiveFriend[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());
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

  // Presence + live poll — best-effort, never surfaces an error.
  const pollPresence = useCallback(() => {
    backend.live
      .friendsLive()
      .then((r) => setLive(r.users))
      .catch(() => {});
    backend.presence
      .list()
      .then((p) =>
        setOnlineIds(
          new Set(p.entries.filter((e) => e.online).map((e) => e.userId)),
        ),
      )
      .catch(() => {});
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
    pollRef.current();
    const id = window.setInterval(() => pollRef.current(), POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoaded, isSignedIn, loadLists]);

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

  // Online = followed + online, minus anyone already shown as live, so a
  // friend never appears in both presence rows.
  const liveIds = useMemo(() => new Set(live.map((u) => u.userId)), [live]);
  const onlineUsers = useMemo(
    () =>
      (lists?.following ?? []).filter(
        (u) => onlineIds.has(u.userId) && !liveIds.has(u.userId),
      ),
    [lists, onlineIds, liveIds],
  );

  const emptyGraph =
    lists != null &&
    lists.friends.length === 0 &&
    lists.following.length === 0 &&
    lists.followers.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-1 py-6 sm:gap-9 sm:py-10">
      <header className="flex flex-col gap-2">
        <Tag tone="dim">Friends</Tag>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          People you type with
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Follow anyone to keep tabs on their runs. Follow each other to become
          friends and unlock duels and live spectating.
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
      ) : emptyGraph ? (
        <EmptyGraph />
      ) : (
        <>
          <LiveNow users={live} />
          <OnlineNow users={onlineUsers} />
          {lists ? (
            <Directory
              lists={lists}
              relationshipFor={relationshipFor}
              onlineIds={onlineIds}
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
      <span className="h-2.5 w-20 rounded-full bg-muted" />
      {[0, 1, 2].map((i) => (
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

function EmptyGraph() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border bg-card/40 px-4 py-10">
      <p className="text-sm text-muted-foreground">
        You're not following anyone yet. Find fast typists on the leaderboard
        and follow them. Follow each other to unlock duels and live spectating.
      </p>
      <Link
        href="/leaderboard"
        className="rounded-md border border-border bg-background px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-accent"
      >
        Browse the leaderboard →
      </Link>
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
