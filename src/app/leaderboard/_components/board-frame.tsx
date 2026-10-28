"use client";

import type { ReactNode } from "react";
import { relativeTime } from "@/lib/relative-time";
import { BoardActions, BoardNotice, useSaveBoardImage } from "./board-actions";
import { LeaderboardToolbar } from "./toolbar";

/** Toolbar, failure notices and the board, shared by every view.
 *  A refresh that fails while older rows are showing, or a failed image
 *  save, gets a visible line under the toolbar instead of failing
 *  silently. */
export function BoardFrame({
  onRefresh,
  refreshing,
  generatedAt,
  refreshError,
  children,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  generatedAt: number | null;
  /** Set only when rows are still on screen; a board with no rows shows
   *  its own error state instead. */
  refreshError: string | null;
  children: ReactNode;
}) {
  const image = useSaveBoardImage();
  return (
    <div className="flex flex-col gap-4">
      <LeaderboardToolbar
        actions={
          <BoardActions
            onRefresh={onRefresh}
            refreshing={refreshing}
            generatedAt={generatedAt}
            image={image}
          />
        }
      />
      {refreshError ? (
        <BoardNotice
          message={
            generatedAt
              ? `Couldn't refresh. Last updated ${relativeTime(generatedAt)}.`
              : "Couldn't refresh the leaderboard."
          }
          onRetry={onRefresh}
        />
      ) : null}
      {image.failed ? (
        <BoardNotice message="Couldn't save the image." onRetry={image.save} />
      ) : null}
      {children}
    </div>
  );
}
