"use client";

import { Ban, Check, ChevronDown, MoreHorizontal, Swords, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useBackend } from "@/lib/backend";
import { useAsyncAction } from "@/lib/use-async-action";
import { cn } from "@/lib/utils";
import type { FriendRelationship } from "@/types/friends";

type Op = "follow" | "unfollow" | "block" | "unblock";

const LOADING_LABEL: Record<Op, string> = {
  follow: "Following…",
  unfollow: "Unfollowing…",
  block: "Blocking…",
  unblock: "Unblocking…",
};

/** The single relationship control, reused on profile heroes and
 *  friends-list rows. The brand coral marks exactly one thing here: the
 *  *Follow* / *Follow back* call to action. Once connected the control is
 *  a **stable** status (it never morphs on hover); management actions
 *  (Unfollow, Block, Challenge) live in a dropdown, and the destructive
 *  ones route through a confirm step (ui-law §17.1).
 *
 *  - `compact` (dense rows): the connected state shows *only* the ⋯ menu,
 *    since the list a row sits in already says "following" / "friends".
 *  - default (profile hero): the connected state shows a labelled status
 *    button that opens the same menu, so the relationship reads at a
 *    glance.
 *
 *  Self-contained: owns optimistic relationship state + the async states
 *  (loading disables + relabels, errors render below). */
export function FollowButton({
  userId,
  initial,
  size = "default",
  compact = false,
  handle,
  className,
  onChange,
}: {
  userId: string;
  initial: FriendRelationship;
  size?: "default" | "sm";
  /** Dense-row mode: hide the connected status button, show only ⋯. */
  compact?: boolean;
  /** `@handle` for menu labels; falls back to "this person". */
  handle?: string | null;
  className?: string;
  onChange?: (rel: FriendRelationship) => void;
}) {
  const backend = useBackend();
  const router = useRouter();
  const [rel, setRel] = useState<FriendRelationship>(initial);
  const [confirm, setConfirm] = useState<null | "unfollow" | "block">(null);
  const opRef = useRef<Op>("follow");

  const action = useAsyncAction<FriendRelationship>(async () => {
    const next = await backend.friends[opRef.current]({ userId });
    setRel(next);
    onChange?.(next);
    setConfirm(null);
    return next;
  });

  function trigger(op: Op) {
    opRef.current = op;
    void action.run();
  }

  // They blocked you: no affordance at all.
  if (rel.blockedBy) return null;

  const loading = action.loading;
  const err = action.result && !action.result.ok ? action.result.message : null;
  const btnSize = size === "sm" ? "sm" : "default";
  // The repo's Button `default` size is h-8 (32px) — under the §7 44px
  // touch floor for a primary action. The profile CTA bumps to 44 on
  // mobile, relaxes to the dense desktop height. Rows use size="sm".
  const heightClass = size === "default" ? "h-11 sm:h-9" : "h-8";
  const handleName = handle ? `@${handle}` : "this person";

  // The ⋯ menu body — Challenge (friends only), Unfollow, then Block.
  const menuItems = (
    <DropdownMenuContent align="end" sideOffset={6} className="min-w-48 p-1">
      {rel.mutual ? (
        <DropdownMenuItem
          onSelect={() => router.push(`/duel/new?opponent=${userId}`)}
          className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em]"
        >
          <Swords size={13} aria-hidden />
          <span>Challenge to a duel</span>
        </DropdownMenuItem>
      ) : null}
      {rel.following || rel.mutual ? (
        <DropdownMenuItem
          onSelect={() => setConfirm("unfollow")}
          className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em]"
        >
          <UserMinus size={13} aria-hidden />
          <span>Unfollow {handleName}</span>
        </DropdownMenuItem>
      ) : null}
      {rel.following || rel.mutual ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem
        onSelect={() => setConfirm("block")}
        className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em] text-destructive focus:text-destructive"
      >
        <Ban size={13} aria-hidden />
        <span>Block {handleName}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const kebabTrigger = (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={`More options for ${handleName}`}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
          "transition-colors hover:border-foreground/40 hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          size === "sm" && "size-8",
        )}
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
    </DropdownMenuTrigger>
  );

  let control: React.ReactNode;
  if (rel.blocking) {
    // Unblock isn't destructive — a plain toggle, no confirm.
    control = (
      <Button
        type="button"
        variant="outline"
        size={btnSize}
        disabled={loading}
        onClick={() => trigger("unblock")}
        className={cn("text-muted-foreground", heightClass)}
      >
        {loading ? LOADING_LABEL.unblock : "Blocked"}
      </Button>
    );
  } else if (rel.mutual || rel.following) {
    // Connected — stable status, no hover morph. The trigger opens the
    // management menu. Compact rows show only the ⋯; the profile shows a
    // labelled status button that opens the same menu.
    const statusTrigger = compact ? (
      kebabTrigger
    ) : (
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={btnSize}
          className={cn("gap-1.5", heightClass)}
        >
          {rel.mutual ? (
            <Check size={14} className="text-primary" aria-hidden />
          ) : null}
          {rel.mutual ? "Friends" : "Following"}
          <ChevronDown size={13} className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
    );
    control = (
      <DropdownMenu>
        {statusTrigger}
        {menuItems}
      </DropdownMenu>
    );
  } else {
    // Not following — the one coral CTA, plus a ⋯ for Block.
    control = (
      <>
        <Button
          type="button"
          size={btnSize}
          disabled={loading}
          onClick={() => trigger("follow")}
          className={heightClass}
        >
          {loading
            ? LOADING_LABEL.follow
            : rel.followedBy
              ? "Follow back"
              : "Follow"}
        </Button>
        <DropdownMenu>
          {kebabTrigger}
          {menuItems}
        </DropdownMenu>
      </>
    );
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <div className="flex items-center gap-2">{control}</div>
      {err ? (
        <span className="text-[11px] text-destructive">
          Couldn&apos;t update. Try again.
        </span>
      ) : null}

      <ConfirmDialog
        open={confirm === "unfollow"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Unfollow ${handleName}?`}
        confirmLabel="Unfollow"
        confirmVariant="destructive"
        confirmDisabled={loading}
        onConfirm={() => trigger("unfollow")}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          You&apos;ll stop seeing their activity, and you won&apos;t be friends
          until you follow each other again.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "block"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Block ${handleName}?`}
        confirmLabel="Block"
        confirmVariant="destructive"
        confirmDisabled={loading}
        onConfirm={() => trigger("block")}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          You&apos;ll both be removed as followers and won&apos;t see each
          other&apos;s activity or be able to duel. You can unblock them later.
        </p>
      </ConfirmDialog>
    </div>
  );
}
