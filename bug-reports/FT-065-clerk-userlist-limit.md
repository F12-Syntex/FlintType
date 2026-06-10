# FT-065 — resolveUserDisplays passes an unbounded follow-list size as the Clerk getUserList limit — breaks past Clerk's 500 cap

> **Severity:** LOW  •  **Area:** `social`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

`client.users.getUserList({ userId: misses, limit: misses.length })` — `misses` is fed directly from uncapped follow edges (follows.listFollowing/listFollowers/listFriends have no LIMIT clause; friends.listFollowing → toFriendUsers → resolveUserDisplays passes every edge). Clerk's getUserList limit parameter has a documented maximum of 500;

## Affected code

- `src/server/user-display.ts:137-140`

## Evidence

`client.users.getUserList({ userId: misses, limit: misses.length })` — `misses` is fed directly from uncapped follow edges (follows.listFollowing/listFollowers/listFriends have no LIMIT clause; friends.listFollowing → toFriendUsers → resolveUserDisplays passes every edge). Clerk's getUserList limit parameter has a documented maximum of 500; a user following/followed-by more than 500 accounts produces an out-of-range limit, so the batch either errors (failing friends.listFollowing / the dock's loadLists entirely — the error posture comment at :110-115 says misses are NOT swallowed) or is truncated to 500 with the remainder silently dropped from the directory. Same path serves presence-free dock directory, friends leaderboard display resolution, and toFriendUsers.

## Steps to reproduce

Account following 501+ users → open the friends dock or call friends.listFollowing.

## Proposed fix

Chunk misses into ≤500-id pages (Clerk getUserList supports offset/paging) inside resolveUserDisplays, or cap list sizes at the repo layer with pagination.

## Suggested labels

`severity:low` `area:social`

---

_Found by: review:db-social. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-065-clerk-userlist-limit.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-065-clerk-userlist-limit.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
