"use client";

import { Ban, Check, MoreHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
 *  friends-list rows. The brand coral marks exactly one thing here:
 *  the *Follow* / *Follow back* call to action (the move we want the
 *  viewer to make). Once connected it drops to a quiet outline, and
 *  the established-friendship state is marked only by a small coral
 *  check, so a screen never carries two competing sparks.
 *
 *  Self-contained: owns optimistic relationship state + the three
 *  async states (loading disables + relabels the trigger, errors
 *  render below). Pass `menu` to expose Block/Unblock in a kebab. */
export function FollowButton({
  userId,
  initial,
  size = "default",
  menu = false,
  handle,
  className,
  onChange,
}: {
  userId: string;
  initial: FriendRelationship;
  size?: "default" | "sm";
  /** Show the Block/Unblock kebab beside the button. */
  menu?: boolean;
  /** `@handle` for the Block menu label; falls back to "this user". */
  handle?: string | null;
  className?: string;
  onChange?: (rel: FriendRelationship) => void;
}) {
  const backend = useBackend();
  const [rel, setRel] = useState<FriendRelationship>(initial);
  const opRef = useRef<Op>("follow");

  const action = useAsyncAction<FriendRelationship>(async () => {
    const next = await backend.friends[opRef.current]({ userId });
    setRel(next);
    onChange?.(next);
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
  // touch floor for a primary action. The full-size control is the
  // profile CTA, so bump it on mobile and relax to the dense desktop
  // height. Dense rows use size="sm" and stay compact (secondary).
  const heightClass = size === "default" ? "h-11 sm:h-9" : "";

  let button: React.ReactNode;
  if (rel.blocking) {
    button = (
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
  } else if (rel.mutual) {
    // Friends — quiet outline, coral check, hover offers Unfollow.
    button = (
      <Button
        type="button"
        variant="outline"
        size={btnSize}
        disabled={loading}
        onClick={() => trigger("unfollow")}
        className={cn("group", heightClass)}
      >
        {loading ? (
          LOADING_LABEL.unfollow
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 group-hover:hidden">
              <Check size={14} className="text-primary" aria-hidden />
              Friends
            </span>
            <span className="hidden text-destructive group-hover:inline">
              Unfollow
            </span>
          </>
        )}
      </Button>
    );
  } else if (rel.following) {
    button = (
      <Button
        type="button"
        variant="outline"
        size={btnSize}
        disabled={loading}
        onClick={() => trigger("unfollow")}
        className={cn("group", heightClass)}
      >
        {loading ? (
          LOADING_LABEL.unfollow
        ) : (
          <>
            <span className="group-hover:hidden">Following</span>
            <span className="hidden text-destructive group-hover:inline">
              Unfollow
            </span>
          </>
        )}
      </Button>
    );
  } else {
    // Not following — the one coral CTA. "Follow back" when they
    // already follow us.
    button = (
      <Button
        type="button"
        size={btnSize}
        disabled={loading}
        onClick={() => trigger("follow")}
        className={heightClass || undefined}
      >
        {loading
          ? LOADING_LABEL.follow
          : rel.followedBy
            ? "Follow back"
            : "Follow"}
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        {button}
        {menu && !rel.blocking ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
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
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-44 p-1">
              <DropdownMenuItem
                onSelect={() => trigger("block")}
                className="flex items-center gap-2.5 rounded-sm py-2 pl-2 pr-3 text-[12px] font-medium uppercase tracking-[0.12em] text-destructive focus:text-destructive"
              >
                <Ban size={13} aria-hidden />
                <span>Block {handle ? `@${handle}` : "this user"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {err ? (
        <span className="text-[11px] text-destructive">
          Couldn&apos;t update. Try again.
        </span>
      ) : null}
    </div>
  );
}
