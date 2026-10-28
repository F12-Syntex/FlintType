"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeaderboardFilters } from "./filters";
import { STATE_CTA } from "./shared-list";
import { otherScope } from "./slice-labels";
import type { SetLeaderboardFilters } from "./use-leaderboard-params";

/** The widest filter that is narrowing the board, offered as one tap to
 *  show more, plus a way to put a run on the board. When nothing is
 *  left to widen, offer the other mode, which may well have runs. */
export function EmptyActions({
  slice,
  setFilters,
}: {
  slice: LeaderboardFilters;
  setFilters: SetLeaderboardFilters;
}) {
  const widen =
    slice.preset !== "any"
      ? { label: "Show all lengths", next: { preset: "any" as const } }
      : slice.window !== "all_time"
        ? { label: "Show all time", next: { window: "all_time" as const } }
        : slice.audience === "friends"
          ? { label: "Show everyone", next: { audience: "global" as const } }
          : null;
  const start = (
    <Link
      href="/"
      className={cn(
        buttonVariants({ variant: widen ? "ghost" : "default" }),
        STATE_CTA,
      )}
    >
      Start a test
    </Link>
  );
  if (widen) {
    return (
      <>
        <Button
          type="button"
          onClick={() => setFilters(widen.next)}
          className={STATE_CTA}
        >
          {widen.label}
        </Button>
        {start}
      </>
    );
  }
  const other = otherScope(slice.scope);
  return (
    <>
      {start}
      <Button
        type="button"
        variant="outline"
        onClick={() => setFilters({ scope: other.id })}
        className={STATE_CTA}
      >
        Show {other.label} runs
      </Button>
    </>
  );
}
