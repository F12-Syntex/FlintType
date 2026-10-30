"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { DeltaText } from "@/components/analysis/delta-text";
import { UserTag } from "@/components/ft";
import { friendPbSentence, pbDelta, pbSentence } from "@/lib/pb-copy";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type {
  Notification,
  PersonalBestData,
  AnnouncementData,
  FollowNotificationData,
  MutualNotificationData,
  FriendPbNotificationData,
  RaceInviteData,
} from "@/types/notification";

/** One row of the notifications popover: an inset, rounded row that
 *  links to whatever the notification is about (profile, lobby,
 *  announcement), with an unread dot, a relative time and per-kind
 *  extras (the PB delta line, OG tag, friends check). */
export function NotificationRow({
  item,
  onMarkRead,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
}) {
  const accent = item.kind === "personal_best" || item.kind === "mutual";
  const unread = item.readAtMs == null;
  const href = isAnnouncement(item)
    ? item.data?.href
    : isFollowNotification(item)
      ? `/profile/${item.data.followerUsername ?? item.data.followerId}`
      : isMutualNotification(item)
        ? `/profile/${item.data.friendUsername ?? item.data.friendId}`
        : isFriendPb(item)
          ? `/profile/${item.data.friendUsername ?? item.data.friendId}`
          : isRaceInvite(item)
            ? `/race/c/${item.data.slug}`
            : undefined;
  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-200",
        href && "group-hover:bg-accent",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread
            ? accent
              ? "bg-primary"
              : "bg-foreground/70"
            : "bg-transparent",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              unread ? "font-semibold" : "font-medium",
              "text-foreground",
            )}
          >
            {item.title}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {relativeTime(item.createdAtMs)}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {bodyText(item)}
        </p>
        {isPersonalBest(item) ? <PbDelta data={item.data} /> : null}
        {item.kind === "og_granted" ? (
          <span className="mt-1.5 inline-flex">
            <UserTag tag="og" size="sm" />
          </span>
        ) : null}
        {item.kind === "mutual" ? (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Check size={12} aria-hidden /> Friends
          </span>
        ) : null}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link
        href={href}
        // Clicking a race invite through to the lobby marks it read, so
        // it stops haunting the dock + bell (FT-031). Other kinds keep
        // their unread state until Mark all read.
        onClick={
          isRaceInvite(item) ? () => onMarkRead(item.id) : undefined
        }
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {body}
      </Link>
    );
  }
  return body;
}

/** The row's body. Personal-best kinds rebuild their sentence from the
 *  stored data, so old rows (written with dotted bodies) read the same as
 *  new ones; every other kind shows its stored body. */
function bodyText(item: Notification): string {
  if (isPersonalBest(item)) return pbSentence(item.data);
  if (isFriendPb(item) && typeof item.data.wpm === "number") {
    return friendPbSentence(item.data.friendName, item.data);
  }
  return item.body;
}

/** The improvement, said once, in ink: nothing on a first run (the title
 *  says so), an up arrow and the gain when it beat the previous best. */
function PbDelta({ data }: { data: PersonalBestData }) {
  if (data.previousWpm == null) return null;
  const prev = Math.round(data.previousWpm);
  const delta = pbDelta(data.wpm, data.previousWpm);
  if (delta > 0) {
    return (
      <DeltaText direction="up" className="mt-1 text-xs text-foreground">
        {delta} wpm above your previous best of {prev} wpm
      </DeltaText>
    );
  }
  return <p className="mt-1 text-xs text-muted-foreground">Your previous best was {prev} wpm.</p>;
}

function isAnnouncement(n: Notification): n is Notification & {
  data: AnnouncementData;
} {
  return n.kind === "announcement";
}

function isPersonalBest(n: Notification): n is Notification & {
  data: PersonalBestData;
} {
  if (n.kind !== "personal_best") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "wpm" in (n.data as Record<string, unknown>);
}

function isFollowNotification(n: Notification): n is Notification & {
  data: FollowNotificationData;
} {
  if (n.kind !== "follow") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "followerId" in (n.data as Record<string, unknown>);
}

function isMutualNotification(n: Notification): n is Notification & {
  data: MutualNotificationData;
} {
  if (n.kind !== "mutual") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "friendId" in (n.data as Record<string, unknown>);
}

function isFriendPb(n: Notification): n is Notification & {
  data: FriendPbNotificationData;
} {
  if (n.kind !== "friend_pb") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "friendId" in (n.data as Record<string, unknown>);
}

/** A friend opened a race lobby and invited you — links to the lobby. */
function isRaceInvite(n: Notification): n is Notification & {
  data: RaceInviteData;
} {
  if (n.kind !== "race_invite") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "slug" in (n.data as Record<string, unknown>);
}

export function BellIcon() {
  // Inline SVG so we don't pull a stroke-width-2 lucide icon into the topbar
  // (lucide's default weight reads heavier than the typography here).
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px]"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

