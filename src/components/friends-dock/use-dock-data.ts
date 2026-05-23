"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBackend } from "@/lib/backend";
import type { FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import type { RaceInviteData } from "@/types/notification";
import type { PresenceEntry } from "@/types/presence";
import {
  withDummyChallenges,
  withDummyLists,
  withDummyLive,
  withDummyPresence,
} from "./dock-dummy";

/** A pending race-lobby invite, surfaced as a "challenge" row in the
 *  dock. Derived from unread `race_invite` notifications — the live
 *  lobby is the only kind of friend race, so a pending invite is the
 *  dock's challenge. */
export type DockChallenge = {
  /** Notification id — the row key + dedupe handle. */
  id: string;
  /** Lobby slug, the join target (`/race/c/<slug>`). */
  slug: string;
  inviterId: string;
  inviterName: string;
  inviterUsername: string | null;
};

/** Dev-only: inject fake friends/presence/challenges so the dock can be
 *  exercised without a real follow graph. Eliminated from prod builds. */
const DEV_DUMMY = process.env.NODE_ENV === "development";

/** Presence / live refresh cadence (live snapshots age out at 6s). */
const POLL_MS = 6_000;

export type DockData = {
  /** Mutual friends broadcasting a live run right now. */
  live: LiveFriend[];
  /** Pending race-lobby invites — a friend opened a lobby and invited
   *  you. Derived from unread `race_invite` notifications. */
  challenges: DockChallenge[];
  /** Everyone in your network — friends, people you follow, and your
   *  followers (deduped). */
  directory: FriendUser[];
  presenceById: Map<string, PresenceEntry>;
  /** People in the directory who are online right now. */
  onlineCount: number;
  loading: boolean;
  reload: () => void;
};

/** Powers the friends dock. Loads the follow lists once (they change
 *  rarely), then polls live + presence + incoming challenges on an
 *  interval while the dock is mounted and the tab is foregrounded — a
 *  backgrounded tab makes zero requests and resumes on return, matching
 *  the broadcaster / watch loops (multiplayer.md). */
export function useDockData({
  enabled,
  signedIn,
}: {
  enabled: boolean;
  signedIn: boolean;
}): DockData {
  const backend = useBackend();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [following, setFollowing] = useState<FriendUser[]>([]);
  const [followers, setFollowers] = useState<FriendUser[]>([]);
  const [live, setLive] = useState<LiveFriend[]>([]);
  const [challenges, setChallenges] = useState<DockChallenge[]>([]);
  const [presenceById, setPresenceById] = useState<Map<string, PresenceEntry>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);

  // Real data needs a signed-in caller; dev-dummy renders regardless so
  // the dock is reviewable without a populated Clerk instance.
  const wantsData = signedIn || DEV_DUMMY;

  const loadLists = useCallback(async () => {
    try {
      const [f, fo, fr] = signedIn
        ? await Promise.all([
            backend.friends.listFriends(),
            backend.friends.listFollowing(),
            backend.friends.listFollowers(),
          ])
        : await Promise.all([
            Promise.resolve({ users: [] as FriendUser[] }),
            Promise.resolve({ users: [] as FriendUser[] }),
            Promise.resolve({ users: [] as FriendUser[] }),
          ]);
      const next = { friends: f.users, following: fo.users };
      const merged = DEV_DUMMY ? withDummyLists(next) : next;
      setFriends(merged.friends);
      setFollowing(merged.following);
      setFollowers(fr.users);
    } catch {
      if (DEV_DUMMY) {
        const merged = withDummyLists({ friends: [], following: [] });
        setFriends(merged.friends);
        setFollowing(merged.following);
        setFollowers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [backend, signedIn]);

  const poll = useCallback(() => {
    const liveReq = signedIn
      ? backend.live.friendsLive().then((r) => r.users)
      : Promise.resolve<LiveFriend[]>([]);
    liveReq
      .then((u) => setLive(DEV_DUMMY ? withDummyLive(u) : u))
      .catch(() => DEV_DUMMY && setLive(withDummyLive([])));

    const presenceReq = signedIn
      ? backend.presence.list().then((p) => p.entries)
      : Promise.resolve<PresenceEntry[]>([]);
    presenceReq
      .then((entries) => {
        const map = new Map(entries.map((e) => [e.userId, e]));
        setPresenceById(DEV_DUMMY ? withDummyPresence(map) : map);
      })
      .catch(() => DEV_DUMMY && setPresenceById(withDummyPresence(new Map())));

    // Pending race-lobby invites = unread `race_invite` notifications.
    // The notification bell is the canonical feed; the dock surfaces the
    // still-actionable ones as a join shortcut.
    const inviteReq = signedIn
      ? backend.notifications.list().then((r) =>
          r.items.flatMap<DockChallenge>((n) => {
            if (n.kind !== "race_invite" || n.readAtMs != null) return [];
            const d = n.data;
            if (!d || typeof d !== "object" || !("slug" in d)) return [];
            const data = d as RaceInviteData;
            return [
              {
                id: n.id,
                slug: data.slug,
                inviterId: data.inviterId,
                inviterName: data.inviterName,
                inviterUsername: data.inviterUsername,
              },
            ];
          }),
        )
      : Promise.resolve<DockChallenge[]>([]);
    inviteReq
      .then((invites) =>
        setChallenges(DEV_DUMMY ? withDummyChallenges(invites) : invites),
      )
      .catch(() => {
        if (DEV_DUMMY) setChallenges(withDummyChallenges([]));
      });
  }, [backend, signedIn]);

  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  useEffect(() => {
    if (!enabled || !wantsData) return;
    void loadLists();
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      pollRef.current();
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) pollRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, wantsData, loadLists]);

  const directory = useMemo(() => {
    const seen = new Set<string>();
    const out: FriendUser[] = [];
    // Mutual friends first, then people you follow, then your followers.
    for (const u of [...friends, ...following, ...followers]) {
      if (seen.has(u.userId)) continue;
      seen.add(u.userId);
      out.push(u);
    }
    return out;
  }, [friends, following, followers]);

  const onlineCount = useMemo(
    () =>
      directory.filter((u) => presenceById.get(u.userId)?.online).length,
    [directory, presenceById],
  );

  return {
    live,
    challenges,
    directory,
    presenceById,
    onlineCount,
    loading,
    reload: () => void loadLists(),
  };
}
