"use client";

import Link from "next/link";
import { Avatar, UserTag } from "@/components/ft";
import { FollowButton } from "@/components/follow-button";
import { cn } from "@/lib/utils";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import type { PresenceEntry } from "@/types/presence";
import { presenceCaption } from "./presence-label";

const SINCE_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

/** One person in the directory's Friends / Following / Followers list:
 *  avatar + handle + tags link to their profile; the shared relationship
 *  control (with a Block kebab) sits on the right. The row is the hover
 *  `group` that brings the avatar to full colour.
 *
 *  The caption under the name carries presence when we have it (every
 *  person you follow): "Online" / "Practising" / "In a race", or
 *  "Active 5m ago" when they're offline. Followers you don't follow back
 *  have no presence (privacy), so they fall back to the join date. */
export function FriendListRow({
  user,
  relationship,
  presence,
  onChange,
}: {
  user: FriendUser;
  relationship: FriendRelationship;
  presence?: PresenceEntry | null;
  onChange?: (rel: FriendRelationship) => void;
}) {
  const href = `/profile/${user.username ?? user.userId}`;
  const caption = presence ? presenceCaption(presence) : null;
  return (
    <div className="group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Avatar
          src={user.imageUrl}
          alt={user.name}
          size="md"
          status={presence?.online ? "online" : null}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
              {user.name}
            </span>
            {user.tags.map((t) => (
              <UserTag key={t} tag={t} size="sm" />
            ))}
          </span>
          {caption ? (
            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", caption.dotClass)}
              />
              <span className="tabular-nums">{caption.label}</span>
            </span>
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              since {SINCE_FMT.format(user.sinceMs)}
            </span>
          )}
        </span>
      </Link>
      <FollowButton
        userId={user.userId}
        initial={relationship}
        size="sm"
        menu
        handle={user.username}
        onChange={onChange}
      />
    </div>
  );
}
