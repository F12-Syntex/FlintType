# FT-024 — Matchmaking word races have no max-duration watchdog — an AFK racer pins the room in 'racing' forever and leaks the bot tick

> **Severity:** MEDIUM  •  **Area:** `race`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

maybeFinishRace only flips to 'finished' when EVERY racer is finished-or-disconnected (room.ts:761-764). For word races startRacing arms a 100ms botTickInterval (room.ts:489) but NO end timer — only timed races get a buzzer (room.ts:492-498). scheduleGc (the 5-min ROOM_TTL / challenge idle GC) is invoked ONLY from maybeFinishRace (room.ts:772), so an unfinished racing room is never scheduled for GC.

## Affected code

- `src/server/race/room.ts:485-500,754-773,930-945`

## Evidence

maybeFinishRace only flips to 'finished' when EVERY racer is finished-or-disconnected (room.ts:761-764). For word races startRacing arms a 100ms botTickInterval (room.ts:489) but NO end timer — only timed races get a buzzer (room.ts:492-498). scheduleGc (the 5-min ROOM_TTL / challenge idle GC) is invoked ONLY from maybeFinishRace (room.ts:772), so an unfinished racing room is never scheduled for GC. Crucially the SSE route does NOT remove the racer on disconnect ('We do NOT auto-leave the room on disconnect', route.ts:14-18, cleanup at 124-130 only unsubscribes) and removeRacer is only reached via the explicit leave route/pagehide beacon. So if a connected racer never finishes (AFK at the gun) — OR if their tab/process dies without firing the beacon (crash, network drop, mobile tab kill) — their seat stays connected-and-unfinished, the room stays 'racing' forever, the 100ms interval keeps firing, and nothing GCs it (matchmaking rooms have no idle GC at all). I reproduced it live: queued a 1v1, never typed; the bot finished (progress 118/118, finishedAt=20) yet the room remained phase='racing' at +29s/+31s/+33s with my progress at 0 and never finished. I also observed that accumulating several such leaked rooms saturated the event loop enough to visibly slow the bot tick across rooms (a bot stalled at 126/132).

## Steps to reproduce

POST /api/race/queue {modeId:'1v1'}; open the SSE stream; never POST a keystroke. The bot finishes ~20s in but the room stays 'racing' indefinitely (verified to 33s+). Killing the client without a leave beacon leaves it racing with zero subscribers and no GC.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every load-bearing claim. (1) startRacing (room.ts:485-499) arms a 100ms botTickInterval for all races but an end timer only when durationSec != null; matchmaking rooms (joinOrCreateMatchmaking, store.ts:104-120) never set durationSec, so matchmaking word races have no buzzer. (2) maybeFinishRace (room.ts:754-773) flips to 'finished' only when every racer is finishedAt!=null or disconnected; a connected racer who never types blocks it indefinitely. (3) The SSE route explicitly does NOT auto-leave on disconnect (route.ts:15-18, cleanup at 124-130 only unsubscribes); disconnected is set solely by removeRacer via the explicit leave route / pagehide beacon, so a crash/network-drop/mobile-kill never marks the seat disconnected. (4) scheduleGc is reachable only from maybeFinishRace (room.ts:772), and the sliding-window idle GC (scheduleChallengeIdleGc) is armed only for challenge rooms (constructor 168-176, scheduleGc 938-940) — matchmaking rooms stuck in 'racing' are never GC'd, leaking the room object and the 100ms interval until process restart on the single Railway authority. Tests (room.test.ts, room-lifecycle.test.ts) cover challenge idle GC only; nothing asserts a stuck matchmaking race terminates. Aggravator: leaked rooms count toward MAX_LIVE_ROOMS=1000 and never free, so capacity erodes monotonically and can eventually 503 all new races (also a deliberate-abuse vector). Mitigations that keep this at medium: a clean leave (beacon fires) does self-heal on the next bot tick (room.ts:604 calls maybeFinishRace after the racer is flagged disconnected); challenge-kind rooms have a 30-min zero-subscriber idle GC; per-tick cost of a leaked interval is microscopic, and Railway restarts/deploys reset the store. The finder's 'event-loop saturation / bot stalled' anecdote is NOT credible from the code (a leaked tick loops over a couple of racers per 100ms) and should be discounted, but it isn't load-bearing. Severity medium is honest; title corrected to scope the no-self-heal claim to matchmaking rooms and name the capacity-erosion consequence.

## Proposed fix

Arm a hard max-duration watchdog for word races (like the timed-race buzzer) that finishes or disposes the room after N seconds of racing; and/or treat an SSE disconnect as a leave (or run a periodic store sweep that disposes rooms whose lastTouchedAt is stale regardless of phase).

## Suggested labels

`severity:medium` `area:race` `security` `multiplayer`

---

_Found by: review:race. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-024-race-no-watchdog.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-024-race-no-watchdog.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
