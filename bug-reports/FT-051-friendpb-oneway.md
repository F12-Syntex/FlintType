# FT-051 — friend_pb fan-out notifies ALL one-way followers with copy claiming 'A friend hit a personal best'

> **Severity:** LOW  •  **Area:** `backend`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

On a PB the handler does `const followers = await db.follows.listFollowers(userId)` and creates a kind:'friend_pb' notification titled 'A friend hit a personal best' for every follower. Everywhere else in the codebase 'friend' is strictly the mutual-follow relationship (friends.ts:20: 'mutual … i.e. friends'; isMutual gates invites + spectate).

## Affected code

- `src/server/routes/adapt/submit.ts:204-227`

## Evidence

On a PB the handler does `const followers = await db.follows.listFollowers(userId)` and creates a kind:'friend_pb' notification titled 'A friend hit a personal best' for every follower. Everywhere else in the codebase 'friend' is strictly the mutual-follow relationship (friends.ts:20: 'mutual … i.e. friends'; isMutual gates invites + spectate). A one-way follower — including someone the typist has never followed back or interacted with — receives a notification asserting friendship. Functionally it also means a popular user's every PB fans out one DB insert per follower inline in the submit request path (unbounded Promise.all, adapt/submit.ts:210).

## Steps to reproduce

B follows A (A does not follow back). A sets a PB. B's bell shows 'A friend hit a personal best'.

## Proposed fix

Either fan out to db.follows.listFriends(userId) (mutuals) to match the copy, or keep follower reach and reword title/body to 'Someone you follow hit a personal best'. Consider capping/batching the insert loop.

## Suggested labels

`severity:low` `area:backend`

---

_Found by: review:db-social. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-051-friendpb-oneway.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-051-friendpb-oneway.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
