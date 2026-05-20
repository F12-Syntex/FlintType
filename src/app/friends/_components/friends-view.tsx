"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import { FriendRow } from "./friend-row";

type TabId = "friends" | "following" | "followers";

const TABS: { id: TabId; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "following", label: "Following" },
  { id: "followers", label: "Followers" },
];

const EMPTY_COPY: Record<TabId, string> = {
  friends:
    "No friends yet. When someone you follow follows you back, they land here.",
  following:
    "You're not following anyone yet. Find people on the leaderboard and follow them.",
  followers: "No followers yet. Share your profile and they'll show up here.",
};

type Lists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};

/** /friends — three lists behind a segmented control. Loads all three
 *  in one pass so follow-back state on every row is computed locally
 *  (no per-row relationship round-trip): a row's relationship is just
 *  set-membership across the following/followers sets. */
export function FriendsView() {
  const { isSignedIn, isLoaded } = useUser();
  const backend = useBackend();
  const [tab, setTab] = useState<TabId>("friends");
  const [lists, setLists] = useState<Lists | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
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
      // Presence is best-effort — never fail the list over it.
      backend.presence
        .list()
        .then((p) =>
          setOnlineIds(
            new Set(p.entries.filter((e) => e.online).map((e) => e.userId)),
          ),
        )
        .catch(() => {});
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

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    void load();
  }, [isLoaded, isSignedIn, load]);

  // Membership sets drive each row's follow-back state without an
  // extra relationship call per user.
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

  const counts: Record<TabId, number | null> = {
    friends: lists?.friends.length ?? null,
    following: lists?.following.length ?? null,
    followers: lists?.followers.length ?? null,
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 py-6 sm:gap-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <Tag tone="dim">Friends</Tag>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          People you type with
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Follow anyone to keep tabs on their runs. When you follow each other,
          you become friends and unlock duels and live spectating.
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
      ) : (
        <>
          <Segments tab={tab} onTab={setTab} counts={counts} />
          <ListBody
            tab={tab}
            lists={lists}
            loading={loading}
            error={error}
            relationshipFor={relationshipFor}
            onlineIds={onlineIds}
            onChange={() => void load()}
          />
        </>
      )}
    </main>
  );
}

function Segments({
  tab,
  onTab,
  counts,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  counts: Record<TabId, number | null>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Friend lists"
      className="flex gap-1 rounded-md border border-border bg-muted/40 p-1"
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {counts[t.id] != null ? (
              <span className="tabular-nums text-muted-foreground">
                {counts[t.id]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ListBody({
  tab,
  lists,
  loading,
  error,
  relationshipFor,
  onlineIds,
  onChange,
}: {
  tab: TabId;
  lists: Lists | null;
  loading: boolean;
  error: string | null;
  relationshipFor: (userId: string) => FriendRelationship;
  onlineIds: Set<string>;
  onChange: () => void;
}) {
  if (error) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-primary">
        {error}
      </p>
    );
  }
  if (loading && !lists) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Loading…
      </p>
    );
  }
  const users = lists?.[tab] ?? [];
  if (users.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        {EMPTY_COPY[tab]}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {users.map((u) => (
        <li key={u.userId}>
          <FriendRow
            user={u}
            relationship={relationshipFor(u.userId)}
            online={onlineIds.has(u.userId)}
            onChange={onChange}
          />
        </li>
      ))}
    </ul>
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
