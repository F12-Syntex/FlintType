# FT-044 — Block + concurrent follow race can leave a live follow edge across a block (presence leaks to the blocked party)

> **Severity:** LOW  •  **Area:** `social`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The block route is non-transactional: `db.blocks.block(me, target)` then `Promise.all([unfollow(me,target), unfollow(target,me)])`. The follow route checks `eitherBlocks` BEFORE inserting (follow.ts:37-39). Interleaving: B's follow handler passes the block check while A's block hasn't landed; A's block + both unfollows complete;

## Affected code

- `src/server/routes/friends/index.ts:31-47`

## Evidence

The block route is non-transactional: `db.blocks.block(me, target)` then `Promise.all([unfollow(me,target), unfollow(target,me)])`. The follow route checks `eitherBlocks` BEFORE inserting (follow.ts:37-39). Interleaving: B's follow handler passes the block check while A's block hasn't landed; A's block + both unfollows complete; B's `follows.follow` INSERT then lands — leaving B→A standing while A blocks B, violating the documented invariant ('while a block exists in either direction, neither party can follow', blocks.ts schema comment). Concrete consequence: presence.list returns presence for everyone the caller follows (src/server/routes/presence/index.ts:30-48), so B keeps seeing A's online/practising status and last-seen despite the block, indefinitely (nothing re-severs the edge later). Spectate/invite stay safe (they re-check eitherBlocks/isMutual at use), but lists, counts, and presence honour the dangling edge.

## Steps to reproduce

Requires a timing race: fire friends.follow (B→A) and friends.block (A blocks B) concurrently so B's insert lands after A's unfollow pass. Verify follows table then contains (B,A) while blocks contains (A,B); B's presence.list includes A.

## Proposed fix

Either wrap block+unfollow in a transaction AND re-check eitherBlocks inside follows.follow at insert time (e.g. INSERT … SELECT WHERE NOT EXISTS(block)), or run a periodic/inline invariant sweep that deletes follow edges where a block row exists for the pair.

## Suggested labels

`severity:low` `area:social` `security` `multiplayer`

---

_Found by: review:db-social. Generated from scan run `wf_a630179b-84b`._
