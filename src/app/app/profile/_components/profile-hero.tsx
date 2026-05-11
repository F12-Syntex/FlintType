"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Download, Link2, LogOut, Pencil } from "lucide-react";
import { useState } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { cn } from "@/lib/utils";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";
import type { ProfileTotals } from "./derive-stats";
import { EditProfileDialog } from "./edit-profile-dialog";
import { MonkeyTypeImportDialog } from "./monkeytype-import-dialog";
import { MonkeyTypeManageDialog } from "./monkeytype-manage-dialog";

const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** Profile hero. Avatar + name lockup on the left, settings on the
 *  right. Sizes follow ui-law §4 page-title scale (text-3xl /
 *  text-5xl / text-6xl) so it reads as the page anchor.
 *
 *  `username` is the canonical handle from the URL; display name and
 *  avatar still come from the signed-in Clerk session. */
export function ProfileHero({
  totals,
  username,
  isOwner,
}: {
  totals: ProfileTotals;
  username?: string;
  /** True when the viewer owns this profile. Owner-only chrome (Edit,
   *  MonkeyType, Sign out) is hidden when false so visitors see a
   *  pure-data view of someone else's profile. */
  isOwner: boolean;
}) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  // The hero ALWAYS reflects the subject of the URL, not the viewer.
  // For owners that's the signed-in Clerk user; for visitors we have
  // no Clerk record on the client, so the URL slug is the only handle
  // we can show. Display name in the visitor case is just `@slug` with
  // an initial-fallback avatar — when the public profile data fetch
  // returns we don't get an avatar URL back (no public users API
  // surface yet), so an initial is the best we have.

  // Owner-only: track the connection state inline so the import
  // button label + dialog flips between paste-key and manage based on
  // whether we have a stored Ape Key. Visitors never see these
  // controls so we read the slice anyway (cheap) but gate the UI on
  // isOwner.
  const { value: mtSliceRaw, update: updateMtSlice } =
    useRemotePrefs<MonkeytypeStatsSlice>("monkeytypeStats", EMPTY_MT_SLICE);
  const isConnected =
    isOwner &&
    mtSliceRaw.importedAt > 0 &&
    mtSliceRaw.encryptedApiKey != null;
  // Owner: prefer Clerk's profile fields. Visitor: the URL slug is
  // the only identity we have on the client.
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
  const joined =
    isOwner && user?.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        })
      : null;
  // Visitors get the initial-fallback avatar; we don't have a public
  // users-API surface that returns a foreign user's imageUrl yet.
  const avatarImageUrl = isOwner ? (user?.imageUrl ?? null) : null;

  return (
    <header className="relative border-b border-border px-5 py-12 sm:px-12 sm:py-16 lg:px-16">
      {/* Owner-only chrome — Edit, MonkeyType (import / manage),
       *  Sign out. Visitors don't see any of these so they get a
       *  read-only profile view. The MonkeyType button label flips
       *  once a key is stored: 'Import' opens the paste-key dialog,
       *  'MonkeyType' opens the manage dialog (resync / re-paste /
       *  disconnect). */}
      {isOwner ? (
        <div className="absolute top-5 right-5 flex items-center gap-2 sm:top-8 sm:right-8 lg:top-10 lg:right-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              isConnected ? setManageOpen(true) : setImportOpen(true)
            }
            aria-label={
              isConnected
                ? "Manage MonkeyType connection"
                : "Import from MonkeyType"
            }
          >
            {isConnected ? (
              <Link2 size={14} aria-hidden />
            ) : (
              <Download size={14} aria-hidden />
            )}
            <span className="hidden sm:inline">
              {isConnected ? "MonkeyType" : "Import"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            aria-label="Edit profile"
          >
            <Pencil size={14} aria-hidden />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signOut({ redirectUrl: "/" })}
            aria-label="Sign out"
          >
            <LogOut size={14} aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      ) : null}

      {isOwner ? (
        <>
          <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
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

      <div className="mb-7 flex items-center justify-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <Tag>Public profile</Tag>
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <Avatar
          imageUrl={avatarImageUrl}
          initial={initial}
          isLoaded={isOwner ? isLoaded : true}
        />

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {displayName}
          </h1>
          {joined ? (
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Member since {joined}
            </span>
          ) : null}
        </div>

        <LevelBadge totals={totals} />
      </div>
    </header>
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
  if (!isLoaded) {
    return (
      <span
        aria-hidden
        className="size-24 animate-pulse rounded-full border border-border bg-foreground/[0.04] sm:size-28"
      />
    );
  }
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="size-24 shrink-0 rounded-full border border-border object-cover sm:size-28"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-24 shrink-0 items-center justify-center rounded-full border border-border bg-card text-3xl font-bold tracking-tight text-primary sm:size-28 sm:text-4xl"
    >
      {initial}
    </span>
  );
}

function LevelBadge({ totals }: { totals: ProfileTotals }) {
  return (
    <div className="mt-2 flex w-full max-w-xs flex-col items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Level{" "}
        <span className="text-foreground tabular-nums">{totals.level}</span>
      </span>
      <span
        aria-hidden
        className="relative inline-block h-1 w-full overflow-hidden rounded-full bg-foreground/[0.08]"
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 origin-left rounded-full bg-primary",
          )}
          style={{
            transform: `scaleX(${totals.levelProgress})`,
            width: "100%",
          }}
        />
      </span>
    </div>
  );
}
