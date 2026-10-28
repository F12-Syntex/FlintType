"use client";

import { useCallback, useEffect, useState } from "react";
import type { useBackend } from "@/lib/backend";
import type { FriendRelationship, FriendStats } from "@/types/friends";
import { patchFriendStats } from "./friend-stats-patch";

type Backend = ReturnType<typeof useBackend>;

type FriendState = {
  /** Which subject + viewer role this state belongs to. State for any
   *  other key is ignored, so switching profiles never shows stale
   *  counts (derived, not reset in an effect). */
  key: string;
  stats: FriendStats | null;
  relationship: FriendRelationship | null;
};

/** Friend counts for the profile's subject (everyone signed in) and
 *  the viewer's relationship with them (visitors only). The friends
 *  routes need auth, so signed-out viewers get neither.
 *
 *  `onRelationshipChange` patches the counts the moment Follow /
 *  Unfollow / Block lands, then re-fetches the real numbers. */
export function useProfileFriends({
  backend,
  subjectUserId,
  isOwner,
  signedIn,
}: {
  backend: Backend;
  subjectUserId: string | null;
  isOwner: boolean | null;
  signedIn: boolean;
}) {
  const key =
    subjectUserId && signedIn && isOwner != null
      ? `${subjectUserId}|${isOwner ? "owner" : "visitor"}`
      : null;
  const [state, setState] = useState<FriendState | null>(null);

  useEffect(() => {
    if (!key || !subjectUserId) return;
    let cancelled = false;
    const merge = (patch: Partial<FriendState>) => {
      if (cancelled) return;
      setState((prev) => ({
        stats: null,
        relationship: null,
        ...(prev?.key === key ? prev : {}),
        ...patch,
        key,
      }));
    };
    backend.friends
      .stats({ userId: subjectUserId })
      .then((stats) => merge({ stats }))
      .catch(() => {});
    if (!isOwner) {
      backend.friends
        .relationship({ userId: subjectUserId })
        .then((relationship) => merge({ relationship }))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [backend, key, subjectUserId, isOwner]);

  const onRelationshipChange = useCallback(
    (next: FriendRelationship) => {
      if (!key || !subjectUserId) return;
      setState((prev) =>
        prev?.key === key
          ? {
              ...prev,
              relationship: next,
              stats: prev.stats
                ? patchFriendStats(prev.stats, prev.relationship, next)
                : null,
            }
          : { key, stats: null, relationship: next },
      );
      backend.friends
        .stats({ userId: subjectUserId })
        .then((stats) =>
          setState((prev) => (prev?.key === key ? { ...prev, stats } : prev)),
        )
        .catch(() => {});
    },
    [backend, key, subjectUserId],
  );

  const current = state && state.key === key ? state : null;
  return {
    friendStats: current?.stats ?? null,
    relationship: current?.relationship ?? null,
    onRelationshipChange,
  };
}
