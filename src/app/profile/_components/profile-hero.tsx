"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Download, Link2, LogOut, MoreHorizontal, Pencil } from "lucide-react";
import { useState } from "react";
import { UserTag } from "@/components/ft";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { cn } from "@/lib/utils";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";
import type { UserTagId } from "@/types/user-tag";
import type { ProfileTotals, StreakStats } from "./derive-stats";
import { EditProfileDialog } from "./edit-profile-dialog";
import { MonkeyTypeImportDialog } from "./monkeytype-import-dialog";
import { MonkeyTypeManageDialog } from "./monkeytype-manage-dialog";

const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

const NUM_FMT = new Intl.NumberFormat("en-US");

/** Wide MonkeyType-style hero panel — identity on the left, big
 *  headline stats inline on the right, kebab menu pinned to the far
 *  right corner. Stacks vertically on mobile and goes side-by-side at
 *  md+. The level lockup + XP bar sit underneath the name on the
 *  identity side so the eye reads "who, then what they've done."
 *
 *  Visually this is one bordered card panel, matching the rest of the
 *  page rhythm; the panel itself is the section. */
export function ProfileHero({
  username,
  isOwner,
  tags = [],
  eligibleTags = [],
  onTagsChanged,
  totals,
  streak,
}: {
  username?: string;
  isOwner: boolean;
  tags?: UserTagId[];
  /** Full set of tags the subject is eligible to display. Owner-only:
   *  passed through to the EditProfileDialog so the toggle UI can
   *  paint every eligible chip (selected and unselected). */
  eligibleTags?: UserTagId[];
  /** Fires when the dialog saves a new selection. Parents use this
   *  to refresh the visible tag set without a snapshot refetch. */
  onTagsChanged?: (next: UserTagId[]) => void;
  totals: ProfileTotals;
  streak: StreakStats;
}) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const { value: mtSliceRaw, update: updateMtSlice } =
    useRemotePrefs<MonkeytypeStatsSlice>("monkeytypeStats", EMPTY_MT_SLICE);
  const isConnected =
    isOwner &&
    mtSliceRaw.importedAt > 0 &&
    mtSliceRaw.encryptedApiKey != null;

  const displayName = isOwner
    ? !isLoaded
      ? "—"
      : (user?.firstName ??
          user?.username ??
          username ??
          user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
          "Anonymous")
    : (username ?? "Anonymous");
  const initial = (displayName.charAt(0) || "·").toUpperCase();
  const handle = isOwner ? (user?.username ?? username ?? null) : (username ?? null);
  const joined =
    isOwner && user?.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        })
      : null;
  const avatarImageUrl = isOwner ? (user?.imageUrl ?? null) : null;

  return (
    <section className="rounded-md border border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        {/* Identity — avatar + name + tags + level lockup */}
        <div className="flex items-center gap-4 md:min-w-0 md:flex-1">
          <Avatar
            imageUrl={avatarImageUrl}
            initial={initial}
            isLoaded={isOwner ? isLoaded : true}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {displayName}
              </h1>
              {tags.map((t) => (
                <UserTag key={t} tag={t} size="sm" />
              ))}
            </div>
            {handle || joined ? (
              <p className="truncate text-[11px] tracking-[0.04em] text-muted-foreground">
                {[handle ? `@${handle}` : null, joined ? `joined ${joined}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            <LevelLockup totals={totals} />
          </div>
        </div>

        {/* Headline stats — inline strip with hairline dividers */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-6 md:flex md:flex-none md:items-baseline md:gap-x-8 md:divide-x md:divide-border/60">
          <StatCell
            label="Tests"
            value={NUM_FMT.format(totals.testsCompleted)}
            accent
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
            accent
          />
          <StatCell
            label="Streak"
            value={`${streak.current}`}
            suffix="d"
            accent={streak.current > 0}
            sub={streak.longest > 0 ? `${streak.longest}d best` : undefined}
          />
        </div>

        {isOwner ? (
          <OwnerMenu
            isConnected={isConnected}
            onImport={() => setImportOpen(true)}
            onManage={() => setManageOpen(true)}
            onEdit={() => setEditOpen(true)}
            onSignOut={() => void signOut({ redirectUrl: "/" })}
          />
        ) : null}
      </div>

      {isOwner ? (
        <>
          <EditProfileDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            tags={tags}
            eligibleTags={eligibleTags}
            onTagsChanged={onTagsChanged}
          />
          <MonkeyTypeImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
          />
          {isConnected ? (
            <MonkeyTypeManageDialog
              open={manageOpen}
              onOpenChange={setManageOpen}
              slice={mtSliceRaw}
              onSliceUpdate={(next) => updateMtSlice(next)}
              onSliceCleared={() => updateMtSlice(EMPTY_MT_SLICE)}
              onRepaste={() => {
                setManageOpen(false);
                setImportOpen(true);
              }}
            />
          ) : null}
        </>
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
    <div className="flex flex-col gap-0.5 md:pl-8 md:first:pl-0">
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

function LevelLockup({ totals }: { totals: ProfileTotals }) {
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Level{" "}
          <span className="text-foreground tabular-nums">{totals.level}</span>
          <span className="mx-1.5 text-foreground/30">·</span>
          <span className="text-foreground tabular-nums">
            {NUM_FMT.format(totals.totalXp)}
          </span>{" "}
          xp
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/80">
          {NUM_FMT.format(totals.xpIntoLevel)} / 1,000
        </span>
      </div>
      <span
        aria-hidden
        className="relative block h-[3px] w-full overflow-hidden rounded-full bg-foreground/[0.08]"
      >
        <span
          className={cn("absolute inset-y-0 left-0 origin-left rounded-full bg-primary")}
          style={{
            transform: `scaleX(${totals.levelProgress})`,
            width: "100%",
          }}
        />
      </span>
    </div>
  );
}

function Avatar({
  imageUrl,
  initial,
  isLoaded,
}: {
  imageUrl: string | null;
  initial: string;
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
  return (
    <span
      aria-hidden
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-full border border-border bg-background text-base font-bold tracking-tight text-primary sm:text-lg",
      )}
    >
      {initial}
    </span>
  );
}

function OwnerMenu({
  isConnected,
  onImport,
  onManage,
  onEdit,
  onSignOut,
}: {
  isConnected: boolean;
  onImport: () => void;
  onManage: () => void;
  onEdit: () => void;
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
          onSelect={isConnected ? onManage : onImport}
          className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em]"
        >
          {isConnected ? (
            <Link2 size={13} aria-hidden className="text-muted-foreground" />
          ) : (
            <Download size={13} aria-hidden className="text-muted-foreground" />
          )}
          <span>{isConnected ? "MonkeyType" : "Import"}</span>
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
