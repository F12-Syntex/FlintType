"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Download, Link2, LogOut, Pencil } from "lucide-react";
import { useState } from "react";
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
    <header className="relative border-b border-border px-4 py-10 sm:px-12 sm:py-16 lg:px-16">
      {/* Owner action cluster. On mobile it sits as a centred row
       *  *under* the lockup so it doesn't fight the centred title in
       *  a 375px column. From sm+ it floats back into the absolute
       *  top-right corner the way it used to. */}

      {isOwner ? (
        <div className="absolute top-4 right-4 hidden items-center gap-2 sm:top-8 sm:right-8 sm:flex lg:top-10 lg:right-10">
          <ActionButtons
            isConnected={isConnected}
            onImport={() => setImportOpen(true)}
            onManage={() => setManageOpen(true)}
            onEdit={() => setEditOpen(true)}
            onSignOut={() => void signOut({ redirectUrl: "/" })}
          />
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

      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center sm:gap-5">
        <Avatar
          imageUrl={avatarImageUrl}
          initial={initial}
          isLoaded={isOwner ? isLoaded : true}
        />

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {displayName}
          </h1>
          {joined ? (
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
              Member since {joined}
            </span>
          ) : null}
        </div>

        <LevelBadge totals={totals} />

        {/* Mobile-only action row sits below the level bar so the
         *  centred lockup stays clean. Hidden at sm+ — the absolute
         *  top-right cluster takes over. */}
        {isOwner ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-2 pt-1 sm:hidden">
            <ActionButtons
              isConnected={isConnected}
              onImport={() => setImportOpen(true)}
              onManage={() => setManageOpen(true)}
              onEdit={() => setEditOpen(true)}
              onSignOut={() => void signOut({ redirectUrl: "/" })}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** The owner-action trio (MonkeyType / Edit / Sign out). Rendered
 *  twice in the hero — once in the absolute top-right corner at sm+,
 *  once as a centred row beneath the lockup on mobile. Same buttons,
 *  same labels; the parent decides positioning. */
function ActionButtons({
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
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={isConnected ? onManage : onImport}
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
        <span>{isConnected ? "MonkeyType" : "Import"}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        aria-label="Edit profile"
      >
        <Pencil size={14} aria-hidden />
        <span>Edit</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onSignOut}
        aria-label="Sign out"
      >
        <LogOut size={14} aria-hidden />
        <span>Sign out</span>
      </Button>
    </>
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
  const numberFmt = new Intl.NumberFormat("en-US");
  return (
    <div className="mt-2 flex w-full max-w-xs flex-col items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Level{" "}
        <span className="text-foreground tabular-nums">{totals.level}</span>
        <span className="mx-1.5 text-foreground/30">·</span>
        <span className="text-foreground tabular-nums">
          {numberFmt.format(totals.totalXp)}
        </span>{" "}
        xp
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
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground/85">
        {numberFmt.format(totals.xpIntoLevel)} / 1,000 to next
      </span>
    </div>
  );
}
