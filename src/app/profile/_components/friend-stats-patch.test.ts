import { describe, expect, it } from "vitest";
import type { FriendRelationship, FriendStats } from "@/types/friends";
import { patchFriendStats } from "./friend-stats-patch";

const stats: FriendStats = {
  userId: "u",
  followers: 10,
  following: 4,
  friends: 2,
};

const rel = (over: Partial<FriendRelationship> = {}): FriendRelationship => ({
  userId: "u",
  following: false,
  followedBy: false,
  mutual: false,
  blocking: false,
  blockedBy: false,
  ...over,
});

describe("patchFriendStats", () => {
  it("adds a follower on Follow", () => {
    const next = patchFriendStats(stats, rel(), rel({ following: true }));
    expect(next).toMatchObject({ followers: 11, following: 4, friends: 2 });
  });

  it("adds a follower and a friend on Follow back", () => {
    const next = patchFriendStats(
      stats,
      rel({ followedBy: true }),
      rel({ following: true, followedBy: true, mutual: true }),
    );
    expect(next).toMatchObject({ followers: 11, following: 4, friends: 3 });
  });

  it("drops a follower and a friend on Unfollow of a friend", () => {
    const next = patchFriendStats(
      stats,
      rel({ following: true, followedBy: true, mutual: true }),
      rel({ followedBy: true }),
    );
    expect(next).toMatchObject({ followers: 9, following: 4, friends: 1 });
  });

  it("removes both edges on Block", () => {
    const next = patchFriendStats(
      stats,
      rel({ following: true, followedBy: true, mutual: true }),
      rel({ blocking: true }),
    );
    expect(next).toMatchObject({ followers: 9, following: 3, friends: 1 });
  });

  it("treats a missing previous relationship as no edges", () => {
    const next = patchFriendStats(stats, null, rel({ following: true }));
    expect(next.followers).toBe(11);
  });

  it("never goes below zero", () => {
    const zero = { ...stats, followers: 0, following: 0, friends: 0 };
    const next = patchFriendStats(
      zero,
      rel({ following: true, followedBy: true, mutual: true }),
      rel(),
    );
    expect(next).toMatchObject({ followers: 0, following: 0, friends: 0 });
  });
});
