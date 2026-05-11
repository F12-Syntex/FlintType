"use client";

import { useUser } from "@clerk/nextjs";
import { Download, Pencil } from "lucide-react";
import { useState } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileTotals } from "./derive-stats";
import { EditProfileDialog } from "./edit-profile-dialog";
import { MonkeyTypeImportDialog } from "./monkeytype-import-dialog";

/** Profile hero. Avatar + name lockup on the left, settings on the
 *  right. Sizes follow ui-law §4 page-title scale (text-3xl /
 *  text-5xl / text-6xl) so it reads as the page anchor.
 *
 *  `username` is the canonical handle from the URL; display name and
 *  avatar still come from the signed-in Clerk session. */
export function ProfileHero({
  totals,
  username,
}: {
  totals: ProfileTotals;
  username?: string;
}) {
  const { user, isLoaded } = useUser();
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const displayName = !isLoaded
    ? "—"
    : (user?.firstName ??
        user?.username ??
        username ??
        user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
        "Anonymous");
  // `username` from the URL is the canonical handle even though we
  // no longer surface it inline — page metadata + the route still
  // depend on it. Display name + member-since are the only visible
  // chrome above the level bar.
  void username;
  const initial = (displayName.charAt(0) || "·").toUpperCase();
  const joined =
    user?.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        })
      : null;

  return (
    <header className="relative border-b border-border px-5 py-12 sm:px-12 sm:py-16 lg:px-16">
      {/* Edit + Import sit in the top-right corner so they stay
       *  accessible without breaking the centred profile lockup.
       *  Settings moved off this page; account chrome lives at
       *  /app/customise (still reachable via the topbar). */}
      <div className="absolute top-5 right-5 flex items-center gap-2 sm:top-8 sm:right-8 lg:top-10 lg:right-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          aria-label="Import from MonkeyType"
        >
          <Download size={14} aria-hidden />
          <span className="hidden sm:inline">Import</span>
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
      </div>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      <MonkeyTypeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <div className="mb-7 flex items-center justify-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <Tag>Public profile</Tag>
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <Avatar
          imageUrl={user?.imageUrl ?? null}
          initial={initial}
          isLoaded={isLoaded}
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
