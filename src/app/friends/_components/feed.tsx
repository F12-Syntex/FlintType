"use client";

import {
  Award,
  Megaphone,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type {
  AnnouncementData,
  DuelChallengeData,
  DuelResultData,
  FollowNotificationData,
  FriendPbNotificationData,
  MutualNotificationData,
  Notification,
} from "@/types/notification";

const ICON: Record<string, LucideIcon> = {
  follow: UserPlus,
  mutual: Users,
  friend_pb: Zap,
  personal_best: Zap,
  duel_challenge: Swords,
  duel_result: Trophy,
  og_granted: Award,
  announcement: Megaphone,
};

/** Where a feed row points. Social kinds deep-link to the relevant
 *  profile / duel; personal milestones and announcements stay quiet
 *  unless they carry a CTA. */
function feedHref(item: Notification): string | null {
  const d = item.data;
  switch (item.kind) {
    case "follow": {
      const f = d as FollowNotificationData | null;
      return f ? `/profile/${f.followerUsername ?? f.followerId}` : null;
    }
    case "mutual": {
      const f = d as MutualNotificationData | null;
      return f ? `/profile/${f.friendUsername ?? f.friendId}` : null;
    }
    case "friend_pb": {
      const f = d as FriendPbNotificationData | null;
      return f ? `/profile/${f.friendUsername ?? f.friendId}` : null;
    }
    case "duel_challenge":
      return (d as DuelChallengeData | null)
        ? `/duel/${(d as DuelChallengeData).duelId}`
        : null;
    case "duel_result":
      return (d as DuelResultData | null)
        ? `/duel/${(d as DuelResultData).duelId}`
        : null;
    case "announcement":
      return (d as AnnouncementData | null)?.href ?? null;
    default:
      return null;
  }
}

function timeAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.round(d / 7)}w`;
}

/** The activity timeline — friends' PBs, duels, follows, your milestones,
 *  newest first. A divided list (not a card grid) so it reads as a feed.
 *  Rows with a destination are links; unread carry a quiet coral dot. */
export function ActivityFeed({
  items,
  loading,
}: {
  items: Notification[];
  loading: boolean;
}) {
  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border/60 py-3"
          >
            <span className="size-8 shrink-0 rounded-md bg-muted" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="h-3 w-2/3 rounded-full bg-muted" />
              <span className="h-2 w-1/3 rounded-full bg-muted/70" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        No activity yet. Follow people and your feed fills with their personal
        bests, duels, and new friendships.
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id}>
          <FeedRow item={item} />
        </li>
      ))}
    </ul>
  );
}

function FeedRow({ item }: { item: Notification }) {
  const Icon = ICON[item.kind] ?? Megaphone;
  const href = feedHref(item);
  const unread = item.readAtMs == null;

  const inner = (
    <div className="flex items-start gap-3 border-b border-border/60 py-3 transition-colors group-hover:bg-accent/40">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
        <Icon size={15} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {item.title}
          </span>
          {unread ? (
            <span
              aria-label="Unread"
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
          ) : null}
        </span>
        <span className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
          {item.body}
        </span>
      </span>
      <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground">
        {timeAgo(item.createdAtMs)}
      </span>
    </div>
  );

  if (!href) return <div className="px-1">{inner}</div>;
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-sm px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      {inner}
    </Link>
  );
}
