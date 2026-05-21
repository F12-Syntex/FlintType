"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import type { PresenceEntry } from "@/types/presence";
import { FriendListRow } from "./friend-list-row";

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

export type PeopleLists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};

/** The relationship-management surface — Friends / Following / Followers
 *  behind a segmented control, searchable, with the full `<FollowButton>`
 *  controls. Rendered **inline** (a desktop rail, a mobile tab); never a
 *  popup. See ui-law §17.5. */
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
  const [tab, setTab] = useState<TabId>("friends");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = lists[tab];
    if (!needle) return rows;
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        (u.username ?? "").toLowerCase().includes(needle),
    );
  }, [lists, tab, q]);

  const counts: Record<TabId, number> = {
    friends: lists.friends.length,
    following: lists.following.length,
    followers: lists.followers.length,
  };

  return (
    <div className="flex flex-col gap-3">
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
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="tabular-nums text-muted-foreground">
                {counts[t.id]}
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
          {q.trim() ? "No one here matches that handle." : EMPTY_COPY[tab]}
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
    </div>
  );
}
