"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  Download,
  Link2,
  LogOut,
  MoreHorizontal,
  Pencil,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tag, UserTag } from "@/components/ft";
import { FollowButton } from "@/components/follow-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FriendRelationship, FriendStats } from "@/types/friends";
import type { RankId } from "@/types/rank";
import type { UserTagId } from "@/types/user-tag";
import {
  XP_PER_LEVEL,
  type ProfileTotals,
  type StreakStats,
} from "./derive-stats";
import { EditProfileDialog } from "./edit-profile-dialog";
import { RankBadge } from "./rank-badge";

const NUM_FMT = new Intl.NumberFormat("en-US");

/** Wide MonkeyType-style hero panel — identity on the left, big
 *  headline stats inline on the right, kebab menu pinned to the far
 *  right corner. Stacks vertically on mobile and goes side-by-side at
 *  md+.
 *
 *  MonkeyType import / manage state lives in the parent
 *  (`profile-view.tsx`) — both the kebab menu and the dismissible
 *  banner above the hero open the same dialog through `onOpenMt`. */
export function ProfileHero({
  username,
  isOwner,
  tags = [],
  eligibleTags = [],
  onTagsChanged,
  rank = null,
  onRankChanged,
  totals,
  streak,
  isMtConnected = false,
  onOpenMt,
  subjectAvatarUrl = null,
  subjectUserId = null,
  friendStats = null,
  relationship = null,
}: {
  username?: string;
  isOwner: boolean;
  tags?: UserTagId[];
  eligibleTags?: UserTagId[];
  onTagsChanged?: (next: UserTagId[]) => void;
  /** The subject's self-selected rank flair (shown beside the name), or
   *  null when unset. */
  rank?: RankId | null;
  /** Owner-only — fires after the rank is changed in the edit dialog so
   *  the hero badge updates without a snapshot refetch. */
  onRankChanged?: (next: RankId | null) => void;
  totals: ProfileTotals;
  streak: StreakStats;
  /** Subject's Clerk id — drives the follow button + friend counts. */
  subjectUserId?: string | null;
  /** Follower / following / friend counts for the subject. Null until
   *  resolved or for anonymous viewers (the friends routes need auth). */
  friendStats?: FriendStats | null;
  /** The viewer↔subject relationship — present only when a signed-in
   *  visitor views someone else's profile. Drives the follow button +
   *  "follows you" badge. */
  relationship?: FriendRelationship | null;
  /** True when the owner has a stored MonkeyType Ape Key. Drives the
   *  kebab item's label ("MonkeyType" → manage / "Import" → connect). */
  isMtConnected?: boolean;
  /** Routes to the appropriate MT dialog based on connection state.
   *  Parent (profile-view) decides which (manage vs import) opens. */
  onOpenMt?: () => void;
  /** Avatar URL for the profile's *subject*, returned by the server
   *  (history.summary / publicProfile) and pre-filtered through
   *  `hasImage` so Clerk's auto-gradient never ships through. Lets
   *  visitors see a real photo for someone else's profile — useUser()
   *  alone only knows the viewer's image. Null falls back to the
   *  silhouette placeholder. */
  subjectAvatarUrl?: string | null;
}) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [editOpen, setEditOpen] = useState(false);

  const displayName = isOwner
    ? !isLoaded
      ? "—"
      : (user?.firstName ??
          user?.username ??
          username ??
          user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
          "Anonymous")
    : (username ?? "Anonymous");
  const handle = isOwner ? (user?.username ?? username ?? null) : (username ?? null);
  const joined =
    isOwner && user?.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        })
      : null;
  // Avatar resolution. Two sources, in priority order:
  //   1. useUser() — owner's own Clerk profile (instant, available
  //      before the snapshot lands).
  //   2. subjectAvatarUrl — the *subject*'s avatar from the server's
  //      history payload. Required for visitors viewing someone
  //      else's profile because useUser() only knows about the
  //      viewer's image.
  // Both sources have already filtered Clerk's auto-generated
  // gradient default (`hasImage === false`) so we never paint the
  // generic AI-art swatch — silhouette covers that case.
  const ownerImageUrl =
    isOwner && isLoaded && (user?.hasImage ?? false) && user?.imageUrl
      ? user.imageUrl
      : null;
  const avatarImageUrl = ownerImageUrl ?? subjectAvatarUrl ?? null;
  // Avatar is "loaded" once we either have the owner's Clerk data
  // (for own profile) OR the snapshot has arrived (for visitors).
  // When neither has resolved, render the pulsing placeholder.
  const avatarIsLoaded = isOwner ? isLoaded : true;

  return (
    <section className="rounded-md border border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
      {/* Top row — identity on the left, actions hugging the top-right
       *  corner. Actions are NOT a third flex column (that squeezed the
       *  identity + stats); they sit out of the content flow so the
       *  stats strip below gets the full width. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar imageUrl={avatarImageUrl} isLoaded={avatarIsLoaded} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                {displayName}
              </h1>
              {rank ? <RankBadge rank={rank} /> : null}
              {tags.map((t) => (
                <UserTag key={t} tag={t} size="sm" />
              ))}
              {relationship?.followedBy ? <Tag tone="dim">Follows you</Tag> : null}
            </div>
            {handle || joined ? (
              <p className="truncate text-[11px] tracking-[0.04em] text-muted-foreground">
                {[handle ? `@${handle}` : null, joined ? `joined ${joined}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {friendStats ? (
              <FriendCounts stats={friendStats} isOwner={isOwner} />
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isOwner ? (
            <OwnerMenu
              isMtConnected={isMtConnected}
              onEdit={() => setEditOpen(true)}
              onOpenMt={onOpenMt ?? (() => undefined)}
              onSignOut={() => void signOut({ redirectUrl: "/" })}
            />
          ) : relationship && subjectUserId ? (
            <>
              {relationship.mutual ? (
                <Link
                  href={`/duel/new?opponent=${subjectUserId}`}
                  className="hidden h-9 items-center rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent sm:inline-flex"
                >
                  Duel
                </Link>
              ) : null}
              <FollowButton
                userId={subjectUserId}
                initial={relationship}
                handle={handle}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Headline stats — a full-width strip (2×2 on mobile, four columns
       *  from sm+). On a visitor's view the Follow CTA is the single coral
       *  spark (§2), so the stat values stay ink; the owner's own profile
       *  (no follow button) may accent them coral. */}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-x-6">
        <StatCell
          label="Tests"
          value={NUM_FMT.format(totals.testsCompleted)}
          sub={
            totals.testsStarted > totals.testsCompleted
              ? `${NUM_FMT.format(totals.testsStarted)} started`
              : undefined
          }
          accent={isOwner}
        />
        <StatCell
          label="Time typing"
          value={formatDuration(totals.totalSeconds)}
        />
        <StatCell
          label="Best WPM"
          value={Math.round(totals.bestWpm).toString()}
          sub={
            totals.bestWpm > 0
              ? `${totals.bestWpmAccuracy.toFixed(1)}%`
              : undefined
          }
          accent={isOwner}
        />
        <StatCell
          label="Streak"
          value={`${streak.current}`}
          suffix="d"
          accent={isOwner && streak.current > 0}
          sub={streak.longest > 0 ? `${streak.longest}d best` : undefined}
        />
      </div>

      {/* Experience — the big full-width bar that closes the card. It's the
       *  last element, so nothing sits in dead space beneath it. */}
      <div className="mt-6 border-t border-border/60 pt-5">
        <LevelLockup totals={totals} />
      </div>

      {isOwner ? (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          tags={tags}
          eligibleTags={eligibleTags}
          onTagsChanged={onTagsChanged}
          rank={rank}
          bestWpm={totals.bestWpm}
          onRankChanged={onRankChanged}
        />
      ) : null}
    </section>
  );
}

function StatCell({
  label,
  value,
  suffix,
  sub,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold leading-none tracking-[-0.02em] tabular-nums sm:text-3xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
      {sub ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/** Compact follower / following / friend line under the handle.
 *  Tabular-nums counts in ink, labels muted. For the owner the whole
 *  line links to /friends; visitors see it as static text. */
function FriendCounts({
  stats,
  isOwner,
}: {
  stats: FriendStats;
  isOwner: boolean;
}) {
  const parts: { n: number; label: string }[] = [
    { n: stats.friends, label: stats.friends === 1 ? "friend" : "friends" },
    { n: stats.followers, label: "followers" },
    { n: stats.following, label: "following" },
  ];
  const inner = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {parts.map((p) => (
        <span key={p.label} className="text-[11px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {NUM_FMT.format(p.n)}
          </span>{" "}
          {p.label}
        </span>
      ))}
    </span>
  );
  if (isOwner) {
    return (
      <Link
        href="/friends"
        className="w-fit rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

/** The experience bar — the big full-width progress block that closes the
 *  hero card. A prominent level number, a chunky 3px track, and a total /
 *  to-next-level breakdown beneath. */
function LevelLockup({ totals }: { totals: ProfileTotals }) {
  const toNext = Math.max(0, XP_PER_LEVEL - totals.xpIntoLevel);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Level
          </span>
          <span className="text-2xl font-extrabold leading-none tracking-[-0.03em] tabular-nums text-foreground sm:text-3xl">
            {totals.level}
          </span>
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">
            {NUM_FMT.format(totals.xpIntoLevel)}
          </span>{" "}
          / {NUM_FMT.format(XP_PER_LEVEL)} xp
        </span>
      </div>
      <span
        aria-hidden
        className="relative block h-3 w-full overflow-hidden rounded-full bg-foreground/[0.08]"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${Math.round(totals.levelProgress * 100)}%` }}
        />
      </span>
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
        <span>
          <span className="tabular-nums text-muted-foreground">
            {NUM_FMT.format(totals.totalXp)}
          </span>{" "}
          total xp
        </span>
        <span>
          <span className="tabular-nums text-muted-foreground">
            {NUM_FMT.format(toNext)}
          </span>{" "}
          to level {totals.level + 1}
        </span>
      </div>
    </div>
  );
}

function Avatar({
  imageUrl,
  isLoaded,
}: {
  imageUrl: string | null;
  isLoaded: boolean;
}) {
  const sizeClass = "size-12 shrink-0 sm:size-14";
  if (!isLoaded) {
    return (
      <span
        aria-hidden
        className={cn(
          sizeClass,
          "animate-pulse rounded-full border border-border bg-foreground/[0.04]",
        )}
      />
    );
  }
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={cn(
          sizeClass,
          "rounded-full border border-border object-cover",
        )}
      />
    );
  }
  // Blank fallback — Clerk's auto-gradient is suppressed (`hasImage`
  // gates the imageUrl branch above). Quiet silhouette + muted bg
  // reads as "no avatar set" rather than "AI made me a portrait."
  return (
    <span
      aria-hidden
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground",
      )}
    >
      <UserIcon
        size={20}
        strokeWidth={1.5}
        className="sm:hidden"
        aria-hidden
      />
      <UserIcon
        size={22}
        strokeWidth={1.5}
        className="hidden sm:block"
        aria-hidden
      />
    </span>
  );
}

function OwnerMenu({
  isMtConnected,
  onEdit,
  onOpenMt,
  onSignOut,
}: {
  isMtConnected: boolean;
  onEdit: () => void;
  onOpenMt: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Profile actions"
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
            "transition-colors hover:border-foreground/40 hover:bg-accent/40 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "md:self-start",
          )}
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-52 p-1">
        <DropdownMenuItem
          onSelect={onEdit}
          className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em]"
        >
          <Pencil size={13} aria-hidden className="text-muted-foreground" />
          <span>Edit profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onOpenMt}
          className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em]"
        >
          {isMtConnected ? (
            <Link2 size={13} aria-hidden className="text-muted-foreground" />
          ) : (
            <Download size={13} aria-hidden className="text-muted-foreground" />
          )}
          <span>{isMtConnected ? "MonkeyType" : "Import"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onSignOut}
          className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em]"
        >
          <LogOut size={13} aria-hidden className="text-muted-foreground" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h >= 100) return `${h}h`;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}
