"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { UserTag } from "@/components/ft";
import { FollowButton } from "@/components/follow-button";
import { InviteToRaceButton } from "@/components/invite-to-race-button";
import { Surface } from "@/components/page-shell";
import { clearUserScopedStorage } from "@/lib/sign-out-cleanup";
import type { FriendRelationship, FriendStats } from "@/types/friends";
import type { RankId } from "@/types/rank";
import type { UserTagId } from "@/types/user-tag";
import type { ProfileTotals, StreakStats } from "./derive-stats";
import { EditProfileDialog } from "./edit-profile-dialog";
import { HeroStats, LevelLockup } from "./hero-stats";
import { OwnerMenu } from "./owner-menu";
import { ProfileAvatar } from "./profile-avatar";
import { RankBadge } from "./rank-badge";

const NUM_FMT = new Intl.NumberFormat("en-US");

/** The profile hero — the page's one card-as-header (ui-law §18.1).
 *
 *  - Identity: a flame-ringed avatar, the name as the page's h1, the
 *    handle + join date, the rank / identity chips and friend counts.
 *  - Actions sit in the top-right corner, out of the content flow: the
 *    owner's ⋯ menu, or a visitor's Follow (+ Race for friends). On
 *    phones the avatar shares the top row with the actions and the
 *    identity drops beneath at full width.
 *  - Stats tiles, then the XP bar closing the card.
 *
 *  MonkeyType import / manage state lives in the parent so the ⋯ menu
 *  and the banner open the same dialog through `onOpenMt`. */
export function ProfileHero({
  username,
  isOwner,
  pending = false,
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
  /** No snapshot yet (loading or failed): stats render as dashes. */
  pending?: boolean;
  tags?: UserTagId[];
  eligibleTags?: UserTagId[];
  onTagsChanged?: (next: UserTagId[]) => void;
  /** The subject's self-selected rank flair, or null when unset. */
  rank?: RankId | null;
  /** Owner-only — fires after the rank changes in the edit dialog so
   *  the badge updates without a refetch. */
  onRankChanged?: (next: RankId | null) => void;
  totals: ProfileTotals;
  streak: StreakStats;
  /** Subject's Clerk id — drives the follow button + friend counts. */
  subjectUserId?: string | null;
  /** Follower / following / friend counts. Null until resolved or for
   *  anonymous viewers (the friends routes need auth). */
  friendStats?: FriendStats | null;
  /** Viewer↔subject relationship — present only when a signed-in
   *  visitor views someone else's profile. */
  relationship?: FriendRelationship | null;
  /** True once the owner has imported MonkeyType data. */
  isMtConnected?: boolean;
  /** Opens the right MonkeyType dialog (manage vs import). */
  onOpenMt?: () => void;
  /** The subject's avatar from the history payload (already filtered
   *  through `hasImage`), so visitors see the subject's photo. */
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
  const handle = isOwner
    ? (user?.username ?? username ?? null)
    : (username ?? null);
  const joined =
    isOwner && user?.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        })
      : null;
  // Owner's own Clerk photo first (instant), then the subject's photo
  // from the snapshot (visitors). Both already exclude Clerk's
  // auto-generated gradient, so a missing photo shows the silhouette.
  const ownerImageUrl =
    isOwner && isLoaded && (user?.hasImage ?? false) && user?.imageUrl
      ? user.imageUrl
      : null;
  const avatarImageUrl = ownerImageUrl ?? subjectAvatarUrl ?? null;
  const avatarIsLoaded = isOwner ? isLoaded : true;
  const hasChips = rank != null || tags.length > 0 || relationship?.followedBy;

  return (
    <Surface as="section" className="relative overflow-hidden">
      {/* A faint flame wash across the top of the card. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-primary/10 to-transparent"
      />
      <div className="relative flex flex-col gap-6 p-5 sm:gap-7 sm:p-8">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <ProfileAvatar imageUrl={avatarImageUrl} isLoaded={avatarIsLoaded} />

          <div className="flex items-center justify-self-end sm:order-last sm:self-start">
            {isOwner ? (
              <OwnerMenu
                isMtConnected={isMtConnected}
                onEdit={() => setEditOpen(true)}
                onOpenMt={onOpenMt ?? (() => undefined)}
                onSignOut={() => {
                  clearUserScopedStorage();
                  void signOut({ redirectUrl: "/" });
                }}
              />
            ) : relationship && subjectUserId ? (
              <div className="flex items-center gap-2">
                {relationship.mutual ? (
                  <InviteToRaceButton
                    opponentId={subjectUserId}
                    className="hidden sm:inline-flex"
                  />
                ) : null}
                <FollowButton
                  userId={subjectUserId}
                  initial={relationship}
                  handle={handle}
                />
              </div>
            ) : null}
          </div>

          <div className="col-span-2 flex min-w-0 flex-col gap-2 sm:col-span-1 sm:self-center">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {displayName}
            </h1>
            {handle || joined ? (
              <p className="truncate text-sm text-muted-foreground">
                {[handle ? `@${handle}` : null, joined ? `Joined ${joined}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {hasChips ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {rank ? <RankBadge rank={rank} /> : null}
                {tags.map((t) => (
                  <UserTag key={t} tag={t} size="sm" />
                ))}
                {relationship?.followedBy ? (
                  <span className="inline-flex h-5 items-center rounded-pill bg-muted px-2 text-[11px] font-medium text-muted-foreground">
                    Follows you
                  </span>
                ) : null}
              </div>
            ) : null}
            {friendStats ? <FriendCounts stats={friendStats} /> : null}
          </div>
        </div>

        <HeroStats totals={totals} streak={streak} pending={pending} />

        <div className="border-t border-border/60 pt-5 sm:pt-6">
          <LevelLockup totals={totals} pending={pending} />
        </div>
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
    </Surface>
  );
}

/** Friend / follower / following counts under the handle. Static text —
 *  the friend graph lives in the friends dock, not a profile link. */
function FriendCounts({ stats }: { stats: FriendStats }) {
  const parts: { n: number; label: string }[] = [
    { n: stats.friends, label: stats.friends === 1 ? "friend" : "friends" },
    {
      n: stats.followers,
      label: stats.followers === 1 ? "follower" : "followers",
    },
    { n: stats.following, label: "following" },
  ];
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
      {parts.map((p) => (
        <span key={p.label}>
          <span className="font-semibold tabular-nums text-foreground">
            {NUM_FMT.format(p.n)}
          </span>{" "}
          {p.label}
        </span>
      ))}
    </p>
  );
}
