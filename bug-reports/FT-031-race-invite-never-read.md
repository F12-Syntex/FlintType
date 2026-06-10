# FT-031 — race_invite notification is never marked read on join — dock challenge + Swords badge persist forever pointing at dead lobbies

> **Severity:** MEDIUM  •  **Area:** `social`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The dock derives challenges from unread race_invite notifications (use-dock-data.ts:131-149 filters `n.readAtMs != null`). The challenge row's Join affordance is a plain <Link href={`/race/c/${c.slug}`}> (dock-panel.tsx:149) — no markRead. The notifications popover race-invite row is likewise a bare Link (notifications-popover.tsx:245-246,306-317).

## Affected code

- `src/components/friends-dock/dock-panel.tsx:146-161`

## Evidence

The dock derives challenges from unread race_invite notifications (use-dock-data.ts:131-149 filters `n.readAtMs != null`). The challenge row's Join affordance is a plain <Link href={`/race/c/${c.slug}`}> (dock-panel.tsx:149) — no markRead. The notifications popover race-invite row is likewise a bare Link (notifications-popover.tsx:245-246,306-317). The challenge join flow has zero notification interaction (grep for notification/markRead in src/app/race/c/[slug]/_components/challenge-shell.tsx and src/server/routes/race/* returns nothing). The backend markRead route exists (src/server/routes/notifications/index.ts:35) but a repo-wide grep shows NO client caller anywhere — only markAllRead is wired (popover 'Mark all read'). This directly contradicts the documented contract (ui-law §17.5 / multiplayer doc: 'Joining or marking the notification read clears it from the dock'). Net effect: after joining (or after the in-memory lobby dies on authority restart), the dock keeps showing the inviter 'wants to race' with a Join action that 404s ('no challenge with slug …', race/challenge.ts:80-85), and the collapsed pill keeps a permanent Swords badge, until the user discovers Mark-all-read in the bell — which also nukes their unread state for everything else.

## Steps to reproduce

Account A invites mutual friend B (FollowButton → Invite to a race). B clicks Join in the dock and races. Return to any page: the dock still lists the challenge and the pill still shows the Swords count. Restart the dev server (kills the in-memory lobby) — Join now lands on a 404 lobby, challenge still listed.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Every claim verified by reading the code. (1) use-dock-data.ts:131-149 derives dock challenges solely from unread race_invite notifications (`n.readAtMs != null` filter), with no age cutoff or lobby-liveness check. (2) dock-panel.tsx:146-161 renders the challenge row as a plain Link to /race/c/<slug>; onNavigate only closes the panel. (3) Repo-wide grep confirms backend.notifications.markRead has ZERO client callers — only list() and markAllRead() (notifications-popover.tsx:102) are wired; the markRead route at src/server/routes/notifications/index.ts:35 is dead client-side. (4) Grep over src/server/routes/race/** and src/app/race/** for notification/markRead/readAt returns nothing — challenge.join (challenge.ts:76+) never marks the invite read, and it throws 404 NOT_FOUND for a missing slug (challenge.ts:80-85) since lobbies are in-memory and vanish on authority restart (multiplayer.md) while the notification is DB-persisted. (5) The collapsed pill's Swords badge renders from data.challenges.length (friends-dock/index.tsx:251-254), so it persists too. (6) This directly contradicts the documented contract in ui-law §17.5 ('Joining or marking the notification read clears it from the dock') — the 'joining clears it' half is unimplemented, and the only clearing path is Mark-all-read, which wipes all unread state. The notifications popover race-invite row (lines 245-247, 306-317) is likewise a bare Link with no per-item markRead. No guard, no TTL, no test asserting otherwise (lobby/index.test.ts only covers creation/dedupe). Severity medium is honest: every user who receives a race invite hits a permanently stale 'wants to race' row and Swords badge with a Join that 404s after the lobby dies — a persistent UX defect, not data loss or security.

## Proposed fix

Call backend.notifications.markRead({id}) when a challenge row's Join is clicked (the dock already has the notification id on DockChallenge.id), and/or mark the matching race_invite read server-side on successful challenge.join. Optionally also age out invites whose lobby no longer resolves.

## Suggested labels

`severity:medium` `area:social` `multiplayer`

---

_Found by: review:db-social. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-031-race-invite-never-read.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-031-race-invite-never-read.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
