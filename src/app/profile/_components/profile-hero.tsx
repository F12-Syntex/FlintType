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
import { EditProfileDialog } from "./edit-profile-dialog";
import { MonkeyTypeImportDialog } from "./monkeytype-import-dialog";
import { MonkeyTypeManageDialog } from "./monkeytype-manage-dialog";

const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** /profile hero — editorial lockup. Avatar on the left, name +
 *  identity-tag chips + `@handle · joined` subline on the right,
 *  owner-only kebab menu pinned to the row's right edge.
 *
 *  The lockup stays horizontal at every viewport (avatar+text don't
 *  stack vertically on mobile); the avatar shrinks slightly on small
 *  screens and the tag chips wrap to a second line when the name
 *  pushes them out. That keeps the visual mass tight even at 375px
 *  and avoids the "centred avatar, centred text, centred actions"
 *  triple stack that read as packed in the old design.
 *
 *  Owner-only chrome (Edit, MonkeyType, Sign out) collapses behind a
 *  single ⋯ button instead of a three-button row. Visitors see no
 *  button at all — empty owner-action affordances are dead UI. */
export function ProfileHero({
  username,
  isOwner,
  tags = [],
}: {
  username?: string;
  /** True when the viewer owns this profile. Owner-only chrome (Edit,
   *  MonkeyType, Sign out) collapses behind the kebab menu when true;
   *  hidden entirely otherwise. */
  isOwner: boolean;
  /** Identity-marker tags for the subject of this profile, resolved
   *  server-side (see `src/server/resolve-tags.ts`). Painted as
   *  `<UserTag size="md">` chips inline beside the display name in
   *  array order (OWNER first, then OG). */
  tags?: UserTagId[];
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

  // Display name: owners get the live Clerk lockup; visitors see only
  // the URL slug since we don't expose a foreign user's display name
  // through the public-profile route.
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

  const subline = [
    handle ? `@${handle}` : null,
    joined ? `joined ${joined}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="flex items-start gap-4 sm:gap-5">
      <Avatar
        imageUrl={avatarImageUrl}
        initial={initial}
        isLoaded={isOwner ? isLoaded : true}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {displayName}
          </h1>
          {tags.map((t) => (
            <UserTag key={t} tag={t} size="md" />
          ))}
        </div>
        {subline ? (
          <p className="text-[11px] font-medium tracking-[0.04em] text-muted-foreground sm:text-[12px]">
            {subline}
          </p>
        ) : null}
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

      {isOwner ? (
        <>
          <EditProfileDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            tags={tags}
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
  const sizeClass = "size-14 shrink-0 sm:size-16";
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
        "flex items-center justify-center rounded-full border border-border bg-card text-lg font-bold tracking-tight text-primary sm:text-xl",
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
