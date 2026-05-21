"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import type { PresenceEntry } from "@/types/presence";
import { FriendListRow } from "./friend-list-row";

type View = "friends" | "following" | "followers";

const TITLE: Record<View, string> = {
  friends: "Your friends",
  following: "Following",
  followers: "Followers",
};

const EMPTY_COPY: Record<View, string> = {
  friends:
    "No friends yet. When someone you follow follows you back, they land here.",
  following:
    "You're not following anyone yet. Find people on the leaderboard and follow them.",
  followers: "No followers yet. Share your profile and they'll show up here.",
};

export type PeopleLists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};

/** The relationship surface — friends-first. The page leads with Your
 *  Friends; Following and Followers are quiet links beside the heading
 *  (with a "‹ Friends" return once you leave), not a chunky segmented
 *  control. Searchable, with the full `<FollowButton>` per row. Rendered
 *  inline, never a popup (ui-law §17.2 / §17.5). */
export function PeoplePanel({
  lists,
  relationshipFor,
  presenceById,
  onChange,
}: {
  lists: PeopleLists;
  relationshipFor: (userId: string) => FriendRelationship;
  presenceById: Map<string, PresenceEntry>;
  onChange: () => void;
}) {
  const [view, setView] = useState<View>("friends");
  const [q, setQ] = useState("");

  const counts: Record<View, number> = {
    friends: lists.friends.length,
    following: lists.following.length,
    followers: lists.followers.length,
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = lists[view];
    if (!needle) return rows;
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        (u.username ?? "").toLowerCase().includes(needle),
    );
  }, [lists, view, q]);

  // Friends-first: lead with the active list; the other two views ride
  // beside the heading. Leaving Friends surfaces a "‹ Friends" return.
  const others = (["friends", "following", "followers"] as View[]).filter(
    (v) => v !== view,
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
          {TITLE[view]}
          <span className="ml-1.5 tabular-nums text-muted-foreground">
            {counts[view]}
          </span>
        </h2>
        <nav className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em]">
          {others.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
            >
              {v === "friends" ? "‹ Friends" : TITLE[v]}
              <span className="ml-1 tabular-nums text-muted-foreground/70">
                {counts[v]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="relative">
        <Search
          size={15}
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by handle"
          aria-label="Search people"
          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
          {q.trim() ? "No one here matches that handle." : EMPTY_COPY[view]}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((u) => (
            <li key={u.userId}>
              <FriendListRow
                user={u}
                relationship={relationshipFor(u.userId)}
                presence={presenceById.get(u.userId) ?? null}
                onChange={onChange}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
