"use client";

import Link from "next/link";
import { UserTag } from "@/components/ft";
import { FollowButton } from "@/components/follow-button";
import type { FriendRelationship, FriendUser } from "@/types/friends";

const SINCE_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

/** One person in a following / followers / friends list: handle + tags
 *  link to their profile, a `since` caption, and the shared relationship
 *  control on the right. Stacks on mobile, inline at sm+. */
export function FriendRow({
  user,
  relationship,
  online = false,
  onChange,
}: {
  user: FriendUser;
  relationship: FriendRelationship;
  /** Show the green online dot beside the handle. */
  online?: boolean;
  onChange?: (rel: FriendRelationship) => void;
}) {
  const href = `/profile/${user.username ?? user.userId}`;
  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2">
      <Link
        href={href}
        className="group flex min-w-0 flex-col gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {online ? (
            <span
              className="size-2 shrink-0 rounded-full bg-ft-ok"
              aria-label="Online"
              title="Online"
            />
          ) : null}
          <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
            {user.name}
          </span>
          {user.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          since {SINCE_FMT.format(user.sinceMs)}
        </span>
      </Link>
      <FollowButton
        userId={user.userId}
        initial={relationship}
        size="sm"
        onChange={onChange}
        className="shrink-0"
      />
    </div>
  );
}
