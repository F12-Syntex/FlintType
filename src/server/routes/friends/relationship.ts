import type { Database } from "@/db/server";
import type { FollowEdge } from "@/db/server/repositories/follows";
import { resolveUserDisplays } from "@/server/user-display";
import type { FriendRelationship, FriendUser } from "@/types/friends";

/** Build the full pairwise relationship snapshot between `me` and
 *  `target`. Four indexed lookups in parallel; `mutual` is derived.
 *  Every mutation route returns this so the client updates the follow
 *  button straight from the response. */
export async function relationshipOf(
  db: Database,
  me: string,
  target: string,
): Promise<FriendRelationship> {
  const [following, followedBy, blocking, blockedBy] = await Promise.all([
    db.follows.isFollowing(me, target),
    db.follows.isFollowing(target, me),
    db.blocks.isBlocked(me, target),
    db.blocks.isBlocked(target, me),
  ]);
  return {
    userId: target,
    following,
    followedBy,
    mutual: following && followedBy,
    blocking,
    blockedBy,
  };
}

/** Resolve a list of follow edges into renderable `FriendUser` rows,
 *  attaching each edge's `createdAt` as `sinceMs`. Edges whose user
 *  Clerk can't resolve (deleted account, stale id) are dropped — same
 *  policy as the leaderboard, so a list never shows a placeholder. The
 *  input order (newest-first from the repo) is preserved. */
export async function toFriendUsers(
  db: Database,
  edges: FollowEdge[],
): Promise<FriendUser[]> {
  const displays = await resolveUserDisplays(
    db,
    edges.map((e) => e.userId),
  );
  const out: FriendUser[] = [];
  for (const edge of edges) {
    const d = displays.get(edge.userId);
    if (!d) continue;
    out.push({
      userId: edge.userId,
      username: d.username,
      name: d.name,
      tags: d.tags,
      imageUrl: d.imageUrl,
      sinceMs: edge.createdAt.getTime(),
    });
  }
  return out;
}
