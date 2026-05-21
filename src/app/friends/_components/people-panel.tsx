"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import type { PresenceEntry } from "@/types/presence";
import { FriendListRow } from "./friend-list-row";

type View = "friends" | "following" | "followers";

const VIEWS: View[] = ["friends", "following", "followers"];

const LABEL: Record<View, string> = {
  friends: "Friends",
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

/** The relationship surface. Friends / Following / Followers switch via a
 *  segmented control built from the **same idiom as the TopBar nav**
 *  (`rounded-md border bg-card p-0.5`, segments `rounded-[5px]` with a
 *  subtle `bg-foreground/[0.06]` active tint), so the app's switches read
 *  consistently. Full-width on mobile, hugging on `sm+`. Searchable, with
 *  the full `<FollowButton>` per row. Inline, never a popup (ui-law
 *  §17.2 / §17.5). */
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

  return (
    <section className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="People"
        className="flex w-full items-center gap-0.5 rounded-md border border-border bg-card p-0.5 sm:inline-flex sm:w-fit sm:self-start"
      >
        {VIEWS.map((v) => {
          const active = v === view;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(v)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[13px] tracking-tight outline-none transition-colors sm:flex-initial sm:justify-start",
                active
                  ? "bg-foreground/[0.06] font-semibold text-foreground"
                  : "font-normal text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground focus-visible:text-foreground",
              )}
            >
              {LABEL[v]}
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {counts[v]}
              </span>
            </button>
          );
        })}
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
